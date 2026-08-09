-- =============================================================================
-- Origem "Outro" — §3.4 do CONTRATO_MVP1
--
-- O CONTRATO PEDE CINCO OPÇÕES MÍNIMAS no nível principal da escolha de origem:
-- cerveja, refrigerante, comida, puxando ar e OUTRO. As quatro primeiras já
-- tinham para onde ir no banco (cerveja e refrigerante são `origin_subtype` de
-- 'Bebida'; comida é 'Comida'; puxar ar é 'Puxei ar'). "Outro" não tinha
-- NENHUM valor válido — nem no tipo do cliente, nem em
-- `public.aue_origin_score_v1`, nem na constraint `resultados_origin_type_valid`.
--
-- POR QUE ISTO É UMA MIGRAÇÃO, E NÃO UMA MUDANÇA DE TELA
-- -----------------------------------------------------
-- `submit_resultado` (assinatura atual em 20260807000023) recusa com
-- "Origem inválida" qualquer `p_origin_type` que `aue_origin_score_v1` não
-- conheça, e as constraints `resultados_origin_type_valid` e
-- `resultados_origin_score_coherent` rejeitam a linha mesmo que ela chegasse por
-- outro caminho. Publicar o botão "Outro" sem esta migração não degrada a
-- experiência: DERRUBA o envio para quem tocar nele, em produção, em silêncio
-- do lado do cliente (a RPC devolve erro genérico).
--
-- PESO ESCOLHIDO: 80. O critério inteiro está escrito em
-- `src/features/audio/rules.ts`, junto da tabela — aqui fica o resumo:
--   * 100 seria a escolha ótima de quem quer nota, e transformaria a declaração
--     de origem em botão de bônus;
--   * 0 é o peso de 'Puxei ar' e é o que define `is_artificial` — empatar
--     "não sei dizer" com "eu fabriquei" seria mentira sobre o que aconteceu;
--   * 80 é o PISO das origens honestas (hoje ocupado por 'Bebida'), então
--     escolher "Outro" nunca paga mais do que declarar o que de fato foi.
--
-- O QUE ESTA MIGRAÇÃO NÃO TOCA, DE PROPÓSITO
-- ------------------------------------------
--   * `aue_score_v1` — os pesos das parciais e do termo de origem seguem
--     0,25/0,20/0,25/0,20/0,10. Nada aqui mexe na fórmula.
--   * `aue_classification_v1` — as faixas seguem idênticas.
--   * `submit_resultado` — NÃO É RECOPIADA. Ela já delega o peso a
--     `aue_origin_score_v1` e já deriva `is_artificial` de
--     `(p_origin_type = 'Puxei ar')`, então trocar a função de origem basta.
--     Recopiar o corpo é exatamente o padrão que matou o acúmulo de XP duas
--     vezes neste repositório (ver `deriva-de-funcoes.migracoes.test.ts`).
--   * `resultados_is_artificial_coherent` — 'Outro' NÃO é artificial, e a
--     constraint continua sendo `is_artificial = (origin_type = 'Puxei ar')`.
--     Nada a fazer.
--   * `resultados_origin_subtype_coerente` (20260807000023) — subtipo continua
--     restrito a 'Comida' e 'Bebida'. É o comportamento certo: "Outro" é
--     justamente a saída de quem não vai detalhar, e a RPC já anula o subtipo
--     para qualquer origem fora daquelas duas.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Tabela de origens — porte fiel de ORIGIN_SCORES (`rules.ts`)
--
-- `CREATE OR REPLACE` mantém a assinatura, então as constraints e a RPC que
-- dependem desta função continuam válidas sem DROP/recriação.
--
-- Postgres NÃO revalida linhas antigas ao substituir a função: as gravações que
-- já existem continuam onde estão. O que muda é o que passa a ser aceito daqui
-- para frente.
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
    WHEN 'Outro'      THEN 80
    WHEN 'Puxei ar'   THEN 0
    ELSE NULL
  END::numeric;
$$;

COMMENT ON FUNCTION public.aue_origin_score_v1(text) IS
  'Peso de origem do aue-score-v1. Espelho de ORIGIN_SCORES em '
  'src/features/audio/rules.ts — mudar um lado sem o outro quebra o envio. '
  '"Outro" vale 80 (piso das origens honestas) para não ser a escolha ótima de '
  'quem quer nota nem empatar com o zero do arroto forçado com ar.';


-- -----------------------------------------------------------------------------
-- 2. Constraint de origem válida
--
-- Continua NOT VALID pelo mesmo motivo da 000011: existem linhas legadas
-- (inclusive `origin_type = 'Unknown'`) que a varredura reprovaria, e a
-- migração não pode falhar por causa do histórico. Ela vale para todo
-- INSERT/UPDATE a partir de agora.
-- -----------------------------------------------------------------------------

ALTER TABLE public.resultados
  DROP CONSTRAINT IF EXISTS resultados_origin_type_valid;

ALTER TABLE public.resultados
  ADD CONSTRAINT resultados_origin_type_valid
    CHECK (origin_type IN ('Espontâneo', 'Comida', 'Bebida', 'Puxei ar', 'Outro')) NOT VALID;


-- =============================================================================
-- CONFERIR DEPOIS DE APLICAR
--
--   select public.aue_origin_score_v1('Outro');     -- 80
--   select public.aue_origin_score_v1('Espontâneo');-- 100
--   select public.aue_origin_score_v1('Fantasia');  -- null (recusa)
--
--   select conname, pg_get_constraintdef(oid)
--     from pg_constraint
--    where conrelid = 'public.resultados'::regclass
--      and conname like 'resultados_origin%';
--
-- E o teste que importa mais: gravar um arroto no app escolhendo "Outro" e ver
-- a linha aparecer com origin_score = 80 e is_artificial = false.
-- =============================================================================
