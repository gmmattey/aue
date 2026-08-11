# A Arena — estados

A experiência principal do Auê acontece em **uma Arena que muda de estado**.

Não é uma sequência de páginas. Não é um roteador com uma tela por momento. É uma
superfície só, com estrutura fixa, cujas faixas ligam e desligam conforme o
estado da partida.

> ## ESTE DOCUMENTO MANDA NA MÁQUINA DE ESTADOS
>
> **Quais estados existem, o que cada um faz, o que ele não pode fazer e para
> onde ele sai: quem decide é este arquivo.** Nenhum protótipo, design system,
> handoff ou export cria, renomeia ou remove estado da Arena.
>
> O que o material de design decide é o resto — e é bastante: como cada estado
> **se parece, se move e mede**. Geometria, token, tipografia, componente,
> motion e acessibilidade saem de
> [`../design/prototipo-arena/arena.html`](../design/prototipo-arena/arena.html)
> e de
> [`../design/design-system/system/DESIGN.md`](../design/design-system/system/DESIGN.md).
> Nesse terreno, quando este documento e o protótipo divergirem, **o protótipo
> vence**.
>
> Quando qualquer um deles divergir em escopo, vale
> [`../escopo/ESCOPO_ATUAL.md`](../escopo/ESCOPO_ATUAL.md).

### O que isso resolve, agora

O material do lançamento mínimo descreve entre 19 e 20 estados, com nomes que
não existem aqui (`MIC_PENDING`, `VALIDATING`, `NOT_A_BURP`, `RESULT_REVEAL`,
`DRAW`, `SESSION_RECOVERY`, `CHALLENGE_CREATED`, `WAITING_OPPONENT`, `INCOMING`,
`CHALLENGE_EXPIRED`, `MIC_ERROR`, `SHARE_ERROR`, `AD_BREAK`).

- **A máquina continua com os 10 estados da seção 2.** Os nomes acima não são
  estados da Arena.
- **`AD_BREAK` está fora.** Não é estado, não é momento, e não se desenha nada
  que dependa dele. Isso bate com o próprio design system (§12.4 e §20) e com
  [`../escopo/ESCOPO_ATUAL.md`](../escopo/ESCOPO_ATUAL.md) §3, onde monetização
  está fora do escopo.
- **`ORIGIN` continua sendo um estado**, como descrito abaixo. O handoff do
  protótipo afirma que nada acontece entre o arroto e a nota; nesse ponto ele
  não vale.

**Onde cada nome do material novo foi parar.** O comportamento útil que eles
descreviam foi absorvido como **momento dentro** de um dos dez estados. Nenhum
virou estado:

| Nome no material de design | Onde vive aqui |
|---|---|
| `MIC_PENDING` | momento do `IDLE` — a Arena não se mexe enquanto a caixinha está aberta |
| `VALIDATING` | a conferida na saída do `RECORDING`, antes do `ORIGIN` |
| `NO_SOUND` · `NOT_A_BURP` | casos do `ERROR`, que já estavam listados |
| `MIC_ERROR` · `SHARE_ERROR` · `CHALLENGE_EXPIRED` | casos do `ERROR`, idem |
| `RESULT_REVEAL` | a revelação com teatro que o `RESULT` já descrevia |
| `CHALLENGE_CREATED` · `WAITING_OPPONENT` | o `CHALLENGE` inteiro |
| `INCOMING` | o `VERSUS` |
| `DRAW` | momento do `SCOREBOARD` |
| `SESSION_RECOVERY` | como a Arena monta ao abrir — ver §3 |
| `AD_BREAK` | **lugar nenhum.** Está fora |

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

## A roda — a disputa com um aparelho só

De 2 a 5 pessoas, de 1 a 3 rounds, o celular passando de mão em mão. Cada uma
arrota na sua vez, recebe a própria nota, e no fim sai um pódio que vai pro
grupo.

**A roda não cria estado nenhum.** Ela é uma sobreposição para montar a mesa,
mais momentos dentro de estados que já existem:

| O que acontece | Onde vive |
|---|---|
| montar a mesa (nomes, rounds, contexto, aviso de gravação) | **sobreposição** "chamar a mesa", igual à assinatura e ao menu |
| "agora é você, Rafa · round 2 de 3" | momento do `IDLE` |
| arrotar, dizer de onde veio, o juiz ouvir | `RECORDING`, `ORIGIN`, `JUDGING` — sem uma linha diferente |
| a nota da pessoa e o passa-o-celular | momentos do `RESULT` |
| o pódio no fim | `SCOREBOARD`, na segunda forma dele |
| não deu pra abrir, não deu pra registrar o turno | `ERROR`, nos casos que já existem |

