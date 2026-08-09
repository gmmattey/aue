-- =============================================================================
-- Fecha a leitura direta de `resultados` e `desafios`.
--
-- O VAZAMENTO, dito sem eufemismo
-- -------------------------------
-- A 20260807000010 (seção C5) recriou, nas duas tabelas:
--
--     CREATE POLICY "Enable read access for all users"
--     ON public.<tabela> FOR SELECT TO anon, authenticated USING (true);
--
-- Nenhuma migração posterior revogou isso. Era herança do MVP anônimo de
-- 20260807000000, quando `resultados` guardava só nota e classificação.
--
-- Desde a 20260807000027, `resultados` guarda `audio_path`. E a policy de
-- SELECT do bucket (`"Audio is readable while not hidden"`, 20260807000028) é
-- `TO anon` e só pergunta `is_hidden = false`. Somando as duas coisas:
--
--     GET /rest/v1/resultados?select=id,score,audio_path
--
-- com a chave anônima — que é PÚBLICA e vai no bundle do site — devolve o
-- catálogo inteiro de áudios do sistema. De lá, `createSignedUrl` em cada
-- caminho entrega o arquivo. Sem código de batalha, sem link, sem prazo.
--
-- O mesmo GET em `/rest/v1/desafios` lista todos os duelos já criados.
--
-- POR QUE ISSO É GRAVE AQUI, E NÃO SÓ "FEIO"
-- ------------------------------------------
--   * O §3.7 do CONTRATO_MVP1 diz que, passados os 7 dias, o conteúdo da
--     sessão não deve continuar acessível. A 20260807000030 fez esse trabalho
--     direito: `batalhas` e `rodadas_batalha` não têm policy nenhuma e o prazo
--     é aplicado dentro de `obter_batalha`. Só que o prazo protegia a porta da
--     frente enquanto a porta lateral ficava escancarada — `resultados` não
--     tem prazo, e era ele que carregava o ponteiro do áudio.
--   * "Segurança e privacidade vencem a piada" (AGENTS.md) não sobrevive a um
--     endpoint que devolve o arroto de qualquer pessoa para qualquer pessoa.
--
-- A DECISÃO
-- ---------
-- `resultados` e `desafios` deixam de ser legíveis por PostgREST. Passam a ser
-- exatamente como `batalhas`: RLS ligada, NENHUMA policy de SELECT, e todo
-- acesso legítimo por RPC `SECURITY DEFINER` que exige a credencial do link.
--
-- Isto é uma migração de FECHAMENTO. Ela quebra, de propósito, tudo que
-- dependia da porta aberta. O que sobrevive e o que morre está listado abaixo,
-- um a um, porque a alternativa honesta a "não quebra nada" é dizer o que
-- quebra.
--
-- CONTINUA FUNCIONANDO (verificado lendo cada consumidor de src/)
--   * `submit_resultado`, `definir_audio_do_resultado`,
--     `remover_audio_do_resultado` — SECURITY DEFINER, devolvem a linha de
--     dentro da função. Não passam por policy.
--   * `criar_batalha`, `obter_batalha`, `responder_batalha`,
--     `criar_batalha_presencial` (000030/000031/000033) — SECURITY DEFINER. É
--     o fluxo de batalha do MVP1 inteiro.
--   * `can_use_as_challenger` (000016) e `can_use_as_challenged` (000023) —
--     SECURITY DEFINER, e o cabeçalho da 000016 já previa este dia: "a
--     checagem não pode depender de a policy de SELECT de `resultados`
--     continuar sendo USING (true)".
--   * `aue_compare_results_v1` e o trigger `on_desafio_set_winner` (000011) —
--     SECURITY DEFINER.
--   * `get_championship_leaderboard` (000007) — SECURITY DEFINER.
--   * A leitura do áudio no Storage — mas SÓ depois da seção 1 abaixo. Ver lá.
--   * `/d/CODIGO` (ChallengeView) — mas SÓ depois da seção 2 abaixo.
--
-- PARA DE FUNCIONAR, E ISSO ESTÁ ACEITO
--   * A view `global_ranking` (000009/000015) roda com `security_invoker = on`,
--     ou seja, lê `resultados` com as policies de quem chama. Sem policy, ela
--     devolveria lista VAZIA — e "RANKING VAZIO" é exatamente a mentira que o
--     comentário de `RankingScreen.tsx` diz ter corrigido ("ranking que falhava
--     aparecia como RANKING VAZIO, fazendo o produto parecer morto sem ser
--     verdade"). Por isso a seção 3 REVOGA o SELECT na view: ela passa a falhar
--     alto, e a tela mostra "Não foi possível carregar o ranking".
--     Ranking global está em §4 do contrato (fora do MVP1) e atrás de
--     `FLAGS.ranking`, que nasce desligada. Ligar aquela flag agora entrega uma
--     tela de erro; religar o ranking de verdade exige trocar a view por uma
--     RPC SECURITY DEFINER, e isso é trabalho do MVP2.
--   * Os embeds do PostgREST que puxam `result:resultados(*)` passam a devolver
--     `null` nesse campo: `getCommunityFeed`, `getUserFavorites` e
--     `getChampionshipLobby` em `src/db/supabase.ts`. Feed, favoritos e ligas
--     estão em §4 do contrato e atrás de `FLAGS.feed` / `FLAGS.ligas`, ambas
--     desligadas. `getUserFavorites` e `getChampionshipLobby` não têm um único
--     consumidor no src hoje.
--
--     FLAG DESLIGADA NÃO JUSTIFICA MANTER O VAZAMENTO. A porta é pública
--     independentemente do que o bundle renderiza — a chave anônima faz o GET
--     sem abrir o app. Então o feed é que passa a ter um defeito registrado, e
--     não a policy que fica aberta esperando por ele.
--
-- O QUE ESTA MIGRAÇÃO **NÃO** RESOLVE
--   * `desafios` continua sem prazo de validade. Ele é turno único e congelado
--     (000011), nunca teve `expires_at`, e inventar um aqui apagaria links por
--     conta própria. O §3.7 fala da sessão da batalha, que é `batalhas` e já
--     cumpre os 7 dias.
--   * Quem tem o CAMINHO de um áudio continua conseguindo assiná-lo enquanto o
--     resultado não estiver escondido. Isso não mudou e está documentado desde
--     a 000028. O que muda é que o caminho deixa de ser listável: ele agora só
--     chega por `obter_batalha` (que aplica os 7 dias) ou `obter_desafio`.
--   * A retenção do arquivo depois da expiração continua sendo a decisão de
--     produto pendente registrada no §9 do contrato. Não é decidida aqui.
--
-- NÃO VALIDADO: não há Postgres, Docker nem Supabase CLI neste ambiente.
-- Nenhuma instrução deste arquivo passou por um parser real — revisão por
-- leitura apenas. Ver a lista de verificação no fim do arquivo.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. STORAGE — tirar `public.resultados` de dentro das policies do bucket.
--
-- ESTA É A SEÇÃO QUE NÃO PODE FALTAR, e o motivo não é óbvio.
--
-- As duas policies de SELECT de `storage.objects` criadas na 20260807000028
-- fazem `EXISTS (SELECT 1 FROM public.resultados r WHERE ...)` dentro da
-- própria expressão da policy. Expressão de policy é avaliada com o ROLE DE
-- QUEM PEDE — então a RLS de `public.resultados` também se aplica ali dentro.
--
-- Consequência se esta seção não existisse: no instante em que a seção 3
-- derruba a policy de `resultados`, aquele EXISTS passa a não achar linha
-- nenhuma para `anon`, e NINGUÉM mais consegue assinar áudio. O fluxo principal
-- do MVP1 — abrir o link da batalha e OUVIR o arroto — morreria em silêncio,
-- com `assinarUrlDoAudio` devolvendo `null` e a tela dizendo educadamente que
-- não há áudio. Falha silenciosa, que é a pior das que este projeto já pagou.
--
-- A saída é a mesma que `can_use_as_challenger` usou em 000016: mover a
-- pergunta para uma função SECURITY DEFINER. Ela devolve BOOLEAN, nunca
-- conteúdo — não é uma brecha de leitura, é um predicado.
--
-- Prefixo `aue_` conforme a exceção da nomenclatura.md §4: regra de negócio
-- canônica compartilhada, no mesmo espírito de `aue_vaga_de_fundador_disponivel`.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.aue_audio_esta_visivel(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.resultados r
     WHERE r.audio_path = p_object_name
       AND r.is_hidden = false
  );
$$;

COMMENT ON FUNCTION public.aue_audio_esta_visivel(text) IS
  'Existe um resultado NÃO escondido apontando para este objeto do bucket? '
  'Usada na policy de SELECT de storage.objects. SECURITY DEFINER porque '
  'public.resultados deixou de ser legível pelo cliente (20260807000034).';

GRANT EXECUTE ON FUNCTION public.aue_audio_esta_visivel(text) TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.aue_audio_esta_escondido(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.resultados r
     WHERE r.audio_path = p_object_name
       AND r.is_hidden
  );
$$;

COMMENT ON FUNCTION public.aue_audio_esta_escondido(text) IS
  'Existe um resultado ESCONDIDO apontando para este objeto do bucket? Não é a '
  'negação de aue_audio_esta_visivel: objeto recém-subido, ainda sem ponteiro, '
  'não está visível nem escondido — e é esse caso que a policy do dono cobre.';

GRANT EXECUTE ON FUNCTION public.aue_audio_esta_escondido(text) TO anon, authenticated;


/*
  As duas policies voltam com a MESMA semântica da 20260807000028 — só a forma
  de perguntar mudou. Repetindo o que aquela migração já dizia, para quem ler
  só este arquivo:

    (a) A pública gateia por `is_hidden`. Inclui `anon` porque quem chega pelo
        link da batalha está deslogado.

    (b) A do dono existe por causa da janela real entre `upload` e
        `definir_audio_do_resultado`: nesse intervalo o objeto existe e nenhuma
        linha o referencia. Ela TAMBÉM respeita `is_hidden`, senão a moderação
        valeria para todos menos para quem ela existe para conter.

  `DROP` antes de `CREATE` porque policy de SELECT é combinada por OR: manter a
  versão antiga ao lado anularia a nova e, pior, manteria `public.resultados`
  dentro da expressão.
*/

DROP POLICY IF EXISTS "Audio is readable while not hidden" ON storage.objects;
DROP POLICY IF EXISTS "Owners can read their own pending audio" ON storage.objects;

CREATE POLICY "Audio is readable while not hidden"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'audio_records'
  AND public.aue_audio_esta_visivel(storage.objects.name)
);

