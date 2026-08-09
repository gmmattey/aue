# A Arena — estados

A experiência principal do Auê acontece em **uma Arena que muda de estado**.

Não é uma sequência de páginas. Não é um roteador com uma tela por momento. É uma
superfície só, com estrutura fixa, cujas faixas ligam e desligam conforme o
estado da partida.

A referência canônica de comportamento e aparência é
**[`../design/prototipo-arena/arena.html`](../design/prototipo-arena/arena.html)**.
Quando este documento e o protótipo divergirem em detalhe visual, o protótipo
vence. Quando divergirem em escopo, vale
[`../escopo/ESCOPO_ATUAL.md`](../escopo/ESCOPO_ATUAL.md).

> ## ⚠️ ESTE DOCUMENTO ESTÁ ATRASADO EM RELAÇÃO AO PROTÓTIPO
>
> O material do lançamento mínimo trocou a máquina de estados. Este documento
> descreve **10** estados; o material novo descreve entre **19 e 20**, com nomes
> diferentes (`MIC_PENDING`, `VALIDATING`, `NOT_A_BURP`, `RESULT_REVEAL`,
> `DRAW`, `SESSION_RECOVERY`, entre outros).
>
> **As duas fontes novas também divergem entre si:** o handoff do protótipo
> lista 20 estados incluindo `AD_BREAK`; o design system diz que a máquina tem
> **19** e que `AD_BREAK` foi removido por não ser parte do gameplay
> (`design-system/system/DESIGN.md` §12.4 e §20).
>
> Enquanto este aviso existir, a fonte dos estados é
> [`../design/prototipo-arena/DESIGN-HANDOFF.md`](../design/prototipo-arena/DESIGN-HANDOFF.md)
> §3 e `design-system/system/DESIGN.md` §12 — não a seção 2 abaixo.
>
> Alinhar este documento, e decidir quem ganha na divergência acima, é decisão
> de produto e **ainda não foi tomada**.

---

## 1. Estrutura fixa

Quatro faixas, sempre nas mesmas posições, em todos os estados:

```text
┌──────────────────────────────┐
│ HUD        Auê!         ☰    │  56px — some em RECORDING e JUDGING
├──────────────────────────────┤
│                              │
│ PALCO      ( Bolha )         │  altura reservada; a Bolha nunca salta
│         score / versus       │  de lugar entre um estado e outro
├──────────────────────────────┤
│ REAÇÃO   frase do juiz       │  o que o jogo está dizendo agora:
│          métricas / placar   │  timer, métricas, player, link, placar
│          link / player       │
├──────────────────────────────┤
│ AÇÃO     [ CTA PRINCIPAL ]   │  o que dá para fazer agora
│          [ secundário ]      │
└──────────────────────────────┘
```

Três coisas dependem dessa estrutura e não podem ser quebradas:

1. **A Bolha não muda de posição entre estados.** Ela é a âncora da tela. Se ela
   salta, a Arena vira sequência de telas outra vez.
2. **A zona de reação cabe inteira, sem rolagem.** Quatro métricas se leem de uma
   vez.
3. **Cada estado liga só o que usa.** A entrada num estado zera todas as faixas
   antes de montar as suas.

### A Bolha

Personagem, não decoração. Muda de forma, tamanho e cor por estado — repouso,
gravação, contenção, julgamento, entrega, espera, replay, vitória, derrota. É o
que dá sensação de que tem alguém ouvindo.

Com `prefers-reduced-motion`, ela para de deformar e a informação continua
legível.

### Sobreposições

Não são estados. Pintam por cima da Arena e voltam:

- **assinatura** — cobra o nome no ato de desafiar ou compartilhar, nunca antes;
- **compartilhar** — o link do arroto avulso, fora da briga;
- **menu** — como funciona, privacidade, termos.

---

## 2. Os estados

| Estado | Uma frase |
|---|---|
| `IDLE` | tá esperando você arrotar |
| `RECORDING` | tá gravando e reagindo ao som |
| `ORIGIN` | segurou o áudio e quer saber de onde veio |
| `JUDGING` | o juiz tá ouvindo |
| `RESULT` | a nota |
| `CHALLENGE` | o desafio saiu, falta o outro responder |
| `VERSUS` | te chamaram, e você ouviu o que veio |
| `SCOREBOARD` | o placar da disputa |
| `REMATCH` | revanche dentro da mesma disputa |
| `ERROR` | deu ruim, e o jogo fala a verdade |

