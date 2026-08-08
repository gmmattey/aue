-- =============================================================================
-- ROLLBACK MANUAL de 20260807000026_comentarios_em_posts.sql
--
-- USO DE EMERGÊNCIA. Leia `supabase/rollback/README.md` antes.
--
-- AVISO: remove as RPCs de comentário. O modal do feed passa a chamar funções
-- inexistentes e falha ao abrir. Recompile o cliente sem a feature antes de
-- rodar isto, senão o botão "Comentar" quebra na cara do usuário.
--
-- NÃO APAGA COMENTÁRIOS. As linhas de `public.comentarios` permanecem — só o
-- caminho de leitura e escrita via RPC é removido.
--
-- NÃO VALIDADO: escrito e revisado por leitura, sem Postgres neste ambiente.
-- Rode dentro de BEGIN / ROLLBACK e confira antes de confirmar.
-- =============================================================================

DROP FUNCTION IF EXISTS public.criar_comentario(text, uuid, uuid);
DROP FUNCTION IF EXISTS public.listar_comentarios(uuid, uuid);

DROP INDEX IF EXISTS public.comentarios_por_post;
DROP INDEX IF EXISTS public.comentarios_por_resultado;