CREATE POLICY "Owners can read their own pending audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'audio_records'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND NOT public.aue_audio_esta_escondido(storage.objects.name)
);


-- -----------------------------------------------------------------------------
-- 2. O DESAFIO LEGADO `/d/CODIGO` passa a ler por RPC.
--
-- `ChallengeView` continua roteada em `App.tsx` e é porta de entrada pública.
-- Ela faz hoje, em `src/db/supabase.ts`:
--
--   getChallenge      -> .from('desafios').select('*, challenger_result:resultados(...)')
--   completeChallenge -> .from('desafios').update(...).select().single()
--
-- As duas morrem quando a policy de SELECT cai — inclusive o UPDATE, porque o
-- `.eq('id', ...)` do PostgREST precisa LER a linha para achá-la, e o
-- `.select()` do retorno idem.
--
-- Em vez de manter a tabela aberta para servir uma tela legada, o acesso migra
-- para o mesmo desenho de `obter_batalha` / `responder_batalha`: o código do
-- link é o argumento e a única credencial.
--
-- A RPC devolve SÓ o que a tela renderiza (id, nota, classificação, caminho do
-- áudio) — e não `resultados.*`. O `select('*')` de antes entregava parciais,
-- `user_id`, `group_id`, XP e flags de moderação a quem abrisse um link do
-- WhatsApp. Estreitar isso é metade do ponto desta migração.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.obter_desafio(p_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_d public.desafios;
  v_desafiante jsonb;
  v_desafiado jsonb;
BEGIN
  IF p_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_d
    FROM public.desafios d
   WHERE d.id = p_id;

  IF v_d.id IS NULL THEN
    RETURN NULL;
  END IF;

  /*
    `audio_path` vira NULL quando o resultado está escondido — mesmo tratamento
    de `obter_batalha` (000033). Sem isto, a moderação dependeria só da policy
    do Storage, e a tela renderizaria um player que nunca toca.
  */
  SELECT jsonb_build_object(
           'id',             r.id,
           'score',          r.score,
           'classification', r.classification,
           'is_hidden',      r.is_hidden,
           'audio_path',     CASE WHEN r.is_hidden THEN NULL ELSE r.audio_path END
         )
    INTO v_desafiante
    FROM public.resultados r
   WHERE r.id = v_d.challenger_result_id;

  SELECT jsonb_build_object(
           'id',             r.id,
           'score',          r.score,
           'classification', r.classification,
           'is_hidden',      r.is_hidden,
           'audio_path',     CASE WHEN r.is_hidden THEN NULL ELSE r.audio_path END
         )
    INTO v_desafiado
    FROM public.resultados r
   WHERE r.id = v_d.challenged_result_id;

  /*
    Um desafio sem desafiante é impossível pelo schema (`challenger_result_id`
    é NOT NULL), mas o resultado pode ter sido apagado por CASCATA de conta. Se
    isso aconteceu, não há duelo para mostrar — e devolver o objeto pela metade
    faria a tela quebrar em `challenger_result.score`.
  */
  IF v_desafiante IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id',                v_d.id,
    'created_at',        v_d.created_at,
    'winner',            v_d.winner,
    'resolved_at',       v_d.resolved_at,
    'challenger_result', v_desafiante,
    'challenged_result', v_desafiado
  );
