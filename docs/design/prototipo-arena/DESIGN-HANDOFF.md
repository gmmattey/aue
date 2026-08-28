# Auê! — Handoff de implementação da Arena

O Art Bible [`../AUÊ!.md`](../AUÊ!.md) e a prancha visual de telas recebida são
referências de direção e composição. Eles não ampliam a máquina de estados nem
criam rotas. A implementação continua obedecendo a `ARENA.md`, ao protótipo
executável e ao design system.

### Leitura da prancha visual

A prancha recebida organiza vinte momentos visuais em quatro blocos — tentativa
individual, confronto X1, Roda e estados especiais. Esses cartões são referências
de composição e de feedback, não vinte estados de produto. A máquina normativa
continua em [`../../jogo/ARENA.md`](../../jogo/ARENA.md); `AD_BREAK` permanece
fora do produto e `ORIGIN` permanece estado quando essa fonte assim determinar.

> **Arrote. Receba a nota. Humilhe seus amigos.**
> Jogo mobile casual. O protótipo valida uma única pergunta:
> *é divertido abrir, arrotar, receber uma nota e desafiar alguém?*

---

## 1. Fonte canônica

**`arena.html` + o Design System Auê! (`system/DESIGN.md` do projeto de marca
`brand-au-bf769b`) são as únicas referências canônicas de UX/UI do Auê! atual.**

Não existe terceira fonte. Qualquer protótipo, especificação, deck, landing,
kit de marketing ou documento de escopo que contradiga esses dois é resíduo —
não é legado, não é referência futura e não deve ser portado. Quando os dois
divergirem: `arena.html` decide comportamento e geometria; o Design System
decide token, nome, regra e intenção.

Não existe outro arquivo de protótipo. Não existe launcher, índice, landing, feed, ranking, perfil,
comunidade, campeonato, conquista, assinatura, histórico, tutorial nem
configurações extensas — tudo isso foi removido do protótipo por não pertencer
ao gameplay atual.

Se um arquivo HTML aparecer ao lado de `arena.html`, ele é resíduo de export
antigo e deve ser apagado, não portado.

## 2. Os estados NÃO são páginas nem rotas

Esta é a regra estrutural do produto e a que mais se perde em implementação.

- Existe **uma Arena**. Ela é o mesmo lugar durante a partida inteira.
- O que muda é o **estado do jogo**, exposto em `#arena[data-state]`.
- Elementos **entram, saem, mudam, reagem e se transformam** dentro do mesmo
  palco. Nada é remontado do zero a cada estado.
- Vocabulário obrigatório: "**estado de RESULT**", "momento da partida". Chamar
  um estado de tela ou de rota faz o time reconstruir páginas estáticas em vez
  de uma Arena. Landing, termos e privacidade — que vivem fora deste protótipo —
  continuam sendo páginas.
- Em React/Vue/Compose/SwiftUI: **um componente `Arena` com uma máquina de
  estados**, não um `Router` com 20 rotas. Cada rota criada aqui é um bug de
  arquitetura, porque quebra a continuidade visual que é o produto.
- A URL pode carregar um X1 (`aue.gg/x1/<code>`), mas isso **hidrata um estado**
  da Arena — não navega para uma página nova.

## 3. Máquina de estados

`data-state` assume exatamente **20 valores**. Não existe estado de feed, de
perfil, de ranking global, de conquista, de campeonato, de temporada nem de
assinatura.

### Fluxo solo

