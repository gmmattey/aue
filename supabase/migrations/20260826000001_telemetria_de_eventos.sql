-- =============================================================================
-- Telemetria v1 — de onde o jogador vem, e onde ele para de jogar.
--
-- CONTEXTO. O Giam quer enxergar o funil "aquisição → primeiro arroto → nota →
-- compartilhamento/X1 → resposta → revanche" sem abrir mão de duas coisas:
-- nenhum serviço externo (Google Analytics, Firebase Analytics, PostHog) e
-- nenhum dado que identifique alguém. O que esta migração cria é uma tabela de
-- EVENTOS ANÔNIMOS, gravada pelo próprio cliente, e SÓ ISSO.
--
-- O QUE NÃO É: um SELECT para o app. A tabela é WRITE-ONLY para quem joga —
-- ninguém lê o próprio evento de volta, e não existe tela que dependa disto.
-- Quem consulta o funil é humano, direto no SQL Editor do painel (dono do
-- projeto = `postgres`, que não passa por RLS).
--
-- POR QUE TABELA + RLS, E NÃO UMA RPC. A issue #178 (auditoria do Marcelinho)
-- listou 29 funções SECURITY DEFINER com EXECUTE liberado para `anon` — a
-- maioria resto de feature desligada, nenhuma testada uma por uma. O pedido
-- explícito que motivou esta migração é NÃO acrescentar a trigésima: um
-- INSERT direto, gateado por RLS e CHECK, faz o mesmo trabalho sem rodar com
-- privilégio de dono e sem crescer a lista que a #178 está tentando reduzir.
-- É também o padrão mais antigo do próprio schema — `resultados` e `desafios`
-- nasceram (20260807000000) com `FOR INSERT TO anon WITH CHECK (true)`, e
-- 20260807000016 reafirmou o mesmo desenho para `desafios`.
--
-- POR QUE anon E authenticated OS DOIS. A sessão do Auê é anônima
-- (`signInAnonymously`, 20260807000029), criada em segundo plano no boot SEM
-- `await` (`main.tsx`). Um evento pode sair ANTES dessa sessão existir (role
-- `anon`, sem JWT) ou DEPOIS (role `authenticated`, JWT anônimo) — o cliente
-- não escolhe quando a corrida termina. Restringir a um dos dois papéis faria
-- `abriu_arena` falhar em silêncio na metade das visitas, dependendo de quem
-- chegou primeiro na corrida.
--
-- POR QUE NEM authenticated GANHA LEITURA. Pedido explícito do Giam: a tabela
-- não abre SELECT para ninguém que não seja o dono do projeto. Não existe
-- feature que precise ler o próprio histórico de eventos.
--
-- A LIÇÃO DA 20260812000001, APLICADA AQUI DE PROPÓSITO. Aquela migração
-- mostrou que `REVOKE ... FROM PUBLIC` sozinho não fecha porta nenhuma —
-- Postgres concede privilégio por default a `anon`/`authenticated` no schema
-- `public`, e sem REVOKE nominal os dois continuam com acesso. Por isso esta
-- migração REVOGA tudo dos dois papéis primeiro e GRANTa só o INSERT, em vez
-- de confiar apenas na ausência de policy de SELECT/UPDATE/DELETE. Duas
-- camadas independentes (GRANT e RLS) para o mesmo "não".
--
-- O QUE ESTA TABELA NÃO GUARDA, DE PROPÓSITO: nome, e-mail, IP, geolocalização,
-- áudio, texto digitado, user agent completo ou qualquer coisa que identifique
-- alguém. `sessao_id` é um UUID gerado no navegador (`crypto.randomUUID()`),
-- sem fingerprinting — ver `src/nucleo/telemetria/sessao.ts`.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- A tabela.
--
-- Os dez eventos do v1 são um CHECK, não um ENUM: trocar o CHECK é uma
-- migração de uma linha, e um ENUM exigiria ALTER TYPE toda vez que o v2
-- acrescentar um evento. `evento` deliberadamente não referencia nenhum outro
-- domínio do schema — telemetria não é regra de jogo, e não tem FK para
-- `resultados`, `desafios` ou `perfis`.
-- -----------------------------------------------------------------------------

