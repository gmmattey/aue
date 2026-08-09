# AGENTS.md — a autoridade do Auê

Este arquivo é a **autoridade única** do repositório `aue`.

Regras, papéis, escopo e fluxo de trabalho do projeto vivem aqui ou em documentos
que este arquivo aponta. **Tudo que o projeto precisa está dentro deste
repositório.** Nenhum agente, skill, política, configuração pessoal, instrução de
organização ou outro repositório é necessário para trabalhar no Auê — e nada
externo tem autoridade sobre o que está escrito aqui.

`CLAUDE.md` contém apenas `@AGENTS.md`. Não existe segunda governança escondida.

---

## 1. O que é o Auê

**Auê é um jogo mobile casual, web-first, preparado para virar Android e iOS
depois.**

> **Arrote. Receba a nota. Humilhe seus amigos.**

Não é rede social. Não é feed. Não é app de perfil. É um joguinho de arroto que
cabe num toque e gera briga entre amigos.

O loop é:

```text
ARROTAR → RECEBER NOTA → DESAFIAR → RESPONDER → REVANCHE
```

A experiência acontece dentro de **uma Arena que muda de estado**, não numa
sequência de páginas.

Fontes:

- visão: [`docs/jogo/VISAO.md`](docs/jogo/VISAO.md)
- loop: [`docs/jogo/LOOP.md`](docs/jogo/LOOP.md)
- estados da Arena: [`docs/jogo/ARENA.md`](docs/jogo/ARENA.md)
- regras de gameplay: [`docs/jogo/REGRAS.md`](docs/jogo/REGRAS.md)

---

## 2. Fontes canônicas

Não duplique regra. Leia a fonte certa.

| Pergunta | Fonte |
|---|---|
| **O que o jogo é?** | [`docs/jogo/VISAO.md`](docs/jogo/VISAO.md) |
| Qual é o loop? | [`docs/jogo/LOOP.md`](docs/jogo/LOOP.md) |
| Quais são os estados da Arena? | [`docs/jogo/ARENA.md`](docs/jogo/ARENA.md) |
| Como o jogo se comporta e pontua? | [`docs/jogo/REGRAS.md`](docs/jogo/REGRAS.md) |
| **Com o que a Arena se parece?** | [`docs/design/prototipo-arena/arena.html`](docs/design/prototipo-arena/arena.html) |
| De onde vêm cor, tipo, espaço e movimento? | [`docs/design/DESIGN_SYSTEM.md`](docs/design/DESIGN_SYSTEM.md) |
| **O que estamos construindo agora?** | [`docs/escopo/ESCOPO_ATUAL.md`](docs/escopo/ESCOPO_ATUAL.md) |
| O que vem depois? | [`docs/escopo/BACKLOG.md`](docs/escopo/BACKLOG.md) |
| Como o sistema está organizado? | [`docs/technical/arquitetura.md`](docs/technical/arquitetura.md) |
| Como o Auê fala? | [`docs/jogo/VOZ.md`](docs/jogo/VOZ.md) |
| De onde veio o produto? | [`docs/jogo/HISTORIA.md`](docs/jogo/HISTORIA.md) |
| Como nomear objetos no banco? | [`docs/schema/nomenclatura.md`](docs/schema/nomenclatura.md) |
| O que existe no banco? | `supabase/migrations/` + ambiente aplicado |
| Onde está o mapa completo? | [`docs/README.md`](docs/README.md) |

### Precedência

1. **Comportamento real** — código, migrações e o que roda no celular vencem
   qualquer documento de intenção.
2. **`docs/escopo/ESCOPO_ATUAL.md`** — decide o que pertence ao jogo agora.
3. **`docs/design/prototipo-arena/arena.html`** — decide como a Arena se parece e
   se comporta.
4. **Este arquivo** — decide como o trabalho acontece.
5. **Demais documentos** — contexto. História dá origem, voz orienta linguagem.
   Nenhum dos dois abre escopo sozinho.

Documentos em [`docs/_arquivo/`](docs/_arquivo/) **não têm autoridade nenhuma**.
São registro da visão anterior. Não use um deles como argumento.

---

## 3. A SQUAD Auê

Três primos. Decisão de produto é colaborativa — os três discutem o jogo em pé
de igualdade. **A ordem da entrega, não.** Ela é definida aqui e em nenhum outro
lugar.

