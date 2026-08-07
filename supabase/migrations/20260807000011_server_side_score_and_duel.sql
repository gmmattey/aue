-- =============================================================================
-- Correções ALTA (revisão Rian — A1 e A2)
--
-- A1: o score era calculado 100% no browser e gravado direto via REST com a
--     anon key (pública por definição). Não havia constraint de faixa nem de
--     coerência em `resultados`, e a policy de INSERT só validava `user_id`.
--     Qualquer pessoa com a anon key podia inserir `score: 100`.
--
-- A2: o vencedor do duelo era decidido no browser (`compareResults`) e nunca
--     era persistido nem verificado.
--
-- LIMITE INERENTE, DECLARADO EXPLICITAMENTE:
--   O score deriva de análise acústica feita no browser (Web Audio API). O
--   servidor NÃO recebe o áudio e portanto NÃO pode recalcular as métricas
--   primárias (duração, RMS, energia grave, ZCR) de forma independente.
--   Esta migração elimina a falsificação DIRETA do score final, da
--   classificação e do peso de origem — mas as PARCIAIS continuam sendo
--   entrada não verificável vinda do cliente. Um atacante que envie
--   parciais fabricadas (duration=100, power=100, ...) ainda obtém score 100.
--   Fechar isso de verdade exige subir o áudio e reanalisá-lo no servidor,
--   o que está fora do escopo desta correção.
--
-- O que esta migração de fato garante:
--   1. `score`, `classification`, `origin_score` e `is_artificial` passam a ser
--      derivados server-side a partir das parciais e da origem — o valor
--      enviado pelo cliente é ignorado.
--   2. Parciais fora de [0,100] e origens inválidas são rejeitadas.
--   3. Linhas incoerentes (score que não bate com a fórmula) são rejeitadas
--      mesmo que alguém consiga um caminho de INSERT direto no futuro.
--   4. O `user_id` passa a vir de `auth.uid()` no servidor, não do payload.
--   5. O vencedor do duelo é decidido e persistido pelo banco.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Fórmula de score portada de `src/features/audio/rules.ts` (aue-score-v1)
--
-- Porte fiel, função por função. Ver rules.ts:18-77.
-- As funções são IMMUTABLE justamente para poderem ser usadas em CHECK.
-- O sufixo `_v1` amarra a versão do algoritmo, como pede
-- `docs/technical/arquitetura.md` (seção 4.1, "Versionamento").
-- -----------------------------------------------------------------------------