---

### `IDLE`

**Entra quando:** abre o jogo, ou desiste de um desafio.

- Bolha em repouso, respiração irregular.
- Chamada variável ("Manda o arrotão aí."), com um comentário embaixo.
- Quem já jogou recebe uma chamada de volta diferente da primeira vez.
- CTA único: **ARROTAR**.

**Sai para:** `RECORDING`.

**Não pode:** pedir nome, pedir login, mostrar tutorial obrigatório ou pedir
microfone antes do toque.

---

### `RECORDING`

**Entra quando:** toca em ARROTAR (e o microfone já está liberado; senão passa
pela permissão).

- HUD some — nada compete com a captura.
- Bolha grande e agitada, **dirigida pelo áudio real** do microfone.
- Cronômetro visível, contando.
- Aviso visual perto do teto de tempo.
- Para sozinho no teto; o mesmo caminho serve para PARAR, timeout e fim
  automático.
- CTA: **PARAR**.

**Sai para:** `ORIGIN` (parou, com som) · `ERROR` (permissão negada, sem som,
falha técnica).

**Não pode:** deixar stream ou timer vivo ao sair. Recurso de microfone tem dono
e ciclo de vida explícito.

---

### `ORIGIN`

**Entra quando:** a gravação terminou com áudio aproveitável.

- Bolha comprimida — está segurando o que acabou de sair.
- Pergunta variável ("Isso veio de onde?").
- Cinco alvos grandes, um toque resolve, sem confirmação.
- O CTA principal some: a escolha **é** a ação.

**Sai para:** `JUDGING`.

**Não pode:** fingir detectar a origem sozinho. Quem informa é a pessoa.

---

### `JUDGING`

**Entra quando:** a origem foi informada.

- HUD some.
- Bolha pequena e concentrada.
- Frase curta e baixa ("Xiu."), com comentário embaixo.
- Nenhum CTA — não há o que fazer aqui.
- É onde roda a detecção real de arroto e o cálculo do score.

**Sai para:** `RESULT` (é arroto) · `ERROR` (não é arroto, ou a análise falhou).

**Não pode:** durar tanto que vire tela de carregamento. A espera é piada curta,
e encolhe quando o movimento é reduzido.

---

### `RESULT`

**Entra quando:** o juiz fechou a nota.

- Bolha se abre e entrega o palco ao número.
- **Auê Score** grande, contando até o valor. A primeira revelação tem teatro; a
  repetição é direta.
- Reação do juiz escrita em cima da faixa da nota — e essa frase fica guardada,
  porque o compartilhamento tem que repetir a mesma.
- As quatro métricas abrem **depois** do número, em linha, nunca em card.
- Ações: **CHAMAR NO X1** (principal) · **COMPARTILHAR** (alternativa) · *"Vou
  mandar outro!"* (volta direto a gravar).
- Se a pessoa está respondendo a um desafio, o principal vira **VER O ESTRAGO**.

**Sai para:** `CHALLENGE` · `SCOREBOARD` · `RECORDING`.

**Não pode:** mostrar métrica antes do número, nem inventar precisão física que o
motor não tem.

---

### `CHALLENGE`

> No protótipo este estado se chama `X1`.

**Entra quando:** desafia alguém. O nome é cobrado aqui, se ainda não existir.

- Bolha quase parada, só respirando: vivo, mas sem resposta.
- Score do desafiante continua no palco.
- **Link privado do desafio**, com copiar.
- **Player do próprio arroto** — dá para ouvir de novo enquanto espera.
- Aviso pulsando: "esperando fulano…".
- Ações: **MANDAR O DESAFIO** · *"Deixa pra lá"*.

**Sai para:** `SCOREBOARD` (o outro respondeu) · `IDLE` (desistiu).

**Não pode:** prometer notificação que não existe, nem sugerir que o adversário
já viu.

---

### `VERSUS`

> No protótipo este estado se chama `INCOMING`.

**Entra quando:** abre um link de desafio que alguém mandou.

