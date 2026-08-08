-- =============================================================================
-- Correções da auditoria (Rian) — C1, A2, A3, M5, M8, M9
--
-- NÃO VALIDADO: não há Postgres, Docker, psql nem Supabase CLI neste ambiente.
-- Nada aqui passou por parser de SQL. Aplique com BEGIN / ROLLBACK primeiro.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- C1 (CRÍTICO) — o acúmulo de XP e a progressão de nível estavam mortos.
--
-- Histórico do defeito:
--   20260807000001  cria `protect_profile_stats()` revertendo xp_total/nivel em
--                   TODO UPDATE de profiles.
--   20260807000002  cria `update_profile_xp()`, que faz justamente um UPDATE de
--                   xp_total — e é revertido pelo trigger acima. Bug C4.
--   20260807000010  corrige C4 com a válvula `app.allow_stat_update`: o trigger
--                   só deixa passar quando o próprio fluxo de gamificação do
--                   banco sinaliza, e o cliente não alcança a flag (PostgREST
--                   não executa `set_config` arbitrário; o terceiro argumento
--                   `true` a torna local à transação).
--   20260807000015  (agora 000022) recopia o corpo da função para acrescentar
--                   `is_founder` — e DESCARTA a válvula. C4 volta.
--   20260807000021  recopia de novo para acrescentar `is_premium` — e descarta
--                   a válvula outra vez. É este o estado final vigente.
--
-- Efeito no estado atual do schema: `SECURITY DEFINER` não desabilita triggers,
-- então o UPDATE emitido por `update_profile_xp()` dispara `on_profile_update`,
-- que reverte xp_total e nivel. XP nunca acumula, nível nunca sobe, título
-- nunca muda — silenciosamente, sem erro.
--
-- CAUSA RAIZ (o que esta seção também corrige): a função foi redefinida em
-- CINCO migrações, cada uma recopiando o corpo à mão. O padrão ia repetir na
-- sexta. Daqui em diante esta é a DEFINIÇÃO ÚNICA e consolidada — para
-- proteger um campo novo, acrescente a linha AQUI e não recopie o corpo em
-- outra migração. As demais correções de `search_path` desta mesma migração
-- usam `ALTER FUNCTION` exatamente para não recopiar corpo nenhum.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_profile_stats()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Imutáveis, venha o UPDATE de onde vier.
  NEW.id         := OLD.id;
  NEW.created_at := OLD.created_at;

  -- Concedidos apenas por fluxo do servidor; o cliente nunca os altera.
  NEW.is_founder := OLD.is_founder;
  NEW.is_premium := OLD.is_premium;

  -- xp_total / nivel: só mudam sob a válvula aberta por `update_profile_xp()`.
  IF coalesce(current_setting('app.allow_stat_update', true), 'off') <> 'on' THEN
    NEW.xp_total := OLD.xp_total;
    NEW.nivel    := OLD.nivel;
  END IF;

  RETURN NEW;
END;
$$;

-- Recriado para garantir que o trigger está de fato ligado à função — em algum
-- ambiente ele pode ter sido derrubado junto com um rollback parcial.
DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_stats();

COMMENT ON FUNCTION public.protect_profile_stats() IS
  'DEFINIÇÃO ÚNICA. Protege id, created_at, is_founder, is_premium sempre; e '
  'xp_total/nivel exceto sob a válvula app.allow_stat_update aberta por '
  'update_profile_xp(). Para proteger um campo novo, edite ESTA função — não '
  'recopie o corpo em outra migração (foi assim que o bug C1 nasceu duas vezes).';


-- -----------------------------------------------------------------------------
-- M8 — `SET search_path` nas funções SECURITY DEFINER que ainda não tinham.
--
-- Feito com ALTER FUNCTION de propósito: não recopia corpo, portanto não pode
-- reintroduzir regressão como a do C1. É também o advisor
-- "Function Search Path Mutable" do Supabase.
--
-- `handle_new_user()` foi corrigida em 20260807000022.
-- `check_reports_and_hide()` é recriada mais abaixo (A2), já com search_path.
-- -----------------------------------------------------------------------------

