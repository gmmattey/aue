-- =============================================================================
-- Disputa presencial: várias pessoas, um aparelho só.
--
-- O QUE O PRODUTO PEDE (decisão de Luiz, segunda fatia do MVP): no churrasco,
-- no bar, no escritório — até 5 participantes com nome/apelido, cada um arrota
-- na sua vez e recebe a nota, até 3 rounds definidos no início, ranking ao fim
-- de cada round, e um pódio compartilhável no fim. Dá para dizer onde a disputa
-- aconteceu.
--
-- O QUE ELA REAPROVEITA: tudo. `batalhas` já nasceu (20260807000030) com
-- `battle_type`, `venue_type`, `rounds_total` e `rodadas_batalha.round_number`
-- exatamente para isto. Esta migração acrescenta UMA tabela e UMA coluna — não
-- há ALTER destrutivo, nem tabela reescrita, nem RPC com assinatura trocada.
--
-- A PEÇA QUE FALTAVA, e por que ela é necessária: na disputa remota cada
-- participante tem o próprio aparelho, logo o próprio `auth.uid()`, e
-- `rodadas_batalha.user_id` basta para saber quem é quem. No presencial são
-- cinco pessoas gravando pelo MESMO aparelho: as cinco compartilham um único
-- `auth.uid()`. Sem uma tabela de participantes, as cinco viram a mesma pessoa
-- e o ranking do round é uma lista de "Arrotador a1b2c3" contra ele mesmo.
--
-- ONDE MORA O ESTADO: no banco, não no aparelho. Isso é consequência direta do
-- requisito de guardar os áudios para o acervo — áudio só existe atrelado a um
-- `resultados.id` (o caminho no bucket é derivado dele, ver 20260807000027).
-- Guardar a disputa em memória e sincronizar depois exigiria um segundo
-- caminho de gravação; assim, cada turno é um `submit_resultado` + upload
-- normais, iguaizinhos aos da fatia 1.
--
-- MESMO REGIME DE ACESSO da 20260807000030, e pelo mesmo motivo: RLS ligada,
-- NENHUMA policy, tudo por RPC. Leia a seção 2 daquela migração antes de achar
-- que falta alguma coisa aqui.
--
-- VERIFICAR DEPOIS DE APLICAR:
--   1. Com a chave ANÔNIMA: GET /rest/v1/participantes_batalha?select=*
--      -> DEVE vir vazio ou falhar.
--   2. rpc criar_batalha_presencial com 6 apelidos -> DEVE recusar (5 é o teto).
--   3. rpc criar_batalha_presencial com dois apelidos iguais -> DEVE recusar.
--   4. rpc responder_batalha(codigo, resultado, participante) -> agora aceita o
--      terceiro argumento em vez de levantar 0A000.
--
-- VALIDADO: aplicada com sucesso num Postgres 17.6 real (projeto Supabase do
-- Auê, 2026-08-08), junto com as 31 anteriores, na ordem, sem erro. O
-- comportamento foi exercitado ponta a ponta por RPC com sessões anônimas
-- reais — ver o resumo no docs/lancamento.md.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. PARTICIPANTES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.participantes_batalha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  battle_id uuid NOT NULL
    REFERENCES public.batalhas(id) ON DELETE CASCADE,

  /*
    `apelido` em português é a EXCEÇÃO CORRETA da nomenclatura.md (seção 2): a
    regra é coluna em inglês, salvo quando a coluna repete um campo que já
    existe em português em outra tabela. `profiles.apelido` já existe e
    significa a mesma coisa. Ter `profiles.apelido` e
    `participantes_batalha.nickname` lado a lado seria pior que a inconsistência
    de idioma.
  */
  apelido text NOT NULL,

  /*
    Quase sempre NULL, e isso é o normal aqui: o convidado do churrasco não tem
    conta nem aparelho no jogo — ele só falou o nome e arrotou no telefone de
    outra pessoa. A coluna existe para o caso de o participante ser o próprio
    dono do aparelho, e para o dia em que a disputa presencial puder ser
    continuada por quem estava lá.
  */
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT participantes_batalha_apelido_valido
    CHECK (char_length(btrim(apelido)) BETWEEN 1 AND 40)
);

