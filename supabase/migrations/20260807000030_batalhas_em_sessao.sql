-- =============================================================================
-- Batalhas: o duelo deixa de ser um turno único e vira uma sessão em loop.
--
-- O QUE O PRODUTO PEDE (decisão de Luiz, MVP): eu gravo, gero um link, mando
-- para um amigo. Ele abre, OUVE o meu arroto com a nota, grava a revanche e me
-- manda de volta. Fica em loop. Os arrotos ficam em sequência, estilo feed. A
-- batalha é acessível só para quem tem o link, e mais amigos podem entrar —
-- desde que pelo convite. A sessão vale 7 dias.
--
-- POR QUE TABELA NOVA, E NÃO EVOLUIR `desafios`. Três motivos, em ordem de
-- peso:
--
--   1. `desafios` tem dois triggers cujo contrato é literalmente "turno único,
--      veredito congelado": `set_desafio_winner()` e `protect_desafio_fields()`
--      (20260807000010 / 000011). A policy de UPDATE ainda por cima é
--      `USING (challenged_result_id IS NULL)` (20260807000023). Transformar
--      aquilo em N rodadas exigiria redefinir as duas funções — que é o padrão
--      que fez o acúmulo de XP se perder DUAS vezes neste mesmo projeto.
--
--   2. Links `/d/CODIGO` podem estar circulando. `ChallengeView` continua
--      funcionando sem uma linha alterada, e esta migração não toca em
--      `desafios`.
--
--   3. `desafios` tem SELECT `USING (true)` para `anon` (20260807000010). Ou
--      seja: hoje qualquer pessoa lista TODOS os duelos com um único GET em
--      /rest/v1/desafios. Herdar aquela tabela seria herdar esse buraco. A
--      tabela nova nasce sem ele — ver a seção de RLS abaixo, que é a parte
--      mais importante deste arquivo.
--
-- O QUE ESTA MIGRAÇÃO NÃO FAZ: nada de disputa presencial. Ela deixa o espaço
-- pronto (`battle_type`, `venue_type`, `rounds_total`, `round_number`) para a
-- 20260807000031 acrescentar só `participantes_batalha`, sem ALTER destrutivo
-- nem mudança de assinatura de RPC.
--
-- DEPENDE DE: 20260807000029 (login anônimo). Sem sessão, `auth.uid()` é NULL
-- e `can_use_as_challenger` cai no ramo da janela de 60 minutos — funciona,
-- mas o áudio não sobe e a batalha fica muda.
--
-- VERIFICAR DEPOIS DE APLICAR, COM A CHAVE ANÔNIMA (não a service role):
--   1. GET /rest/v1/batalhas?select=*         -> DEVE vir vazio ou falhar.
--   2. GET /rest/v1/rodadas_batalha?select=*  -> idem.
--      Se QUALQUER um dos dois listar linha, a RLS foi "consertada" errado —
--      leia a seção 2 antes de mexer.
--   3. rpc obter_batalha('<código válido>')   -> devolve o feed da batalha.
--   4. rpc obter_batalha('NAOEXISTE1')        -> devolve NULL.
--   5. update public.batalhas set expires_at = timezone('utc', now()) - interval '1 day';
--      repita (3) -> DEVE virar NULL. É assim que o prazo de 7 dias é aplicado.
--
-- VALIDADO: aplicada com sucesso num Postgres 17.6 real (projeto Supabase do
-- Auê, 2026-08-08), junto com as 31 anteriores, na ordem, sem erro. O
-- comportamento foi exercitado ponta a ponta por RPC com sessões anônimas
-- reais — ver o resumo no docs/lancamento.md.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. TABELAS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.batalhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  /*
    O código do link, e a ÚNICA credencial da batalha.

    Separado do `id` de propósito — `desafios` usou o código como chave
    primária e por isso não há como trocar um link vazado (no grupo da firma,
    num print) sem perder as linhas que apontam para ele. Aqui as FKs apontam
    para `id`; trocar o código é um UPDATE numa coluna.
  */
  access_code text NOT NULL,

  /*
    'remota'     — o duelo por link, em loop aberto (esta migração).
    'presencial' — a disputa no mesmo aparelho (20260807000031).

    Já está aqui para que a segunda fatia não precise de ALTER numa tabela que
    a essa altura já terá dado em produção.
  */
  battle_type text NOT NULL DEFAULT 'remota',

  -- FK para `public.profiles`, NUNCA `auth.users`: é o que permite
  -- `select('*, profiles(apelido)')`. Ver nomenclatura.md seção 3.
  -- ON DELETE SET NULL: perder o criador não pode apagar a batalha dos outros.
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  /*
    Onde a disputa aconteceu. Só a presencial preenche.

    Fica em `batalhas` e NÃO em `resultados` por três razões: é propriedade do
    evento e não da gravação; em `resultados` seria uma coluna NULL em 99% das
    linhas; e alimentá-la de lá exigiria mais um parâmetro em
    `submit_resultado` — a 20260807000023 (linha 279) já documenta que isso
    obriga um DROP FUNCTION da RPC mais crítica do sistema.
  */
  venue_type text,

  -- Quantos rounds a disputa presencial terá. NULL = loop aberto (remota).
  rounds_total integer,

  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  /*
    Os 7 dias. Ver a seção 5: quem aplica o prazo são as RPCs, não um job.
  */
  expires_at timestamptz NOT NULL
    DEFAULT timezone('utc', now()) + interval '7 days',

  finished_at timestamptz,

  CONSTRAINT batalhas_access_code_formato
    CHECK (char_length(access_code) = 10),
  CONSTRAINT batalhas_battle_type_valido
    CHECK (battle_type IN ('remota', 'presencial')),
  CONSTRAINT batalhas_venue_type_valido
    CHECK (venue_type IS NULL
           OR venue_type IN ('casa', 'publico', 'escritorio', 'churrasco', 'outro')),
  CONSTRAINT batalhas_rounds_total_valido
    CHECK (rounds_total IS NULL OR rounds_total BETWEEN 1 AND 3)
);

