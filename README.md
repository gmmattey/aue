# Auê 🎙️💨

**Um jogo mobile casual, web-first.**

> ## Arrote. Receba a nota. Humilhe seus amigos.

```text
ARROTAR → RECEBER NOTA → DESAFIAR → RESPONDER → REVANCHE
```

Abre no navegador do celular, arrota, ganha um número na cara e manda pro grupo.
Sem cadastro, sem tutorial, sem tela de boas-vindas. A primeira coisa que a
pessoa vê já é o botão de arrotar.

Feito por três primos que já faziam essa besteira antes de existir qualquer
código.

## A Arena

A experiência acontece em **uma Arena que muda de estado**, não numa sequência de
páginas. Dez estados: `IDLE`, `RECORDING`, `ORIGIN`, `JUDGING`, `RESULT`,
`CHALLENGE`, `VERSUS`, `SCOREBOARD`, `REMATCH`, `ERROR`.

**A referência visual é o protótipo:**

```text
docs/design/prototipo-arena/arena.html
```

Abra direto no navegador — roda sozinho, sem build. Ver
[`docs/design/README.md`](docs/design/README.md) e
[`docs/jogo/ARENA.md`](docs/jogo/ARENA.md).

## O que o Auê não é

Não tem, e **não é roadmap futuro**: feed · seguidores · comunidades ·
campeonatos · temporadas · assinatura · XP · conquistas · ranking global ·
perfil social · notificações.

Existe código de várias dessas coisas no repositório, herdado da fase anterior
do produto. Está desligado por `src/shared/flags.ts` — **padrão desligado** — e
está na fila para sair ([#109](https://github.com/gmmattey/aue/issues/109)).
Código legado desligado não é roadmap.

## Web-first, nativo depois

O alvo é a web no celular: é onde um link cai no grupo e alguém joga em três
segundos sem instalar nada. Android e iOS nativos são um destino possível
**depois**. A consequência prática hoje é só não fechar a porta — motor de áudio
e de score separados da tela, Arena empacotável, nada dependente de desktop.

**Nada de implementar nativo agora.**

## Como a identidade funciona sem cadastro

Sessão anônima do Supabase (`signInAnonymously`) criada no boot. A pessoa não vê
tela de conta, mas o backend ainda aplica regras de acesso e associa as
gravações da sessão. O nome só é pedido no ato de desafiar ou compartilhar.

Para funcionar no ambiente publicado:

- `Anonymous sign-ins` habilitado no Supabase;
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` presentes **antes do build**;
- mudar variável `VITE_*` depois do build exige novo deploy.

## Stack

React 19 + TypeScript · Vite · PWA (`vite-plugin-pwa`) · Web Audio API +
MediaRecorder · YAMNet local para detectar arroto · Supabase (Auth, PostgreSQL
com RLS/RPC, Storage, Edge Functions) · Vitest.

## Motor de julgamento

O juiz primeiro decide **se aquilo foi arroto mesmo** — conversa, sopro e
silêncio não viram nota. Depois mede duração, potência, profundidade e textura e
gera o **Auê Score** de 0 a 100.

O produto não chama isso de medição científica em dB nem finge precisão física
que não tem. A fórmula é versionada e espelhada entre TypeScript e SQL, com
testes de paridade — o que **não** prova que o banco remoto está com a mesma
migração aplicada.

Regras completas: [`docs/jogo/REGRAS.md`](docs/jogo/REGRAS.md).

## Desenvolvimento local

```bash
npm install
cp .env.example .env
npm run dev
```

Validação mínima antes de PR:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

As regras de trabalho estão em [`AGENTS.md`](AGENTS.md) — a **autoridade única**
do repositório. `CLAUDE.md` só aponta para ele. Tudo que o projeto precisa está
dentro deste repositório: nenhum agente, skill ou configuração externa é
necessária.

## Banco e migrações

A fonte do schema versionado é `supabase/migrations/`. Não use um desenho antigo
de banco como prova de que uma tabela existe.

Os scripts em `supabase/rollback/` são de emergência, não substituem backup, e
vários foram revisados por leitura sem execução contra Postgres. Leia
[`supabase/rollback/README.md`](supabase/rollback/README.md) antes de usar.

## O que acontece com o áudio depois dos 7 dias

**O que expira é o acesso pelo link, não a gravação.** Passado o prazo, o link
para de abrir a sessão; o arquivo é mantido. **Não existe expurgo automático.**

Isso está publicado na política de privacidade com essas palavras, porque
retenção que a pessoa não consegue ler é retenção escondida. Quem gravou pode
apagar o próprio áudio pela tela de resultado, e denúncia esconde a gravação.

## Documentação

Comece por [`docs/README.md`](docs/README.md).

- visão: [`docs/jogo/VISAO.md`](docs/jogo/VISAO.md)
- loop: [`docs/jogo/LOOP.md`](docs/jogo/LOOP.md)
- estados da Arena: [`docs/jogo/ARENA.md`](docs/jogo/ARENA.md)
- regras de gameplay: [`docs/jogo/REGRAS.md`](docs/jogo/REGRAS.md)
- design: [`docs/design/README.md`](docs/design/README.md)
- escopo: [`docs/escopo/ESCOPO_ATUAL.md`](docs/escopo/ESCOPO_ATUAL.md)
- backlog: [`docs/escopo/BACKLOG.md`](docs/escopo/BACKLOG.md)
- arquitetura: [`docs/technical/arquitetura.md`](docs/technical/arquitetura.md)
- voz: [`docs/jogo/VOZ.md`](docs/jogo/VOZ.md)
- história: [`docs/jogo/HISTORIA.md`](docs/jogo/HISTORIA.md)

A visão anterior está em [`docs/_arquivo/`](docs/_arquivo/), **sem autoridade
nenhuma**.

## Regra que vale mais que empolgação

> Uma coisa de cada vez. Termina. Valida. Mergeia.

E nada pode fingir que funciona.