COMMENT ON TABLE public.participantes_batalha IS
  'Quem está disputando uma batalha presencial. Existe porque no presencial '
  'várias pessoas compartilham o mesmo auth.uid() — o do aparelho que está '
  'sendo passado de mão em mão.';

/*
  Dois "Carlos" na mesma disputa tornam o ranking indecifrável — a lista final
  teria duas linhas iguais com notas diferentes e ninguém saberia qual é quem.
  `lower(btrim(...))` porque "carlos" e "Carlos " são a mesma pessoa na mesa.
*/
CREATE UNIQUE INDEX IF NOT EXISTS participantes_um_apelido_por_batalha
  ON public.participantes_batalha (battle_id, lower(btrim(apelido)));

CREATE INDEX IF NOT EXISTS participantes_por_batalha
  ON public.participantes_batalha (battle_id);

ALTER TABLE public.participantes_batalha ENABLE ROW LEVEL SECURITY;
-- NENHUMA POLICY, igual às tabelas da 20260807000030. É deliberado: o acesso é
-- pelo código do link, e código não se expressa em policy.
REVOKE ALL ON public.participantes_batalha FROM anon, authenticated;


-- -----------------------------------------------------------------------------
-- 2. A LIGAÇÃO ENTRE A GRAVAÇÃO E QUEM GRAVOU
-- -----------------------------------------------------------------------------