**Uma seta nova, e só uma: `SCOREBOARD → IDLE`**, para o "acabou essa porra"
fechar a mesa e o jogo voltar a esperar alguém arrotar. É irmã do
`CHALLENGE → IDLE` do "deixa pra lá".

**Não pode:**

- **criar estado.** Nem `DISPUTA`, nem `ROUND`, nem `PODIO`. Cada estado novo é
  uma tela nova disfarçada, e a Arena existe justamente para não ter tela por
  momento;
- **guardar de quem é a vez num ponteiro.** A vez e o round são **derivados**
  das gravações que já existem, no jogo e no servidor, pela mesma regra. É o que
  faz a tela e o banco nunca discordarem — inclusive depois de um erro de rede,
  que é onde um ponteiro estraga tudo;
- **gravar gente sem avisar.** O aviso de que todo mundo vai ser gravado fica na
  mesma tela onde os nomes são escritos, sempre visível. É o único ponto do jogo
  em que uma pessoa registra o áudio de outra;
- **perder o arroto de alguém no passa-o-celular.** A nota fica na tela até
  alguém tocar;
- **guardar o placar no aparelho.** O que fica ali é o número da mesa, e mais
  nada — as notas moram no banco. Mesa que não existe mais ou venceu: o bilhete
  é rasgado e o jogo abre no `IDLE` limpo. Não se ressuscita mesa morta.

Fechar a roda a partir da vez não passa pelo pódio: chegar lá dali exigiria a
seta `IDLE → SCOREBOARD`, e a roda acrescenta **uma** aresta. Quem quer o pódio
o alcança do `RESULT`.

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

#### A permissão de microfone é pedida aqui, e a Arena não se mexe

O microfone só é pedido **depois** do toque em ARROTAR. Enquanto o sistema
mostra a caixinha de permissão, **a Arena continua em `IDLE`, inalterada**: a
Bolha segue respirando, a chamada continua no lugar.

- **Liberou** → `RECORDING`.
- **Negou** → `ERROR`, no caso "microfone negado", que diz como liberar.

Quem já liberou antes não vê caixinha nenhuma e vai direto para `RECORDING`.
**É por isso que a Arena não muda:** um momento visual próprio apareceria e
sumiria em menos de um segundo para a maioria das partidas, e piscar à toa é
pior que ficar parado.

**Não pode:** montar a cena de gravação antes de ter o microfone. Se a Arena já
tivesse virado `RECORDING`, negar a permissão obrigaria a desmontar tudo — e
daria a impressão de que gravou alguma coisa sem ter gravado.

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
falha técnica) · `IDLE` (a tela sumiu no meio).

**Não pode:** deixar stream ou timer vivo ao sair. Recurso de microfone tem dono
e ciclo de vida explícito.

#### Sumiu do meio da gravação

Trocou de aba, atendeu ligação, o navegador matou a aba: o microfone é solto na
hora e a Arena **volta para o `IDLE`**.

Não é `ERROR`. Nada quebrou, e nenhum dos sete casos descreve o que aconteceu —
"não veio som" culparia o microfone e "deu ruim do lado do jogo" culparia o
jogo, quando na verdade a pessoa só saiu. O `IDLE` é o estado honesto de "não
aconteceu nada": ela volta e o jogo está esperando ela arrotar, como antes.

**Não pode:** retomar a gravação de onde parou, nem guardar o pedaço que já
tinha sido capturado.

#### A conferida acontece aqui, na saída

Quem decide entre `ORIGIN` e `ERROR` é uma checagem curta que roda **depois do
PARAR e antes da pergunta de origem**: veio som? aquilo foi arroto?

- **Passou** → `ORIGIN`.
- **Não passou** → `ERROR`, nos casos "nenhum som capturado" ou "não é arroto".

**Ninguém escolhe origem à toa.** A pessoa não responde "de onde veio" para
depois descobrir que não valeu — essa foi a decisão, e ela existe para não
gastar o gesto do jogador à toa.

Enquanto a conferida roda, a Arena continua em `RECORDING`: a Bolha segura o que
acabou de sair e o CTA já não é mais PARAR. **Não é um estado**, e por isso não
tem nome próprio, não tem HUD de volta e não remonta as faixas.

