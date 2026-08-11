-- =============================================================================
-- A REVANCHE VIRA ROUND — placar de vitórias na briga por link
-- =============================================================================
--
-- O QUE MUDA NO JOGO
--
-- Revanche deixa de ser "tenta bater teu recorde" e passa a ser outro round
-- contra a mesma pessoa:
--
--   * cada revanche ABRE um round novo;
--   * o round só FECHA quando os dois arrotaram;
--   * nota maior fecha o round e vale UMA vitória;
--   * notas iguais fecham o round sem vitória para ninguém;
--   * round aberto que ninguém responde fica aberto. Não existe W.O.
--
-- Isto REVERTE a decisão da 20260809000001 (melhor tentativa). O documento
-- mudou antes: `docs/jogo/ARENA.md` (REMATCH e SCOREBOARD) e `docs/jogo/REGRAS.md`
-- §5. A disputa presencial NÃO muda: lá melhor tentativa continua sendo o certo.
--
-- O QUE ESTA MIGRAÇÃO FAZ
--
--   1. relaxa o CHECK 1..3 de `numero_da_rodada` para `>= 1`;
--   2. cria o índice único de um arroto por pessoa por round, só na remota;
--   3. cria `vencedor_do_round`, que compara SÓ a nota;
--   4. reescreve o miolo de `revanchar_batalha` (o esqueleto de segurança fica);
--   5. `obter_batalha` ganha a chave `placar` e para de coroar quem empatou.
--
-- Rollback: `supabase/rollback/20260811000003_a_revanche_vira_round.down.sql`.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. O CHECK 1..3 CAI
--
-- Ele é o que impede um 4x3 de existir. O limite de 1..3 da disputa PRESENCIAL
-- não dependia dele de verdade: quem recusa round além do combinado é a
-- `responder_batalha`, comparando com `batalhas.total_de_rodadas` (000031 linha
-- 168, 000033 linha 113, 000036). O CHECK da tabela era cinto e suspensório.
-- -----------------------------------------------------------------------------

ALTER TABLE public.rodadas_batalha
  DROP CONSTRAINT IF EXISTS rodadas_batalha_numero_da_rodada_valido;

ALTER TABLE public.rodadas_batalha
  ADD CONSTRAINT rodadas_batalha_numero_da_rodada_valido
  CHECK (numero_da_rodada >= 1);


-- -----------------------------------------------------------------------------
-- 2. UM ARROTO POR PESSOA POR ROUND — o remédio contra duplo toque e duas abas
--
-- É a mesma ideia do `rodadas_uma_por_participante_por_round` da presencial
-- (000031 linha 125), na versão remota: lá a pessoa é o participante, aqui é o
-- usuário.
--
-- O `participante_id IS NULL` NÃO É ENFEITE. Na disputa presencial todas as
-- linhas são do MESMO usuário (é um aparelho só) e várias dividem o mesmo round
-- — sem esse recorte, o índice quebraria a mesa inteira no round 1.
--
-- Se a criação falhar por dado existente, é briga remota com duas linhas da
-- mesma pessoa no mesmo round. Limpe a sobra antes de rodar de novo: o índice é
-- o que impede a briga de contar vitória duas vezes.
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS rodadas_um_arroto_por_round_na_remota
  ON public.rodadas_batalha (batalha_id, usuario_id, numero_da_rodada)
  WHERE participante_id IS NULL AND usuario_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 3. QUEM VENCEU O ROUND — e por que esta função não é a `aue_compare_results_v1`
