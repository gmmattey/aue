/*
  20260811000001 — Auê Nota v2 calibrada com áudio real

  Banco usado para calibrar: 43 arquivos fornecidos por Luiz em 10/08/2026.
  Oito pares eram duplicatas e três arquivos eram voz; a régua de nota foi
  calculada sobre 32 arrotos únicos válidos.

  A mudança importante:
    v1 = duração 25% + potência 20% + profundidade 25% + textura 20% + origem 10%
    v2 = fôlego 30% + força 30% + grave 30% + origem 10%

  Os NOMES das colunas continuam `duracao`, `potencia`, `profundidade`, `textura`
  por compatibilidade. A semântica entregue pelo cliente muda para as parciais
  calibradas:
    duracao      = FÔLEGO
    potencia     = FORÇA
    profundidade = GRAVE
    textura      = diagnóstico legado, peso zero

  `aue_score_v1` NÃO é alterada. Resultado histórico continua explicável pela
  fórmula que existia quando foi criado.
*/

CREATE OR REPLACE FUNCTION public.aue_nota_v2(
  p_duracao numeric,
  p_potencia numeric,
  p_profundidade numeric,
  p_textura numeric,
  p_nota_da_origem numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT least(100::numeric, greatest(0::numeric,
      (p_duracao        * 0.30)
    + (p_potencia       * 0.30)
    + (p_profundidade   * 0.30)
    + (p_textura        * 0.00)
    + (p_nota_da_origem * 0.10)
  ));
$$;

COMMENT ON FUNCTION public.aue_nota_v2(numeric, numeric, numeric, numeric, numeric) IS
  'Auê Nota v2: Fôlego 30%, Força 30%, Grave 30%, textura 0%, origem 10%. Calibrada em 32 arrotos únicos do lote de 10/08/2026.';

/*
  A constraint aceita as DUAS fórmulas de propósito. NÃO "limpe" isso deixando
  só a v2.

  `NOT VALID` só evita a varredura na hora de criar a constraint. Depois disso,
  todo UPDATE revalida a linha inteira — inclusive linha gravada antes desta
  migração, cuja nota foi calculada pela v1. Se a check só conhecesse a v2,
  quebrariam três caminhos que hoje funcionam em resultado antigo:

    - `remover_audio_do_resultado` — a pessoa apagando o próprio arroto. Isso é
      privacidade, não cosmético;
    - `esconder_por_denuncias` — na terceira denúncia o UPDATE estoura, a
      transação falha inteira e o conteúdo denunciado continua no ar;
    - `anexar_audio_ao_resultado`.

  Nada de backfill: nota velha continua velha e explicada pela v1. Nota nova
  nasce pela v2, porque `enviar_resultado` calcula só com `aue_nota_v2` — a
  check é conferência, não é ela que escolhe a fórmula.
*/
ALTER TABLE public.resultados
  DROP CONSTRAINT IF EXISTS resultados_nota_coerente;

ALTER TABLE public.resultados
  ADD CONSTRAINT resultados_nota_coerente
    CHECK (
      abs(nota - public.aue_nota_v2(duracao, potencia, profundidade, textura, nota_da_origem)) <= 0.01
      OR abs(nota - public.aue_score_v1(duracao, potencia, profundidade, textura, nota_da_origem)) <= 0.01
    ) NOT VALID;

/*
  Mesmo contrato público da RPC atual. A única mudança é qual versão da fórmula
  calcula `v_nota`. Copiar a assinatura é obrigatório: frontend publicado não
  pode descobrir uma RPC nova no meio do deploy.
*/
CREATE OR REPLACE FUNCTION public.enviar_resultado(
  p_duracao numeric,
  p_potencia numeric,
  p_profundidade numeric,
  p_textura numeric,
  p_tipo_de_origem text,
  p_nome_do_jogador text DEFAULT NULL,
  p_subtipo_de_origem text DEFAULT NULL,
  p_grupo_id uuid DEFAULT NULL
)
RETURNS public.resultados
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_nota_da_origem numeric;
  v_nota numeric;
  v_subtipo text;
  v_nome text;
  v_linha public.resultados;
BEGIN
  IF p_duracao IS NULL OR p_potencia IS NULL OR p_profundidade IS NULL OR p_textura IS NULL THEN
    RAISE EXCEPTION 'Parciais obrigatórias ausentes' USING ERRCODE = '22023';
  END IF;

  IF p_duracao      < 0 OR p_duracao      > 100
     OR p_potencia     < 0 OR p_potencia     > 100
     OR p_profundidade < 0 OR p_profundidade > 100
     OR p_textura      < 0 OR p_textura      > 100 THEN
    RAISE EXCEPTION 'Parciais fora da faixa 0-100' USING ERRCODE = '22023';
  END IF;

  v_nota_da_origem := public.aue_origin_score_v1(p_tipo_de_origem);
  IF v_nota_da_origem IS NULL THEN
    RAISE EXCEPTION 'Origem inválida: %', p_tipo_de_origem USING ERRCODE = '22023';
  END IF;

  v_nota := public.aue_nota_v2(
    p_duracao,
    p_potencia,
    p_profundidade,
    p_textura,
    v_nota_da_origem
  );

  v_subtipo := nullif(left(btrim(coalesce(p_subtipo_de_origem, '')), 40), '');
  IF p_tipo_de_origem NOT IN ('Comida', 'Bebida') THEN
    v_subtipo := NULL;
  END IF;

  IF p_grupo_id IS NOT NULL THEN
    IF v_uid IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.membros_grupo m
       WHERE m.group_id = p_grupo_id AND m.user_id = v_uid
    ) THEN
      RAISE EXCEPTION 'Grupo inválido ou usuário não é membro' USING ERRCODE = '42501';
    END IF;
  END IF;

  v_nome := CASE
    WHEN v_uid IS NOT NULL THEN NULL
    ELSE nullif(left(btrim(coalesce(p_nome_do_jogador, '')), 40), '')
  END;

  INSERT INTO public.resultados (
    nota, classificacao, e_artificial,
    duracao, potencia, profundidade, textura,
    nota_da_origem, tipo_de_origem, subtipo_de_origem,
    nome_do_jogador, usuario_id, grupo_id
  ) VALUES (
    v_nota,
    public.aue_classification_v1(v_nota),
    (p_tipo_de_origem = 'Puxei ar'),
    p_duracao, p_potencia, p_profundidade, p_textura,
    v_nota_da_origem, p_tipo_de_origem, v_subtipo,
    v_nome,
    v_uid,
    p_grupo_id
  )
  RETURNING * INTO v_linha;

  RETURN v_linha;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enviar_resultado(
  numeric, numeric, numeric, numeric, text, text, text, uuid
) TO anon, authenticated;
