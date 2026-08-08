-- =============================================================================
-- Moderação que alcança o áudio: bucket privado, ocultação com efeito real,
-- decisão humana que o gatilho automático não desfaz, e exclusão pelo titular.
--
-- CONTEXTO: a 20260807000027 ligou o áudio ponta a ponta, e ao fazer isso
-- transformou uma lacuna teórica em operacional. `resultados.is_hidden`
-- (20260807000014) esconde a linha do ranking, mas o bucket `audio_records` é
-- PÚBLICO (20260807000013, `public = true`): esconder um resultado denunciado
-- não tirava — e até esta migração não tira — o áudio do ar. A URL continua
-- tocando para qualquer pessoa que já a tenha.
--
-- O PONTO ESTRUTURAL: enquanto o bucket for público, NENHUMA coluna do banco
-- torna um áudio inacessível. Storage público não consulta RLS; serve o arquivo
-- direto. Por isso esta migração REVERTE o `public = true` da 20260807000013.
-- Isso é uma mudança de contrato deliberada, autorizada por Luiz, e quebra
-- qualquer URL pública de áudio já distribuída.
--
-- COM O BUCKET PRIVADO, a emissão de URL assinada (`createSignedUrl`) passa a
-- ser autorizada contra a policy de SELECT de `storage.objects`. É esse o
-- gancho: a policy faz join com `public.resultados` pelo `audio_path` e exige
-- `is_hidden = false`. Esconder passa a cortar o áudio na próxima assinatura, e
-- de forma REVERSÍVEL — restaurar devolve o som, o que apagar o arquivo não
-- faria.
--
-- O QUE ISTO NÃO É: privacidade. A policy contempla `anon` de propósito, porque
-- quem abre /d/CODIGO vindo do WhatsApp está deslogado e precisa ouvir o arroto
-- do desafiante. Como a chave anônima é pública, qualquer pessoa consegue
-- assinar a URL de qualquer áudio NÃO escondido. O ganho aqui é
-- REVOGABILIDADE, não sigilo. Quem quiser sigilo precisa de outro desenho, e
-- ele não cabe num produto cujo feed é público.
--
-- O QUE JÁ ESTAVA CERTO E NÃO FOI MEXIDO: a 20260807000023 (seção A2) já
-- resolveu a sabotagem por denúncia — `denuncias.user_id`, índice único
-- `denuncias_uma_por_pessoa_por_resultado`, policy `TO authenticated` com
-- `auth.uid() = user_id`, `REVOKE INSERT ... FROM anon` e contagem de PESSOAS
-- distintas. Esta migração não recria nada disso.
--
-- VERIFICAR DEPOIS DE APLICAR:
--   1. `select public from storage.buckets where id = 'audio_records';`
--      -> DEVE ser `false`. Se continuar `true`, todo o resto desta migração é
--      decorativo: o Storage serve o arquivo sem consultar policy nenhuma.
--   2. Pegue um `audio_path` de um resultado com `is_hidden = false` e, com a
--      CHAVE ANÔNIMA, chame `createSignedUrl`. DEVE funcionar — é o caminho do
--      visitante do WhatsApp. Se falhar, o desafio fica mudo para quem chega
--      pelo link, que é o pior resultado possível.
--   3. Marque esse mesmo resultado com `is_hidden = true` e repita: a assinatura
--      DEVE passar a falhar. Uma URL assinada emitida ANTES continua válida até
--      expirar — ver a seção 2 sobre o TTL.
--   4. `select indexname from pg_indexes where indexname = 'resultados_por_audio_path';`
--      -> a policy faz join por `audio_path` a cada objeto avaliado.
--   5. Denuncie um resultado com `is_moderation_locked = true` a partir de três
--      contas distintas: ele NÃO pode ser escondido pelo gatilho.
--
-- NÃO VALIDADO: não há Postgres, psql nem Supabase CLI neste ambiente. Escrito
-- e revisado por leitura, sem passar por parser. Rollback em
-- `supabase/rollback/20260807000028_moderacao_de_audio.down.sql`.
-- Runbook de operação em `docs/technical/moderacao-de-audio.md`.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. O bucket deixa de ser público.
--
-- `UPDATE`, e não `INSERT ... ON CONFLICT`, porque a linha já existe desde a
-- 20260807000013 e o objetivo aqui é mudar UM campo. Limite de tamanho e lista
-- de mime types ficam como estão.
-- -----------------------------------------------------------------------------

UPDATE storage.buckets
   SET public = false
 WHERE id = 'audio_records';


-- -----------------------------------------------------------------------------
-- 2. Índice para o join da policy.
--
-- A policy de SELECT abaixo é avaliada POR OBJETO. Sem índice em
-- `resultados.audio_path`, cada avaliação é uma varredura sequencial em
-- `resultados` — e o feed pede várias assinaturas seguidas.
--
-- Parcial (`WHERE audio_path IS NOT NULL`) porque a esmagadora maioria das
-- linhas não tem áudio: toda gravação anônima, e tudo que é anterior à
-- 20260807000027.
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS resultados_por_audio_path
  ON public.resultados (audio_path)
  WHERE audio_path IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 3. Leitura do áudio passa a depender de `is_hidden`.
