/*
  20260807000036 — nomenclatura em PT-BR nas tabelas do MVP1

  O schema cresceu metade em português, metade em inglês. As TABELAS já eram
  quase todas PT; as COLUNAS eram inglês por regra escrita (`nomenclatura.md`
  §2). Esta migração inverte a regra para as tabelas que o jogo usa hoje:

    resultados · desafios · batalhas · rodadas_batalha ·
    participantes_batalha · profiles → perfis

  As 13 tabelas de features desligadas (feed, grupos, campeonatos, conquistas,
  seguidores, favoritos, denúncias, push) NÃO entram. Elas continuam em inglês,
  e isso está registrado no `nomenclatura.md` como dívida com dono.

  ---------------------------------------------------------------------------
  O QUE ACOMPANHA UM RENAME SOZINHO, E O QUE NÃO ACOMPANHA

  O Postgres guarda expressão de policy, CHECK, índice, FK e definição de VIEW
  como árvore de parse — todas seguem o rename sem uma linha de SQL aqui. Por
  isso esta migração NÃO recria nenhuma policy de `resultados`/`desafios`, nem
  a view `global_ranking`.

  Corpo de função é TEXTO. Toda função que cita tabela ou coluna renomeada
  precisa ser reescrita — inclusive as de features fora do escopo, porque elas
  leem `resultados` e `profiles`. É de longe a maior parte deste arquivo.

  ---------------------------------------------------------------------------
  CONTRATO QUEBRADO DE PROPÓSITO — corte seco

  Os nomes de RPC e as chaves do jsonb devolvido por `obter_batalha` e
  `obter_desafio` mudam. Build antigo com banco novo não funciona. Esta
  migração vai junto com o deploy do frontend, nunca antes.

  ---------------------------------------------------------------------------
  REGRA APLICADA ÀS FUNÇÕES DE FEATURE DESLIGADA

  Elas são renomeadas para PT, mas seus PARÂMETROS e COLUNAS DE SAÍDA seguem os
  nomes das tabelas que leem — que continuam em inglês. Inventar contrato em
  português sobre tabela inglesa criaria uma terceira convenção.
*/

BEGIN;

-- ===========================================================================
-- 1. TABELA
-- ===========================================================================

ALTER TABLE public.profiles RENAME TO perfis;

-- ===========================================================================
-- 2. COLUNAS
-- ===========================================================================

-- resultados ----------------------------------------------------------------
ALTER TABLE public.resultados RENAME COLUMN created_at           TO criado_em;
ALTER TABLE public.resultados RENAME COLUMN score                TO nota;
ALTER TABLE public.resultados RENAME COLUMN classification       TO classificacao;
ALTER TABLE public.resultados RENAME COLUMN is_artificial        TO e_artificial;
ALTER TABLE public.resultados RENAME COLUMN duration             TO duracao;
ALTER TABLE public.resultados RENAME COLUMN power                TO potencia;
ALTER TABLE public.resultados RENAME COLUMN depth                TO profundidade;
ALTER TABLE public.resultados RENAME COLUMN texture              TO textura;
ALTER TABLE public.resultados RENAME COLUMN origin_score         TO nota_da_origem;
ALTER TABLE public.resultados RENAME COLUMN origin_type          TO tipo_de_origem;
ALTER TABLE public.resultados RENAME COLUMN origin_subtype       TO subtipo_de_origem;
ALTER TABLE public.resultados RENAME COLUMN player_name          TO nome_do_jogador;
ALTER TABLE public.resultados RENAME COLUMN user_id              TO usuario_id;
ALTER TABLE public.resultados RENAME COLUMN group_id             TO grupo_id;
ALTER TABLE public.resultados RENAME COLUMN xp_earned            TO xp_ganho;
ALTER TABLE public.resultados RENAME COLUMN is_xp_eligible       TO e_elegivel_para_xp;
ALTER TABLE public.resultados RENAME COLUMN audio_path           TO caminho_do_audio;
ALTER TABLE public.resultados RENAME COLUMN is_hidden            TO esta_escondido;
ALTER TABLE public.resultados RENAME COLUMN is_moderation_locked TO esta_travado_por_moderacao;

-- desafios ------------------------------------------------------------------
ALTER TABLE public.desafios RENAME COLUMN created_at            TO criado_em;
ALTER TABLE public.desafios RENAME COLUMN challenger_result_id  TO resultado_desafiante_id;
ALTER TABLE public.desafios RENAME COLUMN challenged_result_id  TO resultado_desafiado_id;
ALTER TABLE public.desafios RENAME COLUMN winner                TO vencedor;
ALTER TABLE public.desafios RENAME COLUMN resolved_at           TO resolvido_em;

-- batalhas ------------------------------------------------------------------
ALTER TABLE public.batalhas RENAME COLUMN access_code  TO codigo_de_acesso;
ALTER TABLE public.batalhas RENAME COLUMN battle_type  TO tipo_de_batalha;
ALTER TABLE public.batalhas RENAME COLUMN owner_id     TO dono_id;
ALTER TABLE public.batalhas RENAME COLUMN venue_type   TO tipo_de_local;
ALTER TABLE public.batalhas RENAME COLUMN rounds_total TO total_de_rodadas;
ALTER TABLE public.batalhas RENAME COLUMN created_at   TO criado_em;
ALTER TABLE public.batalhas RENAME COLUMN expires_at   TO expira_em;
ALTER TABLE public.batalhas RENAME COLUMN finished_at  TO finalizada_em;

-- rodadas_batalha -----------------------------------------------------------
ALTER TABLE public.rodadas_batalha RENAME COLUMN battle_id      TO batalha_id;
ALTER TABLE public.rodadas_batalha RENAME COLUMN result_id      TO resultado_id;
ALTER TABLE public.rodadas_batalha RENAME COLUMN user_id        TO usuario_id;
ALTER TABLE public.rodadas_batalha RENAME COLUMN position       TO posicao;
ALTER TABLE public.rodadas_batalha RENAME COLUMN round_number   TO numero_da_rodada;
ALTER TABLE public.rodadas_batalha RENAME COLUMN created_at     TO criado_em;
ALTER TABLE public.rodadas_batalha RENAME COLUMN participant_id TO participante_id;

-- participantes_batalha -----------------------------------------------------
ALTER TABLE public.participantes_batalha RENAME COLUMN battle_id  TO batalha_id;
ALTER TABLE public.participantes_batalha RENAME COLUMN user_id    TO usuario_id;
ALTER TABLE public.participantes_batalha RENAME COLUMN joined_at  TO entrou_em;
ALTER TABLE public.participantes_batalha RENAME COLUMN turn_order TO ordem_do_turno;

-- perfis --------------------------------------------------------------------
ALTER TABLE public.perfis RENAME COLUMN avatar_url        TO url_do_avatar;
ALTER TABLE public.perfis RENAME COLUMN created_at        TO criado_em;
ALTER TABLE public.perfis RENAME COLUMN instagram_handle  TO instagram;
ALTER TABLE public.perfis RENAME COLUMN tiktok_handle     TO tiktok;
ALTER TABLE public.perfis RENAME COLUMN youtube_handle    TO youtube;
ALTER TABLE public.perfis RENAME COLUMN twitter_handle    TO twitter;
ALTER TABLE public.perfis RENAME COLUMN is_premium        TO e_premium;
ALTER TABLE public.perfis RENAME COLUMN is_founder        TO e_fundador;
ALTER TABLE public.perfis RENAME COLUMN notify_challenges TO notificar_desafios;
ALTER TABLE public.perfis RENAME COLUMN notify_ranking    TO notificar_ranking;
ALTER TABLE public.perfis RENAME COLUMN notify_community  TO notificar_comunidade;

-- ===========================================================================
-- 3. CONSTRAINTS
--
-- Nome de constraint não acompanha rename de coluna. Um erro de CHECK que diz
-- `resultados_player_name_len` num schema onde a coluna se chama
-- `nome_do_jogador` manda a pessoa procurar uma coluna que não existe.
-- ===========================================================================

