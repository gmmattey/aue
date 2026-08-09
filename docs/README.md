# Mapa da documentação do Auê

O Auê é um **jogo mobile casual, web-first**:

> **Arrote. Receba a nota. Humilhe seus amigos.**

A autoridade do repositório é [`../AGENTS.md`](../AGENTS.md). Este arquivo só
diz onde cada coisa mora.

---

## Comece por aqui

1. [`../AGENTS.md`](../AGENTS.md) — **a autoridade**: papéis, escopo, fluxo e regras.
2. [`jogo/VISAO.md`](jogo/VISAO.md) — **o que o jogo é**, e o que ele não é.
3. [`jogo/LOOP.md`](jogo/LOOP.md) — o loop principal.
4. [`jogo/ARENA.md`](jogo/ARENA.md) — os dez estados da Arena.
5. [`design/prototipo-arena/arena.html`](design/prototipo-arena/arena.html) — **a referência visual**. Abra no navegador.
6. [`escopo/ESCOPO_ATUAL.md`](escopo/ESCOPO_ATUAL.md) — o que estamos construindo.
7. [`escopo/BACKLOG.md`](escopo/BACKLOG.md) — o que está na fila.

---

## Quem manda em quê

| Pergunta | Fonte |
|---|---|
| O que o jogo é? | [`jogo/VISAO.md`](jogo/VISAO.md) |
| Qual é o loop? | [`jogo/LOOP.md`](jogo/LOOP.md) |
| Que estados a Arena tem? | [`jogo/ARENA.md`](jogo/ARENA.md) |
| Como o jogo pontua e o que não vale? | [`jogo/REGRAS.md`](jogo/REGRAS.md) |
| Com o que a Arena se parece? | [`design/prototipo-arena/arena.html`](design/prototipo-arena/arena.html) |
| De onde vêm cor, tipo, espaço e movimento? | [`design/design-system/system/DESIGN.md`](design/design-system/system/DESIGN.md) |
| Onde está a marca, o logo e o kit? | [`design/design-system/`](design/design-system/) |
| Isso pertence ao jogo agora? | [`escopo/ESCOPO_ATUAL.md`](escopo/ESCOPO_ATUAL.md) |
| O que pegar para fazer? | [`escopo/BACKLOG.md`](escopo/BACKLOG.md) |
| Quem implementa e revisa? | [`../AGENTS.md`](../AGENTS.md) |
| Como o Auê fala? | [`jogo/VOZ.md`](jogo/VOZ.md) |
| De onde veio o produto? | [`jogo/HISTORIA.md`](jogo/HISTORIA.md) |
| Como o código está organizado? | [`technical/arquitetura.md`](technical/arquitetura.md) + o código |
| Por que essa gravação não virou nota? | [`technical/deteccao-de-arroto-yamnet.md`](technical/deteccao-de-arroto-yamnet.md) |
| Onde o jogo roda e como uma migração sobe? | [`technical/ambientes.md`](technical/ambientes.md) |
| Como o deploy e o OG dinâmico funcionam? | [`technical/deploy-vercel-e-og-dinamico.md`](technical/deploy-vercel-e-og-dinamico.md) |
| Como a moderação de áudio funciona? | [`technical/moderacao-de-audio.md`](technical/moderacao-de-audio.md) |
| Qual é o schema realmente aplicado? | `../supabase/migrations/` + ambiente aplicado |
| Como nomear um objeto novo do banco? | [`schema/nomenclatura.md`](schema/nomenclatura.md) |
| Qual é o domínio de dados? | [`schema/banco_de_dados.md`](schema/banco_de_dados.md) |
| Como desfazer uma migração? | [`../supabase/rollback/README.md`](../supabase/rollback/README.md) + backup + estado real |

## Precedência

1. **Comportamento real** — código, migrações e o que roda no celular vencem
   documento de intenção.
2. **`escopo/ESCOPO_ATUAL.md`** — decide o que pertence ao jogo.
3. **`design/prototipo-arena/arena.html`** — decide como a Arena se parece e se
   comporta.
4. **`../AGENTS.md`** — decide como o trabalho acontece.
5. **Demais documentos** — contexto.

## Estrutura

```text
docs/
├── README.md                          ← você está aqui
├── inventario-do-reposicionamento.md  ← registro da virada para jogo
├── jogo/        VISAO · LOOP · ARENA · REGRAS · VOZ · HISTORIA
├── design/      README · prototipo-arena/ · design-system/ · fontes/
├── escopo/      ESCOPO_ATUAL · BACKLOG
├── technical/   arquitetura · ambientes · deploy · yamnet · moderação
├── schema/      nomenclatura · banco_de_dados
└── _arquivo/    a visão anterior, sem autoridade nenhuma
```

## Uma última regra

A documentação pode falar palavrão, zoar e parecer escrita pelos três primos.

Ela não pode ser engraçada a ponto de esconder risco, erro, segurança,
privacidade ou comportamento real.

O produto é um jogo de arroto. A documentação não precisa parecer ata de banco.
Mas também não pode meter caô só porque a frase ficou boa.