**Não pode:** inventar barra de progresso para uma espera que costuma ser curta,
nem ficar preso ali. Se a checagem não responde, é `ERROR` com saída — não é
espera infinita. Se ela é instantânea, não aparece nada: a Arena vai direto para
`ORIGIN`.

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

**Sai para:** `CHALLENGE` · `SCOREBOARD` · `RECORDING` · `ERROR`.

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

**Entra quando:** abre um link de desafio e tem um arroto do OUTRO esperando
resposta. Abrir o próprio link, ou uma briga sem round aberto, é `SCOREBOARD`.

- Diz na cara quem chamou e quanto fez.
- **Player do arroto do adversário** — ouvir antes de responder é obrigatório
  para o jogo fazer sentido.
- Ações: **AGUENTA ESSA** (grava a resposta) · *"Ver o placar"*.

**Sai para:** `RECORDING` · `SCOREBOARD`.

**Não pode:** exigir cadastro de quem chegou pelo link. Zero atrito.

---

### `SCOREBOARD`

**Entra quando:** os dois lados têm nota.

- A Bolha sai; entra o **placar de vitórias** — quantos rounds cada lado ganhou
  — e, abaixo dele, o **VS do último round**: nota de cada lado, vencedor do
  round em ouro.
- Frase de vitória ou derrota, e as duas terminam empurrando para a revanche.
- Placar em linhas, ordenado, **só do último round**. **Cada linha toca o arroto
  daquela pessoa** — é onde a nota do outro vira prova.
- A linha que está tocando mostra a contagem regressiva no lugar da nota.
- Ações: **REVANCHE** · *"Mandar o link"*.

**Sai para:** `REMATCH` · `IDLE` (a roda fechou).

**Não pode:** mostrar participante, nota ou pódio que não existe.

#### O pódio da roda é a segunda forma deste estado

O `SCOREBOARD` sempre foi "o placar da disputa". A roda é uma disputa de até
cinco pessoas no mesmo aparelho, e o fim dela é o mesmo momento. O que muda:

- são até cinco linhas, com a **melhor** nota de cada um — não a última, não a
  média. Média puniria quem arriscou; a última jogaria fora um 98 do round 1;
- **empate divide a posição de verdade** (1, 2, 2, 4). Numerar pela ordem da
  lista mandaria para o grupo um desempate que ninguém deu;
- **quem não gravou nenhuma vez não aparece.** Zero é nota possível neste jogo,
  e "não jogou" não é "jogou mal";
- a Bolha **fica** — não há dois lados para confrontar, e um `VS` com cinco
  nomes não significaria nada;
- ações: **MANDAR O PÓDIO** · *"Acabou essa porra"*, que fecha a mesa e volta
  para o `IDLE`.

#### Empate é um momento do placar, não um estado

Quando as duas notas batem, o `SCOREBOARD` continua sendo o `SCOREBOARD` — muda
o que ele diz.

- **Ninguém venceu.** Sem ouro, sem pódio, sem linha líder. Os dois lados no
  mesmo peso visual.
- **O jogo não desempata sozinho.** Nenhuma medida escondida do arroto decide a
  briga por baixo do pano. Se a pessoa não viu o critério, o critério não vale —
  seria roubo aos olhos de quem perdeu.
- **Empate não é vitória dupla.** Se o ouro aparece quando ninguém ganhou, ele
  para de significar vitória.
- **A fala cutuca.** Empate é resultado que não resolveu nada, e o texto diz
  isso. A revanche vira a saída óbvia — é o único lugar onde o empate é útil.

A forma disso — os dois nomes em `--fg`, a marca `=` no lugar do `VS` — está no
design system e é ele quem decide. Aqui se decide só o que o empate significa.

#### Round aberto também é um momento do placar

Um round só fecha quando **os dois** arrotaram. Enquanto falta um, o placar
continua sendo o placar — muda o que ele diz e qual é a ação.

- **Round aberto do outro:** o grito diz quem mandou e quanto fez, o arroto dele
  toca ali mesmo, e a ação principal vira **AGUENTA ESSA**.
- **Round aberto meu:** não existe botão de arrotar. Já mandei; a única saída
  honesta é cutucar o outro, e a ação principal é *"Mandar o link"*.
- **Ninguém ganha por W.O.** Round aberto que nunca é respondido não vira
  vitória de ninguém, por mais tempo que passe.