ALTER TABLE public.rodadas_batalha
  ADD COLUMN IF NOT EXISTS participant_id uuid
    REFERENCES public.participantes_batalha(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.rodadas_batalha.participant_id IS
  'Quem gravou, na disputa presencial. NULL na disputa remota, onde user_id já '
  'identifica a pessoa.';

/*
  Uma pessoa grava uma vez por round. Sem isto, tocar duas vezes em "Arrotar" na
  vez do Bruno põe duas notas dele no mesmo round e o ranking passa a somar
  gente que não existe.

  Parcial (`WHERE participant_id IS NOT NULL`) para não afetar a disputa remota,
  onde `participant_id` é sempre nulo e o loop é justamente ilimitado.
*/
CREATE UNIQUE INDEX IF NOT EXISTS rodadas_uma_por_participante_por_round
  ON public.rodadas_batalha (battle_id, participant_id, round_number)
  WHERE participant_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 3. CRIAR A DISPUTA
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
  v_apelido text;
  v_limpos text[];
  i integer;
BEGIN
  /*
    O teto de 5 participantes é REGRA DE PRODUTO e vive aqui, não num CHECK:
    CHECK olha uma linha por vez e não sabe contar linhas irmãs. Tentar
    expressá-lo no schema exigiria um trigger de contagem — mais peça, mesmo
    efeito, e a mensagem de erro seria pior.
  */
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

  -- Normaliza antes de checar repetido: "Carlos" e "carlos " são a mesma
  -- pessoa na mesa, e o índice único aplica a mesma regra.
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
    A ORDEM DOS PARTICIPANTES É A ORDEM DOS TURNOS. `unnest ... WITH ORDINALITY`
    preserva a ordem do array; um `unnest` simples não garante nada, e a mesa
    combinou quem começa.
  */
  FOR v_apelido IN
    SELECT a FROM unnest(p_apelidos) WITH ORDINALITY AS t(a, ord) ORDER BY t.ord
  LOOP
    INSERT INTO public.participantes_batalha (battle_id, apelido)
    VALUES (v_batalha, btrim(v_apelido));
  END LOOP;

  RETURN public.obter_batalha(v_codigo);
END;
$$;

COMMENT ON FUNCTION public.criar_batalha_presencial(text[], integer, text) IS
  'Abre uma disputa presencial com até 5 participantes e de 1 a 3 rounds. '
  'A ordem do array é a ordem dos turnos.';

GRANT EXECUTE ON FUNCTION public.criar_batalha_presencial(text[], integer, text)
  TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 4. `responder_batalha` PASSA A ACEITAR O PARTICIPANTE
--
-- MESMA ASSINATURA da 20260807000030, de propósito. Lá o terceiro parâmetro já
-- existia e levantava 0A000 justamente para que esta migração fosse um
-- `CREATE OR REPLACE` e não um `DROP FUNCTION` — derrubar uma RPC que o cliente
-- publicado chama abre uma janela em que o app está no ar chamando algo que não
-- existe. A 20260807000023 (linha 279) documenta esse custo em detalhe.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.responder_batalha(
  p_access_code text,
  p_result_id uuid,
  p_participant_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_b public.batalhas;
  v_dono uuid;
  v_pos integer;
  v_round integer := 1;
BEGIN
  IF NOT public.can_use_as_challenger(p_result_id) THEN
    RAISE EXCEPTION 'Este resultado não é seu.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_b
    FROM public.batalhas b
   WHERE b.access_code = p_access_code
     FOR UPDATE;

  IF v_b.id IS NULL OR v_b.expires_at <= timezone('utc', now()) THEN
    RAISE EXCEPTION 'Esta batalha não está mais disponível.'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_participant_id IS NOT NULL THEN
    -- O participante tem de ser DESTA batalha. Sem esta checagem, o id de um
    -- participante de outra disputa entraria aqui e o ranking mostraria alguém
    -- que nunca esteve na mesa.
    PERFORM 1 FROM public.participantes_batalha pb
      WHERE pb.id = p_participant_id AND pb.battle_id = v_b.id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Este participante não está nesta disputa.'
        USING ERRCODE = '42501';
    END IF;

    /*
      O round é DERIVADO, não recebido do cliente.

      Cada participante grava uma vez por round, então o round de quem está
      gravando agora é "quantas vezes ele já gravou, mais um". Deixar o cliente
      mandar o número permitiria refazer um round já fechado — e o ranking do
      round 1 mudaria depois de anunciado.
    */
    SELECT COALESCE(count(*), 0) + 1 INTO v_round
      FROM public.rodadas_batalha rb
     WHERE rb.battle_id = v_b.id
       AND rb.participant_id = p_participant_id;

    IF v_round > COALESCE(v_b.rounds_total, 1) THEN
      RAISE EXCEPTION 'Esta disputa já cumpriu todos os rounds.'
        USING ERRCODE = '54000';
    END IF;
  END IF;

  SELECT COALESCE(max(rb.position), 0) + 1 INTO v_pos
    FROM public.rodadas_batalha rb
   WHERE rb.battle_id = v_b.id;

  IF v_pos > 50 THEN
    RAISE EXCEPTION 'Esta batalha já chegou ao limite de rodadas.'
      USING ERRCODE = '54000';
  END IF;

  SELECT r.user_id INTO v_dono FROM public.resultados r WHERE r.id = p_result_id;

  INSERT INTO public.rodadas_batalha
    (battle_id, result_id, user_id, position, round_number, participant_id)
  VALUES
    (v_b.id, p_result_id, v_dono, v_pos, v_round, p_participant_id);

  RETURN public.obter_batalha(p_access_code);
END;
$$;

COMMENT ON FUNCTION public.responder_batalha(text, uuid, uuid) IS
  'Acrescenta uma gravação ao fim da batalha e devolve o estado atualizado. '
  'Com p_participant_id, é um turno de disputa presencial e o round é derivado '
  'do que aquele participante já gravou.';

GRANT EXECUTE ON FUNCTION public.responder_batalha(text, uuid, uuid) TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 5. `obter_batalha` PASSA A DEVOLVER OS PARTICIPANTES
--
-- Também `CREATE OR REPLACE` com a mesma assinatura. A parte remota do corpo é
-- idêntica à da 20260807000030; o que entra é o array `participantes` (vazio
-- na disputa remota) e o `participant_id` em cada rodada.
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
               -- Na presencial o nome vem do participante; na remota, do perfil.
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

  -- Ordem de entrada = ordem dos turnos.
  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object('id', pb.id, 'apelido', pb.apelido)
             ORDER BY pb.joined_at, pb.id
           ),
           '[]'::jsonb
         )
    INTO v_participantes
    FROM public.participantes_batalha pb
   WHERE pb.battle_id = v_b.id;

  -- Mesmos critérios de `aue_compare_results_v1` (20260807000011, linhas
  -- 325-337). Se aquela função mudar, esta cláusula muda junto.
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
  'Devolve a batalha do código informado (rodadas, participantes e líder), ou '
  'NULL se não existir OU tiver expirado — os dois casos são indistinguíveis '
  'de propósito.';

GRANT EXECUTE ON FUNCTION public.obter_batalha(text) TO anon, authenticated;