COMMENT ON TABLE public.batalhas IS
  'Sessão de duelo. O access_code é a única credencial: NÃO existe policy de '
  'SELECT nesta tabela, todo acesso passa pelas RPCs criar_batalha / '
  'obter_batalha / responder_batalha.';


CREATE TABLE IF NOT EXISTS public.rodadas_batalha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  battle_id uuid NOT NULL
    REFERENCES public.batalhas(id) ON DELETE CASCADE,

  -- CASCADE: apagar o resultado apaga a rodada. Uma rodada sem resultado não
  -- tem nota, nem áudio, nem nada para mostrar — seria uma linha fantasma no
  -- feed da batalha.
  result_id uuid NOT NULL
    REFERENCES public.resultados(id) ON DELETE CASCADE,

  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Ordem no feed da batalha, 1..N. É o que faz "ficar em sequência".
  position integer NOT NULL,

  -- Só a presencial usa > 1. Na remota é sempre 1: o loop é aberto e não tem
  -- rounds fechados.
  round_number integer NOT NULL DEFAULT 1,

  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT rodadas_batalha_position_positiva CHECK (position >= 1),
  CONSTRAINT rodadas_batalha_round_number_valido CHECK (round_number BETWEEN 1 AND 3)
);

COMMENT ON TABLE public.rodadas_batalha IS
  'Uma gravação dentro de uma batalha, na ordem em que entrou. Mesmo regime de '
  'acesso de public.batalhas: RLS ligada, nenhuma policy, tudo por RPC.';


-- Índices únicos nomeiam a REGRA que impõem, não as colunas (nomenclatura.md
-- seção 5).
CREATE UNIQUE INDEX IF NOT EXISTS batalhas_um_codigo_por_link
  ON public.batalhas (access_code);

CREATE UNIQUE INDEX IF NOT EXISTS rodadas_uma_por_posicao_na_batalha
  ON public.rodadas_batalha (battle_id, position);

-- O mesmo arroto não entra duas vezes na mesma batalha. Sem isto, um duplo
-- clique em "mandar de volta" põe a mesma gravação em duas posições do feed.
CREATE UNIQUE INDEX IF NOT EXISTS rodadas_um_resultado_por_batalha
  ON public.rodadas_batalha (result_id);

CREATE INDEX IF NOT EXISTS batalhas_por_expiracao
  ON public.batalhas (expires_at);

CREATE INDEX IF NOT EXISTS rodadas_por_batalha
  ON public.rodadas_batalha (battle_id);