- **Empate de round não pontua.** Notas iguais fecham o round sem vitória para
  nenhum dos dois, e nada desempata por baixo do pano.

Nada disso é estado novo: é o `SCOREBOARD` dizendo outra coisa, do mesmo jeito
que o empate.

---

### `REMATCH`

**Entra quando:** aceita a revanche a partir do placar.

Não é um recomeço: é a mesma disputa continuando. O que muda em relação a um
`RECORDING` normal:

- o contexto da disputa é preservado (adversário, placar, link);
- a nota nova **abre um round novo** na mesma briga — ou fecha o round que o
  outro deixou aberto. Cada round guarda o arroto de cada lado **e o áudio
  daquela tentativa**, senão o placar tocaria um arroto que não é o da nota
  exibida;
- nota maior fecha o round e vale **uma vitória**; notas iguais fecham o round
  sem vitória para ninguém;
- a revelação da nota já não tem o teatro da primeira vez.

**Sai para:** `ORIGIN` · `ERROR`.

O arco termina no `SCOREBOARD` — a nota nova entra no placar quando o juiz
fecha —, mas a transição seguinte é a mesma de qualquer gravação. Estava
escrito como "Sai para: `SCOREBOARD`", que descreve onde a coisa desemboca e
não para onde o estado vai. Documento impreciso vira código torto.

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

**Todo estado que pede o microfone pode sair para o `ERROR`.** Permissão é do
aparelho e pode ser revogada a qualquer momento, inclusive entre um arroto e o
próximo — "já deixei antes" não é garantia. Onde houver pedido de microfone,
existe essa saída.

Regras do `ERROR`:

- fala na lata, no tom da casa, sem culpar a pessoa quando a culpa não é dela;
- **sempre oferece a saída** — quase sempre "tenta de novo";
- erros de peso diferente reagem com peso diferente;
- **nunca vira sucesso por copy**, e nunca mostra nota quando não houve nota.

**Sai para:** `IDLE` · `RESULT` (só quando entrou trazendo a nota).

A segunda saída existe porque **o erro não pode roubar o que o jogador já
conquistou**. Quem tirou a nota, tocou em CHAMAR NO X1 e viu o servidor cair
entrou no erro com a nota na mão: ela continua na tela e tem botão de volta.
Quem entrou sem nota — microfone negado, gravação muda, link torto — só tem o
`IDLE`, e é a mesma regra de sempre: o erro nunca mostra nota que não houve.

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

### Entrar na Arena não é sempre cair no `IDLE`

Abrir o jogo com uma disputa em aberto **devolve a pessoa ao ponto onde ela
parou**, com a nota intacta. Fechar o app, receber ligação ou o navegador matar
a aba não pode custar um arroto bom — perder uma nota alta por acidente é o tipo
de coisa que faz desinstalar.

Existem três entradas:

| Entrada | Vai para |
|---|---|
| primeira vez, ou sem nada em aberto | `IDLE` |
| link de desafio, com round aberto **do outro** | `VERSUS` |
| link de desafio, nos outros casos | `SCOREBOARD` |
| **reabertura com disputa em aberto** | o estado onde a partida parou |

A reabertura **não é um estado.** É como a Arena monta na hora que abre.

O link é o mesmo para os dois lados da briga, e quem mandou também abre — para
conferir se foi, voltando pelo histórico, tocando no próprio zap. Só cai no
`VERSUS` quem tem um arroto esperando resposta do outro lado; o resto é placar.
Mandar todo mundo para o `VERSUS` fazia o jogo dizer "fulano te chamou" tocando
o arroto da própria pessoa.

**O que sobrevive:** a nota, as métricas, a reação que o juiz deu, a origem, o
link do desafio, de que lado a pessoa está e quem é o rival. O bastante para
recompor a partida.

**O que não sobrevive:** o momento visual. Nada de retomar no meio de uma
contagem de score ou de uma animação. A Arena remonta o estado, não a cena.

**Não pode:**

- guardar o áudio da gravação para isso. O que se guarda é o resultado, não o
  arroto — privacidade vence a conveniência
  ([`../escopo/ESCOPO_ATUAL.md`](../escopo/ESCOPO_ATUAL.md) §2.14);
- ressuscitar disputa que já expirou. Se o desafio venceu enquanto o app estava
  fechado, a entrada é `ERROR`, no caso "link expirado ou inválido";
- mostrar nota que não foi conquistada naquela partida.

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
