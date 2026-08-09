-- =============================================================================
-- ROLLBACK MANUAL de 20260807000035_origem_outro.sql
--
-- USO DE EMERGÊNCIA. Leia `supabase/rollback/README.md` antes.
--
-- LEIA ISTO ANTES DE EXECUTAR QUALQUER LINHA
-- ------------------------------------------
-- Este rollback tira a origem 'Outro' do banco. Ele NÃO apaga nenhuma linha —
-- mas as gravações que já foram feitas com `origin_type = 'Outro'` ficam num
-- estado que o banco não sabe mais explicar:
--
--   * `aue_origin_score_v1('Outro')` volta a devolver NULL;
--   * `resultados_origin_score_coherent` e `resultados_origin_type_valid` são
--     NOT VALID, então as linhas continuam lá e continuam legíveis;
--   * qualquer UPDATE futuro nessas linhas passa a ser REJEITADO pelas duas
--     constraints, porque CHECK NOT VALID vale para toda escrita nova.
--
-- Traduzindo: voltar é seguro para leitura e para o ranking; é uma armadilha
-- para qualquer fluxo que edite um resultado antigo (hoje: esconder por
-- denúncia e apagar áudio mexem em `resultados`).
--
-- ANTES DE RODAR, MEÇA O ESTRAGO:
--
--   select count(*) from public.resultados where origin_type = 'Outro';
--
-- Se der zero, este rollback é limpo. Se não der, decida CONSCIENTEMENTE o que
-- fazer com essas linhas — a seção 3 traz a opção de reclassificá-las, e ela é
-- perda de informação declarada pela pessoa que gravou.
--
-- O CLIENTE PRECISA VOLTAR JUNTO. Se o app publicado ainda oferecer o botão
-- "Outro", desfazer só o banco troca uma tela nova por um erro de envio no
-- meio do fluxo principal. Rollback de banco sem rollback de deploy, aqui, é
-- pior que o problema.
--
-- NÃO VALIDADO: escrito e revisado por leitura, sem Postgres neste ambiente.
-- Rode dentro de BEGIN / ROLLBACK e confira os objetos antes de confirmar.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Tabela de origens — de volta à forma da 20260807000011.
--
-- `CREATE OR REPLACE` mantém a assinatura; a RPC `submit_resultado` e as
-- constraints que dependem da função seguem válidas.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.aue_origin_score_v1(p_origin_type text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_origin_type
    WHEN 'Espontâneo' THEN 100
    WHEN 'Comida'     THEN 90
    WHEN 'Bebida'     THEN 80
    WHEN 'Puxei ar'   THEN 0
    ELSE NULL
  END::numeric;
$$;

COMMENT ON FUNCTION public.aue_origin_score_v1(text) IS
  'Peso de origem do aue-score-v1. Espelho de ORIGIN_SCORES em '
  'src/features/audio/rules.ts — mudar um lado sem o outro quebra o envio.';


-- -----------------------------------------------------------------------------
-- 2. Constraint de origem válida — sem 'Outro'.
--
-- NOT VALID de novo, pelo mesmo motivo de sempre: as linhas antigas (legado
-- 'Unknown' e as 'Outro' criadas enquanto a migração esteve no ar) não podem
-- fazer o comando falhar.
-- -----------------------------------------------------------------------------

ALTER TABLE public.resultados
  DROP CONSTRAINT IF EXISTS resultados_origin_type_valid;

ALTER TABLE public.resultados
  ADD CONSTRAINT resultados_origin_type_valid
    CHECK (origin_type IN ('Espontâneo', 'Comida', 'Bebida', 'Puxei ar')) NOT VALID;


-- -----------------------------------------------------------------------------
-- 3. OPCIONAL, E COM PERDA — reclassificar as linhas 'Outro'.
--
-- Só faz sentido se a contagem da abertura for maior que zero E se algum fluxo
-- de UPDATE estiver quebrando por causa delas.
--
-- Isto REESCREVE a declaração de origem que a pessoa fez. Não existe destino
-- honesto: 'Espontâneo' inventa mérito que ninguém declarou, e 'Puxei ar'
-- acusa de fabricação quem não fabricou nada.
--
-- 'Bebida' é o menos errado apenas porque vale os mesmos 80 pontos — a NOTA não
-- muda, só o rótulo passa a dizer uma coisa que a pessoa não disse. Se você
-- rodar isto, é uma decisão de produto, não uma limpeza técnica.
--
-- Descomente conscientemente:
--
-- UPDATE public.resultados
--    SET origin_type = 'Bebida'
--  WHERE origin_type = 'Outro';
--
-- `origin_score` já é 80 nessas linhas, então nada mais precisa mudar; e
-- `is_artificial` continua false nos dois rótulos.
-- -----------------------------------------------------------------------------


-- =============================================================================
-- CONFERIR DEPOIS DE EXECUTAR
--
--   select public.aue_origin_score_v1('Outro');  -- null (recusa de novo)
--
--   select conname, pg_get_constraintdef(oid)
--     from pg_constraint
--    where conrelid = 'public.resultados'::regclass
--      and conname = 'resultados_origin_type_valid';
--
--   select count(*) from public.resultados where origin_type = 'Outro';
--
-- E o teste que importa mais: gravar um arroto no app publicado e ver a nota
-- chegar. Se o cliente ainda tiver o botão "Outro", ele vai falhar — é o
-- lembrete da abertura.
-- =============================================================================