| Agente | Papel |
|---|---|
| **Giam** (`giam`) | **Guardião da entrega** — decide a arquitetura, planeja a implementação, prioriza e dá o aceite final: o que foi entregue atende aos requisitos? |
| **Guinho** (`guinho`) | **Implementação** — abre a branch, escreve o código e a Arena, abre o PR e mergeia. Só entra depois do plano do Giam |
| **Marcelinho** (`marcelinho`) | **Qualidade** — qualidade do código e da interface alinhada ao produto: testes, tipos, lint/build, RLS, fidelidade ao protótipo, celular real e privacidade |

### Ordem de atuação

```text
GIAM decide e planeja
  → GUINHO implementa (branch, código, PR)
    → MARCELINHO garante qualidade de código e de interface
      → GIAM dá o aceite contra os requisitos
        → usuário aprova
          → GUINHO mergeia e limpa
```

O que cada corte significa:

- **Guinho não começa sem plano.** Sem decisão de arquitetura, ordem de
  prioridade e recorte de implementação do Giam, não há branch. Se o plano não
  existe ou está vago, Guinho devolve para o Giam em vez de adivinhar.
- **Marcelinho não é o dono do aceite.** Ele responde "isto está bem feito e
  bate com o produto?". O aceite — "isto era o que a gente pediu?" — é do Giam.
- **Giam não aceita a própria implementação sem passar por Marcelinho.** Se o
  Giam implementou algo, a qualidade ainda é checada pelo Marcelinho.

Um agente não declara a própria entrega "aprovada pelo outro" sem revisão real.
**Guinho** continua podendo questionar complexidade desnecessária e
**Marcelinho** continua podendo tentar quebrar a solução — questionar não exige
autorização; pular a ordem, sim.

### Skills

Vivem em [`.agents/skills/`](.agents/skills/), dentro do repositório.

**Giam**

- [`arquitetarModulo`](.agents/skills/arquitetarModulo/SKILL.md) — desenho
  modular, contratos de dados, RLS/RPC, separação de responsabilidades.

O aceite da entrega não tem skill própria: o procedimento é o §5.5 deste
arquivo.

**Guinho**

- [`criarComponenteUI`](.agents/skills/criarComponenteUI/SKILL.md) — UI fiel ao
  protótipo da Arena, mobile-first, acessível e modular.
- [`aplicarTomOgro`](.agents/skills/aplicarTomOgro/SKILL.md) — aplica a voz
  canônica à copy sem inventar capacidade.

**Marcelinho**

- [`validarModularidade`](.agents/skills/validarModularidade/SKILL.md) — coesão,
  dependências, duplicação de regra e responsabilidade misturada.
- [`auditarSegurancaETestes`](.agents/skills/auditarSegurancaETestes/SKILL.md) —
  testes, build, RLS, recursos sensíveis e fluxo real em celular.

---

## 4. Como o trabalho anda

Não existe fila de Features numeradas. Não existe "a próxima só abre com
autorização". O que existe é ordem **dentro de uma entrega**, não uma esteira de
features travadas umas nas outras.

O que existe:

- o escopo atual diz o que pertence ao jogo;
- o backlog diz o que está na fila;
- o **Giam** decide o que vem primeiro e como será construído;
- o **Guinho** pega **uma issue** já planejada, entrega **inteira**, e abre PR;
- o **Marcelinho** garante a qualidade daquilo antes do aceite.

A regra de ritmo continua valendo, porque ela é sobre terminar, não sobre
permissão:

> **Uma coisa de cada vez. Termina. Valida. Mergeia.**

Se a demanda não pertence ao escopo atual e não é correção necessária para
manter o jogo funcionando, registre no backlog em vez de implementar.

---

## 5. Fluxo obrigatório de desenvolvimento

Cada passo tem dono. O dono está marcado no título.

### 5.0 Plano — **Giam**

Antes de qualquer branch existir, o Giam entrega, por escrito, na issue:

- **o que** vai ser construído e **por quê** (o comportamento do jogo alvo);
- **a decisão de arquitetura** — onde o estado mora, o que é RPC, o que é RLS,
  o que a UI conhece;
- **o recorte da implementação** — a fatia vertical, e o que fica de fora;
- **a prioridade** — por que isto agora e não outra coisa;
- **os requisitos de aceite** — a lista contra a qual o Giam vai conferir a
  entrega no §5.5. Se não dá para conferir, não é requisito.

Sem esse plano, o Guinho não abre branch. Plano vago volta para o Giam.

### 5.1 Sincronize a base — **Guinho**

```bash
git checkout main
git fetch origin
git pull origin main
git status
```

A `main` deve estar limpa e atualizada.

### 5.2 Use branch/worktree isolada — **Guinho**

```bash
git worktree add -b feat/nome-da-mudanca .worktrees/feat-nome-da-mudanca main
```