END;
$$;

COMMENT ON FUNCTION public.obter_desafio(text) IS
  'Duelo legado /d/CODIGO pelo código do link, ou NULL se não existir. Devolve '
  'apenas nota, classificação e caminho do áudio de cada lado — nunca a linha '
  'inteira de resultados.';

GRANT EXECUTE ON FUNCTION public.obter_desafio(text) TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.responder_desafio(
  p_id text,
  p_result_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_afetadas integer;
BEGIN
  /*
    A checagem de posse era feita pela policy de UPDATE
    ("Enable update for owner of challenged result", 000023). SECURITY DEFINER
    roda como dono da tabela e NÃO passa por policy, então a regra precisa ser
    reafirmada aqui — de propósito chamando a MESMA função, e não recopiando o
    predicado. Recopiar corpo de função é o padrão que já custou duas
    regressões silenciosas a este projeto (ver deriva-de-funcoes.migracoes.test.ts).
  */
  IF NOT public.can_use_as_challenged(p_result_id) THEN
    RAISE EXCEPTION 'Este resultado não é seu.'
      USING ERRCODE = '42501';
  END IF;

  /*
    `challenged_result_id IS NULL` reproduz o USING da policy: duelo já
    respondido não aceita segunda resposta. Os triggers `on_desafio_set_winner`
    e `on_desafio_update` (000010/000011) continuam disparando normalmente —
    SECURITY DEFINER não desliga trigger — então o vencedor segue sendo
    decidido pelo servidor e os campos imutáveis seguem protegidos.
  */
  UPDATE public.desafios d
     SET challenged_result_id = p_result_id
   WHERE d.id = p_id
     AND d.challenged_result_id IS NULL;

  GET DIAGNOSTICS v_afetadas = ROW_COUNT;

  IF v_afetadas = 0 THEN
    RAISE EXCEPTION 'Este desafio não existe ou já foi respondido.'
      USING ERRCODE = 'P0002';
  END IF;

  -- Mesma escolha de `responder_batalha`: devolver o estado inteiro, montado
  -- por um dono só da forma, em vez de duplicar o jsonb_build_object aqui.
  RETURN public.obter_desafio(p_id);
END;
$$;

COMMENT ON FUNCTION public.responder_desafio(text, uuid) IS
  'Responde o duelo legado /d/CODIGO e devolve o estado atualizado. A posse do '
  'resultado é reafirmada por can_use_as_challenged, porque SECURITY DEFINER '
  'não passa pela policy de UPDATE.';

GRANT EXECUTE ON FUNCTION public.responder_desafio(text, uuid) TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 3. O FECHAMENTO PROPRIAMENTE DITO.
--
-- Com RLS ligada e NENHUMA policy de SELECT, `GET /rest/v1/resultados` e
-- `GET /rest/v1/desafios` passam a devolver `[]` para `anon` e `authenticated`.
-- É o mesmo desenho de `batalhas` (000030, seção 2).
--
-- POR QUE O `GRANT SELECT` DAS TABELAS **NÃO** É REVOGADO AQUI.
-- A 20260807000030 revogou o GRANT das tabelas dela como cinto e suspensório, e
-- a tentação de repetir o gesto é grande. Não repito, e o motivo é específico:
-- `submit_resultado`, `definir_audio_do_resultado` e `remover_audio_do_resultado`
-- são declaradas `RETURNS public.resultados` e o PostgREST as chama como
-- `SELECT * FROM funcao(...)`. Se o Postgres checar privilégio de tabela ao
-- expandir esse composto — coisa que eu NÃO consigo verificar sem um Postgres
-- de verdade, e este ambiente não tem — o REVOKE derrubaria a RPC mais crítica
-- do produto inteiro. GRANT sem policy não autoriza uma única linha, então o
-- vazamento fecha do mesmo jeito; o REVOKE seria só profundidade extra.
--
-- Quem tiver um banco na mão: aplique esta migração, confirme que gravar,
-- ouvir e apagar áudio continuam funcionando, DEPOIS rode
--
--     REVOKE SELECT ON public.resultados, public.desafios FROM anon, authenticated;
--
-- e repita os três testes. Se passarem, isso vira uma migração 000035 de uma
-- linha. Enquanto ninguém verificar, fica escrito aqui em vez de arriscado lá.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Enable read access for all users" ON public.resultados;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.desafios;

COMMENT ON TABLE public.resultados IS
  'Gravações avaliadas. NÃO existe policy de SELECT: a leitura pelo cliente '
  'passa por RPC SECURITY DEFINER (submit_resultado, obter_batalha, '
  'obter_desafio). Escrita revogada desde 20260807000011.';

COMMENT ON TABLE public.desafios IS
  'Duelo legado /d/CODIGO, turno único e congelado. NÃO existe policy de '
  'SELECT: leitura e resposta passam por obter_desafio / responder_desafio. '
  'INSERT continua direto, gateado por can_use_as_challenger (20260807000016).';


/*
  `global_ranking` é a única consumidora que não tem para onde migrar dentro
  desta migração: ela é uma VIEW com `security_invoker = on` (000015), e sem
  policy na tabela base ela devolveria lista vazia em silêncio.

  Revogar o SELECT dela transforma esse silêncio em erro. `RankingScreen`
  já trata erro com mensagem própria — e o comentário dela diz, com todas as
  letras, que ranking que falha aparecendo como "RANKING VAZIO" faz o produto
  parecer morto sem ser verdade. Essa tela está atrás de `FLAGS.ranking`, que
  nasce desligada, e ranking global está no §4 do contrato (fora do MVP1).

  A view NÃO é derrubada: `RankingScreen` e `useGlobalRanking` continuam
  importando o nome, e derrubá-la aqui só trocaria um erro por outro. Quando o
  ranking voltar ao escopo, ele volta como RPC SECURITY DEFINER.
*/
REVOKE SELECT ON public.global_ranking FROM anon, authenticated;

COMMENT ON VIEW public.global_ranking IS
  'DESATIVADA em 20260807000034. security_invoker = on + resultados sem policy '
  'de SELECT = lista vazia; o GRANT foi revogado para falhar alto em vez de '
  'mentir. Reativar exige trocar a view por uma RPC SECURITY DEFINER.';


-- =============================================================================
-- VERIFICAR DEPOIS DE APLICAR, COM A CHAVE ANÔNIMA (nunca a service role)
--
--   1. GET /rest/v1/resultados?select=id,audio_path  -> DEVE vir `[]`.
--   2. GET /rest/v1/desafios?select=*                -> DEVE vir `[]`.
--   3. GET /rest/v1/global_ranking?select=*          -> DEVE falhar (42501).
--   4. rpc submit_resultado(...)                     -> devolve a linha nova.
--   5. Storage: createSignedUrl no `audio_path` de um resultado com
--      is_hidden = false -> DEVE assinar.
--      `update public.resultados set is_hidden = true where id = ...` e repetir
--      -> DEVE negar. É este par que prova que a seção 1 ficou correta.
--   6. rpc obter_desafio('<código válido>')  -> devolve o duelo.
--      rpc obter_desafio('ZZZZZZ')           -> devolve NULL.
--   7. rpc responder_desafio('<código em aberto>', '<resultado seu>')
--      -> devolve o duelo com `winner` preenchido.
--      Repetir a mesma chamada -> DEVE falhar com P0002.
--   8. Fluxo de ponta a ponta da batalha em dois aparelhos: gravar, criar
--      batalha, abrir o link no outro, OUVIR, responder. O passo "ouvir" é o
--      que a seção 1 pode ter quebrado, e nenhum teste automático deste
--      repositório o cobre.
-- =============================================================================