--
-- A policy antiga liberava o bucket inteiro para qualquer um:
--
--     CREATE POLICY "Public Read Access for Audio"
--     ON storage.objects FOR SELECT TO public
--     USING (bucket_id = 'audio_records');
--
-- Ela precisa SAIR, não apenas ser complementada: policies de SELECT são
-- combinadas por OR, então mantê-la anularia qualquer restrição nova.
--
-- SÃO DUAS POLICIES, e a segunda não é conveniência:
--
--   (a) A pública gateia por `is_hidden`. Inclui `anon` porque o visitante do
--       desafio está deslogado.
--
--   (b) A do dono existe porque há uma JANELA REAL em que o objeto existe e
--       nenhuma linha o referencia: `enviarAudioDoResultado` sobe o arquivo
--       ANTES de chamar `definir_audio_do_resultado` (o caminho deriva do id do
--       resultado, que só existe depois do INSERT). Sem (b), o próprio dono não
--       enxerga o objeto que acabou de subir, e a limpeza do órfão em caso de
--       falha da RPC pode não conseguir sequer localizá-lo.
--
--       (b) TAMBÉM respeita `is_hidden`. Se não respeitasse, o dono de um áudio
--       escondido por moderação continuaria assinando a própria URL e
--       distribuindo o arquivo — a moderação valeria para todos menos para
--       quem ela existe para conter.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public Read Access for Audio" ON storage.objects;
DROP POLICY IF EXISTS "Audio is readable while not hidden" ON storage.objects;
DROP POLICY IF EXISTS "Owners can read their own pending audio" ON storage.objects;

CREATE POLICY "Audio is readable while not hidden"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'audio_records'
  AND EXISTS (
    SELECT 1
      FROM public.resultados r
     WHERE r.audio_path = storage.objects.name
       AND r.is_hidden = false
  )
);

CREATE POLICY "Owners can read their own pending audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'audio_records'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND NOT EXISTS (
    SELECT 1
      FROM public.resultados r
     WHERE r.audio_path = storage.objects.name
       AND r.is_hidden
  )
);


-- -----------------------------------------------------------------------------
-- 4. Decisão humana que o gatilho automático não desfaz.
--
-- Sem isto, "restaurar" é um gesto vazio: Luiz devolve o resultado, e a próxima
-- denúncia de uma terceira pessoa distinta o esconde de novo, porque o gatilho
-- recontava do zero e não sabia que alguém já tinha olhado.
--
-- Boolean `is_*` conforme docs/schema/nomenclatura.md §2. Um enum de estado
-- ('automatico' / 'oculto' / 'liberado') foi considerado e descartado: as duas
-- perguntas reais são "está escondido?" (`is_hidden`, que já existe) e "um
-- humano decidiu?" — e um enum obrigaria a manter os dois em sincronia à mão.
-- -----------------------------------------------------------------------------

ALTER TABLE public.resultados
  ADD COLUMN IF NOT EXISTS is_moderation_locked boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN public.resultados.is_moderation_locked IS
  'Um humano já decidiu sobre este resultado. Trava o gatilho automático de '
  'denúncias nos dois sentidos: nem esconde o que foi liberado, nem interfere '
  'no que foi escondido à mão. Só muda pelo SQL Editor — ver '
  'docs/technical/moderacao-de-audio.md.';

/*
  REDEFINIÇÃO DE FUNÇÃO — LEIA ANTES DE MEXER.

  Esta é a TERCEIRA definição de `check_reports_and_hide()` (000014, 000023,
  esta). É exatamente o padrão que fez o acúmulo de XP quebrar duas vezes em
  `protect_profile_stats()`: alguém recopia o corpo para acrescentar uma
  condição e, no caminho, derruba uma propriedade que ninguém lembrava.

  AS DUAS PROPRIEDADES QUE VÊM DA 20260807000023 E NÃO PODEM SUMIR:

    1. `count(DISTINCT user_id)` — conta PESSOAS, não linhas. Trocar por
       `count(*)` devolve a sabotagem A2: três inserções bastam de novo.

    2. `SET search_path = public, pg_temp` — a função é SECURITY DEFINER; sem
       isto é mais uma entrada no advisor "Function Search Path Mutable".

  Há uma trava textual para as duas em
  `src/features/gamification/deriva-de-funcoes.migracoes.test.ts`.
*/
CREATE OR REPLACE FUNCTION public.check_reports_and_hide()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;


-- -----------------------------------------------------------------------------
-- 5. Exclusão pelo titular.
--
-- Fecha a obrigação registrada no relatório da 20260807000027: não havia
-- NENHUM caminho para alguém tirar o próprio áudio do ar, e com publicação
-- automática esse pedido chega.
--
-- A função limpa o ponteiro; o cliente apaga o objeto em seguida, pela policy
-- de DELETE do Storage que já existe desde a 20260807000013. Nesta ordem de
-- propósito: com `audio_path` NULL, nenhuma linha de `resultados` referencia o
-- objeto, e a policy da seção 3(a) passa a NEGAR a assinatura para todo mundo
-- na hora — mesmo que a remoção do arquivo falhe logo depois.
--
-- Apaga também os posts `audio_result` do PRÓPRIO usuário que apontam para o
-- resultado. Deixá-los renderizaria um card de arroto sem arroto, com apelido e
-- nota, no lugar de onde a pessoa pediu para tirar a gravação — obedecer pela
-- metade é pior do que recusar.
--
-- NÃO apaga o `resultados`: a nota permanece, e com ela o ranking, o XP e o
-- histórico de desafios. Quem quiser sumir com a linha inteira precisa de
-- exclusão de conta, que este produto ainda não tem.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.remover_audio_do_resultado(
  p_result_id uuid
)
RETURNS public.resultados
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

COMMENT ON FUNCTION public.remover_audio_do_resultado(uuid) IS
  'Tira o áudio do próprio resultado do ar: limpa audio_path e apaga os posts '
  'de áudio do próprio usuário que apontam para ele. O arquivo em si é apagado '
  'pelo cliente, pela policy de DELETE do bucket. A nota permanece.';

GRANT EXECUTE ON FUNCTION public.remover_audio_do_resultado(uuid) TO authenticated;
