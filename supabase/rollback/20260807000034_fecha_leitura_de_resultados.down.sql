-- =============================================================================
-- ROLLBACK MANUAL de 20260807000034_fecha_leitura_de_resultados.sql
--
-- USO DE EMERGÊNCIA. Leia `supabase/rollback/README.md` antes.
--
-- LEIA ISTO ANTES DE EXECUTAR QUALQUER LINHA
-- ------------------------------------------
-- Este é o caso que o README chama de "segurança pode piorar ao voltar", e
-- aqui ele não é hipótese: a seção 3 deste arquivo REABRE um vazamento
-- conhecido e confirmado.
--
-- A migração 000034 existe porque `public.resultados` tinha SELECT
-- `USING (true)` para `anon`. Como a chave anônima é pública e vai no bundle,
-- um único `GET /rest/v1/resultados?select=id,audio_path` devolvia o catálogo
-- de áudios do sistema inteiro, e daí `createSignedUrl` entregava os arquivos.
-- Sem código de batalha e sem prazo.
--
-- Executar a seção 3 devolve exatamente isso. Não é "voltar ao estado
-- anterior": é reabrir a porta de propósito.
--
-- ORDEM RECOMENDADA, do menos destrutivo para o mais
-- --------------------------------------------------
--   1. Quebrou o ÁUDIO (ninguém consegue ouvir)?  -> seção 1.
--   2. Quebrou o `/d/CODIGO`?                     -> seção 2.
--   3. Quebrou o RANKING e você precisa dele já?  -> seção 4.
--   4. Só se não houver outra saída                -> seção 3.
--
-- As seções são independentes. Rode SÓ a que corresponde ao que quebrou. Rodar
-- o arquivo inteiro por reflexo é o erro que o README pede para não cometer.
--
-- NENHUMA SEÇÃO APAGA DADO. Nada aqui derruba tabela, coluna ou linha —
-- só policies, grants e funções. `pg_dump` não é obrigatório, mas continua
-- sendo boa ideia.
--
-- NÃO VALIDADO: escrito e revisado por leitura, sem Postgres neste ambiente.
-- Rode dentro de BEGIN / ROLLBACK e confira os objetos antes de confirmar.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. ÁUDIO — devolver as policies do Storage à forma da 20260807000028.
--
-- SINTOMA QUE JUSTIFICA: `assinarUrlDoAudio` devolve `null` para todo mundo, e
-- as telas dizem que não há áudio quando há. Ou seja: os helpers
-- `aue_audio_esta_visivel` / `aue_audio_esta_escondido` não estão sendo
-- avaliados como esperado.
--
-- ATENÇÃO À DEPENDÊNCIA CRUZADA: a forma antiga faz `EXISTS (SELECT 1 FROM
-- public.resultados ...)` DENTRO da policy, e expressão de policy roda com o
-- role de quem pede. Enquanto `resultados` estiver sem policy de SELECT (ou
-- seja, enquanto a seção 3 não tiver sido executada), aquele EXISTS não acha
-- linha nenhuma e o áudio continua sem assinar — só que agora sem os helpers
-- para culpar.
--
-- Então esta seção só resolve alguma coisa se vier ACOMPANHADA da seção 3.
-- Se você não quer reabrir `resultados`, o caminho certo é CONSERTAR os
-- helpers, não voltar as policies.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Audio is readable while not hidden" ON storage.objects;
DROP POLICY IF EXISTS "Owners can read their own pending audio" ON storage.objects;

CREATE POLICY "Audio is readable while not hidden"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'audio_records'
  AND EXISTS (
    SELECT 1
      FROM public.resultados r
     WHERE r.audio_path = storage.objects.name
       AND r.is_hidden = false
  )
);

CREATE POLICY "Owners can read their own pending audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'audio_records'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND NOT EXISTS (
    SELECT 1
      FROM public.resultados r
     WHERE r.audio_path = storage.objects.name
       AND r.is_hidden
  )
);

-- Os helpers ficam de pé de propósito: são inofensivos (devolvem boolean) e
-- apagá-los aqui quebraria qualquer outra policy que passe a usá-los. Se você
-- quiser mesmo removê-los, é depois de conferir que nada mais os referencia:
--
--   DROP FUNCTION IF EXISTS public.aue_audio_esta_visivel(text);
--   DROP FUNCTION IF EXISTS public.aue_audio_esta_escondido(text);