/*
  Os CHECKs de `resultados` são REDECLARADOS, não renomeados — e a diferença
  importa por dois motivos.

  1. `origem.paridade.test.ts` e `deriva-de-funcoes.migracoes.test.ts` leem o
     TEXTO das migrações e conferem a ÚLTIMA DECLARAÇÃO de cada objeto. Um
     `RENAME` puro deixaria a declaração viva em 20260807000035 sob o nome
     antigo: o guarda perderia o rastro e ficaria verde sem conferir nada — a
     forma mais convincente de teste inútil.
  2. Estes CHECKs são a regra de negócio (nota coerente com a fórmula,
     'Puxei ar' sendo a única artificial). Quem abrir esta migração precisa ler
     o que elas dizem, não deduzir de um nome novo.

  `NOT VALID` é preservado em todas: elas nunca validaram as linhas antigas, e
  esta migração não é o lugar de mudar isso.
*/
ALTER TABLE public.resultados
  DROP CONSTRAINT resultados_score_range,
  DROP CONSTRAINT resultados_partials_range,
  DROP CONSTRAINT resultados_score_coherent,
  DROP CONSTRAINT resultados_classification_coherent,
  DROP CONSTRAINT resultados_is_artificial_coherent,
  DROP CONSTRAINT resultados_origin_score_coherent,
  DROP CONSTRAINT resultados_origin_type_valid,
  DROP CONSTRAINT resultados_origin_subtype_len,
  DROP CONSTRAINT resultados_origin_subtype_coerente,
  DROP CONSTRAINT resultados_player_name_len,
  DROP CONSTRAINT resultados_audio_path_formato;

ALTER TABLE public.resultados
  ADD CONSTRAINT resultados_nota_no_intervalo
    CHECK (nota >= 0 AND nota <= 100) NOT VALID,

  ADD CONSTRAINT resultados_parciais_no_intervalo
    CHECK (
      duracao        >= 0 AND duracao        <= 100
      AND potencia      >= 0 AND potencia      <= 100
      AND profundidade  >= 0 AND profundidade  <= 100
      AND textura       >= 0 AND textura       <= 100
      AND nota_da_origem >= 0 AND nota_da_origem <= 100
    ) NOT VALID,

  ADD CONSTRAINT resultados_nota_coerente
    CHECK (
      abs(nota - public.aue_score_v1(duracao, potencia, profundidade, textura, nota_da_origem)) <= 0.01
    ) NOT VALID,

  ADD CONSTRAINT resultados_classificacao_coerente
    CHECK (classificacao = public.aue_classification_v1(nota)) NOT VALID,

  ADD CONSTRAINT resultados_e_artificial_coerente
    CHECK (e_artificial = (tipo_de_origem = 'Puxei ar')) NOT VALID,

  ADD CONSTRAINT resultados_nota_da_origem_coerente
    CHECK (nota_da_origem = public.aue_origin_score_v1(tipo_de_origem)) NOT VALID,

  ADD CONSTRAINT resultados_tipo_de_origem_valido
    CHECK (tipo_de_origem IN ('Espontâneo', 'Comida', 'Bebida', 'Puxei ar', 'Outro')) NOT VALID,

  ADD CONSTRAINT resultados_subtipo_de_origem_tamanho
    CHECK (
      subtipo_de_origem IS NULL
      OR (char_length(btrim(subtipo_de_origem)) >= 1 AND char_length(btrim(subtipo_de_origem)) <= 40)
    ) NOT VALID,

  ADD CONSTRAINT resultados_subtipo_de_origem_coerente
    CHECK (subtipo_de_origem IS NULL OR tipo_de_origem IN ('Comida', 'Bebida')) NOT VALID,

  ADD CONSTRAINT resultados_nome_do_jogador_tamanho
    CHECK (
      nome_do_jogador IS NULL
      OR (char_length(nome_do_jogador) >= 1 AND char_length(nome_do_jogador) <= 40)
    ) NOT VALID,

  ADD CONSTRAINT resultados_caminho_do_audio_formato
    CHECK (
      caminho_do_audio IS NULL
      OR (
        char_length(caminho_do_audio) >= 3
        AND char_length(caminho_do_audio) <= 300
        AND caminho_do_audio LIKE '%/%'
        AND caminho_do_audio NOT LIKE '%..%'
        AND caminho_do_audio NOT LIKE '/%'
      )
    ) NOT VALID;

ALTER TABLE public.resultados RENAME CONSTRAINT resultados_user_id_fkey  TO resultados_usuario_id_fkey;
ALTER TABLE public.resultados RENAME CONSTRAINT resultados_group_id_fkey TO resultados_grupo_id_fkey;

ALTER TABLE public.desafios RENAME CONSTRAINT desafios_winner_valid                 TO desafios_vencedor_valido;
ALTER TABLE public.desafios RENAME CONSTRAINT desafios_challenger_result_id_fkey    TO desafios_resultado_desafiante_id_fkey;
ALTER TABLE public.desafios RENAME CONSTRAINT desafios_challenged_result_id_fkey    TO desafios_resultado_desafiado_id_fkey;

ALTER TABLE public.batalhas RENAME CONSTRAINT batalhas_access_code_formato          TO batalhas_codigo_de_acesso_formato;
ALTER TABLE public.batalhas RENAME CONSTRAINT batalhas_battle_type_valido           TO batalhas_tipo_de_batalha_valido;
ALTER TABLE public.batalhas RENAME CONSTRAINT batalhas_venue_type_valido            TO batalhas_tipo_de_local_valido;
ALTER TABLE public.batalhas RENAME CONSTRAINT batalhas_rounds_total_valido          TO batalhas_total_de_rodadas_valido;
ALTER TABLE public.batalhas RENAME CONSTRAINT batalhas_owner_id_fkey                TO batalhas_dono_id_fkey;

ALTER TABLE public.rodadas_batalha RENAME CONSTRAINT rodadas_batalha_position_positiva    TO rodadas_batalha_posicao_positiva;
ALTER TABLE public.rodadas_batalha RENAME CONSTRAINT rodadas_batalha_round_number_valido  TO rodadas_batalha_numero_da_rodada_valido;
ALTER TABLE public.rodadas_batalha RENAME CONSTRAINT rodadas_batalha_battle_id_fkey       TO rodadas_batalha_batalha_id_fkey;
ALTER TABLE public.rodadas_batalha RENAME CONSTRAINT rodadas_batalha_result_id_fkey       TO rodadas_batalha_resultado_id_fkey;
ALTER TABLE public.rodadas_batalha RENAME CONSTRAINT rodadas_batalha_user_id_fkey         TO rodadas_batalha_usuario_id_fkey;
ALTER TABLE public.rodadas_batalha RENAME CONSTRAINT rodadas_batalha_participant_id_fkey  TO rodadas_batalha_participante_id_fkey;

ALTER TABLE public.participantes_batalha RENAME CONSTRAINT participantes_batalha_battle_id_fkey TO participantes_batalha_batalha_id_fkey;
ALTER TABLE public.participantes_batalha RENAME CONSTRAINT participantes_batalha_user_id_fkey   TO participantes_batalha_usuario_id_fkey;

ALTER TABLE public.perfis RENAME CONSTRAINT profiles_pkey    TO perfis_pkey;
ALTER TABLE public.perfis RENAME CONSTRAINT profiles_id_fkey TO perfis_id_fkey;

-- ===========================================================================
-- 4. ÍNDICES
-- ===========================================================================

ALTER INDEX public.profiles_fundadores        RENAME TO perfis_fundadores;
ALTER INDEX public.resultados_por_audio_path  RENAME TO resultados_por_caminho_do_audio;

-- Já estavam em PT e continuam verdadeiros: batalhas_um_codigo_por_link,
-- batalhas_por_expiracao, rodadas_por_batalha, rodadas_uma_por_posicao_na_batalha,
-- rodadas_um_resultado_por_batalha, rodadas_uma_por_participante_por_round,
-- participantes_por_batalha, participantes_um_apelido_por_batalha,
-- participantes_uma_vez_por_ordem.

-- ===========================================================================
-- 5. VALORES DE `desafios.vencedor`
--
-- A coluna virou PT; o conteúdo dela não podia continuar em inglês. O UPDATE
-- roda antes do CHECK novo e cobre qualquer linha existente — nos dois
-- ambientes a tabela está vazia, mas a migração não pode depender disso.
-- ===========================================================================

