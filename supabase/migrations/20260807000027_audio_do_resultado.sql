-- =============================================================================
-- `resultados.audio_path` deixa de ser coluna morta: RPC de escrita.
--
-- CONTEXTO: a 20260807000013 criou o bucket `audio_records` e a coluna
-- `resultados.audio_path`. Dois números ANTES, a 20260807000011 (linha 248) já
-- havia executado
--
--     REVOKE INSERT, UPDATE, DELETE ON public.resultados FROM anon, authenticated;
--
-- e nenhuma migração posterior devolveu UPDATE nem criou policy `FOR UPDATE`
-- em `resultados`. A RPC `submit_resultado`, único caminho de gravação desde
-- então, nunca recebeu o campo. Resultado: a coluna era inalcançável ponta a
-- ponta, o bucket não tinha produtor, e nenhuma tela conseguia descobrir onde
-- estava o áudio de um resultado. É o mesmo defeito que a 20260807000023
-- descreve para `origin_subtype` e `group_id` (linha 258).
--
-- POR QUE UMA RPC E NÃO UM GRANT DE UPDATE: devolver UPDATE a `authenticated`
-- abriria a tabela inteira — score, classificação, `is_hidden`, `xp_earned` —
-- e desfaria a defesa em profundidade da 20260807000011. A RPC escreve UMA
-- coluna, valida a posse e roda como owner, mantendo o REVOKE intacto.
--
-- POR QUE NÃO ESTENDER `submit_resultado`: o caminho do objeto no Storage é
-- derivado do `resultados.id`, que só existe DEPOIS do INSERT. Acrescentar o
-- parâmetro exigiria o cliente sortear um UUID antes de gravar, e ainda
-- obrigaria a um DROP da assinatura (sobrecarga deixa o PostgREST ambíguo —
-- ver 20260807000023, linha 279).
--
-- ESCRITA ÚNICA, DE PROPÓSITO. `audio_path` só pode sair de NULL uma vez. O
-- bucket `audio_records` não tem policy de UPDATE (só INSERT e DELETE, ver
-- 20260807000013), então trocar o ponteiro deixaria o objeto anterior órfão no
-- Storage, sem nenhum caminho para encontrá-lo ou apagá-lo depois.
--
-- CONSEQUÊNCIA DE PRIVACIDADE — DECISÃO TOMADA, NÃO EFEITO COLATERAL:
-- `resultados` tem SELECT público (`TO anon, authenticated USING (true)`,
-- 20260807000010) e o bucket é público (20260807000013). Logo, TODO caminho
-- gravado aqui é lido por qualquer pessoa e o áudio correspondente é audível
-- por qualquer pessoa que monte a URL, esteja ele no feed ou não. Não existe
-- áudio "privado" neste desenho. O cliente avisa isso na tela antes do envio.
--
-- VERIFICAR DEPOIS DE APLICAR:
--   1. `select proname, prosecdef, proconfig from pg_proc
--       where proname = 'definir_audio_do_resultado';`
--      -> prosecdef = true e proconfig contendo `search_path=public, pg_temp`
--      (o advisor "Function Search Path Mutable" não pode ganhar mais uma
--      entrada — ver README.md, linha 213).
--   2. `select has_table_privilege('authenticated', 'public.resultados', 'UPDATE');`
--      -> DEVE continuar `false`. Se virar `true`, esta migração falhou no seu
--      propósito principal.
--   3. Chamar a RPC autenticado como A para um resultado de B deve levantar
--      42501; para um resultado anônimo (`user_id IS NULL`), 42501 também.
--   4. Chamar duas vezes para o mesmo resultado: a segunda deve levantar 55000.
--   5. Passar um caminho cuja primeira pasta não seja o próprio uid deve
--      levantar 22023 — o mesmo que a policy do Storage recusaria.
--
-- NÃO VALIDADO: não há Postgres, psql nem Supabase CLI neste ambiente. Escrito
-- e revisado por leitura, sem passar por parser. Rollback em
-- `supabase/rollback/20260807000027_audio_do_resultado.down.sql`.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Guarda de formato na própria coluna.
--
-- NOT VALID pelo mesmo motivo das constraints da 20260807000023: não há linha
-- com `audio_path` preenchido hoje (a coluna nunca teve produtor), mas validar
-- retroativamente uma tabela grande trava escrita, e o ganho seria zero.
--
-- O limite de 300 caracteres é folgado para `<uuid>/<uuid>.<ext>` (77) e ainda
-- assim impede que a coluna vire depósito de texto arbitrário.
-- -----------------------------------------------------------------------------

