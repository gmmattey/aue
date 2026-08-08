-- =============================================================================
-- A ordem dos turnos da disputa presencial passa a ser a ordem que a mesa
-- combinou — em vez de aleatória.
--
-- O DEFEITO, encontrado ao aplicar as migrações em staging (2026-08-08):
-- `criar_batalha_presencial(['Carol','Bruno','Rafa'], ...)` devolveu os
-- participantes na ordem **Carol → Rafa → Bruno**. O mesmo chamado, no outro
-- banco, tinha devolvido a ordem certa. Não era coincidência dos dois lados: a
-- ordem simplesmente não estava definida.
--
-- A CAUSA. A 20260807000031 insere os participantes com `unnest ... WITH
-- ORDINALITY`, o que de fato preserva a ordem NA INSERÇÃO — e o cabeçalho dela
-- afirma isso. Só que `obter_batalha` lê de volta com
-- `ORDER BY pb.joined_at, pb.id`, e `joined_at` tem default
-- `timezone('utc', now())`.
--
-- `now()` no Postgres é o instante de INÍCIO DA TRANSAÇÃO, não do comando. Como
-- os participantes de uma disputa nascem todos na mesma transação, as três
-- linhas ficam com `joined_at` IDÊNTICO. O critério de desempate vira `id`, que
-- é `gen_random_uuid()`. Ou seja: a ordem dos turnos era o resultado de um
-- sorteio.
--
-- POR QUE ISSO IMPORTA MAIS DO QUE PARECE. A disputa presencial é o telefone
-- passando de mão em mão numa mesa. "Vez de Carol" precisa bater com o que as
-- pessoas combinaram, e quem cadastrou os nomes cadastrou na ordem em que
-- alguém vai arrotar. Uma ordem sorteada não gera erro nenhum — só confusão na
-- mesa, do tipo que ninguém atribui a um defeito de software.
--
-- A CORREÇÃO. Ordem explícita numa coluna, gravada na criação e lida de volta
-- por ela. Nunca inferida de timestamp: qualquer coluna de tempo preenchida na
-- mesma transação tem esse mesmo problema.
--
-- ONDE MAIS ESTE PADRÃO APARECE, e por que NÃO precisou de conserto:
-- `rodadas_batalha` também é lida por ordem, mas por `position`, que é um
-- inteiro calculado explicitamente (`max(position) + 1`). Ela sempre esteve
-- certa — é justamente o modelo que esta migração copia para os participantes.
--
-- VERIFICAR DEPOIS DE APLICAR:
--   rpc criar_batalha_presencial(ARRAY['Carol','Bruno','Rafa'], 1, null)
--   -> o array `participantes` DEVE voltar exatamente nessa ordem, sempre.
--      Repita algumas vezes: antes desta migração, a ordem variava.
--
-- VALIDADO: aplicada num Postgres 17.6 real (staging do Auê, 2026-08-08).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. A COLUNA DE ORDEM
-- -----------------------------------------------------------------------------

ALTER TABLE public.participantes_batalha
  ADD COLUMN IF NOT EXISTS turn_order integer;

COMMENT ON COLUMN public.participantes_batalha.turn_order IS
  'Posição na ordem de turnos, 1..5, na ordem em que os nomes foram digitados. '
  'NÃO derive ordem de joined_at: now() é o início da transação e todos os '
  'participantes de uma disputa nascem com o mesmo valor.';

/*
  Backfill para disputas que já existam, usando o critério antigo. Não recupera
  a ordem original (ela nunca foi gravada), mas congela a que estava valendo em
  vez de deixar a leitura continuar sorteando a cada chamada.
*/
WITH ordenados AS (
  SELECT id,
         row_number() OVER (PARTITION BY battle_id ORDER BY joined_at, id) AS ordem
    FROM public.participantes_batalha
   WHERE turn_order IS NULL
)
UPDATE public.participantes_batalha pb
   SET turn_order = o.ordem
  FROM ordenados o
 WHERE o.id = pb.id;

-- Duas pessoas não podem disputar a mesma vez.
CREATE UNIQUE INDEX IF NOT EXISTS participantes_uma_vez_por_ordem
  ON public.participantes_batalha (battle_id, turn_order);