ALTER TABLE public.desafios DROP CONSTRAINT desafios_vencedor_valido;

UPDATE public.desafios
   SET vencedor = CASE vencedor
     WHEN 'challenger' THEN 'desafiante'
     WHEN 'challenged' THEN 'desafiado'
     WHEN 'tie'        THEN 'empate'
     ELSE vencedor
   END
 WHERE vencedor IS NOT NULL;

ALTER TABLE public.desafios
  ADD CONSTRAINT desafios_vencedor_valido
  CHECK (vencedor IS NULL OR vencedor IN ('desafiante', 'desafiado', 'empate'));

-- ===========================================================================
-- 6. FUNÇÕES
--
-- Ordem: primeiro as policies que dependem de função a ser derrubada, depois
-- os triggers, depois as funções, e por fim tudo recriado.
--
-- NÃO precisam de nada: aue_score_v1, aue_origin_score_v1,
-- aue_classification_v1 e aue_codigo_de_batalha_v1 — nenhuma delas toca tabela.
-- As três primeiras ainda estão presas pelos CHECKs de coerência de
-- `resultados`, então nem poderiam ser derrubadas. Os nomes dos parâmetros
-- delas seguem em inglês por isso: é fórmula versionada e congelada.
-- ===========================================================================

DROP POLICY "Enable insert for owner of challenger result" ON public.desafios;
DROP POLICY "Enable update for owner of challenged result" ON public.desafios;

DROP TRIGGER on_auth_user_created ON auth.users;
DROP TRIGGER on_profile_update ON public.perfis;
DROP TRIGGER trigger_process_result_xp ON public.resultados;
DROP TRIGGER trigger_update_profile_xp ON public.resultados;
DROP TRIGGER trigger_check_result_achievements ON public.resultados;
DROP TRIGGER trigger_check_reports ON public.denuncias;
DROP TRIGGER on_desafio_set_winner ON public.desafios;
DROP TRIGGER on_desafio_update ON public.desafios;

/*
  Condicionais: os dois só existem onde `pg_net` está instalado (guarda da
  20260807000012). Não estão em produção hoje. Precisam sair ANTES do
  DROP FUNCTION abaixo — trigger é dependência dura da função.
*/
DROP TRIGGER IF EXISTS on_comentario_notify_push ON public.comentarios;
DROP TRIGGER IF EXISTS on_desafio_notify_push ON public.desafios;

DROP FUNCTION public.handle_new_user();
DROP FUNCTION public.protect_profile_stats();
DROP FUNCTION public.process_result_xp();
DROP FUNCTION public.update_profile_xp();
DROP FUNCTION public.check_result_achievements();
DROP FUNCTION public.check_reports_and_hide();
DROP FUNCTION public.set_desafio_winner();
DROP FUNCTION public.protect_desafio_fields();
DROP FUNCTION public.notify_push_event();

DROP FUNCTION public.can_use_as_challenger(uuid);
DROP FUNCTION public.can_use_as_challenged(uuid);
DROP FUNCTION public.aue_compare_results_v1(uuid, uuid);
DROP FUNCTION public.submit_resultado(numeric, numeric, numeric, numeric, text, text, text, uuid);
DROP FUNCTION public.definir_audio_do_resultado(uuid, text);
DROP FUNCTION public.remover_audio_do_resultado(uuid);
DROP FUNCTION public.criar_batalha(uuid);
DROP FUNCTION public.criar_batalha_presencial(text[], integer, text);
DROP FUNCTION public.obter_batalha(text);
DROP FUNCTION public.responder_batalha(text, uuid, uuid);
DROP FUNCTION public.obter_desafio(text);
DROP FUNCTION public.responder_desafio(text, uuid);
DROP FUNCTION public.listar_comentarios(uuid, uuid);
DROP FUNCTION public.criar_comentario(text, uuid, uuid);
DROP FUNCTION public.toggle_reacao(uuid, uuid, text);
DROP FUNCTION public.toggle_follow(uuid);
DROP FUNCTION public.toggle_favorite(uuid);
DROP FUNCTION public.create_social_post(uuid, text, text, text, text);
DROP FUNCTION public.get_championship_leaderboard(uuid);
DROP FUNCTION public.get_user_conquistas_catalog(uuid);

-- --------------------------------------------------------------------------
-- 6.1 Funções `aue_*` que leem tabela
-- --------------------------------------------------------------------------

-- `p_object_name` fica em inglês: é o nome do objeto no Storage, vocabulário
-- da API do Supabase, e as duas policies do bucket dependem desta assinatura.
CREATE OR REPLACE FUNCTION public.aue_audio_esta_visivel(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.resultados r
     WHERE r.caminho_do_audio = p_object_name
       AND r.esta_escondido = false
  );
$$;

CREATE OR REPLACE FUNCTION public.aue_audio_esta_escondido(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.resultados r
     WHERE r.caminho_do_audio = p_object_name
       AND r.esta_escondido
  );
$$;

CREATE OR REPLACE FUNCTION public.aue_vaga_de_fundador_disponivel()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
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
  FROM (SELECT 1 FROM public.perfis WHERE e_fundador LIMIT c_vagas) AS ocupadas;

  RETURN v_ocupadas < c_vagas;
END;
$$;

