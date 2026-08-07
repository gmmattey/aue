-- =============================================================================
-- ROLLBACK MANUAL de 20260807000011_server_side_score_and_duel.sql
--
-- NÃO É MIGRAÇÃO. Ver supabase/rollback/README.md.
-- Rodar como owner (postgres). Quarto da ordem inversa.
--
-- ======================== LEIA ANTES DE RODAR ================================
--
-- ISTO REABRE OS DOIS BURACOS MAIS GRAVES DO PROJETO (A1 e A2):
--   * o cliente volta a poder INSERT direto em `resultados` com o `score` que
--     quiser — a anon key é pública, então isso significa score 100 para
--     qualquer pessoa;
--   * o vencedor do duelo volta a ser decidido no browser e a não ser
--     persistido.
--
-- PERDA DE DADOS: as colunas `desafios.winner` e `desafios.resolved_at` são
-- REMOVIDAS. Todos os vereditos persistidos (inclusive o backfill dos duelos
-- antigos) são apagados e não voltam. Faça `pg_dump` da tabela antes se isso
-- importar. Se quiser preservá-los, comente o bloco 1c e conviva com colunas
-- órfãs — a migração 000011 usa `ADD COLUMN IF NOT EXISTS`, então reaplicá-la
-- depois funciona nos dois casos.
--
-- QUEBRA DE CLIENTE: `src/db/supabase.ts -> submitResult` chama a RPC
-- `submit_resultado`, que deixa de existir. `src/features/audio/ChallengeView.tsx`
-- lê `challengeData.winner`, que passa a vir `undefined` (a tela simplesmente
-- deixa de mostrar o resultado final, sem erro). O código do cliente precisa
-- voltar junto — este script sozinho derruba a gravação de resultados.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Desfazer o bloco 6 (duelo decidido no servidor).
-- -----------------------------------------------------------------------------

-- 1a. Trigger antes da função que ele chama.
DROP TRIGGER IF EXISTS on_desafio_set_winner ON public.desafios;
DROP FUNCTION IF EXISTS public.set_desafio_winner();

-- 1b. Constraint antes das colunas.
ALTER TABLE public.desafios
  DROP CONSTRAINT IF EXISTS desafios_winner_valid;

-- 1c. Colunas. <<< APAGA OS VEREDITOS PERSISTIDOS >>>
ALTER TABLE public.desafios
  DROP COLUMN IF EXISTS winner,
  DROP COLUMN IF EXISTS resolved_at;

-- 1d. Comparador. Removido depois do trigger e do backfill que o usavam.
DROP FUNCTION IF EXISTS public.aue_compare_results_v1(uuid, uuid);


-- -----------------------------------------------------------------------------
-- 2. Desfazer o bloco 4 (revogação do INSERT direto).
--
-- Restaura o estado deixado por 20260807000001: policy `TO public` com
-- `WITH CHECK (user_id IS NULL OR user_id = auth.uid())`. A 20260807000010 não
-- mexeu nesta policy, então este é mesmo o estado imediatamente anterior à 011.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Enable insert for everyone" ON public.resultados;
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON public.resultados;

CREATE POLICY "Enable insert for everyone"
ON public.resultados FOR INSERT
TO public
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Devolver os privilégios de tabela revogados pela 011. Sem isto o RLS acima
-- não adianta nada: o GRANT é checado antes da policy.
GRANT INSERT, UPDATE, DELETE ON public.resultados TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 3. Desfazer o bloco 3 (RPC de gravação).
--    Antes das funções `aue_*`, que ela referencia.
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.submit_resultado(numeric, numeric, numeric, numeric, text, text);


-- -----------------------------------------------------------------------------
-- 4. Desfazer o bloco 2 (constraints).
--    Antes das funções `aue_*`: enquanto um CHECK referenciar a função, o
--    DROP FUNCTION falha por dependência.
-- -----------------------------------------------------------------------------

ALTER TABLE public.resultados
  DROP CONSTRAINT IF EXISTS resultados_score_range,
  DROP CONSTRAINT IF EXISTS resultados_partials_range,
  DROP CONSTRAINT IF EXISTS resultados_origin_type_valid,
  DROP CONSTRAINT IF EXISTS resultados_origin_score_coherent,
  DROP CONSTRAINT IF EXISTS resultados_score_coherent,
  DROP CONSTRAINT IF EXISTS resultados_classification_coherent,
  DROP CONSTRAINT IF EXISTS resultados_is_artificial_coherent,
  DROP CONSTRAINT IF EXISTS resultados_player_name_len;


-- -----------------------------------------------------------------------------
-- 5. Desfazer o bloco 1 (fórmula portada para SQL).
--
-- ATENÇÃO: o teste `src/features/audio/rules.formula.test.ts` lê estas funções
-- direto do arquivo da migração 000011, não do banco. Ele continua passando
-- depois deste rollback — o teste protege o par arquivo-TS/arquivo-SQL, não o
-- estado do banco. Isso é limite conhecido do teste, não bug do rollback.
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.aue_classification_v1(numeric);
DROP FUNCTION IF EXISTS public.aue_score_v1(numeric, numeric, numeric, numeric, numeric);
DROP FUNCTION IF EXISTS public.aue_origin_score_v1(text);

COMMIT;
