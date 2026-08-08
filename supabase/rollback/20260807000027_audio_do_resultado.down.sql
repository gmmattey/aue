-- =============================================================================
-- ROLLBACK MANUAL de 20260807000027_audio_do_resultado.sql
--
-- USO DE EMERGÊNCIA. Leia `supabase/rollback/README.md` antes.
--
-- AVISO 1 — QUEBRA O CLIENTE PUBLICADO. `src/db/supabase.ts` chama
-- `supabase.rpc('definir_audio_do_resultado')` depois de subir o áudio para o
-- Storage. Sem a função, a chamada falha com PGRST202 e o áudio recém-enviado
-- vira objeto órfão no bucket: o arquivo existe, ninguém sabe o caminho, e
-- nenhuma tela consegue tocá-lo. O resultado em si continua sendo gravado
-- normalmente — `submit_resultado` não é tocada aqui. Recompile o cliente sem a
-- feature de áudio ANTES de rodar isto.
--
-- AVISO 2 — NÃO APAGA NADA. Os valores já gravados em `resultados.audio_path`
-- permanecem, e os objetos no bucket `audio_records` permanecem. Rollback de
-- migração não alcança o Storage (ver README.md desta pasta, "Não revertem ação
-- fora do Postgres"). Se a intenção for retirar áudio do ar, isso é trabalho
-- separado, feito no Storage, e não acontece por este arquivo.
--
-- AVISO 3 — a coluna `resultados.audio_path` NÃO é removida. Ela pertence à
-- 20260807000013, não a esta migração. Derrubá-la aqui apagaria os ponteiros e
-- tornaria os objetos do bucket impossíveis de localizar.
--
-- NÃO VALIDADO: escrito e revisado por leitura, sem Postgres neste ambiente.
-- Rode dentro de BEGIN / ROLLBACK e confira antes de confirmar.
-- =============================================================================

DROP FUNCTION IF EXISTS public.definir_audio_do_resultado(uuid, text);

ALTER TABLE public.resultados
  DROP CONSTRAINT IF EXISTS resultados_audio_path_formato;

-- O COMMENT ON COLUMN volta a ser nulo; não descreve mais um contrato que
-- deixou de existir.
COMMENT ON COLUMN public.resultados.audio_path IS NULL;