| # | Estado | O que a Arena está dizendo | Saídas |
|---|---|---|---|
| 1 | `IDLE` | Bolha viva no centro, chamada curta e o **gatilho de microfone**: bola de accent de 112px com ícone de mic e a legenda *Clique e arrote!*. Não é pílula — é o único estado em que a ação principal tem outra forma | → `MIC_PENDING` / `RECORDING` |
| 2 | `MIC_PENDING` | Permissão de microfone pedida **dentro** da Arena, sem navegar | → `RECORDING` / `MIC_ERROR` / `IDLE` |
| 3 | `RECORDING` | Bolha reage ao áudio em tempo real, timer, CTA **PARAR** | → `VALIDATING` (manual ou aos 10s) |
| 4 | `VALIDATING` | Checagem curta: veio som? parece arroto? | → `NO_SOUND` / `NOT_A_BURP` / `JUDGING` |
| 5 | `NO_SOUND` | Nenhum som válido, reação curta, CTA **TENTAR DE NOVO** | → `RECORDING` / `IDLE` |
| 6 | `NOT_A_BURP` | Veio áudio, não veio arroto. Provocação + replay do que foi mandado | → `RECORDING` / `IDLE` |
| 7 | `JUDGING` | Momento de jogo, não spinner. HUD some, palco escurece, Bolha contrai | → `RESULT_REVEAL` |
| 8 | `RESULT_REVEAL` | **Só a nota, dentro da Bolha.** Score contando + reação forte. Nada mais | → `RESULT` (automático, ~1,5s) |
| 9 | `RESULT` | Score continua dentro da Bolha e dominante; replay, métricas e origem entram em cascata. CTA **CHAMAR PRO X1** + **JOGAR NO GRUPO** ao lado, ghost **MANDAR OUTRO** | → `CHALLENGE_CREATED` / `RECORDING` / `SCOREBOARD` |

**Caminho crítico:** `ARROTAR → VALIDAR → JULGAR → NOTA`.
Não existe formulário, seleção ou pergunta entre o arroto e o resultado.

### Fluxo X1

| # | Estado | O que a Arena está dizendo | Saídas |
|---|---|---|---|
| 10 | `CHALLENGE_CREATED` | Desafio existe, link disponível, CTA **MANDAR PRO INFELIZ**. Ainda não há adversário — e por isso não há nome nenhum na tela | → `WAITING_OPPONENT` / `SHARE_ERROR` |
| 11 | `WAITING_OPPONENT` | "Ninguém aceitou ainda." Cutucar de novo, ouvir o próprio arroto, **sair sem perder o desafio** | → `SCOREBOARD` / `DRAW` / `IDLE` (X1 preservado) |
| 12 | `INCOMING` | O amigo abriu o link. Nome e nota do provocador **vieram dentro do link**. Replay + provocação. CTA **ACEITAR O X1**. Não passa pela home | → `RECORDING` |
| 13 | `SCOREBOARD` | Comparação dos dois, vencedor evidente em ouro, placar tocável | → `AD_BREAK` / `IDLE` |
| 14 | `DRAW` | Empate. **Não é vitória de ninguém**: os dois em `--fg`, marca `=` no lugar de `VS`. CTA **REVANCHE** | → `AD_BREAK` / `IDLE` |
| 15 | `AD_BREAK` | Intervalo comercial entre rodadas. Palco cede a altura inteira ao inventário; contagem de pulo de 5s no lugar do CTA | → `REMATCH` |
| 16 | `REMATCH` | Contagem 3·2·1 no palco e reinício da rodada entre os mesmos dois | → `RECORDING` |

Depois de aceitar: `INCOMING → RECORDING → VALIDATING → JUDGING → RESULT_REVEAL
→ RESULT → SCOREBOARD | DRAW`.

### De onde vem o nome de cada jogador

Nenhum nome é inventado pelo app. Existem exatamente duas origens, e as duas
são digitação de alguém:

1. **Quem cria o X1 assina antes de mandar.** Ao tocar em CHAMAR PRO X1, se o
   jogador ainda não tem nome, a assinatura abre. O nome vai embutido no link
   — é por isso que o amigo, ao abrir, lê "LUIZ METEU 91".
2. **Quem aceita assina antes de publicar.** Do lado do amigo, o nome é
   cobrado no "Ver o estrago", imediatamente antes de a nota entrar no placar.
   Mesma regra, mesmo overlay, momento simétrico.

**Briga e plateia não usam o mesmo verbo.** As duas saídas do arroto são
objetos diferentes e os rótulos têm que deixar isso óbvio à primeira leitura:
`CHAMAR PRO X1` / `MANDAR PRO INFELIZ` mandam o desafio (`aue.gg/x1/…`, um
adversário, vira placar); `JOGAR NO GRUPO` manda o arroto avulso
(`aue.gg/a/…`, plateia, não vira placar). Rótulos parecidos para os dois
apagam a distinção que sustenta o loop.

Consequências obrigatórias na implementação: enquanto ninguém aceitou, os
estados de host (`CHALLENGE_CREATED`, `WAITING_OPPONENT`, marca no HUD) **não
exibem nome de adversário**, porque adversário ainda não existe. O nome só
aparece no evento de chegada da resposta, junto com a nota. Quem recusa
assinar joga como `Anônimo` — nunca como um nome sorteado.

