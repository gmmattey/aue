# Auê 🎙️💨

Um jogo de competição de arrotos feito por três primos que já faziam essa
besteira antes de existir qualquer código.

A proposta é simples:

**arrotar → receber uma nota → desafiar alguém → tomar revanche.**

Se o produto precisar de uma explicação muito maior do que isso para começar,
a gente complicou o que era para ser idiota e divertido.

## O que estamos lançando agora

A fonte de verdade é [`docs/mvp1/CONTRATO_MVP1.md`](docs/mvp1/CONTRATO_MVP1.md).

O corte atual tem quatro blocos:

1. **Auê individual** — grava, informa a origem, recebe nota e compartilha.
2. **Batalha por link** (`/b/CODIGO`) — você manda o link, o amigo ouve,
   responde, entra no placar e a provocação continua. A sessão vale até 7 dias.
3. **Disputa local** — 2 a 5 pessoas no mesmo aparelho, 1 a 3 rounds e pódio
   compartilhável. Está protegida pela flag `VITE_FEATURE_DISPUTA_LOCAL` até
   passar pelo fluxo completo em telefone real.
4. **Landing desktop + páginas públicas** — explicar o Auê, permitir descoberta
   e apontar o uso para o celular.

Sem login na tela. Sem feed público. Sem perfil social. Sem liga online. Sem
Auê+. Sem a vontade incontrolável de construir o Facebook do arroto antes de
saber se alguém quer brincar.

## O que existe no repositório, mas não faz parte do MVP1

O código cresceu além do lançamento antes de o escopo ser congelado. Por isso
existem implementações ou protótipos de:

- feed/comunidade;
- ranking global;
- XP, níveis e conquistas;
- perfil e login social;
- grupos e campeonatos;
- push;
- assinatura/monetização.

Esse código foi preservado, mas a superfície pública é controlada por
`src/shared/flags.ts`. **O padrão das flags é desligado.** Feature futura só
volta quando houver decisão explícita de produto e o contrato do estágio
permitir.

O duelo antigo em `/d/CODIGO` é **legado**. Novas disputas usam a batalha em
`/b/CODIGO`.

## Como a identidade funciona sem cadastro

O MVP1 usa sessão anônima do Supabase (`signInAnonymously`) criada no boot. A
pessoa não vê tela de conta, mas o backend ainda consegue aplicar regras de
acesso e associar gravações da sessão.

Para isso funcionar no ambiente publicado:

- `Anonymous sign-ins` precisa estar habilitado no Supabase;
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` precisam existir **antes do
  build**;
- mudar variável `VITE_*` depois do build exige novo deploy.

Sem Supabase configurado, o produto pode até conseguir analisar localmente em
alguns caminhos, mas batalha, persistência e mídia não estão realmente
operacionais.

## Stack

- React 19 + TypeScript
- Vite
- PWA via `vite-plugin-pwa`
- Web Audio API + MediaRecorder
- Supabase Auth
- PostgreSQL + RLS/RPC
- Supabase Storage
- Edge Functions onde necessário
- Vitest

## Motor de julgamento

O Auê mede características digitais do áudio como duração, potência,
profundidade e textura e gera o **Auê Score**.

O produto não chama isso de medição científica de volume em dB nem finge
precisão física que não tem.

A fórmula e as regras competitivas precisam permanecer versionadas e coerentes
entre frontend e banco. Hoje o projeto possui testes que comparam a regra
TypeScript com a regra SQL versionada, mas isso **não prova que o banco remoto
está com a mesma migração aplicada**.

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

As regras completas de trabalho estão em [`AGENTS.md`](AGENTS.md). Para Claude,
[`CLAUDE.md`](CLAUDE.md) apenas aponta para esse arquivo — não existe uma
segunda governança escondida.

## Banco e migrações

A fonte do schema realmente versionado é:

```text
supabase/migrations/
```

Não use um desenho antigo de banco como prova de que uma tabela existe.

Os scripts de rollback ficam em `supabase/rollback/` e são de emergência. Eles
não substituem backup e vários foram revisados por leitura, sem execução contra
Postgres neste ambiente. Leia `supabase/rollback/README.md` antes de usar.

## Documentação

Comece por [`docs/README.md`](docs/README.md). Ele explica qual documento manda
em cada tipo de decisão.

Atalhos:

- lançamento: [`docs/mvp1/CONTRATO_MVP1.md`](docs/mvp1/CONTRATO_MVP1.md)
- história: [`docs/produto/HISTORIA_DO_AUE.md`](docs/produto/HISTORIA_DO_AUE.md)
- voz: [`docs/produto/VOZ_E_PERSONALIDADE.md`](docs/produto/VOZ_E_PERSONALIDADE.md)
- visão funcional: [`docs/functional/especificacao_funcional.md`](docs/functional/especificacao_funcional.md)
- UX/UI: [`docs/especificacao_ux_ui.md`](docs/especificacao_ux_ui.md)
- arquitetura: [`docs/technical/arquitetura.md`](docs/technical/arquitetura.md)
- banco: [`docs/schema/`](docs/schema/)

## Ponto de produto ainda pendente

A batalha pública por link expira em 7 dias. O destino do **arquivo de áudio**
depois desse período ainda precisa de decisão explícita de produto e
privacidade.

Permissão de microfone não é passe livre para retenção eterna.

Enquanto essa decisão não estiver fechada, nenhum documento deve tratar
"guardar para o acervo" como autorização automática.

## Regra que vale mais que empolgação

> Nenhuma funcionalidade nova entra enquanto houver fluxo do MVP1 incompleto ou
> quebrado. Ideia nova vai para backlog.

O trabalho agora é fazer a brincadeira funcionar de ponta a ponta e colocar na
mão de gente real.
