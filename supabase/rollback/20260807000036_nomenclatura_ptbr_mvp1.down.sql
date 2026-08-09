-- =============================================================================
-- ROLLBACK MANUAL de 20260807000036_nomenclatura_ptbr_mvp1.sql
--
-- USO DE EMERGÊNCIA. Leia `supabase/rollback/README.md` antes.
--
-- LEIA ISTO ANTES DE EXECUTAR QUALQUER LINHA
-- ------------------------------------------
-- Este rollback desfaz a tradução do schema do MVP1 para português: devolve
-- `perfis` para `profiles`, as colunas para os nomes em inglês, as constraints
-- e índices para os nomes antigos, e recria as 32 funções exatamente como
-- estavam antes.
--
-- NENHUMA LINHA É APAGADA. Rename é operação de catálogo; os dados não se
-- movem. O risco aqui não é perda de dado — é DESCASAMENTO COM O CLIENTE.
--
-- O CLIENTE PRECISA VOLTAR JUNTO, E ISSO NÃO É NEGOCIÁVEL
-- ------------------------------------------------------
-- A 20260807000036 foi corte seco: o frontend publicado depois dela chama
-- `enviar_resultado`, lê `nota`/`classificacao`/`caminho_do_audio` e espera as
-- chaves em português no jsonb de `obter_batalha` e `obter_desafio`.
--
-- Rodar este rollback com o build novo no ar QUEBRA O JOGO INTEIRO: gravar,
-- desafiar, responder e revanche param os quatro, com erro de "função não
-- existe" ou campo `undefined` na tela.
--
-- A ordem correta é: publicar o build anterior PRIMEIRO, confirmar que ele
-- está servindo, e só então rodar este arquivo.
--
-- O QUE ESTE ROLLBACK NÃO TOCA, DE PROPÓSITO
-- ------------------------------------------
--   * `aue_score_v1`, `aue_classification_v1`, `aue_origin_score_v1` e
--     `aue_codigo_de_batalha_v1` — a 000036 não mexeu nelas (não leem tabela),
--     e as três primeiras estão presas pelos CHECKs de coerência. Derrubá-las
--     aqui seria estrago gratuito.
--   * As 13 tabelas de features desligadas. Elas nunca entraram no rename.
--
-- VALORES DE `desafios.winner`
-- ----------------------------
-- A 000036 traduziu o CONTEÚDO da coluna, não só o nome. Este rollback
-- traduz de volta ('desafiante' → 'challenger' etc.). Antes de rodar, veja o
-- tamanho do problema:
--
--   select vencedor, count(*) from public.desafios group by vencedor;
--
-- Nos dois ambientes a tabela estava vazia quando a 000036 subiu. Se não
-- estiver mais, a conversão de volta é exata e sem perda — são três valores
-- fechados.
--
-- CONFERÊNCIA DEPOIS DE RODAR
-- ---------------------------
--   select count(*) from information_schema.columns
--    where table_schema='public' and table_name='resultados' and column_name='score';
--   -- espera 1
--
--   select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--    where n.nspname='public' and proname='submit_resultado';
--   -- espera 1 linha
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Triggers e policies que dependem do que será derrubado
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS ao_criar_usuario ON auth.users;
DROP TRIGGER IF EXISTS ao_atualizar_perfil ON public.perfis;
DROP TRIGGER IF EXISTS ao_calcular_xp_do_resultado ON public.resultados;
DROP TRIGGER IF EXISTS ao_atualizar_xp_do_perfil ON public.resultados;
DROP TRIGGER IF EXISTS ao_conceder_conquistas_do_resultado ON public.resultados;
DROP TRIGGER IF EXISTS ao_denunciar_resultado ON public.denuncias;
DROP TRIGGER IF EXISTS ao_definir_vencedor_do_desafio ON public.desafios;
DROP TRIGGER IF EXISTS ao_proteger_campos_do_desafio ON public.desafios;
DROP TRIGGER IF EXISTS ao_comentar_notificar_push ON public.comentarios;
DROP TRIGGER IF EXISTS ao_responder_desafio_notificar_push ON public.desafios;

DROP POLICY IF EXISTS "Enable insert for owner of challenger result" ON public.desafios;
DROP POLICY IF EXISTS "Enable update for owner of challenged result" ON public.desafios;