### Estados de resiliência

| # | Estado | Regra inegociável |
|---|---|---|
| 17 | `MIC_ERROR` | Permissão negada. Instrução concreta de como liberar, sem culpar o jogador |
| 18 | `SHARE_ERROR` | Falha de envio/upload **não apaga o resultado conquistado**: o score continua na tela, o link continua copiável, e há retentativa |
| 19 | `CHALLENGE_EXPIRED` | Desafio vencido. Saída honesta: arrotar mesmo assim |
| 20 | `SESSION_RECOVERY` | Reabriu/recarregou com X1 aberto → volta ao estado correto da partida, com a nota intacta |

**Persistência:** `localStorage["aue.arena.v3"]` guarda nota, métricas, reação,
duração, link do desafio, papel (`host`/`guest`), rival e origem — o suficiente
para recompor a partida, nunca o estado visual. `aue.arena.nome`,
`aue.arena.jogou` e `aue.arena.mic` guardam assinatura, reincidência e
permissão.

**X1 aberto é chamada na entrada.** Com desafio pendente, o `IDLE` mostra um
CTA secundário em contorno acima do gatilho de microfone (*"Ver meu X1"*, ou
*"Ver o X1 contra Fulano"* quando já há resposta) mais a marca no HUD. Continua
havendo uma só ação sólida por estado: arrotar segue sendo a primária.

## 4. Origem fora do caminho crítico

`ORIGIN` deixou de ser estado. A pergunta "isso veio de quê?" aparece **depois
da nota**, como último item da cascata do `RESULT`, em uma linha de quatro
pílulas de 44px. É opcional, responde em um toque, colapsa para uma linha
discreta e **nunca bloqueia nenhum CTA**. Se o jogador ignorar, o jogo segue.

## 5. Anatomia do palco

Grade fixa, idêntica em todos os estados: **quatro faixas de jogo** mais a
faixa de inventário, que é a única que pode não existir.

```
┌───────────────────────────────┐
│ HUD        wordmark · X1 · ☰  │  56px — some em RECORDING, VALIDATING,
├───────────────────────────────┤          JUDGING, RESULT_REVEAL, REMATCH,
│                               │          AD_BREAK
│ PALCO   Bolha+Score | Versus  │  clamp(0–308px) por estado; cede altura
│         | Contagem            │  quando a faixa de reação enche
├───────────────────────────────┤
│ REAÇÃO  grito · comentário    │  1fr — timer, player, métricas, origem,
│         · timer · métricas    │  link, placar, intervalo
├───────────────────────────────┤
│ AÇÃO    1 CTA + 1 ghost       │  auto — uma ação principal por estado
├───────────────────────────────┤
│ ANÚNCIO 320×50                │  auto — só nos estados de descanso (§9.1)
└───────────────────────────────┘
```

- As camadas do palco são `grid-area:1/1` empilhadas: trocar de estado liga e
  desliga camadas, não substitui o palco.
- **Não existe bottom navigation.** O HUD não é navegação: é marca, marca de X1
  aberto e menu — e ele desaparece durante a partida.
- Mobile-first, 360–430px, uma mão. Desktop é o mesmo app em shell de 440px com
  raio 32px — não uma versão esticada.

## 6. A Bolha Auê

Componente proprietário, nunca decoração. Blob de N pontos suavizado por
Catmull-Rom em SVG. O vocabulário emocional dela é amplitude × pontos × escala
× cor. Modos: `idle`, `asking`, `recording`, `holding`, `checking`, `judging`,
`cradle`, `waiting`, `playing`, `flat`, `dead`, `victory`, `defeat`.

`cradle` e `waiting` são os modos-recipiente: escala 1 e amplitude baixa não
são estilo, são requisito — o número mora dentro da Bolha e a ondulação não
pode empurrá-lo para fora.

Em `recording` e `playing` a amplitude é dirigida por um envelope de energia.
**Na implementação real esse envelope vem do motor de áudio (RMS por frame do
`AnalyserNode`)** — no protótipo ele é sintetizado. É o único ponto do arquivo
que precisa ser trocado por dado real para a Bolha ficar honesta.

## 7. Motion — cada transição tem função

