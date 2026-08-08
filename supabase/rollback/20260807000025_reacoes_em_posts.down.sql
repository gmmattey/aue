-- =============================================================================
-- ROLLBACK MANUAL de 20260807000025_reacoes_em_posts.sql
--
-- USO DE EMERGÊNCIA. Leia `supabase/rollback/README.md` antes.
--
-- AVISO: remove a unicidade de reação por post. A mesma pessoa volta a poder
-- curtir o mesmo post várias vezes, inflando o contador — que é justamente o
-- que a migração 000025 impede. O botão de curtir do feed passa a chamar uma
-- RPC inexistente e falha; recompile o cliente sem ele antes de rodar isto.
--
-- NÃO RECUPERA NEM APAGA DADOS: as reações já gravadas permanecem.
--
-- NÃO VALIDADO: escrito e revisado por leitura, sem Postgres neste ambiente.
-- Rode dentro de BEGIN / ROLLBACK e confira antes de confirmar.
-- =============================================================================

DROP FUNCTION IF EXISTS public.toggle_reacao(uuid, uuid, text);

DROP INDEX IF EXISTS public.reacoes_por_post;
DROP INDEX IF EXISTS public.reacoes_uma_por_pessoa_por_post;