ALTER TABLE public.resultados
  DROP CONSTRAINT IF EXISTS resultados_audio_path_formato,
  ADD CONSTRAINT resultados_audio_path_formato
    CHECK (
      audio_path IS NULL
      OR (
        char_length(audio_path) BETWEEN 3 AND 300
        AND audio_path LIKE '%/%'
        AND audio_path NOT LIKE '%..%'
        AND audio_path NOT LIKE '/%'
      )
    ) NOT VALID;

COMMENT ON COLUMN public.resultados.audio_path IS
  'Caminho do objeto no bucket público audio_records, no formato '
  '<user_id>/<result_id>.<ext>. Escrito UMA única vez, exclusivamente pela RPC '
  'definir_audio_do_resultado. NULL significa que não há áudio — gravação '
  'anônima nunca tem, porque a policy de INSERT do bucket é TO authenticated.';


-- -----------------------------------------------------------------------------
-- 2. RPC de escrita.
--
-- SECURITY DEFINER pelo mesmo motivo de `submit_resultado` e
-- `criar_comentario`: a identidade vem de `auth.uid()` no servidor, nunca do
-- payload, e a função precisa de um privilégio (UPDATE) que o chamador não
-- tem nem deve ter.
--
-- A checagem da primeira pasta usa `storage.foldername`, a MESMA função da
-- policy "Authenticated Users can upload audio" (20260807000013, linha 31), e
-- não um `split_part` equivalente. É deliberado: se a coluna aceitasse um
-- caminho que a policy do Storage recusaria, o banco passaria a apontar para um
-- objeto que nunca poderia existir. `foldername` devolve array vazio quando não
-- há '/', e `[1]` de array vazio é NULL — o que já recusa caminho sem pasta.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.definir_audio_do_resultado(
  p_result_id uuid,
  p_audio_path text
)
RETURNS public.resultados
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_path  text;
  v_dono  uuid;
  v_atual text;
  v_linha public.resultados;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário precisa estar autenticado' USING ERRCODE = '28000';
  END IF;

  IF p_result_id IS NULL THEN
    RAISE EXCEPTION 'Resultado não informado' USING ERRCODE = '22023';
  END IF;

  v_path := btrim(coalesce(p_audio_path, ''));

  IF char_length(v_path) = 0 THEN
    RAISE EXCEPTION 'Caminho do áudio vazio' USING ERRCODE = '22023';
  END IF;

  IF char_length(v_path) > 300 THEN
    RAISE EXCEPTION 'Caminho do áudio longo demais' USING ERRCODE = '22023';
  END IF;

  -- Espelha exatamente a policy de INSERT do bucket.
  IF (storage.foldername(v_path))[1] IS DISTINCT FROM v_uid::text THEN
    RAISE EXCEPTION 'O caminho do áudio precisa começar pela pasta do próprio usuário'
      USING ERRCODE = '22023';
  END IF;

  IF v_path LIKE '%..%' OR v_path LIKE '/%' THEN
    RAISE EXCEPTION 'Caminho do áudio inválido' USING ERRCODE = '22023';
  END IF;

  -- Trava a linha: duas chamadas concorrentes para o mesmo resultado não podem
  -- as duas ver `audio_path` NULL e as duas escreverem. Sem o FOR UPDATE, a
  -- segunda sobrescreveria o ponteiro da primeira e órfãaria o objeto dela no
  -- Storage — que não tem policy de DELETE para ninguém além do próprio dono, e
  -- ninguém saberia mais o caminho.
  SELECT r.user_id, r.audio_path
    INTO v_dono, v_atual
    FROM public.resultados r
   WHERE r.id = p_result_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resultado não encontrado' USING ERRCODE = '22023';
  END IF;

  -- Resultado anônimo (`user_id IS NULL`) cai aqui e é recusado: `IS DISTINCT
  -- FROM` trata NULL como valor, então não há como um NULL "casar" com o uid.
  IF v_dono IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Este resultado não é seu' USING ERRCODE = '42501';
  END IF;

  IF v_atual IS NOT NULL THEN
    RAISE EXCEPTION 'Este resultado já tem áudio' USING ERRCODE = '55000';
  END IF;

  UPDATE public.resultados
     SET audio_path = v_path
   WHERE id = p_result_id
  RETURNING * INTO v_linha;

  RETURN v_linha;
END;
$$;

COMMENT ON FUNCTION public.definir_audio_do_resultado(uuid, text) IS
  'Grava audio_path num resultado do próprio usuário, uma única vez. Existe '
  'porque 20260807000011 revogou UPDATE em resultados para anon e '
  'authenticated, e devolver esse privilégio abriria a tabela inteira.';

-- Só `authenticated`. `anon` não pode nem subir para o bucket (a policy de
-- INSERT do Storage é TO authenticated), então conceder execução aqui só
-- produziria erro mais tarde, num ponto pior da jornada.
GRANT EXECUTE ON FUNCTION public.definir_audio_do_resultado(uuid, text) TO authenticated;