| Momento | Movimento | Por quê |
|---|---|---|
| Entrada na gravação | anel de accent expandindo do centro (`ring`, 720ms) | confirma que a partida começou |
| Bolha respondendo ao áudio | amplitude e `drive` dirigidos pelo envelope | a Bolha é o VU meter |
| Fim da gravação | `snap` — esmaga e volta (460ms) | o corpo leva o baque antes de segurar o ar |
| Validação | `tick` — três batidas curtas (900ms) | alguém conferindo, não carregando |
| Julgamento | contração lenta + palco escurece + HUD some | suspense |
| Revelação da nota | `pop` do score (560ms) + contagem em ease-out (900ms) | o número é o payoff |
| Vitória | `winPop` do vencedor em ouro (620ms) | vencedor evidente sem legenda |
| Derrota | `loseSag` do perdedor (520ms) | perder tem peso |
| Empate | `drawL`/`drawR` — os dois entram um contra o outro (520ms) | ninguém ganhou |
| Resposta do adversário | `flash` do palco inteiro (620ms) antes de trocar de estado | o evento chegou |
| Revanche | contagem 3·2·1 escalando (620ms cada) | reinício ritualizado |
| Recusa (sem som / não é arroto) | `shake` da Bolha (340ms) | negativa corporal |

`prefers-reduced-motion` neutraliza duração mantendo a informação completa: o
score aparece direto, a barra de replay anda em passos, a Bolha para de ondular.

## 8. Tokens

Somente a paleta registrada. Derivações por `color-mix(in oklch, …)` — nunca
hex novo.

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#0a0a08` | fundo — tema escuro é canônico, não variante |
| `--surface` | `#171712` | pílulas de link e player |
| `--surface-2` | `#1f1f18` | segunda elevação |
| `--fg` | `#f5f3ea` | texto e preenchimento de métrica |
| `--muted` | `#93917f` | comentário do juiz, rótulos, metadados |
| `--border` | `#2b2a22` | divisores discretos |
| `--accent` | `#c6ff00` | **máx. 2 aparições por estado**, nesta prioridade: Bolha gravando → Auê Score → CTA primário |
| `--gold` | `#f4c430` | vitória, aviso de tempo, provocação do `INCOMING` |

O accent **nunca** aparece no wordmark, na barra de métrica, na pílula de link,
no player ou no espaço publicitário. Tipografia: **Anton** no display,
**Archivo** na UI (Inter só como fallback tardio), mono restrito a eyebrow,
contador, código e link.

**O gatilho de microfone é a exceção à regra da pílula.** No `IDLE` a ação
principal é uma bola de accent de 112px (96px abaixo de 730px de altura) com
ícone de microfone, legenda em Display logo abaixo, e o alvo é o conjunto
inteiro — bola mais legenda — para o toque não exigir mira. Ele carrega o mesmo
anel permanente do estilo *focus* do CTA primário, e o foco de teclado se
distingue por anel mais grosso e mais afastado. Em todos os outros estados a
ação volta a ser pílula: a exceção existe porque a entrada precisa dizer
*fale*, não *leia*. Isso mantém uma só ação sólida por estado.

**Botões e foco** seguem o design system Auê! (`brand-au-bf769b`): primário
sólido em accent com raio pílula e altura mínima 56px; secundário em contorno
de 1px; terciário/ghost em texto. O foco é
`outline:2px solid var(--accent); outline-offset:2px`, sem `border-radius`
forçado — o anel acompanha a forma do botão, então pílula ganha anel de pílula.
`disabled` é o único estado autorizado a reduzir contraste.

## 9. Nota

O Auê Score é **inteiro de 0 a 100**, sem casa decimal (DESIGN.md §7.1) —
`91`, nunca `91,4`. Casa decimal dá ar de laudo e rouba leitura do número
grande. O ponto único de formatação é `fmt()` em `arena.html`.

A comparação do X1 usa a nota **arredondada**, a mesma que está na tela: se os
dois exibem `88`, é `DRAW`. Vencedor invisível por diferença decimal é bug.

### A nota vive dentro da Bolha

A camada do score é concêntrica com a da Bolha, e nos estados de nota a Bolha
troca de papel: deixa de ser fundo e vira o corpo que segura o número (modo
`cradle`, escala 1, amplitude baixa). Três consequências que a implementação
precisa manter:

- A largura da Bolha é `min(<teto>, <vw>, var(--stage-h))` — o terceiro termo
  impede que ela vaze para o HUD ou para a faixa de reação em qualquer
  viewport. O diâmetro desenhado é ~74% dessa largura.
