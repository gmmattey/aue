-- =============================================================================
-- ROLLBACK MANUAL de 20260807000031_disputa_presencial.sql
--
-- USO DE EMERGÊNCIA. Leia `supabase/rollback/README.md` antes.
--
-- CAMINHO PREFERIDO, E QUASE SEMPRE O CERTO: não rode nada disto. Desligue
-- `VITE_FEATURE_DISPUTA_LOCAL` e publique de novo. A tela some, o schema fica,
-- e nenhuma disputa já criada é perdida. Reverter banco para desligar uma tela
-- é sempre o caminho mais caro.
--
-- SE FOR MESMO NECESSÁRIO REVERTER O SCHEMA, a ordem importa e a seção 1 é
-- destrutiva de um jeito silencioso: derrubar `participantes_batalha` apaga os
-- NOMES de todo mundo que jogou presencialmente. As gravações e as notas
-- continuam (ON DELETE SET NULL em `rodadas_batalha.participant_id`), mas
-- viram uma lista de resultados sem dono — e não há como reconstruir quem era
-- quem. Faça `pg_dump` da tabela antes.
--
-- NÃO VALIDADO: escrito e revisado por leitura, sem Postgres neste ambiente.
-- Rode dentro de BEGIN / ROLLBACK e confira antes de confirmar.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. FREIO REVERSÍVEL — impede novas disputas presenciais sem apagar nada.
-- -----------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.criar_batalha_presencial(text[], integer, text)
  FROM anon, authenticated;


-- -----------------------------------------------------------------------------
-- 2. VOLTAR AS DUAS RPCs À VERSÃO DA 20260807000030.
--
-- ATENÇÃO: `responder_batalha` volta a RECUSAR `p_participant_id` (0A000) e
-- `obter_batalha` deixa de devolver `participantes`. Se o cliente publicado
-- ainda for o da fatia 2, a tela de disputa presencial quebra na primeira
-- gravação. Reverta o cliente ANTES, ou junto.
--
-- Descomente por inteiro para usar.
-- -----------------------------------------------------------------------------

-- Reaplique os corpos da 20260807000030 (seção 4) para
-- `public.responder_batalha(text, uuid, uuid)` e `public.obter_batalha(text)`.
-- Eles não são recopiados aqui de propósito: duas cópias do mesmo corpo em
-- arquivos diferentes é exatamente o padrão que fez o acúmulo de XP se perder
-- duas vezes neste projeto (ver deriva-de-funcoes.migracoes.test.ts).


-- -----------------------------------------------------------------------------
-- 3. DERRUBAR O SCHEMA — DESTRUTIVO. Apaga os nomes dos participantes.
-- -----------------------------------------------------------------------------

-- DROP FUNCTION IF EXISTS public.criar_batalha_presencial(text[], integer, text);
--
-- DROP INDEX IF EXISTS public.rodadas_uma_por_participante_por_round;
-- ALTER TABLE public.rodadas_batalha DROP COLUMN IF EXISTS participant_id;
--
-- DROP TABLE IF EXISTS public.participantes_batalha;
