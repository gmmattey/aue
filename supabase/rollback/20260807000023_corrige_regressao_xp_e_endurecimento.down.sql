-- =============================================================================
-- ROLLBACK MANUAL de 20260807000023_corrige_regressao_xp_e_endurecimento.sql
--
-- USO DE EMERGÊNCIA. Leia `supabase/rollback/README.md` antes.
--
-- AVISO — ESTE ROLLBACK ANDA PARA TRÁS, PARA UM ESTADO PIOR:
--   * Reintroduz o bug C1: o XP volta a NÃO acumular e o nível a NÃO subir,
--     silenciosamente. Era o estado vigente antes desta migração.
--   * Reintroduz A2: volta a bastar 3 requisições ANÔNIMAS para esconder
--     qualquer gravação do feed e do ranking.
--   * Reintroduz M5: completar desafio volta a aceitar resultado de terceiro.
--   * Reintroduz A3: `origin_subtype` e `group_id` voltam a nunca ser gravados,
--     e o `player_name` do cliente volta a valer para usuário logado — o que
--     faz o ranking global exibir o mesmo nome em todas as linhas.
--
-- NÃO RECUPERA DADOS. As denúncias já gravadas com `user_id` mantêm o valor; a
-- coluna é removida no passo 3 e esses vínculos são PERDIDOS DE VEZ. Se isso
-- importar, faça `pg_dump` da tabela antes.
--
-- NÃO VALIDADO: escrito e revisado por leitura, sem Postgres neste ambiente.
-- Rode dentro de BEGIN / ROLLBACK e confira antes de confirmar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. A3 — volta `submit_resultado` para a assinatura de 6 parâmetros.
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.submit_resultado(
  numeric, numeric, numeric, numeric, text, text, text, uuid
);

CREATE FUNCTION public.submit_resultado(
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
    auth.uid()
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_resultado(numeric, numeric, numeric, numeric, text, text)
  TO anon, authenticated;

ALTER TABLE public.resultados
  DROP CONSTRAINT IF EXISTS resultados_origin_subtype_len,
  DROP CONSTRAINT IF EXISTS resultados_origin_subtype_coerente;


-- -----------------------------------------------------------------------------
-- 2. M9 — remove a exigência de alvo único.
-- -----------------------------------------------------------------------------

ALTER TABLE public.comentarios DROP CONSTRAINT IF EXISTS comentarios_alvo_unico;
ALTER TABLE public.reacoes     DROP CONSTRAINT IF EXISTS reacoes_alvo_unico;


-- -----------------------------------------------------------------------------
-- 3. M5 — devolve o UPDATE aberto de `desafios`.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Enable update for owner of challenged result" ON public.desafios;

CREATE POLICY "Enable update for everyone"
ON public.desafios FOR UPDATE
TO anon, authenticated
USING (challenged_result_id IS NULL)
WITH CHECK (challenged_result_id IS NOT NULL);

DROP FUNCTION IF EXISTS public.can_use_as_challenged(uuid);


-- -----------------------------------------------------------------------------
-- 4. A2 — devolve a denúncia anônima e sem deduplicação.
--
-- ATENÇÃO: o DROP COLUMN abaixo apaga de vez o vínculo entre denúncia e
-- denunciante. Não há como reconstruí-lo depois.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_reports_and_hide()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  report_count integer;
BEGIN
  SELECT COUNT(*) INTO report_count
  FROM public.denuncias
  WHERE result_id = NEW.result_id;

  IF report_count >= 3 THEN
    UPDATE public.resultados SET is_hidden = true WHERE id = NEW.result_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Authenticated users can report once per result" ON public.denuncias;
DROP POLICY IF EXISTS "Users can view their own reports" ON public.denuncias;

CREATE POLICY "Allow anyone to insert denunciation"
ON public.denuncias FOR INSERT
TO public
WITH CHECK (true);

GRANT INSERT ON public.denuncias TO anon;

DROP INDEX IF EXISTS public.denuncias_uma_por_pessoa_por_resultado;

ALTER TABLE public.denuncias
  DROP CONSTRAINT IF EXISTS denuncias_reason_len,
  DROP COLUMN IF EXISTS user_id;


-- -----------------------------------------------------------------------------
-- 5. M8 — remove os search_path fixados.
-- -----------------------------------------------------------------------------

ALTER FUNCTION public.process_result_xp()                SET search_path = "$user", public;
ALTER FUNCTION public.get_championship_leaderboard(uuid) SET search_path = "$user", public;
ALTER FUNCTION public.protect_desafio_fields()           SET search_path = "$user", public;
ALTER FUNCTION public.set_desafio_winner()               SET search_path = "$user", public;


-- -----------------------------------------------------------------------------
-- 6. C1 — devolve `protect_profile_stats()` ao estado da 20260807000021.
--
-- É o estado COM o bug: sem a válvula `app.allow_stat_update`, o XP volta a
-- ser revertido em todo UPDATE e nunca acumula.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_profile_stats()
RETURNS trigger AS $$
BEGIN
  NEW.xp_total = OLD.xp_total;
  NEW.nivel = OLD.nivel;
  NEW.is_founder = OLD.is_founder;
  NEW.is_premium = OLD.is_premium;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