CREATE FUNCTION public.aue_compare_results_v1(
  p_resultado_desafiante_id uuid,
  p_resultado_desafiado_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  a public.resultados;
  b public.resultados;
BEGIN
  IF p_resultado_desafiante_id IS NULL OR p_resultado_desafiado_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO a FROM public.resultados WHERE id = p_resultado_desafiante_id;
  SELECT * INTO b FROM public.resultados WHERE id = p_resultado_desafiado_id;

  IF a.id IS NULL OR b.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF a.nota > b.nota THEN RETURN 'desafiante'; END IF;
  IF b.nota > a.nota THEN RETURN 'desafiado'; END IF;

  IF a.profundidade > b.profundidade THEN RETURN 'desafiante'; END IF;
  IF b.profundidade > a.profundidade THEN RETURN 'desafiado'; END IF;

  IF a.potencia > b.potencia THEN RETURN 'desafiante'; END IF;
  IF b.potencia > a.potencia THEN RETURN 'desafiado'; END IF;

  IF a.duracao > b.duracao THEN RETURN 'desafiante'; END IF;
  IF b.duracao > a.duracao THEN RETURN 'desafiado'; END IF;

  RETURN 'empate';  -- Empate Técnico do Gás
END;
$$;

-- --------------------------------------------------------------------------
-- 6.2 Posse de resultado
-- --------------------------------------------------------------------------

CREATE FUNCTION public.pode_usar_como_desafiante(p_resultado_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resultados r
    WHERE r.id = p_resultado_id
      AND (
        -- Caso 1 — usuário logado: o resultado tem de ser dele.
        (auth.uid() IS NOT NULL AND r.usuario_id = auth.uid())

        -- Caso 2 — usuário anônimo: janela de 60 minutos, fallback do modo
        -- degradado desde que o login anônimo virou o caminho normal (000029).
        OR (
          auth.uid() IS NULL
          AND r.usuario_id IS NULL
          AND r.criado_em > timezone('utc'::text, now()) - interval '60 minutes'
        )
      )
  );
$$;

CREATE FUNCTION public.pode_usar_como_desafiado(p_resultado_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resultados r
    WHERE r.id = p_resultado_id
      AND (
        (auth.uid() IS NOT NULL AND r.usuario_id = auth.uid())
        OR (
          auth.uid() IS NULL
          AND r.usuario_id IS NULL
          AND r.criado_em > timezone('utc'::text, now()) - interval '60 minutes'
        )
      )
  );
$$;

/*
  Recriadas byte a byte como estavam, trocando só o nome da função e da coluna.
  Dois detalhes que NÃO podem sumir na tradução:

  - `TO anon, authenticated`. Sem a cláusula, a policy nasceria para PUBLIC —
    o que inclui `postgres` e qualquer role futura. É alargamento de acesso
    disfarçado de refactor.
  - `resultado_desafiado_id IS NOT NULL` no WITH CHECK do UPDATE. A função já
    devolveria false para NULL, mas a guarda explícita é o que impede um UPDATE
    de "desrresponder" o desafio zerando a coluna.
*/
CREATE POLICY "Enable insert for owner of challenger result"
  ON public.desafios FOR INSERT
  TO anon, authenticated
  WITH CHECK (public.pode_usar_como_desafiante(resultado_desafiante_id));

CREATE POLICY "Enable update for owner of challenged result"
  ON public.desafios FOR UPDATE
  TO anon, authenticated
  USING (resultado_desafiado_id IS NULL)
  WITH CHECK (
    resultado_desafiado_id IS NOT NULL
    AND public.pode_usar_como_desafiado(resultado_desafiado_id)
  );

-- --------------------------------------------------------------------------
-- 6.3 Gatilhos de perfil e XP
-- --------------------------------------------------------------------------

CREATE FUNCTION public.criar_perfil_do_novo_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  /*
    Leitura por `to_jsonb(NEW)` em vez de `NEW.is_anonymous`, de propósito.

    `auth.users` é schema gerenciado pelo Supabase: a coluna `is_anonymous`
    chegou junto com o suporte a login anônimo no GoTrue. Referenciá-la por
    nome faz a função DEIXAR DE COMPILAR num projeto cuja versão do GoTrue
    ainda não a tenha — e o erro apareceria na criação de conta, ou seja, no
    primeiro acesso de todo usuário novo.

    Pelo jsonb, coluna ausente vira NULL e o COALESCE resolve para `false`:
    degrada para o comportamento anterior, em vez de quebrar.
  */
  v_anonimo boolean := COALESCE((to_jsonb(NEW) ->> 'is_anonymous')::boolean, false);
BEGIN
  INSERT INTO public.perfis (id, apelido, url_do_avatar, e_fundador)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Arrotador ' || substr(NEW.id::text, 1, 6)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    /*
      CASE, e não `NOT v_anonimo AND public.aue_vaga_de_fundador_disponivel()`.

      O Postgres NÃO garante avaliação em curto-circuito de AND — ele pode
      avaliar o lado direito primeiro. E o lado direito aqui não é puro: a
      função toma `pg_advisory_xact_lock`. Com a forma AND, todo cadastro
      anônimo disputaria um lock que não deveria nem tocar, serializando a
      criação de contas no exato caminho que precisa ser barato.

      CASE tem ordem de avaliação garantida pela linguagem.
    */
    CASE
      WHEN v_anonimo THEN false
      ELSE public.aue_vaga_de_fundador_disponivel()
    END
  );
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.proteger_estatisticas_do_perfil()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Imutáveis, venha o UPDATE de onde vier.
  NEW.id        := OLD.id;
  NEW.criado_em := OLD.criado_em;

  -- Concedidos apenas por fluxo do servidor; o cliente nunca os altera.
  NEW.e_fundador := OLD.e_fundador;
  NEW.e_premium  := OLD.e_premium;

  -- xp_total / nivel: só mudam sob a válvula aberta por `atualizar_xp_do_perfil()`.
  IF coalesce(current_setting('app.allow_stat_update', true), 'off') <> 'on' THEN
    NEW.xp_total := OLD.xp_total;
    NEW.nivel    := OLD.nivel;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.calcular_xp_do_resultado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_recentes integer;
  v_xp integer := 0;
BEGIN
  -- Só usuário identificado acumula XP.
  IF NEW.usuario_id IS NOT NULL THEN
    SELECT count(*) INTO v_recentes
    FROM public.resultados
    WHERE usuario_id = NEW.usuario_id
      AND criado_em >= NOW() - INTERVAL '24 hours';

    -- Anti-farming: só os 5 primeiros do dia rendem XP.
    IF v_recentes < 5 THEN
      NEW.e_elegivel_para_xp := true;

      v_xp := 5;

      IF NEW.nota >= 95 THEN
        v_xp := v_xp + 40;
      ELSIF NEW.nota >= 90 THEN
        v_xp := v_xp + 30;
      ELSIF NEW.nota >= 70 THEN
        v_xp := v_xp + 20;
      ELSIF NEW.nota >= 40 THEN
        v_xp := v_xp + 10;
      END IF;

      NEW.xp_ganho := v_xp;
    ELSE
      NEW.e_elegivel_para_xp := false;
      NEW.xp_ganho := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.atualizar_xp_do_perfil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_xp_atual integer;
  v_nivel integer;
BEGIN
  IF NEW.usuario_id IS NOT NULL AND NEW.xp_ganho > 0 THEN
    -- Libera a atualização de estatísticas apenas para os UPDATEs abaixo.
    PERFORM set_config('app.allow_stat_update', 'on', true);

    UPDATE public.perfis
    SET xp_total = xp_total + NEW.xp_ganho
    WHERE id = NEW.usuario_id
    RETURNING xp_total INTO v_xp_atual;

    IF v_xp_atual IS NOT NULL THEN
      -- Nível: 1 a cada 100 XP.
      v_nivel := floor(v_xp_atual / 100) + 1;

      UPDATE public.perfis
      SET nivel = v_nivel
      WHERE id = NEW.usuario_id AND nivel <> v_nivel;
    END IF;

    -- Fecha a janela imediatamente; a flag é local à transação de qualquer
    -- forma, mas não deixamos ela aberta para o resto da transação.
    PERFORM set_config('app.allow_stat_update', 'off', true);
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.conceder_conquistas_do_resultado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.usuario_id IS NOT NULL THEN
    -- Primeiro Auê
    INSERT INTO public.conquistas_usuario (user_id, conquista_id)
    VALUES (NEW.usuario_id, 'primeiro_aue')
    ON CONFLICT DO NOTHING;

    IF NEW.nota >= 70 THEN
      INSERT INTO public.conquistas_usuario (user_id, conquista_id)
      VALUES (NEW.usuario_id, 'passou_70')
      ON CONFLICT DO NOTHING;
    END IF;

    IF NEW.nota >= 90 THEN
      INSERT INTO public.conquistas_usuario (user_id, conquista_id)
      VALUES (NEW.usuario_id, 'passou_90')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.esconder_por_denuncias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_denunciantes integer;
  v_travado boolean;
BEGIN
  SELECT r.esta_travado_por_moderacao INTO v_travado
    FROM public.resultados r
   WHERE r.id = NEW.result_id;

  -- Um humano já olhou. A denúncia continua registrada — a trilha importa e
  -- alimenta a fila de revisão —, mas não muda mais a visibilidade sozinha.
  IF COALESCE(v_travado, false) THEN
    RETURN NEW;
  END IF;

  -- Conta PESSOAS distintas, não linhas.
  SELECT count(DISTINCT user_id) INTO v_denunciantes
  FROM public.denuncias
  WHERE result_id = NEW.result_id
    AND user_id IS NOT NULL;

  IF v_denunciantes >= 3 THEN
    UPDATE public.resultados
       SET esta_escondido = true
     WHERE id = NEW.result_id;
  END IF;

  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- 6.4 Gatilhos de desafio
-- --------------------------------------------------------------------------

CREATE FUNCTION public.proteger_campos_do_desafio()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.id := OLD.id;
  NEW.criado_em := OLD.criado_em;
  NEW.resultado_desafiante_id := OLD.resultado_desafiante_id;

  -- Um desafio já respondido não pode ser reescrito.
  IF OLD.resultado_desafiado_id IS NOT NULL THEN
    NEW.resultado_desafiado_id := OLD.resultado_desafiado_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.definir_vencedor_do_desafio()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Um desafio nasce sempre sem vencedor, independente do que o cliente mande.
    NEW.vencedor := NULL;
    NEW.resolvido_em := NULL;
    RETURN NEW;
  END IF;

  IF OLD.resultado_desafiado_id IS NULL AND NEW.resultado_desafiado_id IS NOT NULL THEN
    -- Usa OLD.resultado_desafiante_id de propósito: o desafiante é imutável e o
    -- cliente não pode trocá-lo no mesmo UPDATE para forjar a comparação.
    NEW.vencedor := public.aue_compare_results_v1(
      OLD.resultado_desafiante_id,
      NEW.resultado_desafiado_id
    );
    NEW.resolvido_em := timezone('utc'::text, now());
  ELSE
    -- Qualquer outro UPDATE não pode mexer no veredito.
    NEW.vencedor := OLD.vencedor;
    NEW.resolvido_em := OLD.resolvido_em;
  END IF;

  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- 6.5 Webhook de push
