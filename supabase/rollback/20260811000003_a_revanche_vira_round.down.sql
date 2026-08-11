-- =============================================================================
-- ROLLBACK — a revanche volta a ser melhor tentativa
-- =============================================================================
--
-- Desfaz a 20260811000003. O que ele devolve é o estado da 20260809000001:
-- uma linha por pessoa na briga, e revanche só troca se a nota for maior.
--
-- ATENÇÃO — ISTO NÃO É REVERSÍVEL SOZINHO. Se já existir briga com mais de um
-- round, o CHECK `BETWEEN 1 AND 3` volta a valer e as linhas com
-- `numero_da_rodada > 3` ficam ilegais: o ALTER falha na cara do operador em vez
-- de apagar dado de gente. Limpar essas linhas é decisão de produto, não de
-- migração, e por isso não está escrita aqui.
-- =============================================================================

DROP INDEX IF EXISTS public.rodadas_um_arroto_por_round_na_remota;

ALTER TABLE public.rodadas_batalha
  DROP CONSTRAINT IF EXISTS rodadas_batalha_numero_da_rodada_valido;

ALTER TABLE public.rodadas_batalha
  ADD CONSTRAINT rodadas_batalha_numero_da_rodada_valido
  CHECK (numero_da_rodada BETWEEN 1 AND 3);

DROP FUNCTION IF EXISTS public.vencedor_do_round(uuid, uuid);

