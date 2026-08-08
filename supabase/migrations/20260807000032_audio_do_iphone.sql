-- =============================================================================
-- O iPhone volta a conseguir subir áudio.
--
-- O DEFEITO, observado em aparelho real (2026-08-08): gravar no Safari do
-- iPhone produzia a nota normalmente, mas o áudio NÃO subia. A tela dizia
-- "Seu navegador gravou em audio/mp4, um formato que o Auê ainda não aceita".
--
-- A CAUSA. O bucket `audio_records` (20260807000013) lista `video/mp4` em
-- `allowed_mime_types`, mas NÃO `audio/mp4`. E `audio/mp4` é exatamente o que o
-- `MediaRecorder` do Safari produz — o Chrome e o Firefox produzem
-- `audio/webm`, que estava na lista. Ou seja: o formato certo estava a um item
-- de distância, e o produto ficava mudo em metade dos telefones do país.
--
-- POR QUE ISSO É GRAVE E NÃO COSMÉTICO. O Auê é um jogo de OUVIR o arroto do
-- amigo. Um iPhone que grava, recebe nota e manda um link mudo não participa da
-- brincadeira — e o dono do aparelho não tem como saber que o problema é o
-- formato, porque a nota dele apareceu normalmente. Perder o áudio é perder o
-- produto, mesmo com o placar funcionando.
--
-- O QUE ENTRA:
--   audio/mp4   — Safari (iOS e macOS). É o caso que motivou esta migração.
--   audio/aac   — alguns Android e navegadores embutidos usam este rótulo.
--   audio/x-m4a — rótulo legado para o mesmo contêiner, ainda emitido por
--                 alguns WebViews.
--
-- O QUE NÃO MUDA: o teto de 5 MB, o bucket continuar privado, e as policies.
-- Só a lista de formatos aceitos.
--
-- NOTA SOBRE `video/mp4`: fica na lista. Ele já estava lá e removê-lo poderia
-- quebrar algum navegador que rotula assim o áudio em contêiner MP4 — o custo
-- de manter é zero e o de remover é uma regressão silenciosa.
--
-- VERIFICAR DEPOIS DE APLICAR:
--   select allowed_mime_types from storage.buckets where id = 'audio_records';
--   -> deve conter 'audio/mp4'.
--   E, o que de fato importa: gravar num iPhone e ver o player aparecer.
--
-- VALIDADO: aplicada num Postgres 17.6 real (projeto Supabase do Auê,
-- 2026-08-08).
-- =============================================================================

UPDATE storage.buckets
   SET allowed_mime_types = ARRAY[
     'audio/mpeg',
     'audio/ogg',
     'audio/wav',
     'audio/webm',
     -- Safari (iOS/macOS) — o motivo desta migração.
     'audio/mp4',
     'audio/aac',
     'audio/x-m4a',
     'video/mp4',
     'video/webm'
   ]
 WHERE id = 'audio_records';