-- -----------------------------------------------------------------------------
-- 2. GRAVAR A ORDEM NA CRIAÇÃO
--
-- Mesma assinatura da 20260807000031 — `CREATE OR REPLACE`, sem DROP.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.criar_batalha_presencial(
  p_apelidos text[],
  p_rounds_total integer DEFAULT 1,
  p_venue_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c_maximo constant integer := 5;
  v_uid uuid := auth.uid();
  v_codigo text;
  v_batalha uuid;
  v_limpos text[];
  i integer;
BEGIN
  IF p_apelidos IS NULL OR array_length(p_apelidos, 1) IS NULL THEN
    RAISE EXCEPTION 'Informe pelo menos um participante.' USING ERRCODE = '22023';
  END IF;

  IF array_length(p_apelidos, 1) > c_maximo THEN
    RAISE EXCEPTION 'A disputa presencial aceita no máximo % participantes.', c_maximo
      USING ERRCODE = '22023';
  END IF;

  IF p_rounds_total IS NULL OR p_rounds_total NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'A disputa tem de 1 a 3 rounds.' USING ERRCODE = '22023';
  END IF;

  SELECT array_agg(DISTINCT btrim(a)) INTO v_limpos
    FROM unnest(p_apelidos) AS a
   WHERE btrim(a) <> '';

  IF v_limpos IS NULL OR array_length(v_limpos, 1) <> array_length(p_apelidos, 1) THEN
    RAISE EXCEPTION 'Cada participante precisa de um nome, e eles não podem se repetir.'
      USING ERRCODE = '22023';
  END IF;

  FOR i IN 1..5 LOOP
    v_codigo := public.aue_codigo_de_batalha_v1();

    INSERT INTO public.batalhas (access_code, battle_type, owner_id, rounds_total, venue_type)
    VALUES (v_codigo, 'presencial', v_uid, p_rounds_total, p_venue_type)
    ON CONFLICT (access_code) DO NOTHING
    RETURNING id INTO v_batalha;

    EXIT WHEN v_batalha IS NOT NULL;
  END LOOP;

  IF v_batalha IS NULL THEN
    RAISE EXCEPTION 'Não foi possível gerar um código de batalha.' USING ERRCODE = '55000';
  END IF;

  /*
    A ordinalidade do array vira `turn_order`, gravada.

    O laço anterior fazia `unnest ... WITH ORDINALITY ORDER BY ord` e confiava
    que a ordem de INSERÇÃO seria a ordem de LEITURA. Não é: sem ORDER BY
    explícito na leitura, o Postgres não promete ordem nenhuma, e o ORDER BY que
    existia (`joined_at, id`) empatava em `joined_at` e desempatava por uuid.
  */
  INSERT INTO public.participantes_batalha (battle_id, apelido, turn_order)
  SELECT v_batalha, btrim(t.a), t.ord
    FROM unnest(p_apelidos) WITH ORDINALITY AS t(a, ord);

  RETURN public.obter_batalha(v_codigo);
END;
$$;

COMMENT ON FUNCTION public.criar_batalha_presencial(text[], integer, text) IS
  'Abre uma disputa presencial com até 5 participantes e de 1 a 3 rounds. '
  'A ordem do array vira turn_order e é a ordem dos turnos.';

GRANT EXECUTE ON FUNCTION public.criar_batalha_presencial(text[], integer, text)
  TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 3. LER PELA ORDEM GRAVADA
--
-- Só a cláusula de ordenação dos participantes muda em relação à
-- 20260807000031. O resto do corpo é idêntico.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.obter_batalha(p_access_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_b public.batalhas;
  v_rodadas jsonb;
  v_participantes jsonb;
  v_lider jsonb;
BEGIN
  SELECT * INTO v_b
    FROM public.batalhas b
   WHERE b.access_code = p_access_code
     AND b.expires_at > timezone('utc', now());

  IF v_b.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'rodada_id',      rb.id,
               'position',       rb.position,
               'round_number',   rb.round_number,
               'participant_id', rb.participant_id,
               'result_id',      r.id,
               'score',          r.score,
               'classification', r.classification,
               'origin_type',    r.origin_type,
               'origin_subtype', r.origin_subtype,
               'is_artificial',  r.is_artificial,
               'is_hidden',      r.is_hidden,
               'audio_path',     CASE WHEN r.is_hidden THEN NULL ELSE r.audio_path END,
               'apelido',        COALESCE(pb.apelido, p.apelido, r.player_name, 'Anônimo'),
               'user_id',        rb.user_id,
               'created_at',     rb.created_at
             )
             ORDER BY rb.position
           ),
           '[]'::jsonb
         )
    INTO v_rodadas
    FROM public.rodadas_batalha rb
    JOIN public.resultados r ON r.id = rb.result_id
    LEFT JOIN public.profiles p ON p.id = rb.user_id
    LEFT JOIN public.participantes_batalha pb ON pb.id = rb.participant_id
   WHERE rb.battle_id = v_b.id;

  /*
    ORDEM DOS TURNOS: `turn_order`, e nada mais.

    Era `ORDER BY pb.joined_at, pb.id`. Todos os participantes nascem na mesma
    transação, então `joined_at` empata para todos e o desempate caía no uuid —
    a mesa recebia uma ordem sorteada. `NULLS LAST` cobre linhas anteriores ao
    backfill.
  */
  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object('id', pb.id, 'apelido', pb.apelido, 'turn_order', pb.turn_order)
             ORDER BY pb.turn_order NULLS LAST, pb.joined_at, pb.id
           ),
           '[]'::jsonb
         )
    INTO v_participantes
    FROM public.participantes_batalha pb
   WHERE pb.battle_id = v_b.id;

  SELECT jsonb_build_object(
           'apelido',   COALESCE(pb.apelido, p.apelido, r.player_name, 'Anônimo'),
           'score',     r.score,
           'result_id', r.id
         )
    INTO v_lider
    FROM public.rodadas_batalha rb
    JOIN public.resultados r ON r.id = rb.result_id
    LEFT JOIN public.profiles p ON p.id = rb.user_id
    LEFT JOIN public.participantes_batalha pb ON pb.id = rb.participant_id
   WHERE rb.battle_id = v_b.id
     AND NOT r.is_hidden
   ORDER BY r.score DESC, r.depth DESC, r.power DESC, r.duration DESC
   LIMIT 1;

  RETURN jsonb_build_object(
    'access_code',   v_b.access_code,
    'battle_type',   v_b.battle_type,
    'venue_type',    v_b.venue_type,
    'rounds_total',  v_b.rounds_total,
    'created_at',    v_b.created_at,
    'expires_at',    v_b.expires_at,
    'finished_at',   v_b.finished_at,
    'rodadas',       v_rodadas,
    'participantes', v_participantes,
    'lider',         v_lider
  );
END;
$$;

COMMENT ON FUNCTION public.obter_batalha(text) IS
  'Devolve a batalha do código informado (rodadas por position, participantes '
  'por turn_order, e o líder), ou NULL se não existir OU tiver expirado.';

GRANT EXECUTE ON FUNCTION public.obter_batalha(text) TO anon, authenticated;