CREATE TABLE public.eventos_de_telemetria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  evento text NOT NULL,

  criado_em timestamptz NOT NULL DEFAULT now(),

  -- Anônimo e gerado no cliente. NÃO é `auth.uid()`: a sessão de telemetria
  -- precisa sobreviver a quem limpou o navegador e virou "outra pessoa" para o
  -- Supabase Auth, e precisa existir mesmo quando `signInAnonymously` ainda
  -- não respondeu. Ver `src/nucleo/telemetria/sessao.ts`.
  sessao_id uuid NOT NULL,

  -- De onde a sessão veio (?src=), capturado só na primeira entrada e
  -- preservado depois — nunca sobrescrito por navegação interna. 'direct'
  -- quando não há parâmetro. Texto livre, não ENUM: uma campanha nova em
  -- outra rede não pode exigir migração para ser contada.
  origem text NOT NULL DEFAULT 'direct',
  campanha text,
  conteudo text,

  -- 'web' hoje. Existe a coluna porque `docs/technical/adr/0002-o-aue-nas-lojas.md`
  -- já prevê casca nativa — quando ela existir, o adaptador nativo manda outro
  -- valor pela mesma porta, sem migração nova.
  plataforma text NOT NULL DEFAULT 'web',

  versao_app text,

  -- Opcional, e só usado nos eventos que precisam relacionar o fluxo de X1 ou
  -- de roda (criou_x1, abriu_x1, respondeu_x1, pediu_revanche, concluiu_roda).
  --
  -- GUARDA O `codigo_de_acesso` (texto), NÃO o `batalhas.id` (uuid). O
  -- cliente NUNCA recebe o uuid interno de uma batalha — só o código do link,
  -- que já é a credencial pública dela (`docs/schema/nomenclatura.md`,
  -- `batalhas.codigo_de_acesso`). Sem FK de propósito: telemetria é
  -- best-effort e não pode falhar porque uma tabela operacional mudou de
  -- forma por baixo dela.
  batalha_codigo text,

  CONSTRAINT eventos_de_telemetria_evento_valido CHECK (
    evento IN (
      'abriu_arena',
      'iniciou_arroto',
      'recebeu_nota',
      'tentou_novamente',
      'compartilhou',
      'criou_x1',
      'abriu_x1',
      'respondeu_x1',
      'pediu_revanche',
      'concluiu_roda'
    )
  ),

  -- Tetos de tamanho, não de conteúdo. `origem`/`campanha`/`conteudo` vêm de
  -- parâmetro de URL — texto de fora, nunca confiado. O teto não é sobre
  -- validar formato (isso mudaria com toda campanha nova); é sobre impedir
  -- que alguém grave um evento com um parâmetro de 10 KB nesses campos.
  CONSTRAINT eventos_de_telemetria_origem_do_tamanho CHECK (char_length(origem) <= 40),
  CONSTRAINT eventos_de_telemetria_campanha_do_tamanho CHECK (campanha IS NULL OR char_length(campanha) <= 80),
  CONSTRAINT eventos_de_telemetria_conteudo_do_tamanho CHECK (conteudo IS NULL OR char_length(conteudo) <= 80),
  CONSTRAINT eventos_de_telemetria_plataforma_do_tamanho CHECK (char_length(plataforma) <= 20),
  CONSTRAINT eventos_de_telemetria_versao_app_do_tamanho CHECK (versao_app IS NULL OR char_length(versao_app) <= 40),
  CONSTRAINT eventos_de_telemetria_batalha_codigo_do_tamanho CHECK (batalha_codigo IS NULL OR char_length(batalha_codigo) <= 20)
);

COMMENT ON TABLE public.eventos_de_telemetria IS
  'Telemetria v1 (produto, não publicidade). Eventos anônimos de uso para '
  'enxergar o funil aquisição → primeiro arroto → nota → compartilhamento/X1 → '
  'resposta → revanche. WRITE-ONLY para o cliente: sem policy de SELECT, '
  'UPDATE ou DELETE para anon/authenticated. Sem nome, e-mail, IP, áudio, '
  'texto digitado ou qualquer dado que identifique alguém.';