-- --------------------------------------------------------------------------

CREATE FUNCTION public.notificar_evento_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'vault', 'net', 'pg_temp'
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_url
      FROM vault.decrypted_secrets WHERE name = 'push_webhook_url' LIMIT 1;

    SELECT decrypted_secret INTO v_secret
      FROM vault.decrypted_secrets WHERE name = 'push_webhook_secret' LIMIT 1;

    IF v_url IS NULL OR v_secret IS NULL THEN
      RAISE WARNING 'notificar_evento_push: segredos push_webhook_url/push_webhook_secret ausentes no Vault; notificação ignorada';
      RETURN NULL;
    END IF;

    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', v_secret
      ),
      body := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', to_jsonb(NEW),
        'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Notificação é best-effort. Nunca derruba a transação de negócio.
    RAISE WARNING 'notificar_evento_push falhou (%): %', SQLSTATE, SQLERRM;
  END;

  RETURN NULL;  -- AFTER trigger: o valor de retorno é ignorado.
END;
$$;

-- --------------------------------------------------------------------------
-- 6.6 Envio de resultado
-- --------------------------------------------------------------------------

CREATE FUNCTION public.enviar_resultado(
  p_duracao numeric,
  p_potencia numeric,
  p_profundidade numeric,
  p_textura numeric,
  p_tipo_de_origem text,
  p_nome_do_jogador text DEFAULT NULL,
  p_subtipo_de_origem text DEFAULT NULL,
  p_grupo_id uuid DEFAULT NULL
)
RETURNS public.resultados
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_nota_da_origem numeric;
  v_nota numeric;
  v_subtipo text;
  v_nome text;
  v_linha public.resultados;
BEGIN
  IF p_duracao IS NULL OR p_potencia IS NULL OR p_profundidade IS NULL OR p_textura IS NULL THEN
    RAISE EXCEPTION 'Parciais obrigatórias ausentes' USING ERRCODE = '22023';
  END IF;

  IF p_duracao      < 0 OR p_duracao      > 100
     OR p_potencia     < 0 OR p_potencia     > 100
     OR p_profundidade < 0 OR p_profundidade > 100
     OR p_textura      < 0 OR p_textura      > 100 THEN
    RAISE EXCEPTION 'Parciais fora da faixa 0-100' USING ERRCODE = '22023';
  END IF;

  v_nota_da_origem := public.aue_origin_score_v1(p_tipo_de_origem);
  IF v_nota_da_origem IS NULL THEN
    RAISE EXCEPTION 'Origem inválida: %', p_tipo_de_origem USING ERRCODE = '22023';
  END IF;

  -- Fórmula inalterada (aue-score-v1). Qualquer mudança de peso aqui quebra a
  -- constraint `resultados_nota_coerente` e o teste rules.formula.test.ts.
  v_nota := public.aue_score_v1(p_duracao, p_potencia, p_profundidade, p_textura, v_nota_da_origem);

  -- Subtipo: só para Comida/Bebida, aparado e limitado.
  v_subtipo := nullif(left(btrim(coalesce(p_subtipo_de_origem, '')), 40), '');
  IF p_tipo_de_origem NOT IN ('Comida', 'Bebida') THEN
    v_subtipo := NULL;
  END IF;

  -- Grupo: só quem é membro pode publicar a gravação no grupo.
  IF p_grupo_id IS NOT NULL THEN
    IF v_uid IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.membros_grupo m
       WHERE m.group_id = p_grupo_id AND m.user_id = v_uid
    ) THEN
      RAISE EXCEPTION 'Grupo inválido ou usuário não é membro' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- A1: logado NÃO escolhe o nome exibido — o ranking usa o apelido do perfil.
  v_nome := CASE
    WHEN v_uid IS NOT NULL THEN NULL
    ELSE nullif(left(btrim(coalesce(p_nome_do_jogador, '')), 40), '')
  END;

  INSERT INTO public.resultados (
    nota, classificacao, e_artificial,
    duracao, potencia, profundidade, textura,
    nota_da_origem, tipo_de_origem, subtipo_de_origem,
    nome_do_jogador, usuario_id, grupo_id
  ) VALUES (
    v_nota,
    public.aue_classification_v1(v_nota),
    (p_tipo_de_origem = 'Puxei ar'),
    p_duracao, p_potencia, p_profundidade, p_textura,
    v_nota_da_origem, p_tipo_de_origem, v_subtipo,
    v_nome,
    v_uid,              -- NUNCA vem do cliente
    p_grupo_id
  )
  RETURNING * INTO v_linha;

  RETURN v_linha;
END;
$$;

-- --------------------------------------------------------------------------
-- 6.7 Áudio do resultado
-- --------------------------------------------------------------------------

CREATE FUNCTION public.definir_audio_do_resultado(p_resultado_id uuid, p_caminho_do_audio text)
RETURNS public.resultados
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_path  text;
  v_dono  uuid;
  v_atual text;
  v_linha public.resultados;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário precisa estar autenticado' USING ERRCODE = '28000';
  END IF;

  IF p_resultado_id IS NULL THEN
    RAISE EXCEPTION 'Resultado não informado' USING ERRCODE = '22023';
  END IF;

  v_path := btrim(coalesce(p_caminho_do_audio, ''));

  IF char_length(v_path) = 0 THEN
    RAISE EXCEPTION 'Caminho do áudio vazio' USING ERRCODE = '22023';
  END IF;

  IF char_length(v_path) > 300 THEN
    RAISE EXCEPTION 'Caminho do áudio longo demais' USING ERRCODE = '22023';
  END IF;

  -- Espelha exatamente a policy de INSERT do bucket.
  IF (storage.foldername(v_path))[1] IS DISTINCT FROM v_uid::text THEN
    RAISE EXCEPTION 'O caminho do áudio precisa começar pela pasta do próprio usuário'
      USING ERRCODE = '22023';
  END IF;

  IF v_path LIKE '%..%' OR v_path LIKE '/%' THEN
    RAISE EXCEPTION 'Caminho do áudio inválido' USING ERRCODE = '22023';
  END IF;

  -- Trava a linha: duas chamadas concorrentes para o mesmo resultado não podem
  -- as duas ver `caminho_do_audio` NULL e as duas escreverem. Sem o FOR UPDATE,
  -- a segunda sobrescreveria o ponteiro da primeira e órfãaria o objeto dela no
  -- Storage — que não tem policy de DELETE para ninguém além do próprio dono, e
  -- ninguém saberia mais o caminho.
  SELECT r.usuario_id, r.caminho_do_audio
    INTO v_dono, v_atual
    FROM public.resultados r
   WHERE r.id = p_resultado_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resultado não encontrado' USING ERRCODE = '22023';
  END IF;

  -- Resultado anônimo (`usuario_id IS NULL`) cai aqui e é recusado: `IS DISTINCT
  -- FROM` trata NULL como valor, então não há como um NULL "casar" com o uid.
  IF v_dono IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Este resultado não é seu' USING ERRCODE = '42501';
  END IF;

  IF v_atual IS NOT NULL THEN
    RAISE EXCEPTION 'Este resultado já tem áudio' USING ERRCODE = '55000';
  END IF;

  UPDATE public.resultados
     SET caminho_do_audio = v_path
   WHERE id = p_resultado_id
  RETURNING * INTO v_linha;

  RETURN v_linha;
END;
$$;

CREATE FUNCTION public.remover_audio_do_resultado(p_resultado_id uuid)
RETURNS public.resultados
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_dono  uuid;
  v_linha public.resultados;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário precisa estar autenticado' USING ERRCODE = '28000';
  END IF;

  SELECT r.usuario_id INTO v_dono
    FROM public.resultados r
   WHERE r.id = p_resultado_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resultado não encontrado' USING ERRCODE = '22023';
  END IF;

  IF v_dono IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Este resultado não é seu' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.posts_comunidade
   WHERE result_id = p_resultado_id
     AND user_id = v_uid
     AND post_type = 'audio_result';

  -- Idempotente: chamar de novo com `caminho_do_audio` já NULL não é erro. O
  -- cliente pode ter apagado o objeto e perdido a resposta da primeira chamada.
  UPDATE public.resultados
     SET caminho_do_audio = NULL
   WHERE id = p_resultado_id
  RETURNING * INTO v_linha;

  RETURN v_linha;
