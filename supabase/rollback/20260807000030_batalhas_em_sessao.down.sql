-- =============================================================================
-- ROLLBACK MANUAL de 20260807000030_batalhas_em_sessao.sql
--
-- USO DE EMERGÊNCIA. Leia `supabase/rollback/README.md` antes.
--
-- ESTE ROLLBACK APAGA DADO DO USUÁRIO. É o único da pasta que faz isso, e por
-- isso ele NÃO derruba as tabelas por padrão.
--
-- `batalhas` e `rodadas_batalha` guardam as sessões de duelo que as pessoas
-- compartilharam por link. Derrubá-las quebra todo link `/b/CODIGO` que já
-- circulou — e diferente de `desafios`, não há como reconstruir: a ordem das
-- rodadas e o vínculo entre elas só existem aqui. Os `resultados` e os áudios
-- sobrevivem (nada em cascata sobe para eles), mas viram gravações soltas, sem
-- a batalha que lhes dava sentido.
--
-- ORDEM RECOMENDADA, do menos destrutivo para o mais:
--
--   1. Se o problema é só uma RPC com defeito: reverta SÓ ela, aplicando de
--      novo a versão anterior. Nenhuma das três guarda estado.
--
--   2. Se o problema é o app estar criando batalhas que não deveria: revogue a
--      execução (seção 1 abaixo). O app publicado passa a falhar ao criar e ao
--      responder, mas as batalhas existentes continuam íntegras e voltam a
--      funcionar assim que o GRANT for devolvido. É reversível.
--
--   3. Só se for MESMO necessário: derrube o schema (seção 2). Faça `pg_dump`
--      das duas tabelas antes.
--
-- NÃO VALIDADO: escrito e revisado por leitura, sem Postgres neste ambiente.
-- Rode dentro de BEGIN / ROLLBACK e confira antes de confirmar.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. FREIO REVERSÍVEL — tira o app do ar sem tocar em dado.
--
-- Devolver depois: os mesmos GRANT da seção 4 da migração.
-- -----------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.criar_batalha(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.responder_batalha(text, uuid, uuid) FROM anon, authenticated;

-- `obter_batalha` fica de fora de propósito: leitura não cria nada, e mantê-la
-- permite que quem já tem um link continue vendo a batalha enquanto o problema
-- é investigado.


-- -----------------------------------------------------------------------------
-- 2. DERRUBADA COMPLETA — DESTRUTIVA.
--
-- Descomente por inteiro, e só depois de um pg_dump de public.batalhas e
-- public.rodadas_batalha.
-- -----------------------------------------------------------------------------

-- DROP FUNCTION IF EXISTS public.responder_batalha(text, uuid, uuid);
-- DROP FUNCTION IF EXISTS public.obter_batalha(text);
-- DROP FUNCTION IF EXISTS public.criar_batalha(uuid);
-- DROP FUNCTION IF EXISTS public.aue_codigo_de_batalha_v1();
--
-- -- rodadas_batalha primeiro: ela referencia batalhas.
-- DROP TABLE IF EXISTS public.rodadas_batalha;
-- DROP TABLE IF EXISTS public.batalhas;
--
-- -- Depois disso, o app publicado precisa voltar a gerar links /d/CODIGO
-- -- (createChallenge em src/db/supabase.ts, que NUNCA foi removido justamente
-- -- para este caso).