DROP FUNCTION IF EXISTS public.criar_perfil_do_novo_usuario();
DROP FUNCTION IF EXISTS public.proteger_estatisticas_do_perfil();
DROP FUNCTION IF EXISTS public.calcular_xp_do_resultado();
DROP FUNCTION IF EXISTS public.atualizar_xp_do_perfil();
DROP FUNCTION IF EXISTS public.conceder_conquistas_do_resultado();
DROP FUNCTION IF EXISTS public.esconder_por_denuncias();
DROP FUNCTION IF EXISTS public.definir_vencedor_do_desafio();
DROP FUNCTION IF EXISTS public.proteger_campos_do_desafio();
DROP FUNCTION IF EXISTS public.notificar_evento_push();
DROP FUNCTION IF EXISTS public.pode_usar_como_desafiante(uuid);
DROP FUNCTION IF EXISTS public.pode_usar_como_desafiado(uuid);
DROP FUNCTION IF EXISTS public.aue_compare_results_v1(uuid, uuid);
DROP FUNCTION IF EXISTS public.enviar_resultado(numeric, numeric, numeric, numeric, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.definir_audio_do_resultado(uuid, text);
DROP FUNCTION IF EXISTS public.remover_audio_do_resultado(uuid);
DROP FUNCTION IF EXISTS public.criar_batalha(uuid);
DROP FUNCTION IF EXISTS public.criar_batalha_presencial(text[], integer, text);
DROP FUNCTION IF EXISTS public.obter_batalha(text);
DROP FUNCTION IF EXISTS public.responder_batalha(text, uuid, uuid);
DROP FUNCTION IF EXISTS public.obter_desafio(text);
DROP FUNCTION IF EXISTS public.responder_desafio(text, uuid);
DROP FUNCTION IF EXISTS public.listar_comentarios(uuid, uuid);
DROP FUNCTION IF EXISTS public.criar_comentario(text, uuid, uuid);
DROP FUNCTION IF EXISTS public.alternar_reacao(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.alternar_seguir(uuid);
DROP FUNCTION IF EXISTS public.alternar_favorito(uuid);
DROP FUNCTION IF EXISTS public.criar_post_social(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.obter_placar_do_campeonato(uuid);
DROP FUNCTION IF EXISTS public.obter_catalogo_de_conquistas(uuid);

-- -----------------------------------------------------------------------------
-- 2. Valores de `desafios.vencedor` voltam para o inglês
-- -----------------------------------------------------------------------------

ALTER TABLE public.desafios DROP CONSTRAINT IF EXISTS desafios_vencedor_valido;

UPDATE public.desafios
   SET vencedor = CASE vencedor
     WHEN 'desafiante' THEN 'challenger'
     WHEN 'desafiado'  THEN 'challenged'
     WHEN 'empate'     THEN 'tie'
     ELSE vencedor
   END
 WHERE vencedor IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. CHECKs de `resultados` voltam aos nomes e colunas antigos
--
-- A 000036 os REDECLAROU (não renomeou), então aqui eles são derrubados e
-- recriados na forma original — inclusive o `NOT VALID`.
-- -----------------------------------------------------------------------------

ALTER TABLE public.resultados
  DROP CONSTRAINT IF EXISTS resultados_nota_no_intervalo,
  DROP CONSTRAINT IF EXISTS resultados_parciais_no_intervalo,
  DROP CONSTRAINT IF EXISTS resultados_nota_coerente,
  DROP CONSTRAINT IF EXISTS resultados_classificacao_coerente,
  DROP CONSTRAINT IF EXISTS resultados_e_artificial_coerente,
  DROP CONSTRAINT IF EXISTS resultados_nota_da_origem_coerente,
  DROP CONSTRAINT IF EXISTS resultados_tipo_de_origem_valido,
  DROP CONSTRAINT IF EXISTS resultados_subtipo_de_origem_tamanho,
  DROP CONSTRAINT IF EXISTS resultados_subtipo_de_origem_coerente,
  DROP CONSTRAINT IF EXISTS resultados_nome_do_jogador_tamanho,
  DROP CONSTRAINT IF EXISTS resultados_caminho_do_audio_formato;

-- -----------------------------------------------------------------------------
-- 4. Índices e demais constraints
-- -----------------------------------------------------------------------------

ALTER INDEX public.perfis_fundadores                RENAME TO profiles_fundadores;
ALTER INDEX public.resultados_por_caminho_do_audio  RENAME TO resultados_por_audio_path;

ALTER TABLE public.resultados RENAME CONSTRAINT resultados_usuario_id_fkey TO resultados_user_id_fkey;
ALTER TABLE public.resultados RENAME CONSTRAINT resultados_grupo_id_fkey   TO resultados_group_id_fkey;

ALTER TABLE public.desafios RENAME CONSTRAINT desafios_resultado_desafiante_id_fkey TO desafios_challenger_result_id_fkey;
ALTER TABLE public.desafios RENAME CONSTRAINT desafios_resultado_desafiado_id_fkey  TO desafios_challenged_result_id_fkey;

ALTER TABLE public.batalhas RENAME CONSTRAINT batalhas_codigo_de_acesso_formato TO batalhas_access_code_formato;
ALTER TABLE public.batalhas RENAME CONSTRAINT batalhas_tipo_de_batalha_valido   TO batalhas_battle_type_valido;
ALTER TABLE public.batalhas RENAME CONSTRAINT batalhas_tipo_de_local_valido     TO batalhas_venue_type_valido;
ALTER TABLE public.batalhas RENAME CONSTRAINT batalhas_total_de_rodadas_valido  TO batalhas_rounds_total_valido;
ALTER TABLE public.batalhas RENAME CONSTRAINT batalhas_dono_id_fkey             TO batalhas_owner_id_fkey;

ALTER TABLE public.rodadas_batalha RENAME CONSTRAINT rodadas_batalha_posicao_positiva         TO rodadas_batalha_position_positiva;
ALTER TABLE public.rodadas_batalha RENAME CONSTRAINT rodadas_batalha_numero_da_rodada_valido  TO rodadas_batalha_round_number_valido;
ALTER TABLE public.rodadas_batalha RENAME CONSTRAINT rodadas_batalha_batalha_id_fkey          TO rodadas_batalha_battle_id_fkey;
ALTER TABLE public.rodadas_batalha RENAME CONSTRAINT rodadas_batalha_resultado_id_fkey        TO rodadas_batalha_result_id_fkey;
ALTER TABLE public.rodadas_batalha RENAME CONSTRAINT rodadas_batalha_usuario_id_fkey          TO rodadas_batalha_user_id_fkey;
ALTER TABLE public.rodadas_batalha RENAME CONSTRAINT rodadas_batalha_participante_id_fkey     TO rodadas_batalha_participant_id_fkey;

ALTER TABLE public.participantes_batalha RENAME CONSTRAINT participantes_batalha_batalha_id_fkey TO participantes_batalha_battle_id_fkey;
ALTER TABLE public.participantes_batalha RENAME CONSTRAINT participantes_batalha_usuario_id_fkey TO participantes_batalha_user_id_fkey;

ALTER TABLE public.perfis RENAME CONSTRAINT perfis_pkey    TO profiles_pkey;
ALTER TABLE public.perfis RENAME CONSTRAINT perfis_id_fkey TO profiles_id_fkey;

-- -----------------------------------------------------------------------------
-- 5. Colunas
-- -----------------------------------------------------------------------------

ALTER TABLE public.resultados RENAME COLUMN criado_em                  TO created_at;
ALTER TABLE public.resultados RENAME COLUMN nota                       TO score;
ALTER TABLE public.resultados RENAME COLUMN classificacao              TO classification;
ALTER TABLE public.resultados RENAME COLUMN e_artificial               TO is_artificial;
ALTER TABLE public.resultados RENAME COLUMN duracao                    TO duration;
ALTER TABLE public.resultados RENAME COLUMN potencia                   TO power;
ALTER TABLE public.resultados RENAME COLUMN profundidade               TO depth;
ALTER TABLE public.resultados RENAME COLUMN textura                    TO texture;
ALTER TABLE public.resultados RENAME COLUMN nota_da_origem             TO origin_score;
ALTER TABLE public.resultados RENAME COLUMN tipo_de_origem             TO origin_type;
ALTER TABLE public.resultados RENAME COLUMN subtipo_de_origem          TO origin_subtype;
ALTER TABLE public.resultados RENAME COLUMN nome_do_jogador            TO player_name;
ALTER TABLE public.resultados RENAME COLUMN usuario_id                 TO user_id;
ALTER TABLE public.resultados RENAME COLUMN grupo_id                   TO group_id;
ALTER TABLE public.resultados RENAME COLUMN xp_ganho                   TO xp_earned;
ALTER TABLE public.resultados RENAME COLUMN e_elegivel_para_xp         TO is_xp_eligible;
ALTER TABLE public.resultados RENAME COLUMN caminho_do_audio           TO audio_path;
ALTER TABLE public.resultados RENAME COLUMN esta_escondido             TO is_hidden;
ALTER TABLE public.resultados RENAME COLUMN esta_travado_por_moderacao TO is_moderation_locked;

ALTER TABLE public.desafios RENAME COLUMN criado_em                TO created_at;
ALTER TABLE public.desafios RENAME COLUMN resultado_desafiante_id  TO challenger_result_id;
ALTER TABLE public.desafios RENAME COLUMN resultado_desafiado_id   TO challenged_result_id;
ALTER TABLE public.desafios RENAME COLUMN vencedor                 TO winner;
ALTER TABLE public.desafios RENAME COLUMN resolvido_em             TO resolved_at;

ALTER TABLE public.batalhas RENAME COLUMN codigo_de_acesso TO access_code;
ALTER TABLE public.batalhas RENAME COLUMN tipo_de_batalha  TO battle_type;
ALTER TABLE public.batalhas RENAME COLUMN dono_id          TO owner_id;
ALTER TABLE public.batalhas RENAME COLUMN tipo_de_local    TO venue_type;
ALTER TABLE public.batalhas RENAME COLUMN total_de_rodadas TO rounds_total;
ALTER TABLE public.batalhas RENAME COLUMN criado_em        TO created_at;
ALTER TABLE public.batalhas RENAME COLUMN expira_em        TO expires_at;
ALTER TABLE public.batalhas RENAME COLUMN finalizada_em    TO finished_at;

ALTER TABLE public.rodadas_batalha RENAME COLUMN batalha_id       TO battle_id;
ALTER TABLE public.rodadas_batalha RENAME COLUMN resultado_id     TO result_id;
ALTER TABLE public.rodadas_batalha RENAME COLUMN usuario_id       TO user_id;
ALTER TABLE public.rodadas_batalha RENAME COLUMN posicao          TO position;
ALTER TABLE public.rodadas_batalha RENAME COLUMN numero_da_rodada TO round_number;
ALTER TABLE public.rodadas_batalha RENAME COLUMN criado_em        TO created_at;
ALTER TABLE public.rodadas_batalha RENAME COLUMN participante_id  TO participant_id;

ALTER TABLE public.participantes_batalha RENAME COLUMN batalha_id     TO battle_id;
ALTER TABLE public.participantes_batalha RENAME COLUMN usuario_id     TO user_id;
ALTER TABLE public.participantes_batalha RENAME COLUMN entrou_em      TO joined_at;
ALTER TABLE public.participantes_batalha RENAME COLUMN ordem_do_turno TO turn_order;

ALTER TABLE public.perfis RENAME COLUMN url_do_avatar        TO avatar_url;
ALTER TABLE public.perfis RENAME COLUMN criado_em            TO created_at;
ALTER TABLE public.perfis RENAME COLUMN instagram            TO instagram_handle;
ALTER TABLE public.perfis RENAME COLUMN tiktok               TO tiktok_handle;
ALTER TABLE public.perfis RENAME COLUMN youtube              TO youtube_handle;
ALTER TABLE public.perfis RENAME COLUMN twitter              TO twitter_handle;
ALTER TABLE public.perfis RENAME COLUMN e_premium            TO is_premium;
ALTER TABLE public.perfis RENAME COLUMN e_fundador           TO is_founder;
ALTER TABLE public.perfis RENAME COLUMN notificar_desafios   TO notify_challenges;
ALTER TABLE public.perfis RENAME COLUMN notificar_ranking    TO notify_ranking;
ALTER TABLE public.perfis RENAME COLUMN notificar_comunidade TO notify_community;

-- -----------------------------------------------------------------------------
-- 6. Tabela
-- -----------------------------------------------------------------------------

ALTER TABLE public.perfis RENAME TO profiles;

-- -----------------------------------------------------------------------------
-- 7. CHECKs de `resultados` e de `desafios`, na forma original
-- -----------------------------------------------------------------------------

ALTER TABLE public.desafios
  ADD CONSTRAINT desafios_winner_valid
  CHECK (winner IS NULL OR winner IN ('challenger', 'challenged', 'tie'));

ALTER TABLE public.resultados
  ADD CONSTRAINT resultados_score_range
    CHECK (score >= 0 AND score <= 100) NOT VALID,

  ADD CONSTRAINT resultados_partials_range
    CHECK (
      duration >= 0 AND duration <= 100
      AND power >= 0 AND power <= 100
      AND depth >= 0 AND depth <= 100
      AND texture >= 0 AND texture <= 100
      AND origin_score >= 0 AND origin_score <= 100
    ) NOT VALID,

  ADD CONSTRAINT resultados_score_coherent
    CHECK (abs(score - public.aue_score_v1(duration, power, depth, texture, origin_score)) <= 0.01) NOT VALID,

  ADD CONSTRAINT resultados_classification_coherent
    CHECK (classification = public.aue_classification_v1(score)) NOT VALID,

  ADD CONSTRAINT resultados_is_artificial_coherent
    CHECK (is_artificial = (origin_type = 'Puxei ar')) NOT VALID,

  ADD CONSTRAINT resultados_origin_score_coherent
    CHECK (origin_score = public.aue_origin_score_v1(origin_type)) NOT VALID,

  ADD CONSTRAINT resultados_origin_type_valid
    CHECK (origin_type IN ('Espontâneo', 'Comida', 'Bebida', 'Puxei ar', 'Outro')) NOT VALID,

  ADD CONSTRAINT resultados_origin_subtype_len
    CHECK (
      origin_subtype IS NULL
      OR (char_length(btrim(origin_subtype)) >= 1 AND char_length(btrim(origin_subtype)) <= 40)
    ) NOT VALID,

  ADD CONSTRAINT resultados_origin_subtype_coerente
    CHECK (origin_subtype IS NULL OR origin_type IN ('Comida', 'Bebida')) NOT VALID,

  ADD CONSTRAINT resultados_player_name_len
    CHECK (
      player_name IS NULL
      OR (char_length(player_name) >= 1 AND char_length(player_name) <= 40)
    ) NOT VALID,

  ADD CONSTRAINT resultados_audio_path_formato
    CHECK (
      audio_path IS NULL
      OR (
        char_length(audio_path) >= 3
        AND char_length(audio_path) <= 300
        AND audio_path LIKE '%/%'
        AND audio_path NOT LIKE '%..%'
        AND audio_path NOT LIKE '/%'
      )
    ) NOT VALID;

-- -----------------------------------------------------------------------------
-- 8. Funções, no estado exato anterior à 20260807000036
--
-- Os corpos abaixo foram extraídos do banco com `pg_get_functiondef` ANTES da
-- migração subir. Não são transcrição à mão.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.aue_audio_esta_escondido(p_object_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.resultados r
     WHERE r.audio_path = p_object_name
       AND r.is_hidden
  );
$function$;

CREATE OR REPLACE FUNCTION public.aue_audio_esta_visivel(p_object_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.resultados r
     WHERE r.audio_path = p_object_name
       AND r.is_hidden = false
  );
$function$;

CREATE OR REPLACE FUNCTION public.aue_compare_results_v1(p_challenger_result_id uuid, p_challenged_result_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.aue_vaga_de_fundador_disponivel()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

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

$function$;

CREATE OR REPLACE FUNCTION public.can_use_as_challenged(p_result_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

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

$function$;

CREATE OR REPLACE FUNCTION public.can_use_as_challenger(p_result_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.resultados r
    WHERE r.id = p_result_id
      AND (
        -- Caso 1 — usuário logado: o resultado tem de ser dele.
        (auth.uid() IS NOT NULL AND r.user_id = auth.uid())

        -- Caso 2 — usuário anônimo: ver justificativa abaixo.
        OR (
          auth.uid() IS NULL
          AND r.user_id IS NULL
          AND r.created_at > timezone('utc'::text, now()) - interval '60 minutes'
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.check_reports_and_hide()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

DECLARE

  v_denunciantes integer;

  v_travado boolean;

BEGIN

  SELECT r.is_moderation_locked INTO v_travado

    FROM public.resultados r

   WHERE r.id = NEW.result_id;



  -- Um humano já olhou. A denúncia continua registrada — a trilha importa e

  -- alimenta a fila de revisão —, mas não muda mais a visibilidade sozinha.

  IF COALESCE(v_travado, false) THEN

    RETURN NEW;

  END IF;



  -- Conta PESSOAS distintas, não linhas (ver bloco acima).

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

$function$;

CREATE OR REPLACE FUNCTION public.check_result_achievements()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

BEGIN

  IF NEW.user_id IS NOT NULL THEN

    -- Primeiro Auê

    INSERT INTO public.conquistas_usuario (user_id, conquista_id)

    VALUES (NEW.user_id, 'primeiro_aue')

    ON CONFLICT DO NOTHING;



    -- Passou de 70

    IF NEW.score >= 70 THEN

      INSERT INTO public.conquistas_usuario (user_id, conquista_id)

      VALUES (NEW.user_id, 'passou_70')

      ON CONFLICT DO NOTHING;

    END IF;



    -- Passou de 90

    IF NEW.score >= 90 THEN

      INSERT INTO public.conquistas_usuario (user_id, conquista_id)

      VALUES (NEW.user_id, 'passou_90')

      ON CONFLICT DO NOTHING;

    END IF;

  END IF;



  RETURN NEW;

END;

$function$;

CREATE OR REPLACE FUNCTION public.create_social_post(p_group_id uuid, p_social_network text, p_social_url text, p_topic text DEFAULT 'Todos'::text, p_content text DEFAULT NULL::text)
 RETURNS posts_comunidade
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.criar_batalha(p_result_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.criar_batalha_presencial(p_apelidos text[], p_rounds_total integer DEFAULT 1, p_venue_type text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.criar_comentario(p_conteudo text, p_post_id uuid DEFAULT NULL::uuid, p_result_id uuid DEFAULT NULL::uuid)
 RETURNS comentarios
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

DECLARE

  v_user_id uuid := auth.uid();

  v_conteudo text;

  v_linha public.comentarios;

BEGIN

  IF v_user_id IS NULL THEN

    RAISE EXCEPTION 'Usuário precisa estar autenticado' USING ERRCODE = '28000';

  END IF;



  -- Mesmo invariante da constraint `comentarios_alvo_unico` (20260807000023),

  -- checado aqui para devolver erro legível em vez de violação de CHECK.

  IF num_nonnulls(p_post_id, p_result_id) <> 1 THEN

    RAISE EXCEPTION 'Informe exatamente um alvo: post ou resultado' USING ERRCODE = '22023';

  END IF;



  v_conteudo := btrim(coalesce(p_conteudo, ''));



  -- Espelha o CHECK de `content` criado em 20260807000005 (1 a 500 caracteres),

  -- com mensagem própria. Sem isto, comentário só de espaços passaria pelo

  -- `char_length` do CHECK original antes do btrim.

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

$function$;

CREATE OR REPLACE FUNCTION public.definir_audio_do_resultado(p_result_id uuid, p_audio_path text)
 RETURNS resultados
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

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



  IF p_result_id IS NULL THEN

    RAISE EXCEPTION 'Resultado não informado' USING ERRCODE = '22023';

  END IF;



  v_path := btrim(coalesce(p_audio_path, ''));



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

  -- as duas ver `audio_path` NULL e as duas escreverem. Sem o FOR UPDATE, a

  -- segunda sobrescreveria o ponteiro da primeira e órfãaria o objeto dela no

  -- Storage — que não tem policy de DELETE para ninguém além do próprio dono, e

  -- ninguém saberia mais o caminho.

  SELECT r.user_id, r.audio_path

    INTO v_dono, v_atual

    FROM public.resultados r

   WHERE r.id = p_result_id

     FOR UPDATE;



  IF NOT FOUND THEN

    RAISE EXCEPTION 'Resultado não encontrado' USING ERRCODE = '22023';

  END IF;



  -- Resultado anônimo (`user_id IS NULL`) cai aqui e é recusado: `IS DISTINCT

  -- FROM` trata NULL como valor, então não há como um NULL "casar" com o uid.

  IF v_dono IS DISTINCT FROM v_uid THEN

    RAISE EXCEPTION 'Este resultado não é seu' USING ERRCODE = '42501';

  END IF;



  IF v_atual IS NOT NULL THEN

    RAISE EXCEPTION 'Este resultado já tem áudio' USING ERRCODE = '55000';

  END IF;



  UPDATE public.resultados

     SET audio_path = v_path

   WHERE id = p_result_id

  RETURNING * INTO v_linha;



  RETURN v_linha;

END;

$function$;

CREATE OR REPLACE FUNCTION public.get_championship_leaderboard(champ_id uuid)
 RETURNS TABLE(user_id uuid, apelido text, avatar_url text, highest_score numeric, result_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH RankedResults AS (
    SELECT 
      r.user_id,
      p.apelido,
      p.avatar_url,
      r.score,
      r.id as result_id,
      ROW_NUMBER() OVER(PARTITION BY r.user_id ORDER BY r.score DESC) as rn
    FROM public.resultados r
    JOIN public.profiles p ON p.id = r.user_id
    JOIN public.campeonatos c ON c.id = champ_id
    JOIN public.participantes_campeonato pc ON pc.championship_id = c.id AND pc.user_id = r.user_id
    WHERE r.created_at >= c.start_date 
      AND r.created_at <= c.end_date
  )
  SELECT 
    rr.user_id,
    rr.apelido,
    rr.avatar_url,
    rr.score as highest_score,
    rr.result_id
  FROM RankedResults rr
  WHERE rr.rn = 1
  ORDER BY rr.score DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_conquistas_catalog(p_user_id uuid)
 RETURNS TABLE(id text, nome text, descricao text, icone text, categoria text, is_rare boolean, is_secret boolean, unlocked boolean, unlocked_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

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

$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  /*
    Leitura por `to_jsonb(NEW)` em vez de `NEW.is_anonymous`, de propósito.

    `auth.users` é schema gerenciado pelo Supabase: a coluna `is_anonymous`
    chegou junto com o suporte a login anônimo no GoTrue. Referenciá-la por
    nome faz a função DEIXAR DE COMPILAR num projeto cuja versão do GoTrue
    ainda não a tenha — e o erro apareceria na criação de conta, ou seja, no
    primeiro acesso de todo usuário novo.

    Pelo jsonb, coluna ausente vira NULL e o COALESCE resolve para `false`:
    degrada para o comportamento anterior a esta migração, em vez de quebrar.
  */
  v_anonimo boolean := COALESCE((to_jsonb(NEW) ->> 'is_anonymous')::boolean, false);
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
$function$;

CREATE OR REPLACE FUNCTION public.listar_comentarios(p_post_id uuid DEFAULT NULL::uuid, p_result_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, content text, created_at timestamp with time zone, user_id uuid, apelido text, avatar_url text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$

  SELECT

    c.id,

    c.content,

    c.created_at,

    c.user_id,

    p.apelido,

    p.avatar_url

  FROM public.comentarios c

  LEFT JOIN public.profiles p ON p.id = c.user_id

  WHERE (p_post_id   IS NOT NULL AND c.post_id   = p_post_id)

     OR (p_result_id IS NOT NULL AND c.result_id = p_result_id)

  ORDER BY c.created_at ASC;

$function$;

CREATE OR REPLACE FUNCTION public.notify_push_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'vault', 'net', 'pg_temp'
AS $function$
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
      RAISE WARNING 'notify_push_event: segredos push_webhook_url/push_webhook_secret ausentes no Vault; notificação ignorada';
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
    RAISE WARNING 'notify_push_event falhou (%): %', SQLSTATE, SQLERRM;
  END;

  RETURN NULL;  -- AFTER trigger: o valor de retorno é ignorado.
END;
$function$;

CREATE OR REPLACE FUNCTION public.obter_batalha(p_access_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.obter_desafio(p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    `audio_path` vira NULL quando o resultado está escondido — mesmo tratamento
    de `obter_batalha` (000033). Sem isto, a moderação dependeria só da policy
    do Storage, e a tela renderizaria um player que nunca toca.
  */
  SELECT jsonb_build_object(
           'id',             r.id,
           'score',          r.score,
           'classification', r.classification,
           'is_hidden',      r.is_hidden,
           'audio_path',     CASE WHEN r.is_hidden THEN NULL ELSE r.audio_path END
         )
    INTO v_desafiante
    FROM public.resultados r
   WHERE r.id = v_d.challenger_result_id;

  SELECT jsonb_build_object(
           'id',             r.id,
           'score',          r.score,
           'classification', r.classification,
           'is_hidden',      r.is_hidden,
           'audio_path',     CASE WHEN r.is_hidden THEN NULL ELSE r.audio_path END
         )
    INTO v_desafiado
    FROM public.resultados r
   WHERE r.id = v_d.challenged_result_id;

  /*
    Um desafio sem desafiante é impossível pelo schema (`challenger_result_id`
    é NOT NULL), mas o resultado pode ter sido apagado por CASCATA de conta. Se
    isso aconteceu, não há duelo para mostrar — e devolver o objeto pela metade
    faria a tela quebrar em `challenger_result.score`.
  */
  IF v_desafiante IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id',                v_d.id,
    'created_at',        v_d.created_at,
    'winner',            v_d.winner,
    'resolved_at',       v_d.resolved_at,
    'challenger_result', v_desafiante,
    'challenged_result', v_desafiado
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_result_xp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  recent_count integer;
  gained_xp integer := 0;
  new_nivel integer := 1;
BEGIN
  -- Only process XP for authenticated users
  IF NEW.user_id IS NOT NULL THEN
    -- Count recordings in the last 24 hours
    SELECT count(*) INTO recent_count
    FROM public.resultados
    WHERE user_id = NEW.user_id 
      AND created_at >= NOW() - INTERVAL '24 hours';

    -- Anti-farming: only first 5 get XP
    IF recent_count < 5 THEN
      NEW.is_xp_eligible := true;
      
      -- Base XP
      gained_xp := 5;
      
      -- Score bonus
      IF NEW.score >= 95 THEN
        gained_xp := gained_xp + 40;
      ELSIF NEW.score >= 90 THEN
        gained_xp := gained_xp + 30;
      ELSIF NEW.score >= 70 THEN
        gained_xp := gained_xp + 20;
      ELSIF NEW.score >= 40 THEN
        gained_xp := gained_xp + 10;
      END IF;

      NEW.xp_earned := gained_xp;
    ELSE
      NEW.is_xp_eligible := false;
      NEW.xp_earned := 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_desafio_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.protect_profile_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$

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

$function$;

CREATE OR REPLACE FUNCTION public.remover_audio_do_resultado(p_result_id uuid)
 RETURNS resultados
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

DECLARE

  v_uid   uuid := auth.uid();

  v_dono  uuid;

  v_linha public.resultados;

BEGIN

  IF v_uid IS NULL THEN

    RAISE EXCEPTION 'Usuário precisa estar autenticado' USING ERRCODE = '28000';

  END IF;



  SELECT r.user_id INTO v_dono

    FROM public.resultados r

   WHERE r.id = p_result_id

     FOR UPDATE;



  IF NOT FOUND THEN

    RAISE EXCEPTION 'Resultado não encontrado' USING ERRCODE = '22023';

  END IF;



  IF v_dono IS DISTINCT FROM v_uid THEN

    RAISE EXCEPTION 'Este resultado não é seu' USING ERRCODE = '42501';

  END IF;



  DELETE FROM public.posts_comunidade

   WHERE result_id = p_result_id

     AND user_id = v_uid

     AND post_type = 'audio_result';



  -- Idempotente: chamar de novo com `audio_path` já NULL não é erro. O cliente

  -- pode ter apagado o objeto e perdido a resposta da primeira chamada.

  UPDATE public.resultados

     SET audio_path = NULL

   WHERE id = p_result_id

  RETURNING * INTO v_linha;



  RETURN v_linha;

END;

$function$;

CREATE OR REPLACE FUNCTION public.responder_batalha(p_access_code text, p_result_id uuid, p_participant_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.responder_desafio(p_id text, p_result_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_afetadas integer;
BEGIN
  /*
    A checagem de posse era feita pela policy de UPDATE
    ("Enable update for owner of challenged result", 000023). SECURITY DEFINER
    roda como dono da tabela e NÃO passa por policy, então a regra precisa ser
    reafirmada aqui — de propósito chamando a MESMA função, e não recopiando o
    predicado. Recopiar corpo de função é o padrão que já custou duas
    regressões silenciosas a este projeto (ver deriva-de-funcoes.migracoes.test.ts).
  */
  IF NOT public.can_use_as_challenged(p_result_id) THEN
    RAISE EXCEPTION 'Este resultado não é seu.'
      USING ERRCODE = '42501';
  END IF;

  /*
    `challenged_result_id IS NULL` reproduz o USING da policy: duelo já
    respondido não aceita segunda resposta. Os triggers `on_desafio_set_winner`
    e `on_desafio_update` (000010/000011) continuam disparando normalmente —
    SECURITY DEFINER não desliga trigger — então o vencedor segue sendo
    decidido pelo servidor e os campos imutáveis seguem protegidos.
  */
  UPDATE public.desafios d
     SET challenged_result_id = p_result_id
   WHERE d.id = p_id
     AND d.challenged_result_id IS NULL;

  GET DIAGNOSTICS v_afetadas = ROW_COUNT;

  IF v_afetadas = 0 THEN
    RAISE EXCEPTION 'Este desafio não existe ou já foi respondido.'
      USING ERRCODE = 'P0002';
  END IF;

  -- Mesma escolha de `responder_batalha`: devolver o estado inteiro, montado
  -- por um dono só da forma, em vez de duplicar o jsonb_build_object aqui.
  RETURN public.obter_desafio(p_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_desafio_winner()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.submit_resultado(p_duration numeric, p_power numeric, p_depth numeric, p_texture numeric, p_origin_type text, p_player_name text DEFAULT NULL::text, p_origin_subtype text DEFAULT NULL::text, p_group_id uuid DEFAULT NULL::uuid)
 RETURNS resultados
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

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

$function$;

CREATE OR REPLACE FUNCTION public.toggle_favorite(p_result_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_exists boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário precisa estar autenticado' USING ERRCODE = '28000';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.favoritos
    WHERE user_id = v_user_id AND result_id = p_result_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.favoritos WHERE user_id = v_user_id AND result_id = p_result_id;
    RETURN false;
  ELSE
    INSERT INTO public.favoritos (user_id, result_id) VALUES (v_user_id, p_result_id);
    RETURN true;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_follow(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_following boolean;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuário precisa estar autenticado' USING ERRCODE = '28000';
  END IF;

  IF v_caller_id = target_user_id THEN
    RAISE EXCEPTION 'Não é possível seguir a si mesmo' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.seguidores
    WHERE follower_id = v_caller_id AND following_id = target_user_id
  ) INTO v_is_following;

  IF v_is_following THEN
    DELETE FROM public.seguidores
    WHERE follower_id = v_caller_id AND following_id = target_user_id;
    RETURN false;
  ELSE
    INSERT INTO public.seguidores (follower_id, following_id)
    VALUES (v_caller_id, target_user_id);
    RETURN true;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_reacao(p_post_id uuid DEFAULT NULL::uuid, p_result_id uuid DEFAULT NULL::uuid, p_tipo text DEFAULT 'like'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

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



  -- Mesmo invariante da constraint `reacoes_alvo_unico` (20260807000023):

  -- exatamente um alvo. Checado aqui também para devolver erro legível em vez

  -- de violação de CHECK.

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

    --

    -- Tratando a violação como "já existe", a operação vira idempotente: o

    -- segundo caminho apenas garante o tipo pedido e devolve o mesmo estado.

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

$function$;

CREATE OR REPLACE FUNCTION public.update_profile_xp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;


-- -----------------------------------------------------------------------------
-- 9. Triggers e policies, na forma original
-- -----------------------------------------------------------------------------

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_stats();

CREATE TRIGGER trigger_process_result_xp
  BEFORE INSERT ON public.resultados
  FOR EACH ROW EXECUTE FUNCTION public.process_result_xp();

CREATE TRIGGER trigger_update_profile_xp
  AFTER INSERT ON public.resultados
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_xp();

CREATE TRIGGER trigger_check_result_achievements
  AFTER INSERT ON public.resultados
  FOR EACH ROW EXECUTE FUNCTION public.check_result_achievements();

CREATE TRIGGER trigger_check_reports
  AFTER INSERT ON public.denuncias
  FOR EACH ROW EXECUTE FUNCTION public.check_reports_and_hide();

CREATE TRIGGER on_desafio_set_winner
  BEFORE INSERT OR UPDATE ON public.desafios
  FOR EACH ROW EXECUTE FUNCTION public.set_desafio_winner();

CREATE TRIGGER on_desafio_update
  BEFORE UPDATE ON public.desafios
  FOR EACH ROW EXECUTE FUNCTION public.protect_desafio_fields();

-- Mesma guarda da 20260807000012: sem `pg_net`, o webhook nunca existiu.
DO $rollback$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    EXECUTE 'CREATE TRIGGER on_comentario_notify_push
               AFTER INSERT ON public.comentarios
               FOR EACH ROW EXECUTE FUNCTION public.notify_push_event()';

    EXECUTE 'CREATE TRIGGER on_desafio_notify_push
               AFTER UPDATE ON public.desafios
               FOR EACH ROW EXECUTE FUNCTION public.notify_push_event()';
  END IF;
END;
$rollback$;

CREATE POLICY "Enable insert for owner of challenger result"
  ON public.desafios FOR INSERT
  TO anon, authenticated
  WITH CHECK (public.can_use_as_challenger(challenger_result_id));

CREATE POLICY "Enable update for owner of challenged result"
  ON public.desafios FOR UPDATE
  TO anon, authenticated
  USING (challenged_result_id IS NULL)
  WITH CHECK (
    challenged_result_id IS NOT NULL
    AND public.can_use_as_challenged(challenged_result_id)
  );

-- -----------------------------------------------------------------------------
-- 10. COMMENTs, como estavam
-- -----------------------------------------------------------------------------

COMMENT ON TABLE public.resultados IS
  'Gravações avaliadas. NÃO existe policy de SELECT: a leitura pelo cliente passa por RPC SECURITY DEFINER (submit_resultado, obter_batalha, obter_desafio). Escrita revogada desde 20260807000011.';

COMMENT ON TABLE public.desafios IS
  'Duelo legado /d/CODIGO, turno único e congelado. NÃO existe policy de SELECT: leitura e resposta passam por obter_desafio / responder_desafio. INSERT continua direto, gateado por can_use_as_challenger (20260807000016).';

COMMENT ON TABLE public.batalhas IS
  'Sessão de duelo. O access_code é a única credencial: NÃO existe policy de SELECT nesta tabela, todo acesso passa pelas RPCs criar_batalha / obter_batalha / responder_batalha.';

COMMIT;
