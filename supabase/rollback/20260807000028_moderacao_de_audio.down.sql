-- =============================================================================
-- ROLLBACK MANUAL de 20260807000028_moderacao_de_audio.sql
--
-- USO DE EMERGÊNCIA. Leia `supabase/rollback/README.md` antes.
--
-- AVISO 1 — ISTO REABRE O ÁUDIO ESCONDIDO. Devolver o bucket para público faz
-- TODO objeto de `audio_records` voltar a ser servido direto, sem consultar
-- policy nenhuma. Áudio de resultado com `is_hidden = true`, inclusive o
-- escondido por denúncia ou por decisão sua, volta a tocar para qualquer pessoa
-- com a URL. Rollback anda para trás: este é o estado MENOS seguro, não o mais.
--
-- AVISO 2 — QUEBRA O CLIENTE PUBLICADO. `src/db/supabase.ts` passa a pedir URL
-- ASSINADA (`createSignedUrl`). Num bucket público a assinatura continua
-- funcionando, então o player não quebra — mas `remover_audio_do_resultado`
-- deixa de existir e o botão "Apagar meu áudio" falha com PGRST202. Recompile o
-- cliente sem essa ação antes de rodar isto.
--
-- AVISO 3 — o gatilho volta a ignorar decisão humana. Sem
-- `is_moderation_locked`, um resultado que você restaurou é escondido de novo
-- pela próxima denúncia de uma terceira pessoa distinta.
--
-- NÃO APAGA NADA. Objetos do Storage, valores de `audio_path`, `is_hidden` e
-- linhas de `denuncias` permanecem como estão.
--
-- ORDEM IMPORTA: a função do trigger é restaurada ANTES de a coluna sair. O
-- corpo instalado pela 20260807000028 lê `is_moderation_locked`; se a coluna
-- sumisse primeiro, toda denúncia passaria a falhar com "column does not
-- exist" até a função ser trocada.
--
-- NÃO VALIDADO: escrito e revisado por leitura, sem Postgres neste ambiente.
-- Rode dentro de BEGIN / ROLLBACK e confira antes de confirmar.
-- =============================================================================

-- 1. Titular perde o caminho de exclusão.
DROP FUNCTION IF EXISTS public.remover_audio_do_resultado(uuid);

-- 2. Trigger volta à definição da 20260807000023 — SEM a trava de moderação e
--    COM as duas propriedades que aquela migração instalou: contagem de PESSOAS
--    distintas (não de linhas) e search_path fixo. Recopiar sem elas devolveria
--    a sabotagem A2.
CREATE OR REPLACE FUNCTION public.check_reports_and_hide()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_denunciantes integer;
BEGIN
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

-- 3. Coluna de moderação sai depois que ninguém mais a lê.
ALTER TABLE public.resultados
  DROP COLUMN IF EXISTS is_moderation_locked;

-- 4. Policies de leitura voltam ao acesso irrestrito da 20260807000013.
DROP POLICY IF EXISTS "Audio is readable while not hidden" ON storage.objects;
DROP POLICY IF EXISTS "Owners can read their own pending audio" ON storage.objects;

CREATE POLICY "Public Read Access for Audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio_records');

-- 5. Índice do join.
DROP INDEX IF EXISTS public.resultados_por_audio_path;

-- 6. Bucket volta a ser público. É a linha que reabre o áudio escondido — se
--    você só quer desfazer a trava de moderação e NÃO quer reexpor o que está
--    escondido, pare antes desta.
UPDATE storage.buckets
   SET public = true
 WHERE id = 'audio_records';