-- `revanchar_batalha` como estava na 20260809000001.
CREATE OR REPLACE FUNCTION public.revanchar_batalha(
  p_codigo_de_acesso text,
  p_resultado_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_b          public.batalhas;
  v_dono       uuid;
  v_nota_nova  numeric;
  v_rodada_id  uuid;
  v_nota_atual numeric;
  v_pos        integer;
BEGIN
  IF NOT public.pode_usar_como_desafiante(p_resultado_id) THEN
    RAISE EXCEPTION 'Este resultado não é seu.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_b
    FROM public.batalhas b
   WHERE b.codigo_de_acesso = p_codigo_de_acesso
     FOR UPDATE;

  IF v_b.id IS NULL OR v_b.expira_em <= timezone('utc', now()) THEN
    RAISE EXCEPTION 'Esta batalha não está mais disponível.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_b.tipo_de_batalha IS DISTINCT FROM 'remota' THEN
    RAISE EXCEPTION 'Revanche só vale em disputa por link.'
      USING ERRCODE = '22023';
  END IF;

  SELECT r.usuario_id, r.nota
    INTO v_dono, v_nota_nova
    FROM public.resultados r
   WHERE r.id = p_resultado_id;

  SELECT rb.id, r.nota
    INTO v_rodada_id, v_nota_atual
    FROM public.rodadas_batalha rb
    JOIN public.resultados r ON r.id = rb.resultado_id
   WHERE rb.batalha_id = v_b.id
     AND rb.usuario_id = v_dono
   ORDER BY rb.posicao
   LIMIT 1;

  IF v_rodada_id IS NULL THEN
    SELECT COALESCE(max(rb.posicao), 0) + 1 INTO v_pos
      FROM public.rodadas_batalha rb
     WHERE rb.batalha_id = v_b.id;

    IF v_pos > 50 THEN
      RAISE EXCEPTION 'Esta batalha já chegou ao limite de rodadas.'
        USING ERRCODE = '54000';
    END IF;

    INSERT INTO public.rodadas_batalha
      (batalha_id, resultado_id, usuario_id, posicao, numero_da_rodada)
    VALUES
      (v_b.id, p_resultado_id, v_dono, v_pos, 1);

    RETURN public.obter_batalha(p_codigo_de_acesso);
  END IF;

  IF v_nota_nova > v_nota_atual THEN
    UPDATE public.rodadas_batalha
       SET resultado_id = p_resultado_id
     WHERE id = v_rodada_id;
  END IF;

  RETURN public.obter_batalha(p_codigo_de_acesso);
END;
$$;

COMMENT ON FUNCTION public.revanchar_batalha(text, uuid) IS
  'Revanche numa disputa por link: guarda a melhor tentativa de cada pessoa, com o áudio daquela tentativa. Não substitui responder_batalha, que continua atendendo o fluxo antigo e a primeira resposta.';

-- `obter_batalha` como estava na 20260807000036: sem `placar` e coroando quem
-- empatou por profundidade.
CREATE OR REPLACE FUNCTION public.obter_batalha(p_codigo_de_acesso text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_b public.batalhas;
  v_rodadas jsonb;
  v_participantes jsonb;
  v_lider jsonb;
BEGIN
  SELECT * INTO v_b
    FROM public.batalhas b
   WHERE b.codigo_de_acesso = p_codigo_de_acesso
     AND b.expira_em > timezone('utc', now());

  IF v_b.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'rodada_id',         rb.id,
               'posicao',           rb.posicao,
               'numero_da_rodada',  rb.numero_da_rodada,
               'participante_id',   rb.participante_id,
               'resultado_id',      r.id,
               'nota',              r.nota,
               'classificacao',     r.classificacao,
               'tipo_de_origem',    r.tipo_de_origem,
               'subtipo_de_origem', r.subtipo_de_origem,
               'e_artificial',      r.e_artificial,
               'esta_escondido',    r.esta_escondido,
               'caminho_do_audio',  CASE WHEN r.esta_escondido THEN NULL ELSE r.caminho_do_audio END,
               'apelido',           COALESCE(pb.apelido, p.apelido, r.nome_do_jogador, 'Anônimo'),
               'usuario_id',        rb.usuario_id,
               'criado_em',         rb.criado_em
             )
             ORDER BY rb.posicao
           ),
           '[]'::jsonb
         )
    INTO v_rodadas
    FROM public.rodadas_batalha rb
    JOIN public.resultados r ON r.id = rb.resultado_id
    LEFT JOIN public.perfis p ON p.id = rb.usuario_id
    LEFT JOIN public.participantes_batalha pb ON pb.id = rb.participante_id
   WHERE rb.batalha_id = v_b.id;

  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object('id', pb.id, 'apelido', pb.apelido, 'ordem_do_turno', pb.ordem_do_turno)
             ORDER BY pb.ordem_do_turno NULLS LAST, pb.entrou_em, pb.id
           ),
           '[]'::jsonb
         )
    INTO v_participantes
    FROM public.participantes_batalha pb
   WHERE pb.batalha_id = v_b.id;

  SELECT jsonb_build_object(
           'apelido',      COALESCE(pb.apelido, p.apelido, r.nome_do_jogador, 'Anônimo'),
           'nota',         r.nota,
           'resultado_id', r.id
         )
    INTO v_lider
    FROM public.rodadas_batalha rb
    JOIN public.resultados r ON r.id = rb.resultado_id
    LEFT JOIN public.perfis p ON p.id = rb.usuario_id
    LEFT JOIN public.participantes_batalha pb ON pb.id = rb.participante_id
   WHERE rb.batalha_id = v_b.id
     AND NOT r.esta_escondido
   ORDER BY r.nota DESC, r.profundidade DESC, r.potencia DESC, r.duracao DESC
   LIMIT 1;

  RETURN jsonb_build_object(
    'codigo_de_acesso', v_b.codigo_de_acesso,
    'tipo_de_batalha',  v_b.tipo_de_batalha,
    'tipo_de_local',    v_b.tipo_de_local,
    'total_de_rodadas', v_b.total_de_rodadas,
    'criado_em',        v_b.criado_em,
    'expira_em',        v_b.expira_em,
    'finalizada_em',    v_b.finalizada_em,
    'rodadas',          v_rodadas,
    'participantes',    v_participantes,
    'lider',            v_lider
  );
END;
$$;