-- Consulta de funil por sessão: "essa sessão passou pelos eventos X, Y, Z?".
CREATE INDEX eventos_de_telemetria_por_sessao
  ON public.eventos_de_telemetria (sessao_id, criado_em);

-- Consulta de funil por evento: "quantos abriu_arena essa semana?".
CREATE INDEX eventos_de_telemetria_por_evento_e_data
  ON public.eventos_de_telemetria (evento, criado_em);

-- Consulta do sub-funil de X1/roda: "essa batalha teve resposta?".
CREATE INDEX eventos_de_telemetria_por_batalha
  ON public.eventos_de_telemetria (batalha_codigo)
  WHERE batalha_codigo IS NOT NULL;


-- -----------------------------------------------------------------------------
-- Segurança: RLS + GRANT, as duas camadas.
-- -----------------------------------------------------------------------------

ALTER TABLE public.eventos_de_telemetria ENABLE ROW LEVEL SECURITY;

-- Camada 1 — GRANT explícito. Não confiar no default do schema: revoga tudo
-- dos dois papéis primeiro (mesma lição da 20260812000001) e concede só o
-- INSERT. UPDATE, DELETE e SELECT continuam sem GRANT nenhum — não é "sem
-- policy", é "sem permissão para tentar".
REVOKE ALL ON public.eventos_de_telemetria FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.eventos_de_telemetria TO anon, authenticated;

-- Camada 2 — RLS. Só existe policy de INSERT: sem policy de SELECT, UPDATE ou
-- DELETE para nenhum papel do cliente, então mesmo um GRANT futuro concedido
-- por engano continuaria sem enxergar linha nenhuma.
--
-- `WITH CHECK (true)`: a validação de verdade já são os CONSTRAINTs da tabela
-- (o CHECK do nome do evento e os tetos de tamanho). Repetir a mesma lista
-- aqui seria uma segunda cópia da regra esperando divergir da primeira.
CREATE POLICY "Anyone can insert valid telemetry events"
ON public.eventos_de_telemetria
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- VERIFICAR DEPOIS DE APLICAR (staging antes de produção, ADR 0001 §7):
--   1. `SET ROLE anon; INSERT INTO public.eventos_de_telemetria (evento, sessao_id) VALUES ('abriu_arena', gen_random_uuid()); RESET ROLE;`
--      -> DEVE funcionar.
--   2. `SET ROLE anon; SELECT * FROM public.eventos_de_telemetria; RESET ROLE;`
--      -> DEVE devolver 0 linhas (RLS sem policy de SELECT), nunca erro de
--         permissão — é a mesma forma que `resultados`/`desafios` já usam
--         desde a 20260807000034.
--   3. `SET ROLE anon; UPDATE public.eventos_de_telemetria SET origem = 'x'; RESET ROLE;`
--      -> DEVE afetar 0 linhas.
--   4. `SET ROLE anon; DELETE FROM public.eventos_de_telemetria; RESET ROLE;`
--      -> DEVE afetar 0 linhas.
--   5. `SELECT has_table_privilege('anon', 'public.eventos_de_telemetria', 'SELECT');`
--      -> DEVE ser `false`.
--   6. Repetir 1-5 com `SET ROLE authenticated;` — mesmo resultado.
--   7. `INSERT INTO public.eventos_de_telemetria (evento, sessao_id) VALUES ('nao_existe', gen_random_uuid());`
--      -> DEVE falhar no CHECK `eventos_de_telemetria_evento_valido`.
--
-- NÃO VALIDADO NESTE AMBIENTE: sem Postgres aqui, nada acima passou por
-- parser. `src/db/telemetria-eventos.migracoes.test.ts` trava por análise de
-- texto que a policy de INSERT existe, que não há policy de SELECT/UPDATE/
-- DELETE, que o REVOKE roda antes do GRANT, e que os dez eventos do v1 estão
-- no CHECK — mas é leitura do arquivo, não execução do SQL.