--
-- A `aue_compare_results_v1` desempata por profundidade, potência e duração.
-- Ela serve para ORDENAR lista e ranking, e continua servindo.
--
-- Para decidir um round de briga, ela não serve: o jogo passaria a desempatar
-- por baixo do pano, com um critério que a pessoa não viu na tela. O
-- `docs/jogo/ARENA.md` (SCOREBOARD) proíbe isso com todas as letras — "se a
-- pessoa não viu o critério, o critério não vale".
--
-- Então aqui é só a nota. Igual devolve NULL, e NULL quer dizer empate: ninguém
-- pontua.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.vencedor_do_round(
  p_resultado_a uuid,
  p_resultado_b uuid
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT CASE
           WHEN a.nota > b.nota THEN a.id
           WHEN b.nota > a.nota THEN b.id
           ELSE NULL
         END
    FROM public.resultados a,
         public.resultados b
   WHERE a.id = p_resultado_a
     AND b.id = p_resultado_b;
$$;

COMMENT ON FUNCTION public.vencedor_do_round(uuid, uuid) IS
  'Quem venceu um round da briga por link. Compara SÓ a nota e devolve NULL no empate. Não é a aue_compare_results_v1 de propósito: desempatar por grave, força ou fôlego decidiria a briga por um critério que o jogador não viu.';

GRANT EXECUTE ON FUNCTION public.vencedor_do_round(uuid, uuid) TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 4. `revanchar_batalha` — o esqueleto fica, o miolo muda
--
-- Continua igual: posse do resultado (`pode_usar_como_desafiante`), `FOR UPDATE`
-- (os dois lados podem revanchar no mesmo minuto), prazo do servidor, recusa de
-- batalha não-remota e o cálculo de `posicao`.
--
-- O miolo novo, e QUEM DECIDE É AQUI — a tela não escolhe entre abrir e fechar:
--
--   * existe round aberto e não é meu  -> eu FECHO, na mesma `numero_da_rodada`;
--   * existe round aberto e é meu      -> recusa. Já mandei, falta o outro;
--   * não existe round aberto          -> eu ABRO o round seguinte;
--   * não sou nenhum dos dois donos    -> recusa. Terceiro com o link não entra;
--   * cheguei no round 50              -> recusa.
--
-- O teto virou de ROUND. O antigo era de `posicao` (50 linhas), e empilhando
-- duas linhas por round viraria 25 rounds sem ninguém avisar.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.revanchar_batalha(
  p_codigo_de_acesso text,
  p_resultado_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_b               public.batalhas;
  v_dono            uuid;
  v_donos           integer;
  v_sou_daqui       boolean;
  v_round_aberto    integer;
  v_dono_do_aberto  uuid;
  v_max_round       integer;
  v_round           integer;
  v_pos             integer;
  v_o_que           text;
BEGIN
  -- O resultado tem de ser de quem está chamando. Sem isto, qualquer pessoa
  -- com o link colocaria o arroto de outra na disputa.
  IF NOT public.pode_usar_como_desafiante(p_resultado_id) THEN
    RAISE EXCEPTION 'Este resultado não é seu.'
      USING ERRCODE = '42501';
  END IF;

  -- `FOR UPDATE`: os dois lados podem revanchar no mesmo minuto, e sem a trava
  -- as duas transações leriam o mesmo placar e uma sobrescreveria a outra.
  SELECT * INTO v_b
    FROM public.batalhas b
   WHERE b.codigo_de_acesso = p_codigo_de_acesso
     FOR UPDATE;

  -- O prazo é do servidor, aqui como em todo lugar. A tela não decide isso.
  IF v_b.id IS NULL OR v_b.expira_em <= timezone('utc', now()) THEN
    RAISE EXCEPTION 'Esta batalha não está mais disponível.'
      USING ERRCODE = 'P0002';
  END IF;

  -- Round é coisa de disputa remota. Na presencial o round é derivado por
  -- participante e quem manda é a `responder_batalha`.
  IF v_b.tipo_de_batalha IS DISTINCT FROM 'remota' THEN
    RAISE EXCEPTION 'Revanche só vale em disputa por link.'
      USING ERRCODE = '22023';
  END IF;

  SELECT r.usuario_id INTO v_dono
    FROM public.resultados r
   WHERE r.id = p_resultado_id;

  -- Sem dono não dá para saber de quem é o round, e o índice único não teria o
  -- que segurar. Quem chega pelo link já ganha sessão anônima antes de gravar.
  IF v_dono IS NULL THEN
    RAISE EXCEPTION 'Este arroto não tem dono.'
      USING ERRCODE = '42501';
  END IF;

  /*
    A BRIGA TEM DOIS DONOS, E SÓ ELES.

    Quem ainda não está na briga entra UMA vez — é o caso de quem abriu o link,
    foi ver o placar e apertou em vez de responder pelo VERSUS. A partir do
    momento em que os dois lados existem, um terceiro com o link é recusado:
    com round, uma terceira pessoa viraria bagunça no placar de vitórias.
  */
  SELECT count(DISTINCT rb.usuario_id),
         bool_or(rb.usuario_id = v_dono)
    INTO v_donos, v_sou_daqui
    FROM public.rodadas_batalha rb
   WHERE rb.batalha_id = v_b.id;

  IF NOT COALESCE(v_sou_daqui, false) AND COALESCE(v_donos, 0) >= 2 THEN
    RAISE EXCEPTION 'Esta briga já tem dois donos.'
      USING ERRCODE = '42501';
  END IF;

  -- O round aberto é o maior número de rodada com UMA linha só. Derivado do que
  -- foi gravado, nunca guardado à parte — é o que mantém tela e banco falando a
  -- mesma coisa.
  SELECT x.numero, x.dono
    INTO v_round_aberto, v_dono_do_aberto
    FROM (
      SELECT rb.numero_da_rodada AS numero,
             count(*)            AS quantos,
             min(rb.usuario_id)  AS dono
        FROM public.rodadas_batalha rb
       WHERE rb.batalha_id = v_b.id
       GROUP BY rb.numero_da_rodada
    ) x
   WHERE x.quantos = 1
   ORDER BY x.numero DESC
   LIMIT 1;

  IF v_round_aberto IS NOT NULL AND v_dono_do_aberto = v_dono THEN
    RAISE EXCEPTION 'Você já mandou este round. Falta o outro.'
      USING ERRCODE = '22023';
  END IF;

  IF v_round_aberto IS NOT NULL THEN
    v_round := v_round_aberto;
    v_o_que := 'fechouRound';
  ELSE
    SELECT COALESCE(max(rb.numero_da_rodada), 0) INTO v_max_round
      FROM public.rodadas_batalha rb
     WHERE rb.batalha_id = v_b.id;

    v_round := v_max_round + 1;
    v_o_que := 'abriuRound';

    IF v_round > 50 THEN
      RAISE EXCEPTION 'Esta briga chegou ao limite de rounds.'
        USING ERRCODE = '54000';
    END IF;
  END IF;

  -- A `posicao` continua sendo a ordem de entrada na briga, e continua sob a
  -- mesma trava: duas revanches simultâneas colidiriam no índice único de
  -- posição e uma estouraria na cara do jogador.
  SELECT COALESCE(max(rb.posicao), 0) + 1 INTO v_pos
    FROM public.rodadas_batalha rb
   WHERE rb.batalha_id = v_b.id;

  BEGIN
    INSERT INTO public.rodadas_batalha
      (batalha_id, resultado_id, usuario_id, posicao, numero_da_rodada)
    VALUES
      (v_b.id, p_resultado_id, v_dono, v_pos, v_round);
  EXCEPTION WHEN unique_violation THEN
    -- Duas abas apertando junto. O índice segurou; a resposta é a mesma do
    -- round já aberto por mim.
    RAISE EXCEPTION 'Você já mandou este round. Falta o outro.'
      USING ERRCODE = '22023';
  END;

  -- A batalha inteira, mais o que acabou de acontecer. O cliente lê isto em vez
  -- de tentar adivinhar comparando linhas.
  RETURN public.obter_batalha(p_codigo_de_acesso)
         || jsonb_build_object('o_que_aconteceu', v_o_que);
END;
$$;

COMMENT ON FUNCTION public.revanchar_batalha(text, uuid) IS
  'Revanche numa disputa por link: abre um round novo, ou fecha o round que o outro deixou aberto. Quem decide entre abrir e fechar é esta função, nunca a tela. Não substitui responder_batalha, que continua atendendo o fluxo antigo e a primeira resposta.';

GRANT EXECUTE ON FUNCTION public.revanchar_batalha(text, uuid) TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 5. `obter_batalha` — nasce o `placar`, e o `lider` para de coroar empate
--
-- DUAS COISAS, E A SEGUNDA É UM BUG VIVO:
--
--   a) nasce a chave `placar`, só para batalha remota: vitórias por lado, qual é
--      o último round e se existe round aberto. Quem conta vitória é aqui — a
--      Arena nunca compara duas notas por conta própria;
--
--   b) o `lider` deixa de sair no empate. Ele era montado com
--      `ORDER BY nota DESC, profundidade DESC, potencia DESC, duracao DESC
--       LIMIT 1`, então com duas notas iguais alguém sempre voltava — e a tela
--      pintava esse alguém de ouro. Ou seja: o jogo JÁ desempatava escondido,
--      por profundidade, e ninguém via isso como defeito, via como ouro no lado
--      errado. A porta do cliente sempre prometeu o contrário ("null quando
--      ainda não há vencedor — inclusive no empate").
--
-- O resto da função é o mesmo da 20260807000036.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.obter_batalha(p_codigo_de_acesso text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_b public.batalhas;
  v_rodadas jsonb;
  v_participantes jsonb;
  v_lider jsonb;
  v_empatados integer;
  v_placar jsonb;
BEGIN
  SELECT * INTO v_b
    FROM public.batalhas b
   WHERE b.codigo_de_acesso = p_codigo_de_acesso
     AND b.expira_em > timezone('utc', now());

  IF v_b.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'rodada_id',         rb.id,
               'posicao',           rb.posicao,
               'numero_da_rodada',  rb.numero_da_rodada,
               'participante_id',   rb.participante_id,
               'resultado_id',      r.id,
               'nota',              r.nota,
               'classificacao',     r.classificacao,
               'tipo_de_origem',    r.tipo_de_origem,
               'subtipo_de_origem', r.subtipo_de_origem,
               'e_artificial',      r.e_artificial,
               'esta_escondido',    r.esta_escondido,
               'caminho_do_audio',  CASE WHEN r.esta_escondido THEN NULL ELSE r.caminho_do_audio END,
               'apelido',           COALESCE(pb.apelido, p.apelido, r.nome_do_jogador, 'Anônimo'),
               'usuario_id',        rb.usuario_id,
               'criado_em',         rb.criado_em
             )
             ORDER BY rb.posicao
           ),
           '[]'::jsonb
         )
    INTO v_rodadas
    FROM public.rodadas_batalha rb
    JOIN public.resultados r ON r.id = rb.resultado_id
    LEFT JOIN public.perfis p ON p.id = rb.usuario_id
    LEFT JOIN public.participantes_batalha pb ON pb.id = rb.participante_id
   WHERE rb.batalha_id = v_b.id;

  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object('id', pb.id, 'apelido', pb.apelido, 'ordem_do_turno', pb.ordem_do_turno)
             ORDER BY pb.ordem_do_turno NULLS LAST, pb.entrou_em, pb.id
           ),
           '[]'::jsonb
         )
    INTO v_participantes
    FROM public.participantes_batalha pb
   WHERE pb.batalha_id = v_b.id;

  SELECT jsonb_build_object(
           'apelido',      COALESCE(pb.apelido, p.apelido, r.nome_do_jogador, 'Anônimo'),
           'nota',         r.nota,
           'resultado_id', r.id
         )
    INTO v_lider
    FROM public.rodadas_batalha rb
    JOIN public.resultados r ON r.id = rb.resultado_id
    LEFT JOIN public.perfis p ON p.id = rb.usuario_id
    LEFT JOIN public.participantes_batalha pb ON pb.id = rb.participante_id
   WHERE rb.batalha_id = v_b.id
     AND NOT r.esta_escondido
   ORDER BY r.nota DESC, r.profundidade DESC, r.potencia DESC, r.duracao DESC
   LIMIT 1;

  /*
    A GUARDA DO EMPATE. Se a maior nota aparece mais de uma vez, ninguém lidera.
    Sem isto o `ORDER BY` acima sempre devolve alguém, e o desempate por
    profundidade decide a briga sem a pessoa ter visto o critério.
  */
  IF v_lider IS NOT NULL THEN
    SELECT count(*) INTO v_empatados
      FROM public.rodadas_batalha rb
      JOIN public.resultados r ON r.id = rb.resultado_id
     WHERE rb.batalha_id = v_b.id
       AND NOT r.esta_escondido
       AND r.nota = (v_lider->>'nota')::numeric;

    IF v_empatados > 1 THEN
      v_lider := NULL;
    END IF;
  END IF;

  /*
    O PLACAR DA BRIGA — só na remota.

    Na presencial não existe "os dois lados": são de 2 a 5 participantes num
    aparelho só, e o round de lá tem outra regra. Devolver `null` é mais honesto
    do que inventar um placar que não significa nada.
  */
  IF v_b.tipo_de_batalha = 'remota' THEN
    WITH linhas AS (
      SELECT rb.numero_da_rodada AS numero,
             rb.usuario_id,
             rb.resultado_id,
             rb.posicao,
             COALESCE(p.apelido, r.nome_do_jogador, 'Anônimo') AS apelido
        FROM public.rodadas_batalha rb
        JOIN public.resultados r ON r.id = rb.resultado_id
        LEFT JOIN public.perfis p ON p.id = rb.usuario_id
       WHERE rb.batalha_id = v_b.id
    ),
    rounds AS (
      SELECT numero,
             count(*) AS quantos,
             (array_agg(resultado_id ORDER BY posicao))[1] AS res_a,
             (array_agg(resultado_id ORDER BY posicao))[2] AS res_b
        FROM linhas
       GROUP BY numero
    ),
    fechados AS (
      SELECT numero,
             public.vencedor_do_round(res_a, res_b) AS vencedor
        FROM rounds
       WHERE quantos >= 2
    ),
    vitorias AS (
      SELECT l.usuario_id, count(*) AS quantas
        FROM fechados f
        JOIN linhas l ON l.resultado_id = f.vencedor
       GROUP BY l.usuario_id
    ),
    lados AS (
      SELECT l.usuario_id,
             min(l.posicao) AS entrou,
             (array_agg(l.apelido ORDER BY l.posicao))[1] AS apelido
        FROM linhas l
       GROUP BY l.usuario_id
    ),
    aberto AS (
      SELECT r.numero, l.usuario_id, l.resultado_id
        FROM rounds r
        JOIN linhas l ON l.numero = r.numero
       WHERE r.quantos = 1
       ORDER BY r.numero DESC
       LIMIT 1
    ),
    ultimo AS (
      SELECT max(numero) AS numero FROM rounds
    )
    SELECT jsonb_build_object(
             'rounds', (SELECT COALESCE(count(*), 0) FROM rounds),
             'lados', COALESCE(
               (SELECT jsonb_agg(
                         jsonb_build_object(
                           'usuario_id', s.usuario_id,
                           'apelido',    s.apelido,
                           'vitorias',   COALESCE(v.quantas, 0)
                         ) ORDER BY s.entrou
                       )
                  FROM lados s
                  LEFT JOIN vitorias v ON v.usuario_id = s.usuario_id),
               '[]'::jsonb
             ),
             'ultimo_round', (SELECT numero FROM ultimo),
             'vencedor_do_ultimo_round',
               (SELECT f.vencedor FROM fechados f WHERE f.numero = (SELECT numero FROM ultimo)),
             'round_aberto',
               (SELECT jsonb_build_object(
                         'numero',       a.numero,
                         'usuario_id',   a.usuario_id,
                         'resultado_id', a.resultado_id
                       )
                  FROM aberto a)
           )
      INTO v_placar;
  END IF;

  RETURN jsonb_build_object(
    'codigo_de_acesso', v_b.codigo_de_acesso,
    'tipo_de_batalha',  v_b.tipo_de_batalha,
    'tipo_de_local',    v_b.tipo_de_local,
    'total_de_rodadas', v_b.total_de_rodadas,
    'criado_em',        v_b.criado_em,
    'expira_em',        v_b.expira_em,
    'finalizada_em',    v_b.finalizada_em,
    'rodadas',          v_rodadas,
    'participantes',    v_participantes,
    'lider',            v_lider,
    'placar',           v_placar
  );
END;
$$;

COMMENT ON FUNCTION public.obter_batalha(text) IS
  'A batalha inteira pelo código do link. Na remota devolve também o placar de vitórias por round. O lider volta NULL quando a maior nota empata — quem não venceu na cara dura não fica em ouro.';

GRANT EXECUTE ON FUNCTION public.obter_batalha(text) TO anon, authenticated;
