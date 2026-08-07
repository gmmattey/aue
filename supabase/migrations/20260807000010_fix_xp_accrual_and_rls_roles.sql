-- =============================================================================
-- Correções críticas (revisão Rian — C4 e C5)
--
-- C4: o trigger BEFORE UPDATE `protect_profile_stats()` revertia xp_total/nivel
--     em TODA atualização de profiles, inclusive na feita por
--     `update_profile_xp()`. SECURITY DEFINER não desabilita triggers, então o
--     XP nunca acumulava.
--
-- C5: as policies de SELECT de `resultados` e as três policies de `desafios`
--     foram criadas apenas `TO anon`, deixando o role `authenticated` sem
--     acesso. Além disso, a policy de UPDATE de `desafios` não tinha
--     `WITH CHECK`; nesse caso o Postgres reaproveita a expressão do `USING`
--     como check da linha nova, ou seja, `challenged_result_id IS NULL` também
--     era exigido DEPOIS do update — o que inviabiliza justamente a operação
--     de completar o desafio.
--
-- Esta migração não altera as migrações anteriores (que podem já ter sido
-- aplicadas); ela apenas redefine funções e recria policies de forma
-- idempotente.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- C4 — permitir a atualização de XP feita pelo sistema e continuar bloqueando
--      a feita pelo usuário.
--
-- Abordagem escolhida: flag de sessão local à transação
-- (`app.allow_stat_update`), setada por `update_profile_xp()` imediatamente
-- antes dos UPDATEs e limpa logo depois.
--
-- Por que esta abordagem e não `auth.role()` / `session_user`:
--   * `auth.role()` devolve o role do JWT ('authenticated'/'anon') tanto no
--     UPDATE legítimo quanto no fraudulento — o JWT é o mesmo, já que o
--     trigger roda dentro da requisição do usuário. Não distingue nada.
--   * `session_user` também não muda com SECURITY DEFINER (só `current_user`
--     muda), então dependeria de um detalhe implícito e frágil.
--   * A flag é explícita, auditável, e não é alcançável pelo cliente: o
--     PostgREST não permite executar `SET` / `set_config` arbitrário, e o
--     terceiro argumento `true` torna o valor local à transação.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_profile_stats()
RETURNS trigger AS $$
BEGIN
  -- Campos que nunca podem mudar via UPDATE, venha de onde vier.
  NEW.id := OLD.id;
  NEW.created_at := OLD.created_at;

  -- xp_total / nivel só podem mudar quando a atualização vem do fluxo de
  -- gamificação do próprio banco.
  IF coalesce(current_setting('app.allow_stat_update', true), 'off') <> 'on' THEN
    NEW.xp_total := OLD.xp_total;
    NEW.nivel := OLD.nivel;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- O trigger `on_profile_update` criado em 20260807000001 continua apontando
-- para esta função (CREATE OR REPLACE preserva a ligação).


CREATE OR REPLACE FUNCTION public.update_profile_xp()
RETURNS trigger AS $$
DECLARE
  current_xp integer;
  new_nivel integer;
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.xp_earned > 0 THEN
    -- Libera a atualização de estatísticas apenas para os UPDATEs abaixo.
    PERFORM set_config('app.allow_stat_update', 'on', true);

    UPDATE public.profiles
    SET xp_total = xp_total + NEW.xp_earned
    WHERE id = NEW.user_id
    RETURNING xp_total INTO current_xp;

    IF current_xp IS NOT NULL THEN
      -- Nivel: 1 nível a cada 100 XP.
      new_nivel := floor(current_xp / 100) + 1;

      UPDATE public.profiles
      SET nivel = new_nivel
      WHERE id = NEW.user_id AND nivel <> new_nivel;
    END IF;

    -- Fecha a janela imediatamente; a flag é local à transação de qualquer
    -- forma, mas não deixamos ela aberta para o resto da transação.
    PERFORM set_config('app.allow_stat_update', 'off', true);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- O trigger `trigger_update_profile_xp` (AFTER INSERT em resultados) criado em
-- 20260807000002 continua apontando para esta função.


-- -----------------------------------------------------------------------------
-- C5 — incluir o role `authenticated` nas policies que estavam só `TO anon`.
-- -----------------------------------------------------------------------------

-- resultados: leitura
DROP POLICY IF EXISTS "Enable read access for all users" ON public.resultados;
CREATE POLICY "Enable read access for all users"
ON public.resultados FOR SELECT
TO anon, authenticated
USING (true);

-- desafios: leitura
DROP POLICY IF EXISTS "Enable read access for all users" ON public.desafios;
CREATE POLICY "Enable read access for all users"
ON public.desafios FOR SELECT
TO anon, authenticated
USING (true);

-- desafios: criação
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON public.desafios;
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.desafios;
CREATE POLICY "Enable insert for everyone"
ON public.desafios FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- desafios: completar o desafio
DROP POLICY IF EXISTS "Enable update for anonymous users" ON public.desafios;
DROP POLICY IF EXISTS "Enable update for everyone" ON public.desafios;
CREATE POLICY "Enable update for everyone"
ON public.desafios FOR UPDATE
TO anon, authenticated
USING (challenged_result_id IS NULL)
WITH CHECK (challenged_result_id IS NOT NULL);
-- USING  -> só desafios ainda em aberto podem ser alvo de UPDATE.
-- WITH CHECK -> a linha resultante precisa estar de fato completa. Sem esta
-- cláusula o Postgres reaplicaria o USING na linha nova e o UPDATE legítimo
-- seria rejeitado.


-- A imutabilidade de `id`, `created_at` e `challenger_result_id` NÃO pode ser
-- expressa em WITH CHECK: uma policy só enxerga a linha nova, e referenciar a
-- própria tabela dentro da policy causa recursão infinita em RLS. Por isso a
-- proteção do valor antigo fica num trigger BEFORE UPDATE, que tem acesso a OLD.
CREATE OR REPLACE FUNCTION public.protect_desafio_fields()
RETURNS trigger AS $$
BEGIN
  NEW.id := OLD.id;
  NEW.created_at := OLD.created_at;
  NEW.challenger_result_id := OLD.challenger_result_id;

  -- Um desafio já respondido não pode ser reescrito.
  IF OLD.challenged_result_id IS NOT NULL THEN
    NEW.challenged_result_id := OLD.challenged_result_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_desafio_update ON public.desafios;
CREATE TRIGGER on_desafio_update
  BEFORE UPDATE ON public.desafios
  FOR EACH ROW EXECUTE PROCEDURE public.protect_desafio_fields();
