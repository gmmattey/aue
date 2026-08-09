-- =============================================================================
-- REVANCHE — a mesma disputa continuando, guardando a melhor tentativa
-- =============================================================================
--
-- O QUE ESTA MIGRAÇÃO RESOLVE
--
-- Hoje `responder_batalha` EMPILHA: cada resposta vira uma linha nova no
-- placar. Isso está certo para o primeiro round de cada lado e errado para a
-- revanche — arrotar três vezes daria três linhas suas, e o `docs/jogo/ARENA.md`
-- é explícito no estado `REMATCH`:
--
--   "a nota nova entra no placar existente, guardando a melhor tentativa E O
--    ÁUDIO DAQUELA TENTATIVA — senão o placar toca um arroto que não é o da
--    nota exibida."
--
-- POR QUE UMA FUNÇÃO NOVA, E NÃO UM AJUSTE NA QUE EXISTE
--
-- `responder_batalha` atende o fluxo antigo E a primeira resposta do X1 — que
-- acabou de ser testada em dois celulares e funciona. Mexer nela seria arriscar
-- o que já está de pé para ganhar uma feature nova. Esta nasce ao lado, é
-- chamada só pela Arena, e a unificação fica registrada para quando o legado
-- sair (issue #109).
--
-- Isto NÃO altera nem remove nada existente. Só acrescenta.
-- =============================================================================

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
  -- O resultado tem de ser de quem está chamando. Sem isto, qualquer pessoa
  -- com o link colocaria o arroto de outra na disputa.
  IF NOT public.pode_usar_como_desafiante(p_resultado_id) THEN
    RAISE EXCEPTION 'Este resultado não é seu.'
      USING ERRCODE = '42501';
  END IF;

  -- `FOR UPDATE`: os dois lados podem revanchar no mesmo minuto, e sem a trava
  -- as duas transações leriam o mesmo placar e uma sobrescreveria a outra.
  SELECT * INTO v_b
    FROM public.batalhas b
   WHERE b.codigo_de_acesso = p_codigo_de_acesso
     FOR UPDATE;

  -- O prazo é do servidor, aqui como em todo lugar. A tela não decide isso.
  IF v_b.id IS NULL OR v_b.expira_em <= timezone('utc', now()) THEN
    RAISE EXCEPTION 'Esta batalha não está mais disponível.'
      USING ERRCODE = 'P0002';
  END IF;

  -- Revanche é coisa de disputa remota. Na presencial o round é derivado por
  -- participante e quem manda é a `responder_batalha`.
  IF v_b.tipo_de_batalha IS DISTINCT FROM 'remota' THEN
    RAISE EXCEPTION 'Revanche só vale em disputa por link.'
      USING ERRCODE = '22023';
  END IF;

  SELECT r.usuario_id, r.nota
    INTO v_dono, v_nota_nova
    FROM public.resultados r
   WHERE r.id = p_resultado_id;

  -- A linha que esta pessoa já tem nesta disputa. Numa batalha remota é uma só
  -- por pessoa — é justamente isso que esta função existe para manter.
  SELECT rb.id, r.nota
    INTO v_rodada_id, v_nota_atual
    FROM public.rodadas_batalha rb
    JOIN public.resultados r ON r.id = rb.resultado_id
   WHERE rb.batalha_id = v_b.id
     AND rb.usuario_id = v_dono
   ORDER BY rb.posicao
   LIMIT 1;

  IF v_rodada_id IS NULL THEN
    -- Primeira vez desta pessoa na disputa: entra como entraria pela
    -- `responder_batalha`. Isto torna a função capaz de servir os dois casos
    -- no dia em que a gente unificar.
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

  /*
    A REGRA DA MELHOR TENTATIVA.

    Maior troca; igual ou menor não mexe em nada. O empate mantém a linha
    antiga de propósito: trocar por uma nota igual trocaria o ÁUDIO sem trocar
    o número, e o placar passaria a tocar um arroto diferente do que estava
    valendo — exatamente o que o ARENA.md manda evitar.

    A POSIÇÃO NÃO MUDA. Trocar a posição faria o placar se reordenar sozinho e
    a pessoa perder de vista onde ela estava.
  */
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

GRANT EXECUTE ON FUNCTION public.revanchar_batalha(text, uuid) TO anon, authenticated;