ALTER FUNCTION public.process_result_xp()                     SET search_path = public, pg_temp;
ALTER FUNCTION public.get_championship_leaderboard(uuid)      SET search_path = public, pg_temp;

-- Funções de trigger que não são SECURITY DEFINER, mas ganham a mesma higiene.
ALTER FUNCTION public.protect_desafio_fields()                SET search_path = public, pg_temp;
ALTER FUNCTION public.set_desafio_winner()                    SET search_path = public, pg_temp;


-- -----------------------------------------------------------------------------
-- A2 (ALTO) — qualquer pessoa escondia qualquer gravação com 3 requisições.
--
-- Estado anterior: `denuncias` não tinha `user_id`, não tinha deduplicação, e a
-- policy era `FOR INSERT TO public WITH CHECK (true)`. O trigger contava
-- LINHAS e escondia o resultado a partir de 3. Ou seja: três POSTs anônimos
-- derrubavam qualquer gravação do feed e do ranking, sem conta e sem trilha.
--
-- Correção: denúncia passa a exigir autenticação, uma por pessoa por
-- resultado, e o limiar passa a contar PESSOAS DISTINTAS.
--
-- `user_id` entra como NULLABLE porque a tabela pode já ter linhas legadas sem
-- dono; NOT NULL faria a migração falhar. A policy garante que toda linha nova
-- tenha dono, e o índice único parcial deduplica só as linhas com dono.
-- -----------------------------------------------------------------------------

