-- =============================================================================
-- M7 — o selo de fundador passa a ter escassez: as 500 primeiras vagas.
--
-- DECISÃO DE PRODUTO (Luiz): corte por CONTAGEM, não por data. Antes,
-- `handle_new_user` gravava `is_founder = true` para todo usuário criado, sem
-- corte nenhum — a coroa exibida em ProfileScreen.tsx perdia o sentido no dia
-- seguinte ao lançamento, porque todo mundo teria uma.
--
-- Por que contagem e não data: a data exigiria acertar o dia do lançamento com
-- antecedência. A contagem é comunicável ("os 500 primeiros") e independe de
-- quando o lançamento acontece de fato.
--
-- O selo é PURAMENTE COSMÉTICO — não dá XP, não altera ranking, não libera
-- nada. Só exibe "👑 Fundador" no perfil. Mudar este número depois é seguro.
--
-- NÃO VALIDADO: não há Postgres neste ambiente. Revisão por leitura apenas.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- A regra de elegibilidade fica em FUNÇÃO PRÓPRIA, separada de
-- `handle_new_user()`.
--
-- Isso é lição direta do bug C1: `handle_new_user` e `protect_profile_stats`
-- foram redefinidas em várias migrações, cada uma recopiando o corpo para
-- mexer num detalhe, e no caminho perderam comportamento. Com a regra isolada,
-- mudar o número de vagas (ou trocar contagem por data) toca SÓ esta função —
-- `handle_new_user` não precisa ser recopiada de novo.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.aue_vaga_de_fundador_disponivel()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Número de vagas. Alterar AQUI, e em nenhum outro lugar.
  c_vagas constant integer := 500;
  v_ocupadas integer;
BEGIN
  -- Serializa a checagem entre cadastros simultâneos. Sem o lock, dois
  -- cadastros concorrentes podem ler 499 ao mesmo tempo e as duas transações
  -- concedem a vaga — estourando o limite. O lock é por transação e some
  -- sozinho no commit; só é disputado durante criação de conta.
  PERFORM pg_advisory_xact_lock(hashtext('aue_vaga_de_fundador'));

  -- Conta as vagas EFETIVAMENTE ocupadas, não o total de perfis: se um perfil
  -- fundador for apagado, a vaga volta a existir.
  --
  -- O LIMIT interno impede varredura da tabela inteira quando a base crescer —
  -- basta saber se chegou a 500, não quantos são ao todo.
  SELECT count(*) INTO v_ocupadas
  FROM (SELECT 1 FROM public.profiles WHERE is_founder LIMIT c_vagas) AS ocupadas;

  RETURN v_ocupadas < c_vagas;
END;
$$;

COMMENT ON FUNCTION public.aue_vaga_de_fundador_disponivel() IS
  'Elegibilidade ao selo de fundador: as 500 primeiras vagas (M7). Fonte única '
  'da regra — para mudar o número, edite SOMENTE esta função.';

-- Torna a contagem barata e mantém o LIMIT eficiente conforme a base cresce.
CREATE INDEX IF NOT EXISTS profiles_fundadores
  ON public.profiles (id) WHERE is_founder;


-- -----------------------------------------------------------------------------
-- `handle_new_user` passa a delegar a decisão. É a última vez que ela precisa
-- ser redefinida por causa do selo de fundador.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, apelido, avatar_url, is_founder)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Arrotador ' || substr(NEW.id::text, 1, 6)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    public.aue_vaga_de_fundador_disponivel()
  );
  RETURN NEW;
END;
$$;


-- -----------------------------------------------------------------------------
-- Perfis já existentes NÃO são tocados.
--
-- Quem já tem `is_founder = true` continua tendo — inclusive se já passar de
-- 500, o que é possível se a versão sem corte chegou a rodar em algum
-- ambiente. Tirar a coroa de quem já a viu no perfil seria uma regressão
-- visível, e a decisão de fazer isso é de Luiz, não desta migração.
--
-- Para CONFERIR quantas vagas já estão ocupadas antes de anunciar a campanha:
--
--   SELECT count(*) AS fundadores FROM public.profiles WHERE is_founder;
--
-- Se esse número já passar de 500 e você quiser normalizar, o corte manual
-- (mantendo os 500 mais antigos) seria:
--
--   UPDATE public.profiles SET is_founder = false
--    WHERE is_founder
--      AND id NOT IN (
--        SELECT id FROM public.profiles WHERE is_founder
--         ORDER BY created_at ASC LIMIT 500
--      );
--
-- Deliberadamente NÃO executado aqui: apaga um selo já exibido ao usuário.
-- -----------------------------------------------------------------------------