END;
$$;

-- --------------------------------------------------------------------------
-- 6.8 Batalhas
--
-- As chaves do jsonb também viraram PT. É contrato com o cliente e muda junto.
-- --------------------------------------------------------------------------

CREATE FUNCTION public.obter_batalha(p_codigo_de_acesso text)
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

  /*
    ORDEM DOS TURNOS: `ordem_do_turno`, e nada mais.

    Já foi `ORDER BY pb.joined_at, pb.id`. Todos os participantes nascem na
    mesma transação, então o timestamp empata para todos e o desempate caía no
    uuid — a mesa recebia uma ordem sorteada. `NULLS LAST` cobre linhas
    anteriores ao backfill de 000033.
  */
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
    'lider',            v_lider
  );
END;
$$;

CREATE FUNCTION public.criar_batalha(p_resultado_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_dono uuid;
  v_codigo text;
  v_batalha uuid;
  i integer;
BEGIN
  /*
    Posse do resultado: REAPROVEITA `pode_usar_como_desafiante` em vez de
    reescrever a regra. Ela já resolve os dois casos (logado: o resultado é
    dele; anônimo: resultado sem dono, dentro de 60 minutos) e já está
    concedida a `anon`.
  */
  IF NOT public.pode_usar_como_desafiante(p_resultado_id) THEN
    RAISE EXCEPTION 'Este resultado não é seu.'
      USING ERRCODE = '42501';
  END IF;

  SELECT r.usuario_id INTO v_dono FROM public.resultados r WHERE r.id = p_resultado_id;

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
      WHERE b.expira_em < timezone('utc', now()) - interval '30 days'
      LIMIT 25
   );

  -- Colisão em 2^50 é improvável, mas "improvável" não é "impossível" e o
  -- índice único transformaria isso num erro cru na cara do usuário.
  FOR i IN 1..5 LOOP
    v_codigo := public.aue_codigo_de_batalha_v1();

    INSERT INTO public.batalhas (codigo_de_acesso, tipo_de_batalha, dono_id)
    VALUES (v_codigo, 'remota', v_dono)
    ON CONFLICT (codigo_de_acesso) DO NOTHING
    RETURNING id INTO v_batalha;

    EXIT WHEN v_batalha IS NOT NULL;
  END LOOP;

  IF v_batalha IS NULL THEN
    RAISE EXCEPTION 'Não foi possível gerar um código de batalha.'
      USING ERRCODE = '55000';
  END IF;

  INSERT INTO public.rodadas_batalha (batalha_id, resultado_id, usuario_id, posicao, numero_da_rodada)
  VALUES (v_batalha, p_resultado_id, v_dono, 1, 1);

  RETURN v_codigo;
END;
$$;