- O corpo do número é escolhido para caber nesse diâmetro com folga, inclusive
  em `100`: `clamp(60px,19vw,92px)` na revelação, `clamp(48px,15vw,64px)` no
  resultado, `clamp(36px,11vw,48px)` nos estados de X1.
- O eyebrow também mora dentro da Bolha, então é curto por contrato
  (*De pé*, *Salvo*, *Valendo*, *Tu mandou*) e trunca em 15ch.

## 9.1 Publicidade

O jogo é gratuito, então o inventário faz parte do produto — mas ele nunca
divide espaço com o momento de jogo. Duas superfícies, e só duas:

| Slot | Formato | Onde aparece |
|---|---|---|
| Faixa ancorada | 320×50, 5ª faixa da grade, abaixo da ação | `IDLE`, `CHALLENGE_CREATED`, `WAITING_OPPONENT`, `SCOREBOARD`, `DRAW`, `CHALLENGE_EXPIRED`, `SESSION_RECOVERY` |
| Intervalo | Tela cheia com contagem de pulo de 5s | `AD_BREAK`, entre o placar e a revanche |

A faixa fica **abaixo** da faixa de ação de propósito: ali ela não empurra nem
disputa leitura com o CTA, e sair dela para o polegar é um movimento
deliberado. O intervalo ocupa o palco inteiro (`--stage-h:0`) porque é o único
ponto do jogo em que o payoff da rodada já aconteceu e a próxima ainda não
começou.

**Onde não entra, por decisão de produto:** `MIC_PENDING`, `RECORDING`,
`VALIDATING`, `NO_SOUND`, `NOT_A_BURP`, `JUDGING`, `RESULT_REVEAL`, `RESULT` e
`INCOMING`. Do pedido de microfone até a nota o jogador está jogando; e o
`RESULT` é o produto — a nota não divide a tela com anúncio.

No protótipo os dois slots são placeholders honestos: borda tracejada, rótulo
em mono, sem accent e sem arte falsa. Nenhuma marca ou criativo fictício. Ao
integrar uma rede de anúncios, o contrato visual acima é o limite: nada de
interstitial fora do `AD_BREAK`, nada de faixa nos estados de partida e nada
de accent dentro do inventário.

## 10. Sala de revisão

O menu contém uma seção **Sala de revisão**, marcada como inexistente no jogo
publicado. Ela permite:

- **forçar desfechos** — microfone permite/nega, validação válida/sem som/não é
  arroto, envio envia/falha, nota de quem aceitar sorteio/perde/ganha/empata;
- **digitar os dois nomes do X1** — o que veio no link recebido e o que quem
  aceitar vai assinar, para deixar visível que nome é entrada de gente;
- **abrir um X1 que chegou por link**, entrando pelo lado do amigo;
- **pular para qualquer um dos 20 estados**, com contexto mínimo gerado para o
  estado não aparecer vazio.

Essa seção existe para avaliação de UX. **Não portar para produção.**

## 11. Contrato de implementação

1. Portar `arena.html` como **um** componente com máquina de estados. Nenhuma
   rota por estado.
2. Trocar a simulação por real: `getUserMedia` + `AnalyserNode` (envelope da
   Bolha e detecção de silêncio), classificador de arroto (ver
   `docs/technical/deteccao-de-arroto-yamnet.md`), scoring no backend.
3. Preservar a ordem da cascata do `RESULT`. Mostrar tudo de uma vez mata o
   payoff.
4. Preservar a regra do `SHARE_ERROR`: falha de rede nunca destrói resultado.
5. Preservar `SESSION_RECOVERY`: recarregar não perde partida.
6. Não introduzir feed, perfil social, seguidores, comunidade, ranking global,
   conquistas, campeonatos, temporadas, assinatura, bottom navigation nem
   roadmap futuro. Nenhum deles é legado e nenhum é referência futura.
   Publicidade só nos dois slots da §9.1 — não abrir novos.
7. Preservar a origem dos nomes (§3): host assina ao criar, guest assina ao
   publicar. Nome sorteado ou pré-preenchido pelo app é bug.
8. Verificar sem rolagem horizontal em 360, 390, 430 e 600px; e sem corte
   vertical em alturas de 640, 720, 844 e 932px.