-- -----------------------------------------------------------------------------
-- 2. DESAFIO LEGADO — desfazer as RPCs `/d/CODIGO`.
--
-- SINTOMA QUE JUSTIFICA: a tela do duelo antigo falha e você precisa dela no ar.
--
-- FREIO REVERSÍVEL PRIMEIRO. Revogar a execução tira as RPCs do ar sem apagar
-- nada; devolver é reaplicar os GRANT da seção 2 da migração.
-- -----------------------------------------------------------------------------

-- REVOKE EXECUTE ON FUNCTION public.obter_desafio(text) FROM anon, authenticated;
-- REVOKE EXECUTE ON FUNCTION public.responder_desafio(text, uuid) FROM anon, authenticated;

-- Só depois, se for para remover mesmo:
DROP FUNCTION IF EXISTS public.responder_desafio(text, uuid);
DROP FUNCTION IF EXISTS public.obter_desafio(text);

-- LEMBRETE: sem a seção 3, remover as RPCs deixa `/d/CODIGO` sem NENHUM
-- caminho de leitura — o cliente publicado que chama `obter_desafio` passa a
-- receber "function does not exist". Só faz sentido junto da seção 3, ou junto
-- de um deploy que volte `src/db/supabase.ts` para o `.from('desafios')`.


-- -----------------------------------------------------------------------------
-- 3. REABRIR A LEITURA — o vazamento volta. Leia o cabeçalho de novo.
--
-- SINTOMA QUE JUSTIFICA: praticamente nenhum. As leituras legítimas do MVP1
-- passam por RPC SECURITY DEFINER e NÃO dependem destas policies. Se algo do
-- fluxo principal quebrou, a causa quase certamente está na seção 1 ou 2.
--
-- O que estas policies devolvem, exatamente:
--   * catálogo completo de `resultados`, incluindo `audio_path` de todo mundo;
--   * listagem completa de `desafios`.
--
-- Só execute se a alternativa for o produto fora do ar, e trate como incidente
-- aberto até fechar de novo.
-- -----------------------------------------------------------------------------

-- Descomente conscientemente:
--
-- DROP POLICY IF EXISTS "Enable read access for all users" ON public.resultados;
-- CREATE POLICY "Enable read access for all users"
-- ON public.resultados FOR SELECT
-- TO anon, authenticated
-- USING (true);
--
-- DROP POLICY IF EXISTS "Enable read access for all users" ON public.desafios;
-- CREATE POLICY "Enable read access for all users"
-- ON public.desafios FOR SELECT
-- TO anon, authenticated
-- USING (true);


-- -----------------------------------------------------------------------------
-- 4. RANKING — devolver o GRANT da view.
--
-- SINTOMA QUE JUSTIFICA: a tela de ranking foi religada e precisa responder.
--
-- Isoladamente isto NÃO faz o ranking voltar: `global_ranking` roda com
-- `security_invoker = on`, então sem policy em `resultados` ela devolve lista
-- vazia. Devolver o GRANT sozinho troca "erro honesto" por "RANKING VAZIO",
-- que é a mentira que a própria tela documenta ter corrigido.
--
-- Ou seja: esta seção só entrega ranking de verdade acompanhada da seção 3.
-- A saída correta continua sendo reescrever a view como RPC SECURITY DEFINER.
-- -----------------------------------------------------------------------------

-- GRANT SELECT ON public.global_ranking TO anon, authenticated;


-- =============================================================================
-- CONFERIR DEPOIS DE QUALQUER SEÇÃO
--
--   select polname, polcmd, pg_get_expr(polqual, polrelid)
--     from pg_policy
--    where polrelid in ('public.resultados'::regclass, 'public.desafios'::regclass);
--
--   select polname, pg_get_expr(polqual, polrelid)
--     from pg_policy where polrelid = 'storage.objects'::regclass;
--
--   select proname from pg_proc
--    where proname in ('obter_desafio', 'responder_desafio',
--                      'aue_audio_esta_visivel', 'aue_audio_esta_escondido');
--
--   select has_table_privilege('anon', 'public.global_ranking', 'SELECT');
--
-- E o teste que importa mais que todos: abra um link de batalha num aparelho
-- deslogado e tente OUVIR.
-- =============================================================================