-- -----------------------------------------------------------------------------
-- 2. RLS — LIGADA, E DE PROPÓSITO SEM NENHUMA POLICY
--
-- LEIA ISTO ANTES DE "CONSERTAR" ALGUMA COISA AQUI.
--
-- A nomenclatura.md (seção 7.5) avisa: "RLS ligada sem policy nenhuma bloqueia
-- tudo em silêncio". Neste caso específico isso é EXATAMENTE O OBJETIVO, e é a
-- decisão de segurança central desta migração.
--
-- O raciocínio: a credencial da batalha é o código do link. Uma policy de
-- SELECT não consegue exigir que o cliente PROVE conhecer o código — o
-- PostgREST deixa o cliente escolher o filtro, então
-- `USING (true)` com um `?access_code=eq.X` do lado do cliente é a mesma coisa
-- que não ter proteção nenhuma: basta pedir sem filtro para listar tudo. É
-- literalmente o que acontece hoje em `desafios`.
--
-- Com zero policy, `anon` e `authenticated` não conseguem ler nem escrever
-- NADA por PostgREST. O único caminho é uma RPC `SECURITY DEFINER` que recebe
-- o código como ARGUMENTO — aí sim conhecer o código é pré-requisito, e não
-- existe requisição que devolva a lista de batalhas.
--
-- Consequências de acrescentar uma policy aqui, para quem estiver tentado:
--   - `USING (true)` em `batalhas` -> qualquer pessoa baixa todos os códigos de
--     acesso do sistema, e com eles todas as batalhas privadas do produto.
--   - `USING (true)` em `rodadas_batalha` -> qualquer pessoa baixa todos os
--     `audio_path`, e o Storage entrega o áudio de qualquer resultado não
--     escondido.
--
-- Se algum recurso novo parecer precisar de policy, ele precisa de RPC.
-- -----------------------------------------------------------------------------

ALTER TABLE public.batalhas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rodadas_batalha ENABLE ROW LEVEL SECURITY;

-- Cinto e suspensório: RLS já barra, mas revogar o GRANT deixa a intenção
-- explícita no catálogo, e não só no ausência de policy.
REVOKE ALL ON public.batalhas        FROM anon, authenticated;
REVOKE ALL ON public.rodadas_batalha FROM anon, authenticated;


-- -----------------------------------------------------------------------------
-- 3. O CÓDIGO DO LINK — 10 caracteres, sorteados no servidor
--
-- POR QUE 10 E NÃO 6, como em `desafios`.
--
-- O alfabeto tem 32 símbolos (sem I, O, 0 e 1, porque gente lê o código em voz
-- alta). Com 6 caracteres o espaço é 32^6 ~= 1,07e9, ou seja ~2^30. Com dez mil
-- batalhas vivas, uma tentativa às cegas acerta uma delas com probabilidade
-- ~1/1e5 — cerca de cem mil requisições para invadir a batalha de um
-- desconhecido. Isso é questão de minutos de script, e NÃO há rate limiter na
-- frente do PostgREST. Aceitável quando o duelo era de turno único e efêmero;
-- inaceitável agora que o link é a única credencial de uma sessão que dura 7
-- dias e guarda a voz das pessoas.
--
-- Com 10 caracteres o espaço é 32^10 ~= 1,13e15, ou ~2^50. Com um milhão de
-- batalhas vivas seriam ~1e9 tentativas por acerto. Inviável online, sem
-- precisar de limitador. O link fica `aue.vercel.app/b/K7M3PQ9XTR` — ainda cabe
-- numa mensagem e ainda dá para ditar.
--
-- POR QUE NO SERVIDOR E NÃO NO CLIENTE, como em `desafios`. Lá o cliente sorteia
-- e tenta de novo em caso de colisão 23505 (supabase.ts). Aqui o sorteio é
-- interno à RPC: um cliente não pode ESCOLHER o próprio código, o laço de
-- colisão não viaja pela rede, e o código nunca existe fora do servidor antes
-- de ser gravado.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.aue_codigo_de_batalha_v1()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Mesmo alfabeto de ALFABETO_DESAFIO em src/db/supabase.ts, e pelo mesmo
  -- motivo: I/O/0/1 se confundem quando o código é lido ou digitado.
  c_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  /*
    De onde vem a aleatoriedade: `gen_random_uuid()`, que é núcleo do Postgres
    desde a 13 e usa o CSPRNG do sistema.

    Deliberadamente NÃO usa `gen_random_bytes()`: aquela função é da extensão
    pgcrypto, que o Supabase instala no schema `extensions`. Como esta função
    fixa `search_path = public, pg_temp` (obrigatório em SECURITY DEFINER),
    chamá-la sem qualificar falharia — e qualificar cria dependência de onde a
    extensão foi instalada.

    Quais bytes são usados: os índices 0-5 e 7-10. O byte 6 é PULADO porque um
    UUID v4 carrega ali os 4 bits de versão fixos (0x4X); ele produziria só 16
    dos 32 símbolos possíveis naquela posição. Os índices escolhidos têm os 5
    bits baixos totalmente aleatórios, então cada caractere vale 5 bits cheios:
    10 x 5 = 50 bits de entropia.

    `% 32` não enviesa: 256 é múltiplo exato de 32.
  */
  c_indices constant integer[] := ARRAY[0, 1, 2, 3, 4, 5, 7, 8, 9, 10];

  v_bytes bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  v_codigo text := '';
  i integer;
