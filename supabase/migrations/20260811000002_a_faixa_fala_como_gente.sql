/*
  20260811000002 — a faixa da nota fala como gente

  Os oito rótulos deixam de ser nome de criatura ("Monstro do Esgoto") e passam
  a ser reação ("Tá maluco."). É a tabela do `docs/jogo/VOZ.md` §4, que já era a
  voz canônica do jogo desde antes deste banco existir.

  O QUE NÃO MUDA:
    - os cortes: < 20, < 40, < 60, < 75, < 85, < 95, < 100 e 100;
    - a fórmula, os pesos e a calibração (`aue_nota_v2`, 20260811000001);
    - as policies. Nenhuma RLS é tocada;
    - as RPCs. `enviar_resultado` continua chamando esta função sozinha, sem
      parâmetro novo — o cliente nunca mandou classificação e continua sem
      mandar.

  NENHUM `UPDATE` EM `resultados`. O CHECK `resultados_classificacao_coerente`
  (20260807000036) é `NOT VALID`, então linha antiga não é revalidada na
  criação — ela continua guardando o nome velho, e ninguém mais lê essa coluna
  para desenhar tela: a web deriva a fala de `(nota, id do resultado)`.

  A ATENÇÃO QUE ISSO EXIGE: todo `UPDATE` numa linha revalida a linha inteira.
  Apagar o próprio áudio e esconder por denúncia mexem em `resultados`, e a
  linha antiga tem `classificacao` que não bate mais com esta função. A CHECK
  passa a aceitar TAMBÉM o rótulo histórico, pelo mesmo motivo e do mesmo jeito
  que a constraint irmã, a da nota, aceita o que a v1 calculou.

  ORDEM DE DEPLOY: esta migração primeiro, a web depois. Na janela entre as
  duas, quem gravar tem o rótulo novo no banco e a tela deriva do id do mesmo
  jeito. Cosmético e curto.
*/

CREATE OR REPLACE FUNCTION public.aue_classification_v1(p_score numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_score < 20  THEN 'Foi isso?'
    WHEN p_score < 40  THEN 'Tá fraco, hein.'
    WHEN p_score < 60  THEN 'Dá pro gasto.'
    WHEN p_score < 75  THEN 'Aí sim, porra.'
    WHEN p_score < 85  THEN 'Caralho, veio forte.'
    WHEN p_score < 95  THEN 'Tá maluco.'
    WHEN p_score < 100 THEN 'Esse bagulho tá apelão.'
    ELSE 'Tá roubado. Não é possível.'
  END;
$$;

/*
  Os oito rótulos que este banco usou até aqui. Existem nesta lista por um
  motivo só: linha antiga precisa continuar aceitando UPDATE.
*/
CREATE OR REPLACE FUNCTION public.aue_classification_historica_v1(p_rotulo text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_rotulo IN (
    'Arroto de Hamster',
    'Tentativa Honesta',
    'Arroto Respeitável',
    'Pedreiro Certificado',
    'Trovão Gastrointestinal',
    'Monstro do Esgoto',
    'Arma Biológica',
    'O ARROTO'
  );
$$;

ALTER TABLE public.resultados
  DROP CONSTRAINT IF EXISTS resultados_classificacao_coerente;

ALTER TABLE public.resultados
  ADD CONSTRAINT resultados_classificacao_coerente
  CHECK (
    classificacao = public.aue_classification_v1(nota)
    OR public.aue_classification_historica_v1(classificacao)
  )
  NOT VALID;
