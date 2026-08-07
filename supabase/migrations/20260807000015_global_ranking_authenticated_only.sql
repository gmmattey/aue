-- =============================================================================
-- R1 + M4 — Ranking global: restrito a usuários autenticados e com
--           `security_invoker` ligado.
--
-- R1 (risco registrado em 20260807000011, seção 5)
--   A view `global_ranking` agrupava por `COALESCE(user_id::text, player_name)`.
--   Como a submissão anônima não tem cap nem identidade verificável, e como as
--   parciais continuam sendo entrada não verificável vinda do cliente (limite
--   declarado em 20260807000011), qualquer pessoa podia ocupar o top 50 com um
--   `player_name` inventado e parciais fabricadas.
--
--   DECISÃO DE PRODUTO (Luiz): o ranking global passa a considerar SOMENTE
--   linhas com `user_id IS NOT NULL`. Quem não está logado continua podendo
--   gravar, desafiar, comentar e aparecer no feed — só não entra no ranking.
--
--   Isso NÃO elimina a fabricação de parciais: um usuário logado ainda pode
--   enviar parciais falsas e chegar a 100. O que muda é o custo e a
--   rastreabilidade — passa a existir uma conta por trás da linha, sujeita ao
--   cap de 5/dia de XP e passível de moderação/denúncia. A defesa real exigiria
--   reanálise do áudio no servidor, que segue fora de escopo.
--
-- M4 (achado da revisão do Rian)
--   A view foi criada sem `security_invoker`. Views em Postgres executam, por
--   padrão, com os privilégios do OWNER (aqui, o role que aplica a migração),
--   o que faz a leitura CONTORNAR a RLS de `resultados` e `profiles`. É
--   exatamente o advisor "Security Definer View" do Supabase.
--
--   Com `security_invoker = on`, a view passa a ser lida com os privilégios e
--   as policies do chamador. Consequência prática que precisa ser mantida:
--     * `anon` e `authenticated` precisam de GRANT SELECT nas TABELAS BASE
--       (`resultados`, `profiles`), não só na view. O GRANT abaixo na view
--       deixa de ser suficiente sozinho.
--     * `resultados` tem a policy "Enable read access for all users"
--       (SELECT, TO anon+authenticated, USING true) recriada em
--       20260807000010 — a leitura do feed e do ranking continua funcionando.
--     * A migração 20260807000011 revogou INSERT/UPDATE/DELETE em
--       `resultados`, mas NÃO revogou SELECT; o feed e esta view seguem OK.
--     * `profiles` tem "Public profiles are viewable by everyone"
--       (SELECT, TO public, USING true), criada em 20260807000001.
--   Os GRANT SELECT explícitos nas tabelas base abaixo são idempotentes e
--   existem para tornar esse pré-requisito verificável em vez de implícito.
--
-- NÃO VALIDADO: não há Postgres neste ambiente. Nenhuma instrução deste
-- arquivo foi executada por um parser real — revisão manual apenas.
-- =============================================================================


-- `CREATE OR REPLACE VIEW` não permite mudar o conjunto/tipo das colunas nem é
-- a forma mais previsível de ligar `security_invoker`. Como view não guarda
-- dado, o DROP é seguro.
DROP VIEW IF EXISTS public.global_ranking;

CREATE VIEW public.global_ranking
WITH (security_invoker = on)
AS
SELECT * FROM (
    SELECT DISTINCT ON (r.user_id)
        r.user_id::text                                   AS identifier,
        r.user_id,
        -- Usuário logado costuma gravar sem `player_name` (a RPC
        -- `submit_resultado` aceita NULL). Cai para o apelido do perfil para o
        -- ranking não exibir linhas em branco.
        COALESCE(nullif(btrim(r.player_name), ''), p.apelido) AS player_name,
        r.score,
        r.id                                              AS result_id,
        r.created_at
    FROM public.resultados r
    LEFT JOIN public.profiles p ON p.id = r.user_id
    WHERE r.user_id IS NOT NULL      -- <-- R1: só autenticados
      AND r.is_artificial = false
      AND r.is_hidden = false        -- coluna criada em 20260807000014
    ORDER BY
        r.user_id,
        r.score DESC,
        r.created_at ASC
) AS best_scores
ORDER BY score DESC, created_at ASC
LIMIT 50;

COMMENT ON VIEW public.global_ranking IS
  'Top 50 por melhor score de cada usuário AUTENTICADO. Linhas anônimas (user_id IS NULL) são deliberadamente excluídas (R1). security_invoker = on: a leitura respeita a RLS de resultados e profiles.';

-- Privilégio na view. Com security_invoker isso é necessário mas NÃO
-- suficiente: ver os GRANTs nas tabelas base logo abaixo.
GRANT SELECT ON public.global_ranking TO anon;
GRANT SELECT ON public.global_ranking TO authenticated;

-- Pré-requisitos explícitos do security_invoker (idempotentes; normalmente já
-- concedidos pelos default privileges do Supabase).
GRANT SELECT ON public.resultados TO anon, authenticated;
GRANT SELECT ON public.profiles   TO anon, authenticated;