-- ORIGIN_SCORES (rules.ts:18-23)
CREATE OR REPLACE FUNCTION public.aue_origin_score_v1(p_origin_type text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_origin_type
    WHEN 'Espontâneo' THEN 100
    WHEN 'Comida'     THEN 90
    WHEN 'Bebida'     THEN 80
    WHEN 'Puxei ar'   THEN 0
    ELSE NULL
  END::numeric;
$$;

-- Média ponderada + clamp (rules.ts:47-53 e rules.ts:66)
CREATE OR REPLACE FUNCTION public.aue_score_v1(
  p_duration numeric,
  p_power numeric,
  p_depth numeric,
  p_texture numeric,
  p_origin_score numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT least(100::numeric, greatest(0::numeric,
      (p_duration     * 0.25)
    + (p_power        * 0.20)
    + (p_depth        * 0.25)
    + (p_texture      * 0.20)
    + (p_origin_score * 0.10)
  ));
$$;

-- Faixas de classificação (rules.ts:55-63)
CREATE OR REPLACE FUNCTION public.aue_classification_v1(p_score numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_score < 20  THEN 'Arroto de Hamster'
    WHEN p_score < 40  THEN 'Tentativa Honesta'
    WHEN p_score < 60  THEN 'Arroto Respeitável'
    WHEN p_score < 75  THEN 'Pedreiro Certificado'
    WHEN p_score < 85  THEN 'Trovão Gastrointestinal'
    WHEN p_score < 95  THEN 'Monstro do Esgoto'
    WHEN p_score < 100 THEN 'Arma Biológica'
    ELSE 'O ARROTO'
  END;
$$;


-- -----------------------------------------------------------------------------
-- 2. CHECK constraints em `resultados`
--
-- Todas criadas NOT VALID DE PROPÓSITO: elas passam a valer para todo
-- INSERT/UPDATE a partir de agora, mas não varrem as linhas já existentes.
-- Isso evita que a migração falhe por causa de dados legados gravados sob as
-- regras antigas (inclusive `origin_type = 'Unknown'`, que o
-- ChallengeView antigo enviava).
--
-- Depois de limpar/normalizar o histórico, Luiz pode rodar manualmente:
--   ALTER TABLE public.resultados VALIDATE CONSTRAINT <nome>;
-- -----------------------------------------------------------------------------

ALTER TABLE public.resultados
  DROP CONSTRAINT IF EXISTS resultados_score_range,
  DROP CONSTRAINT IF EXISTS resultados_partials_range,
  DROP CONSTRAINT IF EXISTS resultados_origin_type_valid,
  DROP CONSTRAINT IF EXISTS resultados_origin_score_coherent,
  DROP CONSTRAINT IF EXISTS resultados_score_coherent,
  DROP CONSTRAINT IF EXISTS resultados_classification_coherent,
  DROP CONSTRAINT IF EXISTS resultados_is_artificial_coherent,
  DROP CONSTRAINT IF EXISTS resultados_player_name_len;

ALTER TABLE public.resultados
  ADD CONSTRAINT resultados_score_range
    CHECK (score >= 0 AND score <= 100) NOT VALID,

  ADD CONSTRAINT resultados_partials_range
    CHECK (
      duration >= 0 AND duration <= 100 AND
      power    >= 0 AND power    <= 100 AND
      depth    >= 0 AND depth    <= 100 AND
      texture  >= 0 AND texture  <= 100 AND
      origin_score >= 0 AND origin_score <= 100
    ) NOT VALID,

  ADD CONSTRAINT resultados_origin_type_valid
    CHECK (origin_type IN ('Espontâneo', 'Comida', 'Bebida', 'Puxei ar')) NOT VALID,

  ADD CONSTRAINT resultados_origin_score_coherent
    CHECK (origin_score = public.aue_origin_score_v1(origin_type)) NOT VALID,

  -- Tolerância de 0.01: a fórmula roda em float64 no cliente e em numeric no
  -- banco. A diferença real é da ordem de 1e-14; 0.01 é folga suficiente e
  -- irrelevante numa escala de 0 a 100.
  ADD CONSTRAINT resultados_score_coherent
    CHECK (
      abs(score - public.aue_score_v1(duration, power, depth, texture, origin_score)) <= 0.01
    ) NOT VALID,

  ADD CONSTRAINT resultados_classification_coherent
    CHECK (classification = public.aue_classification_v1(score)) NOT VALID,

  ADD CONSTRAINT resultados_is_artificial_coherent
    CHECK (is_artificial = (origin_type = 'Puxei ar')) NOT VALID,

  -- `player_name` é texto livre vindo do cliente e aparece no ranking global.
  ADD CONSTRAINT resultados_player_name_len
    CHECK (player_name IS NULL OR char_length(player_name) BETWEEN 1 AND 40) NOT VALID;


-- -----------------------------------------------------------------------------
-- 3. RPC `submit_resultado` — único caminho de gravação de resultados
--
-- Recebe apenas as PARCIAIS e a origem. Recalcula score, classificação,
-- peso de origem e `is_artificial` no servidor. Qualquer `score` que o cliente
-- mande é simplesmente inexistente na assinatura — não há como enviá-lo.
--
-- `user_id` vem de `auth.uid()`, não do payload. Isso fecha o bypass do cap
-- diário em que o cliente escolhia o `user_id` (inclusive `null`) livremente.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_resultado(
  p_duration numeric,
  p_power numeric,
  p_depth numeric,
  p_texture numeric,
  p_origin_type text,
  p_player_name text DEFAULT NULL
)
RETURNS public.resultados
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_origin_score numeric;
  v_score numeric;
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

  v_score := public.aue_score_v1(p_duration, p_power, p_depth, p_texture, v_origin_score);

  INSERT INTO public.resultados (
    score, classification, is_artificial,
    duration, power, depth, texture,
    origin_score, origin_type, player_name, user_id
  ) VALUES (
    v_score,
    public.aue_classification_v1(v_score),
    (p_origin_type = 'Puxei ar'),
    p_duration, p_power, p_depth, p_texture,
    v_origin_score,
    p_origin_type,
    nullif(left(coalesce(p_player_name, ''), 40), ''),
    auth.uid()          -- NUNCA vem do cliente
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_resultado(numeric, numeric, numeric, numeric, text, text)
  TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 4. Revogar o INSERT direto do cliente em `resultados`
--
-- A policy "Enable insert for everyone" (criada em 20260807000001) permitia
-- INSERT via REST desde que `user_id` fosse null ou o próprio. Com a RPC no
-- lugar, ela deixa de existir. Sem nenhuma policy de INSERT, o RLS nega
-- qualquer inserção vinda de anon/authenticated.
--
-- `submit_resultado` continua funcionando porque é SECURITY DEFINER e roda com
-- o dono da função (o role que aplica a migração, normalmente `postgres`), que
-- não é submetido a RLS nesta tabela (não há FORCE ROW LEVEL SECURITY).
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Enable insert for everyone" ON public.resultados;
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON public.resultados;

-- Defesa em profundidade: além do RLS, tirar o privilégio de tabela.
REVOKE INSERT, UPDATE, DELETE ON public.resultados FROM anon, authenticated;


-- -----------------------------------------------------------------------------
-- 5. Cap anti-farming de 5/dia — decisão explícita sobre inserção anônima
--
-- Antes: o cliente escolhia o `user_id` do payload. Bastava mandar
-- `user_id: null` para nunca cair na contagem — e, se quisesse, mandar o
-- `user_id` de outra pessoa (a policy só barrava isso para quem estava
-- logado; anon com `user_id` alheio era barrado pelo `auth.uid()` nulo, mas
-- `user_id: null` passava sempre).
--
-- Agora: `user_id` vem de `auth.uid()` dentro da RPC. Um usuário logado NÃO
-- consegue mais gravar como anônimo para escapar do cap — se ele está logado,
-- a linha sai com o `user_id` dele e entra na contagem de 24h.
--
-- DECISÃO REGISTRADA: submissão anônima (sem sessão) permanece SEM cap.
-- Motivo: não existe identificador confiável de "quem" é o anônimo. IP não
-- chega até o Postgres pelo PostgREST de forma confiável, e qualquer
-- pseudo-id gerado no browser (localStorage, fingerprint) é escolhido pelo
-- próprio atacante — daria uma falsa sensação de limite. Além disso o dano é
-- limitado: linha anônima não gera XP nem nível (o trigger
-- `process_result_xp` só age quando `user_id IS NOT NULL`) e não tem perfil.
--
-- RISCO REMANESCENTE ACEITO: a view `global_ranking` (20260807000009) agrupa
-- por `COALESCE(user_id::text, player_name)`, então um anônimo ainda pode
-- poluir o ranking com um `player_name` arbitrário e parciais fabricadas.
-- Corrigir isso exige restringir o ranking a usuários autenticados, o que é
-- decisão de produto e está fora do escopo desta correção.
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- 6. A2 — vencedor do duelo decidido e persistido no servidor
-- -----------------------------------------------------------------------------

ALTER TABLE public.desafios
  ADD COLUMN IF NOT EXISTS winner text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone;

ALTER TABLE public.desafios
  DROP CONSTRAINT IF EXISTS desafios_winner_valid;

ALTER TABLE public.desafios
  ADD CONSTRAINT desafios_winner_valid
    CHECK (winner IS NULL OR winner IN ('challenger', 'challenged', 'tie'));

COMMENT ON COLUMN public.desafios.winner IS
  'Decidido exclusivamente pelo trigger on_desafio_set_winner. Valor enviado pelo cliente é sempre descartado.';

-- Porte fiel de `compareResults` (rules.ts:79-93): score, depois profundidade,
-- potência e duração como critérios de desempate, nessa ordem.
CREATE OR REPLACE FUNCTION public.aue_compare_results_v1(
  p_challenger_result_id uuid,
  p_challenged_result_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  a public.resultados;
  b public.resultados;
BEGIN
  IF p_challenger_result_id IS NULL OR p_challenged_result_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO a FROM public.resultados WHERE id = p_challenger_result_id;
  SELECT * INTO b FROM public.resultados WHERE id = p_challenged_result_id;

  IF a.id IS NULL OR b.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF a.score > b.score THEN RETURN 'challenger'; END IF;
  IF b.score > a.score THEN RETURN 'challenged'; END IF;

  IF a.depth > b.depth THEN RETURN 'challenger'; END IF;
  IF b.depth > a.depth THEN RETURN 'challenged'; END IF;

  IF a.power > b.power THEN RETURN 'challenger'; END IF;
  IF b.power > a.power THEN RETURN 'challenged'; END IF;

  IF a.duration > b.duration THEN RETURN 'challenger'; END IF;
  IF b.duration > a.duration THEN RETURN 'challenged'; END IF;

  RETURN 'tie';  -- Empate Técnico do Gás
END;
$$;

-- Backfill dos duelos que já estavam completos antes desta migração.
-- Feito ANTES de criar o trigger, senão o próprio trigger reverteria o valor
-- (ele preserva OLD.winner quando o desafio já estava respondido).
UPDATE public.desafios d
SET winner = public.aue_compare_results_v1(d.challenger_result_id, d.challenged_result_id),
    resolved_at = coalesce(d.resolved_at, d.created_at)
WHERE d.challenged_result_id IS NOT NULL
  AND d.winner IS NULL;

CREATE OR REPLACE FUNCTION public.set_desafio_winner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Um desafio nasce sempre sem vencedor, independente do que o cliente mande.
    NEW.winner := NULL;
    NEW.resolved_at := NULL;
    RETURN NEW;
  END IF;

  IF OLD.challenged_result_id IS NULL AND NEW.challenged_result_id IS NOT NULL THEN
    -- Usa OLD.challenger_result_id de propósito: o desafiante é imutável e o
    -- cliente não pode trocá-lo no mesmo UPDATE para forjar a comparação.
    NEW.winner := public.aue_compare_results_v1(
      OLD.challenger_result_id,
      NEW.challenged_result_id
    );
    NEW.resolved_at := timezone('utc'::text, now());
  ELSE
    -- Qualquer outro UPDATE não pode mexer no veredito.
    NEW.winner := OLD.winner;
    NEW.resolved_at := OLD.resolved_at;
  END IF;

  RETURN NEW;
END;
$$;

-- Nome escolhido para ordenar ANTES de `on_desafio_update`
-- (os triggers BEFORE disparam em ordem alfabética: 's' < 'u').
-- A lógica acima é, ainda assim, independente de ordem: ela só lê campos de
-- OLD, que `protect_desafio_fields` não altera.
DROP TRIGGER IF EXISTS on_desafio_set_winner ON public.desafios;
CREATE TRIGGER on_desafio_set_winner
  BEFORE INSERT OR UPDATE ON public.desafios
  FOR EACH ROW EXECUTE PROCEDURE public.set_desafio_winner();