- Diz na cara quem chamou e quanto fez.
- **Player do arroto do adversário** — ouvir antes de responder é obrigatório
  para o jogo fazer sentido.
- Ações: **AGUENTA ESSA** (grava a resposta) · *"Ver o placar"*.

**Sai para:** `RECORDING` · `SCOREBOARD`.

**Não pode:** exigir cadastro de quem chegou pelo link. Zero atrito.

---

### `SCOREBOARD`

**Entra quando:** os dois lados têm nota.

- A Bolha sai; entra o **VS**: nota de cada lado, vencedor em ouro.
- Frase de vitória ou derrota, e as duas terminam empurrando para a revanche.
- Placar em linhas, ordenado. **Cada linha toca o arroto daquela pessoa** — é
  onde a nota do outro vira prova.
- A linha que está tocando mostra a contagem regressiva no lugar da nota.
- Ações: **REVANCHE** · *"Mandar o link"*.

**Sai para:** `REMATCH`.

**Não pode:** mostrar participante, nota ou pódio que não existe.

---

### `REMATCH`

**Entra quando:** aceita a revanche a partir do placar.

Não é um recomeço: é a mesma disputa continuando. O que muda em relação a um
`RECORDING` normal:

- o contexto da disputa é preservado (adversário, placar, link);
- a nota nova entra no placar existente, guardando a melhor tentativa **e o
  áudio daquela tentativa** — senão o placar toca um arroto que não é o da nota
  exibida;
- a revelação da nota já não tem o teatro da primeira vez.

**Sai para:** `SCOREBOARD`.

---

### `ERROR`

**Entra quando:** qualquer coisa dá errado. Não é uma tela: é o estado honesto da
Arena.

Casos que existem hoje:

| Caso | O que a Arena diz |
|---|---|
| microfone negado | que precisa do microfone e como liberar |
| nenhum som capturado | que não ouviu nada, e chama de novo |
| não é arroto | que aquilo não foi arroto, sem dar nota |
| falha na análise | que deu ruim do lado do jogo, não do lado da pessoa |
| falha ao compartilhar | que o navegador não deixou — culpa dele |
| link expirado ou inválido | que essa disputa já era |
| sem rede / sem configuração | que o jogo não consegue operar agora |

Regras do `ERROR`:

- fala na lata, no tom da casa, sem culpar a pessoa quando a culpa não é dela;
- **sempre oferece a saída** — quase sempre "tenta de novo";
- erros de peso diferente reagem com peso diferente;
- **nunca vira sucesso por copy**, e nunca mostra nota quando não houve nota.

---

## 3. Transições

```text
        ┌──────────────────────── IDLE ◄──────────────┐
        │                          │                  │
        ▼                          ▼                  │
     ERROR ◄──────────────── RECORDING                │
        ▲                          │                  │
        │                          ▼                  │
        └───────────────────── ORIGIN                 │
        ▲                          │                  │
        │                          ▼                  │
        └───────────────────── JUDGING                │
                                   │                  │
                                   ▼                  │
                    ┌──────────  RESULT  ──────────┐  │
                    │              │               │  │
                    ▼              ▼               ▼  │
               CHALLENGE      SCOREBOARD      (gravar de novo)
                    │              ▲ │
                    │              │ ▼
                    └────────────► REMATCH

     VERSUS ──► RECORDING ──► … ──► RESULT ──► SCOREBOARD
       ▲
       └── entrada por link de desafio
```

---

## 4. Onde o código está hoje

**A Arena descrita aqui é o alvo, não o estado atual do `src/`.**

Hoje o app implementa o mesmo loop como uma sequência de telas React
(`TelaDeConvite`, `TelaDeGravacao`, `EscolhaDeOrigem`, `TelaDeJulgamento`,
`ResultadoScreen`, `BattleView`, `DisputaLocalScreen`), com rotas `/b/:code` para
a batalha por link e `/d/:id` como legado.

O comportamento já existe e funciona. O que falta é a **superfície única**. A
migração para a Arena está no backlog em fatias, e nenhuma delas deve reescrever
motor de áudio, score ou backend — ver
[`../escopo/BACKLOG.md`](../escopo/BACKLOG.md).