CREATE FUNCTION public.criar_batalha_presencial(
  p_apelidos text[],
  p_total_de_rodadas integer DEFAULT 1,
  p_tipo_de_local text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
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

  IF p_total_de_rodadas IS NULL OR p_total_de_rodadas NOT BETWEEN 1 AND 3 THEN
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

    INSERT INTO public.batalhas (codigo_de_acesso, tipo_de_batalha, dono_id, total_de_rodadas, tipo_de_local)
    VALUES (v_codigo, 'presencial', v_uid, p_total_de_rodadas, p_tipo_de_local)
    ON CONFLICT (codigo_de_acesso) DO NOTHING
    RETURNING id INTO v_batalha;

    EXIT WHEN v_batalha IS NOT NULL;
  END LOOP;

  IF v_batalha IS NULL THEN
    RAISE EXCEPTION 'Não foi possível gerar um código de batalha.' USING ERRCODE = '55000';
  END IF;

  /*
    A ordinalidade do array vira `ordem_do_turno`, gravada.

    O laço anterior confiava que a ordem de INSERÇÃO seria a ordem de LEITURA.
    Não é: sem ORDER BY explícito na leitura, o Postgres não promete ordem
    nenhuma.
  */
  INSERT INTO public.participantes_batalha (batalha_id, apelido, ordem_do_turno)
  SELECT v_batalha, btrim(t.a), t.ord
    FROM unnest(p_apelidos) WITH ORDINALITY AS t(a, ord);

  RETURN public.obter_batalha(v_codigo);
END;
$$;

CREATE FUNCTION public.responder_batalha(
  p_codigo_de_acesso text,
  p_resultado_id uuid,
  p_participante_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_b public.batalhas;
  v_dono uuid;
  v_pos integer;
  v_round integer := 1;
BEGIN
  IF NOT public.pode_usar_como_desafiante(p_resultado_id) THEN
    RAISE EXCEPTION 'Este resultado não é seu.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_b
    FROM public.batalhas b
   WHERE b.codigo_de_acesso = p_codigo_de_acesso
     FOR UPDATE;

  IF v_b.id IS NULL OR v_b.expira_em <= timezone('utc', now()) THEN
    RAISE EXCEPTION 'Esta batalha não está mais disponível.'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_participante_id IS NOT NULL THEN
    -- O participante tem de ser DESTA batalha. Sem esta checagem, o id de um
    -- participante de outra disputa entraria aqui e o ranking mostraria alguém
    -- que nunca esteve na mesa.
    PERFORM 1 FROM public.participantes_batalha pb
      WHERE pb.id = p_participante_id AND pb.batalha_id = v_b.id;
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
     WHERE rb.batalha_id = v_b.id
       AND rb.participante_id = p_participante_id;

    IF v_round > COALESCE(v_b.total_de_rodadas, 1) THEN
      RAISE EXCEPTION 'Esta disputa já cumpriu todos os rounds.'
        USING ERRCODE = '54000';
    END IF;
  END IF;

  SELECT COALESCE(max(rb.posicao), 0) + 1 INTO v_pos
    FROM public.rodadas_batalha rb
   WHERE rb.batalha_id = v_b.id;

  IF v_pos > 50 THEN
    RAISE EXCEPTION 'Esta batalha já chegou ao limite de rodadas.'
      USING ERRCODE = '54000';
  END IF;

  SELECT r.usuario_id INTO v_dono FROM public.resultados r WHERE r.id = p_resultado_id;

  INSERT INTO public.rodadas_batalha
    (batalha_id, resultado_id, usuario_id, posicao, numero_da_rodada, participante_id)
  VALUES
    (v_b.id, p_resultado_id, v_dono, v_pos, v_round, p_participante_id);

  RETURN public.obter_batalha(p_codigo_de_acesso);
END;
$$;

-- --------------------------------------------------------------------------
-- 6.9 Desafio legado (/d/CODIGO)
-- --------------------------------------------------------------------------

CREATE FUNCTION public.obter_desafio(p_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_d public.desafios;
  v_desafiante jsonb;
  v_desafiado jsonb;
BEGIN
  IF p_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_d
    FROM public.desafios d
   WHERE d.id = p_id;

  IF v_d.id IS NULL THEN
    RETURN NULL;
  END IF;

  /*
    `caminho_do_audio` vira NULL quando o resultado está escondido — mesmo
    tratamento de `obter_batalha`. Sem isto, a moderação dependeria só da policy
    do Storage, e a tela renderizaria um player que nunca toca.
  */
  SELECT jsonb_build_object(
           'id',               r.id,
           'nota',             r.nota,
           'classificacao',    r.classificacao,
           'esta_escondido',   r.esta_escondido,
           'caminho_do_audio', CASE WHEN r.esta_escondido THEN NULL ELSE r.caminho_do_audio END
         )
    INTO v_desafiante
    FROM public.resultados r
   WHERE r.id = v_d.resultado_desafiante_id;

  SELECT jsonb_build_object(
           'id',               r.id,
           'nota',             r.nota,
           'classificacao',    r.classificacao,
           'esta_escondido',   r.esta_escondido,
           'caminho_do_audio', CASE WHEN r.esta_escondido THEN NULL ELSE r.caminho_do_audio END
         )
    INTO v_desafiado
    FROM public.resultados r
   WHERE r.id = v_d.resultado_desafiado_id;

  /*
    Um desafio sem desafiante é impossível pelo schema (`resultado_desafiante_id`
    é NOT NULL), mas o resultado pode ter sido apagado por CASCATA de conta. Se
    isso aconteceu, não há duelo para mostrar — e devolver o objeto pela metade
    faria a tela quebrar ao ler a nota do desafiante.
  */
  IF v_desafiante IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id',                    v_d.id,
    'criado_em',             v_d.criado_em,
    'vencedor',              v_d.vencedor,
    'resolvido_em',          v_d.resolvido_em,
    'resultado_desafiante',  v_desafiante,
    'resultado_desafiado',   v_desafiado
  );
END;
$$;

CREATE FUNCTION public.responder_desafio(p_id text, p_resultado_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_afetadas integer;
BEGIN
  /*
    A checagem de posse era feita pela policy de UPDATE. SECURITY DEFINER roda
    como dono da tabela e NÃO passa por policy, então a regra precisa ser
    reafirmada aqui — de propósito chamando a MESMA função, e não recopiando o
    predicado. Recopiar corpo de função é o padrão que já custou duas
    regressões silenciosas a este projeto (ver deriva-de-funcoes.migracoes.test.ts).
  */
  IF NOT public.pode_usar_como_desafiado(p_resultado_id) THEN
    RAISE EXCEPTION 'Este resultado não é seu.'
      USING ERRCODE = '42501';
  END IF;

  /*
    `resultado_desafiado_id IS NULL` reproduz o USING da policy: duelo já
    respondido não aceita segunda resposta. Os triggers `on_desafio_set_winner`
    e `on_desafio_update` continuam disparando normalmente — SECURITY DEFINER
    não desliga trigger — então o vencedor segue sendo decidido pelo servidor e
    os campos imutáveis seguem protegidos.
  */
  UPDATE public.desafios d
     SET resultado_desafiado_id = p_resultado_id
   WHERE d.id = p_id
     AND d.resultado_desafiado_id IS NULL;

  GET DIAGNOSTICS v_afetadas = ROW_COUNT;

  IF v_afetadas = 0 THEN
    RAISE EXCEPTION 'Este desafio não existe ou já foi respondido.'
      USING ERRCODE = 'P0002';
  END IF;

  -- Mesma escolha de `responder_batalha`: devolver o estado inteiro, montado
  -- por um dono só da forma, em vez de duplicar o jsonb_build_object aqui.
  RETURN public.obter_desafio(p_id);
END;
$$;

-- ===========================================================================
-- 6.10 Funções de features DESLIGADAS
--
-- Renomeadas para PT, mas parâmetros e colunas de saída seguem os nomes das
-- tabelas que elas leem — `comentarios`, `reacoes`, `posts_comunidade`,
-- `seguidores`, `favoritos`, `campeonatos`, `conquistas` continuam em inglês.
-- A única exceção é o que vem de `perfis`, que mudou de verdade.
-- ===========================================================================

-- `avatar_url` na SAÍDA é mantido de propósito: a feature de comentários está
-- desligada e não vale mexer no cliente dela por causa desta migração.
CREATE FUNCTION public.listar_comentarios(p_post_id uuid DEFAULT NULL, p_result_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, content text, created_at timestamptz, user_id uuid, apelido text, avatar_url text)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT
    c.id,
    c.content,
    c.created_at,
    c.user_id,
    p.apelido,
    p.url_do_avatar AS avatar_url
  FROM public.comentarios c
  LEFT JOIN public.perfis p ON p.id = c.user_id
  WHERE (p_post_id   IS NOT NULL AND c.post_id   = p_post_id)
     OR (p_result_id IS NOT NULL AND c.result_id = p_result_id)
  ORDER BY c.created_at ASC;
$$;

CREATE FUNCTION public.criar_comentario(p_conteudo text, p_post_id uuid DEFAULT NULL, p_result_id uuid DEFAULT NULL)
RETURNS public.comentarios
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_conteudo text;
  v_linha public.comentarios;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário precisa estar autenticado' USING ERRCODE = '28000';
  END IF;

  -- Mesmo invariante da constraint `comentarios_alvo_unico`, checado aqui para
  -- devolver erro legível em vez de violação de CHECK.
  IF num_nonnulls(p_post_id, p_result_id) <> 1 THEN
    RAISE EXCEPTION 'Informe exatamente um alvo: post ou resultado' USING ERRCODE = '22023';
  END IF;

  v_conteudo := btrim(coalesce(p_conteudo, ''));

  IF char_length(v_conteudo) = 0 THEN
    RAISE EXCEPTION 'Comentário vazio' USING ERRCODE = '22023';
  END IF;

  IF char_length(v_conteudo) > 500 THEN
    RAISE EXCEPTION 'Comentário passa de 500 caracteres' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.comentarios (post_id, result_id, user_id, content)
  VALUES (p_post_id, p_result_id, v_user_id, v_conteudo)
  RETURNING * INTO v_linha;

  RETURN v_linha;
END;
$$;

CREATE FUNCTION public.alternar_reacao(p_post_id uuid DEFAULT NULL, p_result_id uuid DEFAULT NULL, p_tipo text DEFAULT 'like')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_atual text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário precisa estar autenticado' USING ERRCODE = '28000';
  END IF;

  IF p_tipo IS NULL OR p_tipo NOT IN ('like', 'dislike') THEN
    RAISE EXCEPTION 'Tipo de reação inválido: %', p_tipo USING ERRCODE = '22023';
  END IF;

  -- Mesmo invariante da constraint `reacoes_alvo_unico`: exatamente um alvo.
  IF num_nonnulls(p_post_id, p_result_id) <> 1 THEN
    RAISE EXCEPTION 'Informe exatamente um alvo: post ou resultado' USING ERRCODE = '22023';
  END IF;

  SELECT reaction_type INTO v_atual
  FROM public.reacoes
  WHERE user_id = v_user_id
    AND (
      (p_post_id   IS NOT NULL AND post_id   = p_post_id)
      OR (p_result_id IS NOT NULL AND result_id = p_result_id)
    )
  FOR UPDATE;

  IF v_atual IS NULL THEN
    -- Sem reação ainda: cria.
    --
    -- O `SELECT ... FOR UPDATE` acima NÃO trava linha inexistente, então duas
    -- transações concorrentes do mesmo usuário (duas abas, dois aparelhos)
    -- podem chegar as duas aqui. O índice único
    -- `reacoes_uma_por_pessoa_por_post` barra a segunda, e sem este bloco o
    -- erro 23505 subiria cru até a interface como "não foi possível registrar
    -- sua curtida" — sendo que a curtida foi registrada, pela outra aba.
    BEGIN
      INSERT INTO public.reacoes (post_id, result_id, user_id, reaction_type)
      VALUES (p_post_id, p_result_id, v_user_id, p_tipo);
    EXCEPTION WHEN unique_violation THEN
      UPDATE public.reacoes
      SET reaction_type = p_tipo
      WHERE user_id = v_user_id
        AND (
          (p_post_id   IS NOT NULL AND post_id   = p_post_id)
          OR (p_result_id IS NOT NULL AND result_id = p_result_id)
        );
    END;

    RETURN p_tipo;
  END IF;

  IF v_atual = p_tipo THEN
    -- Mesmo botão de novo: desfaz.
    DELETE FROM public.reacoes
    WHERE user_id = v_user_id
      AND (
        (p_post_id   IS NOT NULL AND post_id   = p_post_id)
        OR (p_result_id IS NOT NULL AND result_id = p_result_id)
      );
    RETURN NULL;
  END IF;

  -- Botão oposto: troca curtida por descurtida (ou vice-versa).
  UPDATE public.reacoes
  SET reaction_type = p_tipo
  WHERE user_id = v_user_id
    AND (
      (p_post_id   IS NOT NULL AND post_id   = p_post_id)
      OR (p_result_id IS NOT NULL AND result_id = p_result_id)
    );

  RETURN p_tipo;
END;
$$;

CREATE FUNCTION public.alternar_seguir(p_usuario_alvo_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_segue boolean;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuário precisa estar autenticado' USING ERRCODE = '28000';
  END IF;

  IF v_caller_id = p_usuario_alvo_id THEN
    RAISE EXCEPTION 'Não é possível seguir a si mesmo' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.seguidores
    WHERE follower_id = v_caller_id AND following_id = p_usuario_alvo_id
  ) INTO v_segue;

  IF v_segue THEN
    DELETE FROM public.seguidores
    WHERE follower_id = v_caller_id AND following_id = p_usuario_alvo_id;
    RETURN false;
  ELSE
    INSERT INTO public.seguidores (follower_id, following_id)
    VALUES (v_caller_id, p_usuario_alvo_id);
    RETURN true;
  END IF;
END;
$$;

CREATE FUNCTION public.alternar_favorito(p_result_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existe boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário precisa estar autenticado' USING ERRCODE = '28000';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.favoritos
    WHERE user_id = v_user_id AND result_id = p_result_id
  ) INTO v_existe;

  IF v_existe THEN
    DELETE FROM public.favoritos WHERE user_id = v_user_id AND result_id = p_result_id;
    RETURN false;
  ELSE
    INSERT INTO public.favoritos (user_id, result_id) VALUES (v_user_id, p_result_id);
    RETURN true;
  END IF;
END;
$$;

CREATE FUNCTION public.criar_post_social(
  p_group_id uuid,
  p_social_network text,
  p_social_url text,
  p_topic text DEFAULT 'Todos',
  p_content text DEFAULT NULL
)
RETURNS public.posts_comunidade
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_post public.posts_comunidade;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário precisa estar autenticado' USING ERRCODE = '28000';
  END IF;

  IF p_social_url IS NULL OR (p_social_url !~* '^https?://') THEN
    RAISE EXCEPTION 'URL inválida' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.posts_comunidade (
    group_id, user_id, post_type, social_network, social_url, topic, content
  ) VALUES (
    p_group_id, v_user_id, 'social_link', p_social_network, p_social_url, COALESCE(p_topic, 'Todos'), p_content
  ) RETURNING * INTO v_post;

  RETURN v_post;
END;
$$;

CREATE FUNCTION public.obter_placar_do_campeonato(p_campeonato_id uuid)
RETURNS TABLE(usuario_id uuid, apelido text, url_do_avatar text, melhor_nota numeric, resultado_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN QUERY
  WITH ranqueados AS (
    SELECT
      r.usuario_id,
      p.apelido,
      p.url_do_avatar,
      r.nota,
      r.id AS resultado_id,
      ROW_NUMBER() OVER (PARTITION BY r.usuario_id ORDER BY r.nota DESC) AS rn
    FROM public.resultados r
    JOIN public.perfis p ON p.id = r.usuario_id
    JOIN public.campeonatos c ON c.id = p_campeonato_id
    JOIN public.participantes_campeonato pc
      ON pc.championship_id = c.id AND pc.user_id = r.usuario_id
    WHERE r.criado_em >= c.start_date
      AND r.criado_em <= c.end_date
  )
  SELECT
    rr.usuario_id,
    rr.apelido,
    rr.url_do_avatar,
    rr.nota AS melhor_nota,
    rr.resultado_id
  FROM ranqueados rr
  WHERE rr.rn = 1
  ORDER BY rr.nota DESC;
END;
$$;

CREATE FUNCTION public.obter_catalogo_de_conquistas(p_user_id uuid)
RETURNS TABLE(
  id text, nome text, descricao text, icone text, categoria text,
  is_rare boolean, is_secret boolean, unlocked boolean, unlocked_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT
    c.id,
    c.nome,
    c.descricao,
    c.icone,
    c.categoria,
    c.is_rare,
    c.is_secret,
    (uc.user_id IS NOT NULL) AS unlocked,
    uc.unlocked_at
  FROM public.conquistas c
  LEFT JOIN public.conquistas_usuario uc
    ON uc.conquista_id = c.id AND uc.user_id = p_user_id
  ORDER BY c.id;
$$;

-- ===========================================================================
-- 7. TRIGGERS
--
-- Nomes também em PT. Nenhum deles é chamado por nome pelo cliente.
-- ===========================================================================

CREATE TRIGGER ao_criar_usuario
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.criar_perfil_do_novo_usuario();

CREATE TRIGGER ao_atualizar_perfil
  BEFORE UPDATE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION public.proteger_estatisticas_do_perfil();

CREATE TRIGGER ao_calcular_xp_do_resultado
  BEFORE INSERT ON public.resultados
  FOR EACH ROW EXECUTE FUNCTION public.calcular_xp_do_resultado();

CREATE TRIGGER ao_atualizar_xp_do_perfil
  AFTER INSERT ON public.resultados
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_xp_do_perfil();

CREATE TRIGGER ao_conceder_conquistas_do_resultado
  AFTER INSERT ON public.resultados
  FOR EACH ROW EXECUTE FUNCTION public.conceder_conquistas_do_resultado();

CREATE TRIGGER ao_denunciar_resultado
  AFTER INSERT ON public.denuncias
  FOR EACH ROW EXECUTE FUNCTION public.esconder_por_denuncias();

CREATE TRIGGER ao_definir_vencedor_do_desafio
  BEFORE INSERT OR UPDATE ON public.desafios
  FOR EACH ROW EXECUTE FUNCTION public.definir_vencedor_do_desafio();

CREATE TRIGGER ao_proteger_campos_do_desafio
  BEFORE UPDATE ON public.desafios
  FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_do_desafio();

/*
  Os dois gatilhos de push são recriados apenas se `pg_net` existir — mesma
  guarda da 20260807000012. Em ambiente sem a extensão, o webhook nunca existiu
  e não é esta migração que vai criá-lo.
*/
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    EXECUTE 'CREATE TRIGGER ao_comentar_notificar_push
               AFTER INSERT ON public.comentarios
               FOR EACH ROW EXECUTE FUNCTION public.notificar_evento_push()';

    EXECUTE 'CREATE TRIGGER ao_responder_desafio_notificar_push
               AFTER UPDATE ON public.desafios
               FOR EACH ROW EXECUTE FUNCTION public.notificar_evento_push()';
  END IF;
END;
$$;

-- ===========================================================================
-- 8. COMENTÁRIOS DE SCHEMA
--
-- COMMENT sobrevive ao rename da tabela, mas o texto dentro dele não: vários
-- citavam nomes de coluna e de RPC que deixaram de existir.
-- ===========================================================================

COMMENT ON TABLE public.resultados IS
  'Gravações avaliadas. NÃO existe policy de SELECT: a leitura pelo cliente passa por RPC SECURITY DEFINER (enviar_resultado, obter_batalha, obter_desafio). Escrita revogada desde 20260807000011.';

COMMENT ON TABLE public.desafios IS
  'Duelo legado /d/CODIGO, turno único e congelado. NÃO existe policy de SELECT: leitura e resposta passam por obter_desafio / responder_desafio. INSERT continua direto, gateado por pode_usar_como_desafiante.';

COMMENT ON TABLE public.batalhas IS
  'Sessão de duelo. O codigo_de_acesso é a única credencial: NÃO existe policy de SELECT nesta tabela, todo acesso passa pelas RPCs criar_batalha / obter_batalha / responder_batalha.';

COMMENT ON COLUMN public.resultados.caminho_do_audio IS
  'Caminho do objeto no bucket audio_records, no formato <usuario_id>/<resultado_id>.<ext>. Escrito UMA única vez, exclusivamente pela RPC definir_audio_do_resultado. NULL significa que não há áudio — gravação anônima nunca tem, porque a policy de INSERT do bucket é TO authenticated.';

COMMENT ON COLUMN public.resultados.esta_travado_por_moderacao IS
  'Um humano já decidiu sobre este resultado. Trava o gatilho automático de denúncias nos dois sentidos: nem esconde o que foi liberado, nem interfere no que foi escondido à mão. Só muda pelo SQL Editor — ver docs/technical/moderacao-de-audio.md.';

COMMENT ON COLUMN public.desafios.vencedor IS
  'Decidido exclusivamente pelo trigger ao_definir_vencedor_do_desafio. Valor enviado pelo cliente é sempre descartado.';

COMMENT ON COLUMN public.participantes_batalha.ordem_do_turno IS
  'Posição na ordem de turnos, 1..5, na ordem em que os nomes foram digitados. NÃO derive ordem de entrou_em: now() é o início da transação e todos os participantes de uma disputa nascem com o mesmo valor.';

COMMIT;
