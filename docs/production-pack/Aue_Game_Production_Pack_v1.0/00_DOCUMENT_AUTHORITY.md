# Autoridade documental — Auê!

Este arquivo impede que duas verdades concorrentes nasçam dentro do mesmo jogo.

## 1. Precedência

### Nível 0 — realidade executável

- código da `main`;
- `supabase/migrations/` aplicáveis;
- testes de paridade;
- comportamento confirmado em produção/aparelho real.

Se isso divergir de documentação, investigar. Não assumir que o texto vence o que roda.

### Nível 1 — decisões formais

- ADR 0001 — arquitetura oficial;
- ADR 0002 — Auê nas lojas;
- ADRs posteriores aceitos.

Mudanças de stack, fronteira, backend, armazenamento local, lojas ou capacidade nativa precisam respeitar ADR.

### Nível 2 — escopo

`docs/escopo/ESCOPO_ATUAL.md`

Decide o que pertence ao produto agora.

### Nível 3 — gameplay

- `docs/jogo/ARENA.md` — estados e transições;
- `docs/jogo/REGRAS.md` — score, X1, rounds, Roda, privacidade de gameplay;
- `docs/jogo/LOOP.md` — loop central;
- `docs/jogo/VOZ.md` — linguagem.

### Nível 4 — design

- `docs/design/prototipo-arena/arena.html` — comportamento/geometria;
- `docs/design/design-system/system/DESIGN.md` — tokens, componentes, intenção.

### Nível 5 — este pacote

Este pacote consolida as decisões anteriores para produção, onboarding, QA, crescimento e execução por agentes.

## 2. Conflitos conhecidos em documentação antiga

Há documentos históricos que citam infraestrutura anterior ou estados intermediários já superados. Eles servem como contexto, não como autorização para reverter a direção atual.

Exemplos de cuidado:

- referências antigas a Vercel não devem sobrepor o endereço canônico atual `aue.web.app`;
- handoffs exportados podem listar mais estados que os dez estados canônicos de `ARENA.md`;
- documentos antigos podem mencionar features removidas no reposicionamento;
- design exportado pode conter publicidade ou elementos que o escopo atual não autoriza.

## 3. Regra para agentes de IA

Antes de implementar feature:

1. ler `AGENTS.md` e `CLAUDE.md`;
2. ler o documento de escopo;
3. ler o estado/regra afetado;
4. ler ADR relevante;
5. ler Design System/Art Bible se tocar UI;
6. não criar solução paralela quando já houver porta, adaptador, componente ou regra canônica.

## 4. Regra para mudanças grandes

Abrir ADR novo antes de:

- trocar React/Vite/TypeScript;
- trocar ou adicionar backend;
- introduzir motor gráfico;
- criar segunda base nativa;
- adicionar capacidade nativa fora de porta existente;
- adotar IndexedDB/fila offline como fonte de verdade;
- tornar áudio público;
- permitir cliente decidir score oficial;
- adicionar monetização in-app, anúncio dentro do jogo, compra ou assinatura;
- abrir produção pública em loja quando o ADR vigente ainda não permitir.

## 5. Frase de controle

**Documento explica decisão. Código prova decisão. Escopo autoriza decisão.**