Desenvolvimento, commits e validações acontecem fora da árvore principal.

### 5.3 Implemente a fatia vertical — **Guinho**

Preferência:

```text
um comportamento pequeno do jogo
→ estado real da Arena
→ erro tratado
→ teste
→ celular real quando aplicável
→ PR
```

Evitar: quatro coisas pela metade.

### 5.4 Valide a qualidade — **Marcelinho**

O Guinho roda a validação antes de pedir revisão. O **Marcelinho** é quem
responde por ela: qualidade do código e da interface alinhada ao produto.

No mínimo:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Quando a mudança tocar jornada real, valide também no aparelho adequado.
Especialmente: microfone, áudio, share, desafio entre dois aparelhos, disputa
local, Safari iOS e Chrome Android.

O relatório do Marcelinho deve separar:

- verificado automaticamente;
- verificado por leitura;
- verificado em celular/navegador real;
- não verificado.

Além dos comandos, o Marcelinho responde por: modularidade e acoplamento
([`validarModularidade`](.agents/skills/validarModularidade/SKILL.md)),
segurança, RLS, recursos sensíveis e celular real
([`auditarSegurancaETestes`](.agents/skills/auditarSegurancaETestes/SKILL.md)),
e **fidelidade da interface ao produto** — protótipo, estados da Arena e voz.

Marcelinho aprova qualidade. Ele **não** dá o aceite da entrega.

### 5.5 Aceite da entrega — **Giam**

O Giam confere a entrega contra os requisitos que ele mesmo escreveu no §5.0 e
responde, item por item:

- cada requisito de aceite foi atendido? Qual evidência?
- a arquitetura entregue é a que foi decidida, ou desviou pelo caminho?
- entrou coisa que não estava no recorte? Entrou escopo por acidente?
- algo **finge** que funciona? (mock não marcado, botão sem backend, falha
  virando sucesso por copy)
- o relatório do Marcelinho tem buraco relevante em "não verificado"?

Saída possível: **aceito**, **aceito com pendência registrada no backlog**, ou
**devolvido** — com o que falta, explícito.

Sem aceite do Giam, não vai para aprovação do usuário.

### 5.6 Abra PR e peça aprovação — **Guinho**

Nada é mergeado automaticamente.

```bash
git push -u origin feat/nome-da-mudanca
gh pr create --base main --title "..." --body "..."
```

PR e commits em PT-BR, claros e proporcionais ao diff. O corpo do PR carrega o
relatório do Marcelinho (§5.4) e o aceite do Giam (§5.5).

Depois da revisão e aprovação do usuário, o Guinho mergeia:

```bash
gh pr merge <numero> --merge
```

**Nenhum push direto na `main`.**

### 5.7 Limpe depois do merge — **Guinho**

```bash
git worktree remove .worktrees/feat-nome-da-mudanca --force
git push origin --delete feat/nome-da-mudanca
git branch -d feat/nome-da-mudanca
git checkout main
git pull origin main
```

---

## 6. Princípio de arquitetura

Modular por responsabilidade, não por contagem de linhas.

- cada regra importante tem dono claro;
- a Arena é uma máquina de estados, não um emaranhado de telas;
- UI não carrega detalhe de banco sem necessidade;
- regra crítica duplicada precisa de contrato/teste de paridade;
- recurso sensível (microfone, stream, timer, áudio) precisa de ciclo de vida
  explícito;
- arquivo grande é sinal para revisar coesão, não reprovação automática;
- abstração para feature futura não entra só para "deixar preparado".

---

## 7. Regras globais

- **O jogo manda.** Se não fortalece arrotar, receber nota, desafiar, responder
  ou revanche, provavelmente não é para agora.
- **Nada pode fingir que funciona.** Mock fica marcado; botão sem backend fica
  desabilitado; falha não vira sucesso por copy.
- **Segurança e privacidade vencem a piada.**
- **A Arena é uma superfície de estado, não uma pilha de rotas.**
- **Protótipo é referência visual e comportamental, não licença de escopo.**
- **Nenhuma implementação sem plano do Giam.** Sem arquitetura decidida,
  prioridade e requisitos de aceite, não abre branch.
- **Nenhuma entrega sem aceite do Giam.** Qualidade é do Marcelinho; aceite
  contra os requisitos é do Giam.
- **Nenhum merge com `typecheck`, `lint`, `test` ou `build` falhando.**
- **Nenhum desenvolvimento direto na `main`.**
- **Commits e PRs em PT-BR.**
- **Não implemente Android/iOS nativo** — o alvo hoje é web, com o cuidado de
  não fechar a porta para nativo depois.
