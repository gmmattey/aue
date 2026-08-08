-- =============================================================================
-- Reação (curtir) em posts do feed da comunidade.
--
-- CONTEXTO: o botão 👍 do `FeedScreen` era ESTÁTICO — exibia "12" fixo em todo
-- post e não fazia nada. A lógica de reação existia apenas em
-- `CommunityFeed.tsx`, componente que ninguém importa, e reagia a `result_id`.
-- O feed que está de fato roteado é o de `posts_comunidade`.
--
-- LACUNA QUE ESTA MIGRAÇÃO FECHA ANTES DE LIGAR O BOTÃO:
--   `reacoes` tem `UNIQUE(result_id, user_id)`, criada em 20260807000005 quando
--   só existia reação a resultado. A 20260807000019 acrescentou `post_id` e
--   tornou `result_id` nulo — mas NÃO acrescentou unicidade equivalente.
--   Em Postgres, NULLs são distintos entre si numa constraint UNIQUE (o padrão
--   é NULLS DISTINCT), então duas linhas com `result_id = NULL` e o mesmo
--   `user_id` passam sem conflito. Na prática: a mesma pessoa podia curtir o
--   mesmo post quantas vezes quisesse, cada clique inflando o contador.
--
-- NÃO VALIDADO: não há Postgres neste ambiente. Revisão por leitura apenas.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Uma reação por pessoa por post.
--
-- Índice único PARCIAL em vez de constraint: só se aplica às linhas de reação a
-- post (`post_id IS NOT NULL`), deixando as reações a resultado sob a constraint
-- antiga, que continua valendo e não é tocada.
--
-- Se já existirem duplicatas de antes, a criação do índice FALHA — e é o
-- comportamento desejado, porque criar o índice ignorando duplicata deixaria o
-- contador errado para sempre. Para achá-las:
--
--   SELECT post_id, user_id, count(*)
--     FROM public.reacoes
--    WHERE post_id IS NOT NULL
--    GROUP BY post_id, user_id HAVING count(*) > 1;
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS reacoes_uma_por_pessoa_por_post
  ON public.reacoes (post_id, user_id)
  WHERE post_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 2. RPC de alternância.
--
-- Segue o mesmo formato de `toggle_follow` (000017) e `toggle_favorite` (000020):
-- uma chamada resolve inserir, trocar ou remover, e devolve o estado final.
-- Fazer isso no cliente exigiria ler-decidir-escrever em três viagens, com
-- corrida entre cliques rápidos.
--
-- Devolve o tipo de reação vigente após a operação, ou NULL se a reação foi
-- removida. Assim o cliente não precisa recarregar o feed para saber o estado.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.toggle_reacao(
  p_post_id uuid DEFAULT NULL,
  p_result_id uuid DEFAULT NULL,
  p_tipo text DEFAULT 'like'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_atual text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário precisa estar autenticado' USING ERRCODE = '28000';
  END IF;

  IF p_tipo IS NULL OR p_tipo NOT IN ('like', 'dislike') THEN
    RAISE EXCEPTION 'Tipo de reação inválido: %', p_tipo USING ERRCODE = '22023';
  END IF;

  -- Mesmo invariante da constraint `reacoes_alvo_unico` (20260807000023):
  -- exatamente um alvo. Checado aqui também para devolver erro legível em vez
  -- de violação de CHECK.
  IF num_nonnulls(p_post_id, p_result_id) <> 1 THEN
    RAISE EXCEPTION 'Informe exatamente um alvo: post ou resultado' USING ERRCODE = '22023';
  END IF;

  SELECT reaction_type INTO v_atual
  FROM public.reacoes
  WHERE user_id = v_user_id
    AND (
      (p_post_id   IS NOT NULL AND post_id   = p_post_id)
      OR (p_result_id IS NOT NULL AND result_id = p_result_id)
    )
  FOR UPDATE;

  IF v_atual IS NULL THEN
    -- Sem reação ainda: cria.
    --
    -- O `SELECT ... FOR UPDATE` acima NÃO trava linha inexistente, então duas
    -- transações concorrentes do mesmo usuário (duas abas, dois aparelhos)
    -- podem chegar as duas aqui. O índice único
    -- `reacoes_uma_por_pessoa_por_post` barra a segunda, e sem este bloco o
    -- erro 23505 subiria cru até a interface como "não foi possível registrar
    -- sua curtida" — sendo que a curtida foi registrada, pela outra aba.
    --
    -- Tratando a violação como "já existe", a operação vira idempotente: o
    -- segundo caminho apenas garante o tipo pedido e devolve o mesmo estado.
    BEGIN
      INSERT INTO public.reacoes (post_id, result_id, user_id, reaction_type)
      VALUES (p_post_id, p_result_id, v_user_id, p_tipo);
    EXCEPTION WHEN unique_violation THEN
      UPDATE public.reacoes
      SET reaction_type = p_tipo
      WHERE user_id = v_user_id
        AND (
          (p_post_id   IS NOT NULL AND post_id   = p_post_id)
          OR (p_result_id IS NOT NULL AND result_id = p_result_id)
        );
    END;

    RETURN p_tipo;
  END IF;

  IF v_atual = p_tipo THEN
    -- Mesmo botão de novo: desfaz.
    DELETE FROM public.reacoes
    WHERE user_id = v_user_id
      AND (
        (p_post_id   IS NOT NULL AND post_id   = p_post_id)
        OR (p_result_id IS NOT NULL AND result_id = p_result_id)
      );
    RETURN NULL;
  END IF;

  -- Botão oposto: troca curtida por descurtida (ou vice-versa).
  UPDATE public.reacoes
  SET reaction_type = p_tipo
  WHERE user_id = v_user_id
    AND (
      (p_post_id   IS NOT NULL AND post_id   = p_post_id)
      OR (p_result_id IS NOT NULL AND result_id = p_result_id)
    );

  RETURN p_tipo;
END;
$$;

COMMENT ON FUNCTION public.toggle_reacao(uuid, uuid, text) IS
  'Alterna curtida/descurtida de um post OU de um resultado. Devolve o tipo '
  'vigente após a operação, ou NULL se a reação foi removida.';

GRANT EXECUTE ON FUNCTION public.toggle_reacao(uuid, uuid, text) TO authenticated;

-- Leitura do contador continua pela policy de SELECT existente
-- ("Reactions are viewable by everyone", 20260807000005) — anônimo vê a
-- contagem, mas não reage: as policies de INSERT/UPDATE/DELETE são
-- `TO authenticated`. A interface reflete isso desabilitando o botão.

-- Consultar reação por post é o caminho quente do feed.
CREATE INDEX IF NOT EXISTS reacoes_por_post
  ON public.reacoes (post_id) WHERE post_id IS NOT NULL;