ALTER TABLE public.denuncias
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS denuncias_uma_por_pessoa_por_resultado
  ON public.denuncias (result_id, user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.denuncias
  DROP CONSTRAINT IF EXISTS denuncias_reason_len,
  ADD CONSTRAINT denuncias_reason_len
    CHECK (char_length(btrim(reason)) BETWEEN 3 AND 500) NOT VALID;

DROP POLICY IF EXISTS "Allow anyone to insert denunciation" ON public.denuncias;
DROP POLICY IF EXISTS "Authenticated users can report once per result" ON public.denuncias;
DROP POLICY IF EXISTS "Users can view their own reports" ON public.denuncias;

CREATE POLICY "Authenticated users can report once per result"
ON public.denuncias FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Necessária para o cliente saber que já denunciou (e não oferecer o botão de
-- novo). Cada pessoa enxerga apenas as próprias denúncias.
CREATE POLICY "Users can view their own reports"
ON public.denuncias FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

REVOKE INSERT ON public.denuncias FROM anon;
GRANT SELECT, INSERT ON public.denuncias TO authenticated;

CREATE OR REPLACE FUNCTION public.check_reports_and_hide()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_denunciantes integer;
BEGIN
  -- Conta PESSOAS distintas, não linhas. Antes, três inserções da mesma origem
  -- (ou de nenhuma origem identificável) bastavam.
  SELECT count(DISTINCT user_id) INTO v_denunciantes
  FROM public.denuncias
  WHERE result_id = NEW.result_id
    AND user_id IS NOT NULL;

  IF v_denunciantes >= 3 THEN
    UPDATE public.resultados
       SET is_hidden = true
     WHERE id = NEW.result_id;
  END IF;

  RETURN NEW;
END;
$$;

-- LIMITE DECLARADO: ocultação continua automática e sem reversão pelo produto.
-- Três contas combinadas ainda escondem uma gravação legítima. O que muda é o
-- custo (exige três contas reais) e a rastreabilidade (existe dono por linha).
-- Moderação com revisão humana e desfazimento é escopo de produto, de Luiz.


-- -----------------------------------------------------------------------------
-- M5 (MÉDIO) — completar um desafio aceitava resultado de terceiro.
--
-- A policy de UPDATE de `desafios` (20260807000010) exigia apenas que a linha
-- resultante estivesse completa, sem nenhum vínculo de posse com
-- `challenged_result_id`. Como os ids de `resultados` são visíveis no feed,
-- dava para responder um desafio usando o resultado alheio de score alto.
--
-- A 20260807000016 resolveu o lado do desafiante (INSERT) e registrou, no
-- comentário final, a escolha de deixar o UPDATE aberto. A auditoria discorda
-- do saldo: o argumento de lá é que o respondente "acabou de gravar", e é
-- exatamente isso que a janela de 60 minutos expressa — sem impedir quem não
-- tem conta de responder.
--
-- Espelha `can_use_as_challenger` (000016), inclusive a justificativa da
-- janela: o fluxo legítimo responde segundos após gravar; o abuso precisa
-- descobrir o uuid E agir dentro da janela.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_use_as_challenged(p_result_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resultados r
    WHERE r.id = p_result_id
      AND (
        (auth.uid() IS NOT NULL AND r.user_id = auth.uid())
        OR (
          auth.uid() IS NULL
          AND r.user_id IS NULL
          AND r.created_at > timezone('utc'::text, now()) - interval '60 minutes'
        )
      )
  );
$$;

COMMENT ON FUNCTION public.can_use_as_challenged(uuid) IS
  'Posse do resultado usado como resposta ao desafio. Espelha can_use_as_challenger (M5).';

GRANT EXECUTE ON FUNCTION public.can_use_as_challenged(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Enable update for everyone" ON public.desafios;
DROP POLICY IF EXISTS "Enable update for owner of challenged result" ON public.desafios;

CREATE POLICY "Enable update for owner of challenged result"
ON public.desafios FOR UPDATE
TO anon, authenticated
USING (challenged_result_id IS NULL)
WITH CHECK (
  challenged_result_id IS NOT NULL
  AND public.can_use_as_challenged(challenged_result_id)
);


-- -----------------------------------------------------------------------------
-- M9 (MÉDIO) — `comentarios` e `reacoes` aceitavam linha órfã.
--
-- A 20260807000019 tornou `result_id` nullable e acrescentou `post_id`, sem
-- nada exigindo que exatamente um dos dois estivesse preenchido. Linha com os
-- dois nulos (comentário pendurado em nada) ou com os dois preenchidos
-- (contado duas vezes no feed) passava.
--
-- NOT VALID: não varre as linhas já existentes, só vale daqui em diante.
-- -----------------------------------------------------------------------------

ALTER TABLE public.comentarios
  DROP CONSTRAINT IF EXISTS comentarios_alvo_unico,
  ADD CONSTRAINT comentarios_alvo_unico
    CHECK (num_nonnulls(result_id, post_id) = 1) NOT VALID;

ALTER TABLE public.reacoes
  DROP CONSTRAINT IF EXISTS reacoes_alvo_unico,
  ADD CONSTRAINT reacoes_alvo_unico
    CHECK (num_nonnulls(result_id, post_id) = 1) NOT VALID;


-- -----------------------------------------------------------------------------
-- A3 (ALTO) — `origin_subtype` e `group_id` eram colunas mortas ponta a ponta.
--
-- A 20260807000019 acrescentou as duas colunas em `resultados`, mas a RPC
-- `submit_resultado` (20260807000011) — único caminho de gravação desde que o
-- INSERT direto foi revogado — nunca as recebeu nem gravou. No cliente,
-- `SubmitResultInput.originSubtype` existia na interface e nunca era enviado.
--
-- ALCANCE REAL DESTA CORREÇÃO, SEM ARREDONDAR: `origin_subtype` passa a ser
-- gravado de ponta a ponta — o OriginSheet produz o subtipo e o cliente o
-- envia. `group_id`, NÃO: a RPC passa a aceitá-lo e a validar a filiação ao
-- grupo, mas NENHUM chamador o envia, porque não existe seleção de grupo no
-- fluxo de gravação. A coluna deixou de ser inalcançável no servidor e
-- continua sem produtor no cliente. Ligar isso é trabalho de interface, não
-- de schema.
--
-- Também trata A1 pelo lado do servidor: para usuário autenticado o
-- `player_name` enviado pelo cliente passa a ser IGNORADO, e a coluna fica
-- NULL — que é o que faz a view `global_ranking` (20260807000015) cair no
-- `apelido` do perfil. Sem isso, bastava o cliente mandar qualquer string para
-- o ranking inteiro exibir o mesmo nome, que é exatamente o que acontecia.
--
-- `CREATE OR REPLACE` não altera assinatura: acrescentar parâmetro cria uma
-- SOBRECARGA, e duas sobrecargas deixariam o PostgREST ambíguo. Por isso o
-- DROP explícito da assinatura antiga antes de recriar.
-- -----------------------------------------------------------------------------

ALTER TABLE public.resultados
  DROP CONSTRAINT IF EXISTS resultados_origin_subtype_len,
  ADD CONSTRAINT resultados_origin_subtype_len
    CHECK (origin_subtype IS NULL OR char_length(btrim(origin_subtype)) BETWEEN 1 AND 40) NOT VALID;

-- Subtipo só faz sentido para as origens que têm submenu no OriginSheet.
ALTER TABLE public.resultados
  DROP CONSTRAINT IF EXISTS resultados_origin_subtype_coerente,
  ADD CONSTRAINT resultados_origin_subtype_coerente
    CHECK (origin_subtype IS NULL OR origin_type IN ('Comida', 'Bebida')) NOT VALID;

DROP FUNCTION IF EXISTS public.submit_resultado(numeric, numeric, numeric, numeric, text, text);

CREATE FUNCTION public.submit_resultado(
  p_duration numeric,
  p_power numeric,
  p_depth numeric,
  p_texture numeric,
  p_origin_type text,
  p_player_name text DEFAULT NULL,
  p_origin_subtype text DEFAULT NULL,
  p_group_id uuid DEFAULT NULL
)
RETURNS public.resultados
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_origin_score numeric;
  v_score numeric;
  v_subtype text;
  v_player_name text;
  v_row public.resultados;
BEGIN
  IF p_duration IS NULL OR p_power IS NULL OR p_depth IS NULL OR p_texture IS NULL THEN
    RAISE EXCEPTION 'Parciais obrigatórias ausentes' USING ERRCODE = '22023';
  END IF;

  IF p_duration < 0 OR p_duration > 100
     OR p_power   < 0 OR p_power   > 100
     OR p_depth   < 0 OR p_depth   > 100
     OR p_texture < 0 OR p_texture > 100 THEN
    RAISE EXCEPTION 'Parciais fora da faixa 0-100' USING ERRCODE = '22023';
  END IF;

  v_origin_score := public.aue_origin_score_v1(p_origin_type);
  IF v_origin_score IS NULL THEN
    RAISE EXCEPTION 'Origem inválida: %', p_origin_type USING ERRCODE = '22023';
  END IF;

  -- Fórmula inalterada (aue-score-v1). Qualquer mudança de peso aqui quebra a
  -- constraint `resultados_score_coherent` e o teste rules.formula.test.ts.
  v_score := public.aue_score_v1(p_duration, p_power, p_depth, p_texture, v_origin_score);

  -- Subtipo: só para Comida/Bebida, aparado e limitado.
  v_subtype := nullif(left(btrim(coalesce(p_origin_subtype, '')), 40), '');
  IF p_origin_type NOT IN ('Comida', 'Bebida') THEN
    v_subtype := NULL;
  END IF;

  -- Grupo: só quem é membro pode publicar a gravação no grupo.
  IF p_group_id IS NOT NULL THEN
    IF v_uid IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.membros_grupo m
       WHERE m.group_id = p_group_id AND m.user_id = v_uid
    ) THEN
      RAISE EXCEPTION 'Grupo inválido ou usuário não é membro' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- A1: logado NÃO escolhe o nome exibido — o ranking usa o apelido do perfil.
  v_player_name := CASE
    WHEN v_uid IS NOT NULL THEN NULL
    ELSE nullif(left(btrim(coalesce(p_player_name, '')), 40), '')
  END;

  INSERT INTO public.resultados (
    score, classification, is_artificial,
    duration, power, depth, texture,
    origin_score, origin_type, origin_subtype,
    player_name, user_id, group_id
  ) VALUES (
    v_score,
    public.aue_classification_v1(v_score),
    (p_origin_type = 'Puxei ar'),
    p_duration, p_power, p_depth, p_texture,
    v_origin_score, p_origin_type, v_subtype,
    v_player_name,
    v_uid,              -- NUNCA vem do cliente
    p_group_id
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_resultado(
  numeric, numeric, numeric, numeric, text, text, text, uuid
) TO anon, authenticated;