BEGIN
  FOREACH i IN ARRAY c_indices LOOP
    v_codigo := v_codigo || substr(c_alfabeto, (get_byte(v_bytes, i) % 32) + 1, 1);
  END LOOP;

  RETURN v_codigo;
END;
$$;

COMMENT ON FUNCTION public.aue_codigo_de_batalha_v1() IS
  'Sorteia o código de 10 caracteres do link da batalha (~50 bits). Fonte única '
  'da regra — não recopie este corpo.';


-- -----------------------------------------------------------------------------
-- 4. RPCs — o único caminho até as duas tabelas
-- -----------------------------------------------------------------------------

/*
  Cria a batalha a partir do resultado que a pessoa acabou de gravar, e devolve
  o código do link.
*/
CREATE OR REPLACE FUNCTION public.criar_batalha(p_result_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dono uuid;
  v_codigo text;
  v_batalha uuid;
  i integer;
BEGIN
  /*
    Posse do resultado: REAPROVEITA `can_use_as_challenger` da 20260807000016
    em vez de reescrever a regra. Ela já resolve os dois casos (logado: o
    resultado é dele; anônimo: resultado sem dono, dentro de 60 minutos) e já
    está concedida a `anon`.

    Com o login anônimo da 20260807000029, o caso normal passou a ser o
    primeiro — a janela de 60 minutos virou fallback do modo degradado.
  */
  IF NOT public.can_use_as_challenger(p_result_id) THEN
    RAISE EXCEPTION 'Este resultado não é seu.'
      USING ERRCODE = '42501';
  END IF;

  SELECT r.user_id INTO v_dono FROM public.resultados r WHERE r.id = p_result_id;

  /*
    Higiene oportunista, em lote pequeno e limitado.

    Batalhas mortas há mais de 30 dias somem daqui, sem `pg_cron` e sem
    infraestrutura nova. O LIMIT existe para que a criação de uma batalha
    (caminho quente, com o usuário esperando na tela) nunca vire uma varredura.

    O que isto NÃO faz: apagar áudio do Storage. Objeto de bucket não sai por
    SQL — precisaria de Edge Function. Está dito na política de privacidade em
    vez de prometido aqui.
  */
  DELETE FROM public.batalhas
   WHERE id IN (
     SELECT b.id FROM public.batalhas b
      WHERE b.expires_at < timezone('utc', now()) - interval '30 days'
      LIMIT 25
   );

  -- Colisão em 2^50 é improvável, mas "improvável" não é "impossível" e o
  -- índice único transformaria isso num erro cru na cara do usuário.
  FOR i IN 1..5 LOOP
    v_codigo := public.aue_codigo_de_batalha_v1();

    INSERT INTO public.batalhas (access_code, battle_type, owner_id)
    VALUES (v_codigo, 'remota', v_dono)
    ON CONFLICT (access_code) DO NOTHING
    RETURNING id INTO v_batalha;

    EXIT WHEN v_batalha IS NOT NULL;
  END LOOP;

  IF v_batalha IS NULL THEN
    RAISE EXCEPTION 'Não foi possível gerar um código de batalha.'
      USING ERRCODE = '55000';
  END IF;

  INSERT INTO public.rodadas_batalha (battle_id, result_id, user_id, position, round_number)
  VALUES (v_batalha, p_result_id, v_dono, 1, 1);

  RETURN v_codigo;
END;
$$;

COMMENT ON FUNCTION public.criar_batalha(uuid) IS
  'Cria uma batalha a partir de um resultado e devolve o código do link.';

GRANT EXECUTE ON FUNCTION public.criar_batalha(uuid) TO anon, authenticated;


/*
  Devolve a batalha inteira: metadados, as rodadas em ordem e quem está
  liderando.

  Recebe o código como ARGUMENTO — é aqui que "conhecer o link" vira o
  requisito de acesso, em vez de um filtro que o cliente escolhe.
*/
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
  v_lider jsonb;
BEGIN
  /*
    O prazo de 7 dias é aplicado AQUI, e é aplicação de verdade — não
    decoração — precisamente porque não existe outro caminho de leitura.

    Batalha expirada devolve NULL, exatamente como código inexistente. A tela
    não deve distinguir os dois casos: dizer "esta batalha expirou" para um
    código inventado confirmaria ao curioso que ele acertou um código real.
  */
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
               'result_id',      r.id,
               'score',          r.score,
               'classification', r.classification,
               'origin_type',    r.origin_type,
               'origin_subtype', r.origin_subtype,
               'is_artificial',  r.is_artificial,
               'is_hidden',      r.is_hidden,
               /*
                 Áudio escondido pela moderação não tem caminho devolvido. Sem
                 isto o cliente pediria uma URL assinada que a policy de
                 Storage recusaria (20260807000028) — e o usuário veria um
                 player quebrado no lugar de "este áudio não está disponível".
               */
               'audio_path',     CASE WHEN r.is_hidden THEN NULL ELSE r.audio_path END,
               'apelido',        COALESCE(p.apelido, r.player_name, 'Anônimo'),
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
   WHERE rb.battle_id = v_b.id;

  /*
    Quem lidera.

    Os critérios de desempate são OS MESMOS de `aue_compare_results_v1`
    (20260807000011, linhas 325-337): score, depois depth, depois power, depois
    duration. Escritos como ORDER BY porque aqui a comparação é entre N
    resultados, não dois — mas se aquela função mudar, ESTA CLÁUSULA PRECISA
    MUDAR JUNTO, senão o duelo de duas pessoas e a batalha de cinco passam a
    discordar sobre quem ganhou.

    Resultado escondido não lidera: seria coroar um arroto que ninguém pode
    ouvir.
  */
  SELECT jsonb_build_object(
           'apelido',   COALESCE(p.apelido, r.player_name, 'Anônimo'),
           'score',     r.score,
           'result_id', r.id
         )
    INTO v_lider
    FROM public.rodadas_batalha rb
    JOIN public.resultados r ON r.id = rb.result_id
    LEFT JOIN public.profiles p ON p.id = rb.user_id
   WHERE rb.battle_id = v_b.id
     AND NOT r.is_hidden
   ORDER BY r.score DESC, r.depth DESC, r.power DESC, r.duration DESC
   LIMIT 1;

  RETURN jsonb_build_object(
    'access_code',  v_b.access_code,
    'battle_type',  v_b.battle_type,
    'venue_type',   v_b.venue_type,
    'rounds_total', v_b.rounds_total,
    'created_at',   v_b.created_at,
    'expires_at',   v_b.expires_at,
    'finished_at',  v_b.finished_at,
    'rodadas',      v_rodadas,
    'lider',        v_lider
  );
END;
$$;

COMMENT ON FUNCTION public.obter_batalha(text) IS
  'Devolve a batalha do código informado, ou NULL se não existir OU tiver '
  'expirado — os dois casos são indistinguíveis de propósito.';

GRANT EXECUTE ON FUNCTION public.obter_batalha(text) TO anon, authenticated;


/*
  Acrescenta uma gravação ao fim da batalha. É o "mandar de volta".
*/
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
BEGIN
  /*
    `p_participant_id` já está na ASSINATURA, embora a coluna correspondente só
    exista a partir da 20260807000031 (disputa presencial).

    Isso é deliberado e o motivo é caro: `CREATE OR REPLACE FUNCTION` não muda
    assinatura. Acrescentar o parâmetro depois exigiria `DROP FUNCTION` de uma
    RPC que a essa altura já está sendo chamada pelo cliente publicado — e a
    20260807000023 (linha 279) documenta o estrago que isso causa. Reservar o
    parâmetro agora custa uma linha; acrescentá-lo depois custa uma janela em
    que o app publicado chama uma função que não existe.

    Enquanto a coluna não existir, passar um valor aqui é ERRO EXPLÍCITO em vez
    de silêncio: quem chamar assim está rodando o cliente da fatia 2 contra um
    banco da fatia 1, e precisa saber disso.
  */
  IF p_participant_id IS NOT NULL THEN
    RAISE EXCEPTION 'Disputa presencial ainda não está disponível neste banco. Aplique 20260807000031.'
      USING ERRCODE = '0A000';
  END IF;

  IF NOT public.can_use_as_challenger(p_result_id) THEN
    RAISE EXCEPTION 'Este resultado não é seu.'
      USING ERRCODE = '42501';
  END IF;

  /*
    FOR UPDATE trava a batalha durante o cálculo da posição.

    Sem ele, duas pessoas respondendo no mesmo instante leriam o mesmo
    `max(position)` e a segunda inserção bateria em
    `rodadas_uma_por_posicao_na_batalha`. O erro seria correto, mas apareceria
    como falha para alguém que não fez nada de errado — e num produto cujo uso
    é "três amigos no mesmo grupo de WhatsApp ao mesmo tempo", isso não é caso
    raro.
  */
  SELECT * INTO v_b
    FROM public.batalhas b
   WHERE b.access_code = p_access_code
     FOR UPDATE;

  IF v_b.id IS NULL OR v_b.expires_at <= timezone('utc', now()) THEN
    -- Mesma resposta para inexistente e expirada, pelo mesmo motivo de
    -- `obter_batalha`.
    RAISE EXCEPTION 'Esta batalha não está mais disponível.'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(max(rb.position), 0) + 1 INTO v_pos
    FROM public.rodadas_batalha rb
   WHERE rb.battle_id = v_b.id;

  /*
    Teto de 50 rodadas.

    Não é uma regra de produto — é um limite de sanidade. Uma batalha com
    centenas de rodadas deixa de caber na tela, faz `obter_batalha` montar um
    jsonb enorme a cada abertura e é o formato natural de um abuso. Cinquenta é
    muito mais do que qualquer brincadeira real vai usar.
  */
  IF v_pos > 50 THEN
    RAISE EXCEPTION 'Esta batalha já chegou ao limite de rodadas.'
      USING ERRCODE = '54000';
  END IF;

  SELECT r.user_id INTO v_dono FROM public.resultados r WHERE r.id = p_result_id;

  INSERT INTO public.rodadas_batalha (battle_id, result_id, user_id, position, round_number)
  VALUES (v_b.id, p_result_id, v_dono, v_pos, 1);

  RETURN public.obter_batalha(p_access_code);
END;
$$;

COMMENT ON FUNCTION public.responder_batalha(text, uuid, uuid) IS
  'Acrescenta uma gravação ao fim da batalha e devolve o estado atualizado. '
  'p_participant_id é reservado para a disputa presencial (20260807000031).';

GRANT EXECUTE ON FUNCTION public.responder_batalha(text, uuid, uuid) TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 5. O PRAZO DE 7 DIAS — o que ele é e o que ele NÃO é
--
-- O QUE É: `obter_batalha` e `responder_batalha` recusam batalha vencida. Como
-- não existe outro caminho de leitura (seção 2), isso é aplicação real, e não
-- depende de `pg_cron`, de job, nem de nada rodando fora do pedido.
--
-- O QUE NÃO É: apagar áudio. A URL assinada continua sendo emitida enquanto
-- `resultados.is_hidden = false` (20260807000028), com ou sem batalha viva. O
-- que expira é o LINK, não a gravação.
--
-- Isso é decisão de produto, não descuido: os áudios ficam guardados para
-- montar a base de arrotos de um feed futuro. A tela precisa dizer "o link para
-- de funcionar em 7 dias", e NUNCA "o arroto some em 7 dias".
-- -----------------------------------------------------------------------------
