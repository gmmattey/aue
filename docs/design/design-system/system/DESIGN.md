---
name: "Auê!"
category: Brands
surface: jogo mobile casual (mobile-first)
status: "Design System de produto — v4 (derivado de arena.html)"
canonical_refs:
  - "arena.html"
  - "system/DESIGN.md"
colors:
  bg: "#0a0a08"
  surface: "#171712"
  surface-2: "#1f1f18"
  fg: "#f5f3ea"
  muted: "#93917f"
  border: "#2b2a22"
  accent: "#c6ff00"
  gold: "#f4c430"
  danger: "#ff3d3f"
---

# Auê!

**Arrote. Receba a nota. Humilhe seus amigos.**

Auê! é um **jogo mobile casual**. A experiência principal é **uma única Arena com
estados de jogo** — não um conjunto de telas, não um app social, não um webapp
com navegação.

O jogo responde a uma pergunta só: *é divertido abrir, arrotar, receber uma nota
e desafiar alguém?* Tudo que não serve a essa pergunta está fora deste
documento e fora do produto.

## Referências canônicas

**`arena.html` + este Design System são as únicas referências canônicas de UX/UI
do Auê! atual.** Não existe outra fonte. Protótipo antigo, especificação
anterior, deck, landing, kit de marketing ou documento de escopo que contradiga
estes dois arquivos é resíduo — não é legado, não é referência futura, não deve
ser portado.

Quando os dois divergirem: `arena.html` decide comportamento e geometria; este
documento decide token, nome, regra e intenção.

---

## 0. Como usar este documento

1. **Tema escuro é canônico, não variante.** Não existe "tema padrão claro".
2. Todo token de cor é semântico. Nunca usar hex cru fora do §2.
3. **Estados não são páginas nem rotas.** Escrever "estado de `RESULT`",
   "momento da partida" — nunca "tela de resultado". Em React/Vue/Compose/
   SwiftUI: **um componente `Arena` com uma máquina de estados**, nunca um
   `Router` com 19 rotas. Cada rota criada aqui é bug de arquitetura, porque
   quebra a continuidade visual que é o produto.
4. A **Bolha** (§7) é o elemento vivo central e um componente proprietário —
   nunca decoração.
5. Uma ação principal por estado.
6. O escopo deste DS é **exatamente** o necessário para construir a Arena:
   identidade, cores, tipografia, Bolha, HUD, score, VS, botões e ações,
   overlays, estados, motion, feedback, erros, layout mobile, acessibilidade.
   Ver §19 para o que foi removido de propósito.

---

## 1. Identidade

### 1.1 Símbolo — Bolha Viva

Blob orgânico sob pressão com um **`!` pesado integrado ao símbolo** como recorte
de negativo — o elemento que remove a ambiguidade de "blob genérico de startup
orgânica". Flat e vetorial, cor única (`--accent` sobre `--bg`, ou `--bg` sobre
`--accent` na variante invertida). **Sem gradiente, sem glow, sem sombra, sem
volume 3D.**

**A silhueta não é desenhada — é um frame congelado da Bolha do jogo.** Ela sai
de `caminhoDaBolha()` (§7.1), a mesma função que deforma a Bolha na Arena, com
forma e instante fixos em `src/arena/bolha/caminhoDaMarca.ts`. É por isso que a
relação entre marca e componente é demonstrável por teste, e não por semelhança.

| Medida | Regra |
| --- | --- |
| Pontos de controle | `5` — poucos lóbulos, sobrevive a 16px |
| Amplitude | entre **14 e 22**. Abaixo disso lê como círculo (o repouso usa 8); acima, a 16px vira estrela-do-mar (a gravação usa 34) |
| Irregularidade | `(raio_max − raio_min) / raio_médio` entre **0,20 e 0,34** |
| Vão entre haste e pingo do `!` | **≥ 5% do diâmetro** do blob, medido na geometria — não no raster |
| `viewBox` | `-160 -160 320 320`, o mesmo da Bolha componente. Não existe segundo sistema de coordenadas |

O `!` fica sobre o **centro óptico** da silhueta (o meio do bbox real), não sobre
a origem: como o blob está empurrado para um lado, o `!` herda o deslocamento. A
haste **afunila** — mais larga no topo que na base. **Sem inclinação.**

Arquivos: `assets/aue-bolha-mark.svg` · `assets/aue-bolha-mark-inverted.svg`.
Eles são **escritos por `system/scripts/gerar-marca.mjs`**, não editados à mão —
`caminhoDaMarca.test.ts` reprova se o `d` do arquivo divergir do módulo.

### 1.2 Wordmark

`Auê!` em Display 22px, com o `!` em `--fg` — **não** em `--accent`. O verde é
reservado aos sinais vivos do jogo (§2.2); gastá-lo na assinatura de marca,
presente em todo HUD e todo overlay, estouraria o orçamento antes de o jogo
começar.

### 1.3 Símbolo × componente

O símbolo é **estático**: marca, favicon, ícone de app. A Bolha componente (§7) é
**animada e áudio-reativa**. Não são o mesmo artefato e não se substituem.

### 1.4 Ícones de aplicação

O conjunto vive em `assets/favicon/` e é **gerado**, nunca desenhado à mão:
`system/scripts/build-favicons.py` **lê o `d` do `aue-bolha-mark.svg`** e
rasteriza a mesma geometria vetorial do símbolo. Se o símbolo mudar, rode
`npm run assets:marca` — não edite um PNG, e não copie geometria para dentro do
script.

| Arquivo | Alvo | Regra |
| --- | --- | --- |
| `favicon.ico` (16 · 32 · 48) | aba, favoritos, Windows | três quadros PNG num contêiner ICO |
| `favicon.svg` | navegadores atuais | vetorial; usa a forma de tamanho pequeno |
| `apple-touch-icon.png` (180) | iOS / iPadOS | **opaco, sem alfa**, sem cantos arredondados — a máscara é do SO |
| `android-chrome-192/512.png` | instalação, splash, lista de apps | `purpose: any`, símbolo a 88% do lado |
| `maskable-192/512.png` | launcher Android | `purpose: maskable`, símbolo a 70% |
| `safari-pinned-tab.svg` | aba fixada do Safari | silhueta preta sobre transparente |
| `og-image.png` (1200×630) | prévia de link | símbolo centrado sobre `--bg` |

`site.webmanifest` declara `background_color` e `theme_color` ambos em `--bg`: a
splash nasce da cor de fundo do jogo, sem emenda na abertura.

**Correção óptica de tamanho pequeno.** De 48px para baixo a haste do `!`
engrossa: ali ela mede pouco mais de um pixel e sumiria. É adaptação de
legibilidade, não uma segunda marca. O **pingo não desce mais** — o vão entre
haste e pingo é aberto na própria marca (§1.1), e empurrar o pingo no raster só
servia para tampar defeito de geometria.

**O conjunto tem que chegar no jogo.** O script copia para `public/` com os nomes
que o manifest declara, e `src/sincronia-dos-icones.test.ts` compara os dois
lados byte a byte. Isto existe porque `public/` já ficou uma geração inteira
atrás do design system, em silêncio, e refinar a marca não mudava nada no
produto.

---

## 2. Cores

### 2.1 Base (neutra)

| Token | Hex | OKLCH (aprox.) | Uso |
| --- | --- | --- | --- |
| `--bg` | `#0a0a08` | `oklch(0.15 0.005 95)` | Fundo do jogo — preto carvão, quase preto |
| `--surface` | `#171712` | `oklch(0.22 0.006 95)` | Superfície discreta: pílula de link, player, overlay, input |
| `--surface-2` | `#1f1f18` | `oklch(0.26 0.006 95)` | Segunda elevação — usar raramente |
| `--fg` | `#f5f3ea` | `oklch(0.96 0.01 95)` | Texto e preenchimento de métrica |
| `--muted` | `#93917f` | `oklch(0.63 0.015 95)` | Comentário do juiz, rótulos, metadados |
| `--border` | `#2b2a22` | `oklch(0.27 0.01 95)` | Divisores discretos, nunca decorativos |

### 2.2 Accent e o orçamento do verde

| Token | Hex | Uso |
| --- | --- | --- |
| `--accent` | `#c6ff00` | Verde ácido elétrico |
| `--accent-strong` | `#a8d900` | Hover/active de superfícies em `--accent` (L −0.08) |
| `--accent-on` | `#0a0a08` | Texto/ícone sobre `--accent` — sempre carvão, nunca branco |

**Regra dura: no máximo 2 aparições simultâneas do accent**, nesta ordem de
prioridade:

1. **A Bolha, quando está viva** (gravando);
2. **O Auê Score**, no momento em que ele é o assunto;
3. **O CTA primário.**

O accent **nunca** aparece no wordmark, na barra de métrica, na pílula de link,
no player nem em qualquer superfície de inventário. Tudo o mais é `--fg`,
`--muted` ou `--border` — mesmo quando o verde "ficaria bonito".

### 2.3 Semânticos

| Token | Hex | Uso |
| --- | --- | --- |
| `--gold` | `#f4c430` | Vitória, aviso de tempo esgotando, provocação do `INCOMING` |
| `--gold-strong` | `#d9ac1c` | Hover/active sobre `--gold` |
| `--danger` | `#ff3d3f` | Erro técnico real (mic bloqueado, sem áudio, falha de envio) |
| `--danger-strong` | `#e11a1c` | Hover/active sobre `--danger` |

**Derrota nunca é `--danger`.** No placar, o perdedor mantém `--fg`; a Bolha em
`defeat` vai para `--surface`/`--border`. Perder é piada, não falha de sistema.

### 2.4 Derivação

Toda derivação é `color-mix(in oklch, …)` sobre os tokens acima. **Nunca hex
novo.**

| Token | Fórmula | Uso |
| --- | --- | --- |
| `--accent-soft` | `color-mix(in oklch, var(--accent) 14%, transparent)` | Estado selecionado, realce discreto |
| `--fg-soft` | `color-mix(in oklch, var(--fg) 6%, transparent)` | Separação sem borda |
| `--page-bg` | `color-mix(in oklch, var(--bg) 60%, black)` | Área fora do shell no desktop |
| `--overlay-scrim` | `color-mix(in oklch, var(--bg) 94%, transparent)` + `blur(2px)` | Fundo de overlay |

Os preenchimentos da Bolha (§7.3) também são `color-mix` — nunca cores novas.

### 2.5 Contraste

Todo par texto/fundo é obrigatório e **não pode regredir** em hover/focus/active:
normal ≥ 4.5:1, texto grande e ícone ≥ 3:1. `--fg` sobre `--bg`/`--surface`
≈ 15:1. `--accent-on` sobre `--accent` ≈ 15:1. `--bg` sobre `--gold` ≈ 9:1.
`--fg` sobre `--danger` ≈ 3.9:1 → em texto normal sobre `--danger`, usar `--bg`.

---

## 3. Tipografia

| Papel | Família | Fallbacks | Pesos |
| --- | --- | --- | --- |
| Display | **Anton** | Archivo Black, Impact, system-ui, sans-serif | 400 (mono-peso por design) |
| Interface | **Archivo** | Archivo Narrow, Inter, system-ui, -apple-system, Segoe UI, Arial, sans-serif | 400, 500, 600, 700 |
| Mono | `ui-monospace` | JetBrains Mono, SF Mono, Menlo, monospace | 400, 600 |

**Interface é Archivo, não Inter.** Inter permanece no stack apenas como fallback
tardio — qualquer artefato onde `--font-body` comece com Inter está errado.

A pista mono é restrita: eyebrow, contador, código de convite, link do X1,
timestamp. **Nunca corpo de texto.**

Display é usado exclusivamente para: Auê Score, fala principal do juiz, nome no
placar VS, contagem da revanche, item de menu, wordmark. Interface é usada para:
rótulos, métricas, instruções, corpo, botões.

### 3.1 Escala Display (Anton, tracking ~0, line-height apertado)

| Token | Tamanho | LH | Uso |
| --- | --- | --- | --- |
| `--text-display-2xl` | `clamp(60px, 19vw, 92px)` | 0.90 | Auê Score em `RESULT_REVEAL` |
| `--text-display-xl` | `clamp(48px, 15vw, 64px)` | 0.95 | Auê Score em `RESULT` |
| `--text-display-lg` | `clamp(36px, 11vw, 48px)` | 1.0 | Auê Score nos estados de X1; score de cada lado no VS |
| `--text-display-md` | `clamp(30px, 9vw, 38px)` | 1.02 | Fala principal do juiz (`.shout`) |
| `--text-display-sm` | 22–26px | 1.1 | Wordmark, item de menu |

O rótulo do botão primário também é display — 21px, peso 700, caixa alta,
tracking +2% (§6.1). Não tem token próprio: é declarado direto no componente.

Os corpos do score são escolhidos para caber no diâmetro da Bolha **com folga,
inclusive em `100`** — ver §9.2.

`text-wrap: balance` em todo título display. `font-variant-numeric: tabular-nums`
em todo número que muda no lugar (score, cronômetro, métrica, contagem).

### 3.2 Escala Interface (Archivo)

| Token | Tamanho | LH | Peso | Uso |
| --- | --- | --- | --- | --- |
| `--text-body-lg` | 20px | 1.2 | 700, uppercase | Rótulo de ação fora do CTA primário |
| `--text-body-md` | 16px | 1.45 | 400/600 | Corpo, pílula de origem |
| `--text-body-sm` | 15px | 1.45 | 400/600 | Comentário do juiz, linha de placar, botão fantasma |
| `--text-body-xs` | 13px | 1.4 | 400/600 | Rótulo de métrica, dica, cabeçalho do player |
| `--text-caption` | 11–12px | 1.4 | 700, uppercase, tracking +10–14% | Eyebrow do score, botão copiar, metadados |

Mínimos: corpo ≥ 13px em mobile, nunca abaixo. `text-wrap: pretty` em
parágrafos; `max-width: 30ch` no comentário do juiz. **Nenhuma linha final pode
terminar com 1–2 caracteres órfãos** — ajustar container antes de mexer no
tamanho.

---

## 4. Espaçamento, raio e alvo

### 4.1 Grid de espaçamento (base 8px)

`--space-1: 4px` · `--space-2: 8px` · `--space-3: 12px` · `--space-4: 16px` ·
`--space-5: 24px` · `--space-6: 32px` · `--space-7: 40px` · `--space-8: 48px`

Densidade baixa por padrão: margem lateral do shell = `--space-5` (24px), respiro
vertical entre blocos ≥ `--space-4`.

### 4.2 Raio

| Token | Valor | Uso |
| --- | --- | --- |
| `--radius-sm` | 12px | Chips, badges |
| `--radius-md` | 18px | Input, célula, caixa, **botão primário** |
| `--radius-lg` | 24px | Raio padrão de superfícies — overlay, sheet, banner |
| `--radius-shell` | 32px | Shell do jogo no desktop (só ali) |
| `--radius-full` | 999px | Pílula de link, pílula de utilidade, pílula de origem, player, avatar, indicador, barra de métrica |

O botão primário **saiu do `--radius-full`**. Pílula é forma de formulário; o CTA
da Arena é peça de jogo e usa `--radius-md`. As pílulas que sobraram na lista são
as de utilidade e de conteúdo — essas continuam pílula.

### 4.3 Alvo de toque

Mínimo **44×44px** para qualquer elemento tocável. Botão primário: altura mínima
**60px**. Pílula de origem: altura mínima **56px**. Pílulas de utilidade: altura
56px com controle interno de 44px.

### 4.4 Elevação

Sem gradiente e sem glow decorativo. Sombra apenas funcional:
`--shadow-sheet: 0 -8px 24px rgba(0,0,0,.45)` ·
`--shadow-modal: 0 12px 32px rgba(0,0,0,.5)` ·
`--shadow-shell: 0 40px 90px -24px rgba(0,0,0,.65)` (só o shell no desktop).

---

## 5. Estados interativos

Todo elemento focável tem `:focus-visible` com anel **2px `--accent`, offset
2px**, sem `border-radius` forçado — o anel acompanha a forma do elemento, então
pílula ganha anel de pílula.

| Estado | Regra |
| --- | --- |
| Default | Token base do componente |
| Hover | Desloca L do OKLCH em ±0.06–0.12 (superfícies escuras clareiam; `--accent`/`--gold`/`--danger` escurecem para `-strong`). Em contorno, a promoção é `--border` → `--fg` na borda **e** `--muted` → `--fg` no texto. Nunca aproximar o texto do `--muted`. |
| Focus-visible | Anel 2px `--accent`, offset 2px, mantendo o foreground do default |
| Active | `transform: scale(.97)` + token de hover, `--duration-fast`. **Botão** cede em vez de piscar: `translateY(2px) scale(.985)`, `--duration-instant`, e o transform começa no toque — nunca depois da lógica |
| Disabled | **Único** estado autorizado a reduzir contraste: 40% de opacidade, forma preservada |
| Selected | Borda `--accent` 1px + texto `--fg` (opcionalmente fundo `--accent-soft`) — nunca `--muted` |

Botão sólido inverte fundo **e** texto na mesma regra: default
`--accent`/`--accent-on`; hover `--accent-strong`/`--accent-on`. O foreground
nunca muda sozinho.

---

## 6. Botões e ações

### 6.1 Tipos

- **Primário** — caixa de raio moderado (`--radius-md`), altura mínima 60px,
  fundo `--accent`, texto `--accent-on`, família **display**, peso 700, 21px,
  tracking +2%, caixa alta.
  Ex.: `Arrotar`, `Chamar pro X1`, `Aceitar o X1`, `Mandar pro infeliz`,
  `Revanche`, `Ver o estrago`.
  **Era pílula de 56px em Archivo 19px.** Mudou porque a pílula dava cara de
  formulário: o CTA é a peça que a pessoa aperta pra jogar, e peça de jogo tem
  corpo, peso e tipografia de título. A pressão também mudou junto — `:active`
  é `translateY(2px) scale(.985)`, o botão cede em vez de piscar (§5).
- **Contorno** — borda 1px `--border`, fundo transparente, texto `--fg`. Hover
  promove a borda para `--fg` **e** dá fundo `--surface`.
  Ex.: `Parar`, `Jogar no grupo`, `Ver meu X1`, `Cutucar de novo`.
- **Fantasma** — só texto, altura mínima 44px, 15px peso 600, `--muted` → `--fg`
  no hover (nunca o inverso). Ex.: `Mandar outro`, `Amarelar`, `Desisto`,
  `Deixa empatado`.

**Caixa é do CSS, não do texto.** Os rótulos são escritos em caixa de frase
(`'Chamar pro X1'`) e a classe `.btn` aplica `text-transform: uppercase`. Um
rótulo escrito já em maiúsculas no código é bug de origem — quebra leitores de
tela e impede mudar a regra de caixa num lugar só.

### 6.2 Economia de ação

- **Um único botão primário por estado.** Sempre.
- Nunca 3+ CTAs com o mesmo peso visual.
- **Dupla de ações:** quando primário e contorno dividem a linha, ambos caem para
  16px e tracking +2%. A linha usa `grid-auto-flow: column`, para que um botão
  sozinho ocupe a largura inteira — nunca sobra meia-largura órfã. Se nenhum
  botão está visível, a linha some (sem gap fantasma).
- Com X1 pendente, o `IDLE` ganha um CTA **em contorno** acima do `Arrotar`:
  `Ver meu X1`, ou `Ver o X1 contra <nome>` quando já há resposta. Continua
  havendo um só sólido — arrotar segue sendo a ação primária.
- **Dupla de ações do `RESULT`:** `Chamar pro X1` sólido + `Jogar no grupo` em
  contorno. Quando os dois estão visíveis, ambos caem para 16px; quando só um
  está, ele ocupa a linha inteira.
- O CTA primário da Arena carrega um anel de accent permanente (2px, offset 2px)
  **apenas quando é o botão sólido**. Nos estados em que ele vira contorno, o
  anel estouraria o teto de duas aparições do accent. Com o anel sempre aceso, o
  foco de teclado se distingue por 3px e offset 5px.

### 6.3 Pílula de utilidade

Família para tudo que é **ferramenta, não conteúdo**. Forma comum: altura 56px,
`--radius-full`, fundo `--surface`, borda 1px `--border`, **sem accent**.

- **Caixa de link** — link à esquerda (15px, peso 600, `--fg`, truncado com
  elipse) + botão `COPIAR` à direita (44px, caption uppercase, contorno). A
  confirmação troca o rótulo e promove cor/borda para `--fg` — **nunca vira
  verde**.
- **Player de replay** — botão circular de 44px à esquerda (play/pause), corpo
  com cabeçalho (rótulo `--muted` + duração tabular `--fg`) e a mesma barra de
  4px das métricas como progresso. **Nunca toca sozinho.**

### 6.4 Métricas (linha, não card)

Cada métrica é uma linha: rótulo (13px, `--muted`) + valor (13px, peso 600,
`--fg`, à direita, tabular) + barra de 4px abaixo (trilho `--border`,
`--radius-full`, preenchimento **`--fg`**, transição de largura em
`--duration-slow` `--easing-decelerate`).

Ordem fixa: **Força · Fôlego · Grave**. Rótulos de rua, nunca de laudo. O
preenchimento é `--fg` e não `--accent` porque nesse momento o verde já está no
score — usar accent aqui estoura o orçamento de §2.2.

**Eram quatro.** `Sujeira` saiu da tela quando o motor v2 zerou o peso da
textura: mostrar barra para um número que não conta é dizer que ele conta.
`Estouro` virou `Força` porque é o que a pessoa entende sem traduzir.

**Nunca três cards independentes.**

### 6.5 Pílulas de origem

`Cerveja · Refri · Comida · Ar` — quatro pílulas de 44px numa linha, na
cascata do `RESULT`, **depois da nota**. Um toque resolve, colapsa para uma linha
discreta e **nunca bloqueia nenhum CTA**. Se o jogador ignorar, o jogo segue.

### 6.6 Gameplay não usa card

Nada no fluxo de jogo é um card com borda e sombra. O palco é `--bg` puro, a
informação é hierarquia tipográfica e a separação, quando necessária, é um filete
`--border` de 1px. Card, tab, breadcrumb, lista de configurações e qualquer
gramática de app tradicional estão fora da Arena.

---

## 7. Bolha Auê — elemento vivo central

A Bolha é a assinatura do produto e o corpo do jogo. **Se ela aparece, ela está
dizendo algo.**

### 7.1 Geometria

Blob orgânico de **N pontos de controle** distribuídos num círculo de raio `R`,
cada um deslocado radialmente por ruído, conectados por curva suave (Catmull-Rom
→ Bézier cúbica fechada) em SVG. **Nunca é um círculo perfeito**, nem em repouso.

```
Para i em [0, N):
  θ_i     = i · (2π / N)
  raio_i  = R + amplitude · noise(θ_i, t, seed)
  ponto_i = (cos θ_i · raio_i,  sin θ_i · raio_i · (1 + drive · 0.06))
path = smoothClosedCurve(pontos)
```

Ruído de referência (implementado em `arena.html`) — soma de três senóides
normalizada, determinística, sem dependência externa:

```
noise(a,t,seed) = ( sin(a·3 + t·0.90 + seed·5)·0.50
                  + sin(a·5 − t·1.30 + seed·9)·0.32
                  + sin(a·2 + t·0.55 + seed·3)·0.40 ) / 1.22
```

- Viewport do SVG `-160 -160 320 320`, `overflow: visible`, container com
  `aspect-ratio: 1`.
- Suavização: `lerp` de 0.14 por frame em `amp` e `points`. A Bolha **responde,
  não treme**.

### 7.2 Entradas de áudio

Quatro sinais normalizados 0–1, lidos do motor de áudio:

| Sinal | Propriedade | Efeito |
| --- | --- | --- |
| **Grave** (baixa frequência) | `drive` | Alonga o eixo vertical — a forma fica pesada |
| **Estouro** (pico) | escala e amplitude instantânea | Envelope multiplica a amplitude; expande até ~135% do raio |
| **Fôlego** (duração) | piso de escala acumulado | `pisoExtra = min(0.15, 0.02 · segundos)` |
| **Sujeira** (alta frequência) | irregularidade | `amp = 6px + 34px · sujeira`; `N = round(3 + 6 · sujeira)` |

Atualização a 60fps. **Na implementação real o envelope vem do motor de áudio
(RMS por frame do `AnalyserNode`)** — no protótipo ele é sintetizado. É o único
ponto que precisa ser trocado por dado real para a Bolha ficar honesta.

### 7.3 Modos

Treze modos, todos com preenchimento derivado por `color-mix` — nunca cor nova,
nunca gradiente.

| Modo | Momento | `amp` | `N` | Escala | Preenchimento | Contorno |
| --- | --- | --- | --- | --- | --- | --- |
| `idle` | `IDLE` — esperando | 8 | 5 | 1.00 | `accent 8% + surface-2` | `--border` |
| `asking` | `MIC_PENDING` — pedindo permissão | 6 | 6 | 0.94 | `--surface-2` | `--fg` |
| `recording` | `RECORDING` — viva | 34 (dirigida) | 8 | 1.16 | `--accent` | `--accent` |
| `holding` | fim da gravação, segurando o ar | 6 | 5 | 0.86 | `accent 40% + bg` | `--border` |
| `checking` | `VALIDATING` — conferindo | 11 | 9 | 0.90 | `accent 16% + bg` | `--fg` |
| `judging` | `JUDGING` — deliberando | 15 | 7 | 0.82 | `accent 26% + bg` | `--border` |
| `cradle` | **segurando a nota** | 7 | 6 | 1.00 | `accent 13% + surface-2` | `accent 30% + border` |
| `waiting` | X1 mandado, ninguém aceitou | 5 | 6 | 1.00 | `accent 8% + surface-2` | `--border` |
| `playing` | replay de um arroto | 26 (dirigida) | 8 | 1.06 | `accent 22% + bg` | `--border` |
| `flat` | `NO_SOUND` — não veio nada | 2 | 4 | 0.70 | `--surface` | `--border` |
| `dead` | `CHALLENGE_EXPIRED` — acabou | 3 | 5 | 0.78 | `--bg` | `--border` |
| `victory` | venceu | 13 | 6 | 1.12 | `gold 18% + bg` | `--gold` |
| `defeat` | perdeu | 7 | 5 | 0.90 | `--surface` | `--border` |

Notas de intenção, porque as escalas parecem arbitrárias e não são:

- **`cradle` e `waiting` são os modos-recipiente.** Escala 1 e amplitude baixa
  **não são estilo, são requisito**: o número mora dentro da Bolha e a ondulação
  não pode empurrá-lo para fora.
- `playing` é `recording` em tom mais baixo — mesma agitação, accent diluído. É
  lembrança, não o ao vivo.
- `waiting` quase não se move: vivo, mas sem resposta. A espera precisa parecer
  espera.
- `flat` e `dead` colapsam sem virar erro: o corpo desiste, a cor não acusa.
- `defeat` não usa `--danger`. Derrota não é erro.

### 7.4 O que a Bolha não é

Não é waveform tradicional. Não usa gradiente nem glow. Não é decoração. Não é o
símbolo de marca (§1.3).

`prefers-reduced-motion`: `amp = 0` (a forma vira um círculo estável), sem
oscilação nem shake, mantendo transição de escala e cor. A informação permanece
100% legível por cor + rótulo textual — **nunca só por movimento**.

---

## 8. HUD

O HUD **não é navegação**. São três coisas e só três: wordmark à esquerda, marca
de X1 aberto (quando existe) e botão de menu à direita (44px, `--muted` →
`--fg`). Altura fixa de 56px.

**O HUD desaparece durante a partida** (`opacity: 0`) nos estados
`RECORDING`, `VALIDATING`, `JUDGING`, `RESULT_REVEAL` e `REMATCH` — nada compete
com o momento.

**Não existe bottom navigation.** Não existe tab bar, drawer, breadcrumb nem
qualquer destino paralelo. **Menus ficam fora do fluxo principal:** "Como
funciona", "Privacidade" e "Termos" vivem dentro do menu como overlay (§11),
nunca como rota.

---

## 9. Auê Score

### 9.1 Formato

**Inteiro de 0 a 100, sem casa decimal.** `91`, nunca `91,4`. Casa decimal dá ar
de laudo e rouba leitura do número grande. **Ponto único de formatação:** `fmt()`
em `arena.html`.

A comparação do X1 usa a nota **arredondada, a mesma que está na tela**: se os
dois exibem `88`, é `DRAW`. Vencedor invisível por diferença decimal é bug.

O score é `--accent`, tabular, centralizado, e ocupa **25–40% da atenção** no
estado de resultado. Nunca dividir o score em partes menores.

### 9.2 A nota vive dentro da Bolha

A camada do score é **concêntrica** com a da Bolha. Nos estados de nota a Bolha
troca de papel: deixa de ser fundo e vira o corpo que segura o número (modo
`cradle`). Três consequências obrigatórias:

- A largura da Bolha é `min(<teto>, <vw>, var(--stage-h))` — o terceiro termo
  impede que ela vaze para o HUD ou para a faixa de reação em qualquer viewport.
  O diâmetro desenhado é ~74% dessa largura.
- O corpo do número é escolhido para caber nesse diâmetro **com folga, inclusive
  em `100`**: `clamp(60px,19vw,92px)` na revelação, `clamp(48px,15vw,64px)` no
  resultado, `clamp(36px,11vw,48px)` nos estados de X1.
- O eyebrow também mora dentro da Bolha, então é **curto por contrato**
  (*De pé*, *Salvo*, *Valendo*, *Tu mandou*) e trunca em 15ch.

### 9.3 Revelação

Primeira revelação: `pop` do score (560ms) + contagem de 0 ao valor em 900ms com
`easeOutCubic`. Da segunda revanche em diante o número aparece direto — teatro
repetido vira atraso. Com `prefers-reduced-motion`, sempre direto.

---

## 10. VS — X1, placar e revanche

X1, placar e revanche são **o mesmo sistema visual** do resto da Arena: mesma
grade, mesma Bolha, mesmos botões. Não são um módulo à parte.

### 10.1 Bloco VS

Dois blocos espelhados (score em `--text-display-lg` tabular, nome em 13px
truncado), separados por marca central em círculo `--surface` de 36px.

- **Vitória:** vencedor com score em `--gold` e nome em `--fg`; perdedor mantém
  `--fg`/`--muted` — **nunca `--danger`**.
- **Empate:** marca central vira `=` no lugar de `VS`, e **os dois lados ficam em
  `--fg`**. Empate não é vitória de ninguém.

### 10.2 Placar tocável

Cada linha do placar é um **botão que toca o arroto daquele competidor**: play
circular de 32px (contorno `--border`, `--muted` → `--fg` no hover) · nome
(`--fg` quando líder) · nota tabular à direita (`--gold` no líder) · barra de 2px
na base da linha durante a reprodução. Linhas separadas por `border-top: 1px
--border` (a primeira sem). Linha sem áudio fica `disabled` com o play a 40%.

Isso resolve o problema de a nota do adversário ser só um número: no placar ela
vira prova.

### 10.3 Origem dos nomes

**Nenhum nome é inventado pelo jogo.** Existem exatamente duas origens, as duas
digitação de alguém:

1. **Quem cria o X1 assina antes de mandar.** Ao tocar em `CHAMAR PRO X1`, se o
   jogador não tem nome, a assinatura abre. O nome vai embutido no link — é por
   isso que o amigo, ao abrir, lê "LUIZ METEU 91".
2. **Quem aceita assina antes de publicar.** Do lado do amigo, o nome é cobrado
   imediatamente antes de a nota entrar no placar. Mesma regra, momento
   simétrico.

Consequência obrigatória: enquanto ninguém aceitou, os estados de host
(`CHALLENGE_CREATED`, `WAITING_OPPONENT`, marca no HUD) **não exibem nome de
adversário** — adversário ainda não existe. O nome só aparece no evento de
chegada da resposta, junto com a nota. Quem recusa assinar joga como `Anônimo`,
**nunca** como um nome sorteado.

### 10.4 Compartilhamento

- **Link do X1** — pílula de utilidade (§6.3). O link é conteúdo, não decoração:
  é a prova de que existe partida esperando.
- **Banner de link (`og:image`)** — 1200×630, fundo `--bg`, wordmark em `--fg` à
  esquerda e link em mono `--muted` à direita; corpo em duas colunas separadas
  por filete de 1px: à esquerda a nota (`--accent`) com a reação, à direita a
  chamada `ENTRAR NO X1` em pílula `--accent`/`--accent-on`. **Exatamente duas
  aparições do accent.** Sem Bolha (ela é componente vivo; parada aqui vira
  decoração), sem gradiente, sem áudio, sem autoplay. Área de segurança de 5% em
  todos os lados. Sem score ainda? Rótulo `DESAFIO ABERTO` — nunca número
  inventado.
- **A reação exibida no banner é a mesma frase que o jogador leu no resultado.**
  Ela é guardada no estado da partida no momento da revelação e reutilizada.
  Sortear outra faz o produto soar como duas pessoas diferentes.

---

## 11. Overlays

Overlays são **camadas sobre a Arena, não estados**. Eles não trocam
`data-state`, não entram no histórico e não interrompem a partida.

| Overlay | Conteúdo | Regra |
| --- | --- | --- |
| **Menu** | Como funciona · Privacidade · Termos | Display 26px, divisores `--border`, hover → `--accent`. Único acesso a texto institucional. |
| **Assinatura** | Rótulo + score em Display, campo de 56px `--radius-full` `--surface` com borda que promove para `--accent` no foco, `maxlength` 14, CTA `MANDAR` + fantasma `MANDAR SEM NOME` | Enter confirma. O nome é persistido e **retroativo**. |
| **Compartilhar** | Alvos de envio + link copiável | A assinatura precisa poder pintar por cima deste. |

Forma comum: fundo `--overlay-scrim`, superfície `--surface` com `--radius-lg`,
`role="dialog"` `aria-modal="true"`, título associado, foco inicial no primeiro
controle, `Esc` fecha.

---

## 12. Estados da Arena

A Arena é **fullscreen e contínua**. Existe **uma** Arena — ela é o mesmo lugar
durante a partida inteira. O que muda é o estado do jogo, exposto em
`#arena[data-state]`. Elementos **entram, saem, mudam, reagem e se transformam**
dentro do mesmo palco. **Nada é remontado do zero.**

As camadas do palco são `grid-area: 1/1` empilhadas: trocar de estado **liga e
desliga camadas**, não substitui o palco.

A URL pode carregar um X1 (`aue.gg/x1/<code>`), mas isso **hidrata um estado** —
não navega para uma página nova.

### 12.1 Fluxo solo

| # | Estado | O que a Arena está dizendo | Saídas |
| --- | --- | --- | --- |
| 1 | `IDLE` | Bolha viva no centro, chamada curta, CTA `Arrotar` | `MIC_PENDING` · `RECORDING` |
| 2 | `MIC_PENDING` | Permissão pedida **dentro** da Arena, sem navegar. Bolha `asking` | `RECORDING` · `MIC_ERROR` · `IDLE` |
| 3 | `RECORDING` | Bolha reage ao áudio em tempo real, timer, CTA `Parar`. HUD oculto | `VALIDATING` (manual ou aos 10s) |
| 4 | `VALIDATING` | Checagem curta: veio som? parece arroto? HUD oculto | `NO_SOUND` · `NOT_A_BURP` · `JUDGING` |
| 5 | `NO_SOUND` | Nada válido. Bolha `flat`, reação curta, CTA `Tentar de novo` | `RECORDING` · `IDLE` |
| 6 | `NOT_A_BURP` | Veio áudio, não veio arroto. Provocação + replay do que foi mandado | `RECORDING` · `IDLE` |
| 7 | `JUDGING` | **Momento de jogo, não spinner.** HUD some, palco escurece, Bolha contrai | `RESULT_REVEAL` |
| 8 | `RESULT_REVEAL` | **Só a nota, dentro da Bolha.** Score contando + reação forte. Nada mais | `RESULT` (automático, ~1,5s) |
| 9 | `RESULT` | Score segue dentro da Bolha e dominante; replay, métricas e origem entram em cascata. CTA `Chamar pro X1` + `Jogar no grupo` ao lado, ghost `Mandar outro`. Dentro de um X1 já em curso o primário vira `Ver o estrago` | `CHALLENGE_CREATED` · `RECORDING` · `SCOREBOARD` |

**Caminho crítico: `Arrotar → Validar → Julgar → Nota`.** Não existe formulário,
seleção ou pergunta entre o arroto e o resultado. **A origem não bloqueia o
caminho até a nota** — ela entra depois, como último item da cascata do `RESULT`
(§6.5).

**`RESULT_REVEAL` prioriza exclusivamente a nota.** Nesse estado não existe HUD,
não existe métrica, não existe replay, não existe origem, não existe CTA. Só o
número dentro da Bolha e a reação. **Ações secundárias aparecem depois**, em
cascata, já no `RESULT`.

### 12.2 Fluxo X1

| # | Estado | O que a Arena está dizendo | Saídas |
| --- | --- | --- | --- |
| 10 | `CHALLENGE_CREATED` | Desafio existe, link disponível, CTA `Mandar pro infeliz`. Ainda não há adversário — e por isso não há nome nenhum na tela | `WAITING_OPPONENT` · `SHARE_ERROR` |
| 11 | `WAITING_OPPONENT` | "Ninguém aceitou ainda." Cutucar de novo, ouvir o próprio arroto, **sair sem perder o desafio**. Bolha `waiting` | `SCOREBOARD` · `DRAW` · `IDLE` (X1 preservado) |
| 12 | `INCOMING` | O amigo abriu o link. Nome e nota do provocador **vieram dentro do link**. Replay + provocação em `--gold`. CTA `Aceitar o X1`. **Não passa pela home** | `RECORDING` |
| 13 | `SCOREBOARD` | Comparação dos dois, vencedor evidente em `--gold`, placar tocável | `REMATCH` · `IDLE` |
| 14 | `DRAW` | Empate. **Não é vitória de ninguém**: os dois em `--fg`, marca `=` no lugar de `VS`. CTA `Revanche` | `REMATCH` · `IDLE` |
| 15 | `REMATCH` | Contagem 3·2·1 no palco e reinício da rodada entre os mesmos dois. HUD oculto | `RECORDING` |

Depois de aceitar:
`INCOMING → RECORDING → VALIDATING → JUDGING → RESULT_REVEAL → RESULT →
SCOREBOARD | DRAW`.

### 12.3 Estados de resiliência

**Erro e recuperação acontecem dentro da Arena.** Nenhum deles é página, modal de
sistema ou rota de erro.

| # | Estado | Regra inegociável |
| --- | --- | --- |
| 16 | `MIC_ERROR` | Permissão negada. Instrução concreta de como liberar, **sem culpar o jogador** |
| 17 | `SHARE_ERROR` | Falha de envio/upload **não apaga o resultado conquistado**: o score continua na tela, o link continua copiável, e há retentativa |
| 18 | `CHALLENGE_EXPIRED` | Desafio vencido. Bolha `dead`. Saída honesta: arrotar mesmo assim |
| 19 | `SESSION_RECOVERY` | Reabriu/recarregou com X1 aberto → volta ao estado correto da partida, **com a nota intacta** |

> `SHARE_ERROR` é o token canônico em `arena.html` para a falha de
> compartilhamento/upload. Se a implementação preferir `SHARE_UPLOAD_ERROR`, é o
> **mesmo estado** com outro nome — não criar dois.

### 12.4 A máquina tem 19 estados

`data-state` assume exatamente estes 19 valores. Não existe estado de anúncio, de
feed, de perfil, de ranking global, de conquista, de campeonato, de temporada nem
de assinatura. **`AD_BREAK` não faz parte da máquina de jogo** — ver §20.

### 12.5 Persistência

`localStorage["aue.arena.v3"]` guarda nota, métricas, reação, duração, link do
desafio, papel (`host`/`guest`), rival e origem — o suficiente para **recompor a
partida, nunca o estado visual**. `aue.arena.nome`, `aue.arena.jogou` e
`aue.arena.mic` guardam assinatura, reincidência e permissão.

**X1 aberto é chamada na entrada:** com desafio pendente, o `IDLE` mostra o CTA
em contorno acima do `Arrotar` mais a marca no HUD.

### 12.6 Regras da máquina

- Toda transição limpa tudo, e cada estado liga só o que usa — sem resíduo de
  estado anterior. Vale para faixas, timers, overlays e reprodução de áudio.
- Overlays não são estados (§11).
- Um botão fantasma que promete ação imediata entrega ação imediata:
  `Mandar outro` vai direto para `RECORDING`, não volta para `IDLE`.
- Depois de responder a um desafio, o payoff é o placar, não outro convite.

---

## 13. Motion

**Motion transmite estado e feedback. Nunca é decoração.** Se um movimento não
diz o que está acontecendo, ele sai.

### 13.1 Tokens

`--duration-instant: 100ms` · `--duration-fast: 160ms` · `--duration-base: 240ms`
· `--duration-slow: 400ms` · `--duration-reveal: 900ms`

`--easing-standard: cubic-bezier(.2,.8,.2,1)` ·
`--easing-decelerate: cubic-bezier(0,0,.2,1)` ·
`--easing-emphasize: cubic-bezier(.34,1.56,.64,1)`

### 13.2 Catálogo — cada movimento tem função

| Momento | Movimento | Duração | O que comunica |
| --- | --- | --- | --- |
| **Entrada na gravação** | `ring` — anel de accent expandindo do centro do palco | 720ms `--easing-decelerate` | A partida começou. É o disparo, não uma transição |
| **Bolha reagindo ao áudio** | amplitude e `drive` dirigidos pelo envelope de energia, `lerp` 0.14/frame | contínuo, 60fps | A Bolha **é** o VU meter — o jogador vê o próprio arroto |
| **Fim da gravação** | `snap` — esmaga a 0.8 e volta passando por 1.08 | 460ms `--easing-emphasize` | O corpo leva o baque antes de segurar o ar |
| **Validação** | `tick` — três batidas curtas de escala (1.06 / 0.95 / 1.04 / 0.97) | 900ms `--easing-standard` | **Alguém conferindo**, não carregando |
| **Julgamento** | contração lenta da Bolha + palco escurece + HUD some | ~1700ms | Suspense. É o loading do jogo, e é jogo |
| **Revelação da nota** | `pop` do score (escala .68 → 1.07 → 1) + contagem em `easeOutCubic` | 560ms + 900ms | **O número é o payoff.** Nada mais se move |
| **Vitória** | `winPop` — vencedor entra de .6 → 1.14 → 1 em `--gold` | 620ms `--easing-emphasize` | Vencedor evidente sem legenda |
| **Derrota** | `loseSag` — perdedor cai de −10px com opacidade baixa | 520ms `--easing-standard` | Perder tem peso, sem virar erro |
| **Empate** | `drawL` / `drawR` — os dois entram um contra o outro e param | 520ms `--easing-emphasize` | **Ninguém ganhou** — simetria é a informação |
| **Desafio recebido** | `enter` da provocação + replay do arroto do host, Bolha `holding` | 240ms + replay | O X1 chegou com prova junto |
| **Resposta do adversário** | `flash` do palco inteiro antes de trocar de estado | 620ms `--easing-standard` | O evento chegou agora — não estava lá antes |
| **Revanche** | contagem 3·2·1, cada número escalando de 1.7 → 1 → some | 620ms cada `--easing-standard` | Reinício ritualizado, mesmos dois |
| **Recusa** (sem som / não é arroto) | `shake` horizontal da Bolha ±7px | 340ms `--easing-standard` | Negativa corporal, antes de qualquer texto |

### 13.3 Regras gerais

- **Entrada padrão de bloco** (`.enter`): fade + `translateY(8px)` em
  `--duration-base` `--easing-standard`. Variante atrasada em 120ms para o
  segundo elemento de um par (fala → comentário).
- **Cascata do `RESULT`:** score → fala → comentário (+120ms) → replay →
  métricas (~780ms após o score) → origem. **Mostrar tudo de uma vez mata o
  payoff** — a ordem é requisito, não estilo.
- Toda troca de estado reanima a fala principal, mesmo com texto parecido — é o
  sinal de que algo mudou.
- O palco cede altura quando a faixa de reação enche, com transição de
  `grid-template-rows` em `--duration-slow`: o score **assenta** em vez de saltar
  de tamanho.
- Nunca gradiente. Nunca glow. A vivacidade vem de cor sólida + forma + timing.
- `prefers-reduced-motion` **neutraliza duração mantendo a informação completa**:
  o score aparece direto, a barra de replay anda em passos, a Bolha para de
  ondular, o `flash` e o `shake` não disparam. Nenhuma informação depende
  exclusivamente do movimento.

---

## 14. Feedback e voz

### 14.1 Estrutura da fala

Duas linhas, sempre: **fala principal** em Display (curta, uma frase, é o soco) e
**comentário** em `--text-body-sm` `--muted`, máx. 30ch (é a cutucada). A
principal reage; o comentário provoca a próxima ação.

### 14.2 Rótulo de botão é contrato

O texto de um botão **nunca varia**. `Arrotar` é sempre `Arrotar`. Se o rótulo
muda entre sessões, o jogador perde o mapa. Toda a variação acontece na fala —
nunca na ação.

### 14.3 Fala varia, e não se repete

Provocação, reação e comentário saem de **pools por momento**. A primeira vez
entrega o item 0 (a piada canônica daquele momento); as seguintes sorteiam **sem
repetir a anterior**.

Momentos com pool próprio: chamada de estreia, chamada de retorno, gravando,
validando, julgando, resultado (reação + comentário), sem som, não é arroto,
desafio criado, espera, desafio recebido, vitória, derrota, empate, assinatura,
compartilhamento, erro.

### 14.4 Reação por faixa de nota

A reação ao resultado é escolhida pela faixa do Auê Score, com pool próprio em
cada faixa: <20 · 20–40 · 40–60 · 60–75 · 75–85 · 85–95 · 95–100. O comentário do
juiz usa quatro bandas mais largas, para não soar como duas frases dizendo a
mesma coisa.

### 14.5 Onde o humor entra

Nos pontos de payoff: resultado, derrota, empate, erro, compartilhamento. **Não**
em rótulo de campo, **não** em rótulo de métrica, **não** em mensagem técnica.
Palavrão é permitido e faz parte do tom — como pontuação, não como recheio.

### 14.6 Vocabulário

**Usar:** Arrotar · Já foi · Auê Score · X1 · Revanche · Mandar · Arena ·
Placar · Força/Fôlego/Grave.

`Estouro` virou `Força` e `Sujeira` saiu da tela: o motor v2 zerou o peso da
textura na conta, e barra para número que não pesa é dashboard mentindo. O
número continua no contrato e no banco — quem saiu foi a barra, não o dado.

**Evitar:** DESAFIAR (substituído por X1) · "tela de X" para momentos de partida
· jargão técnico (RMS, baseline, amplitude) · rótulos de laudo nas métricas
(Profundidade/Potência/Duração/Textura) · linguagem de dashboard · onboarding
explicativo · piada em todo label.

---

## 15. Erros e recuperação

Todo erro é um **estado da Arena** (§12.3), com o mesmo palco, a mesma Bolha e a
mesma faixa de ação. Nunca uma página, nunca um modal de sistema como primeira
impressão.

| Situação | Tratamento |
| --- | --- |
| Microfone ainda não pedido | `MIC_PENDING` — o jogo pede com voz própria **antes** do diálogo do SO |
| Permissão negada | `MIC_ERROR` — instrução concreta de como liberar, sem culpar o jogador |
| Nenhum som | `NO_SOUND` — Bolha `flat` + `shake`, CTA `Tentar de novo` |
| Não é arroto | `NOT_A_BURP` — provocação + replay do que foi mandado |
| Falha de envio/upload | `SHARE_ERROR` — **o resultado permanece**: score na tela, link copiável, retentativa |
| Desafio vencido | `CHALLENGE_EXPIRED` — Bolha `dead`, saída honesta |
| Recarregou com X1 aberto | `SESSION_RECOVERY` — volta ao estado correto, nota intacta |
| Sem internet | Faixa neutra em `--surface-2` e `--muted` — **não é erro**, o arroto continua funcionando e sincroniza depois. Nunca bloqueia a gravação |

`--danger` só aparece em falha técnica real. **Derrota, empate e nota baixa nunca
usam `--danger`.**

### 15.1 Limite de gravação

Máximo de **10s**. Cronômetro em Display `--accent`, tabular. Aos 8s vira
`--gold` — aviso, não erro. Aos 10s o estado avança sozinho para `VALIDATING`. A
duração real capturada alimenta o player de replay — **nunca exibir duração
inventada**.

---

## 16. Layout mobile

**Mobile-first, 360–430px, uma mão.** A Arena é fullscreen e contínua:
`100dvh`/`100svh` com `env(safe-area-inset-*)`, `overscroll-behavior: none` — o
jogo não é uma página.

### 16.1 Grade fixa de 4 faixas

Idêntica em todos os estados:

```
┌───────────────────────────────┐
│ HUD      wordmark · X1 · ☰    │  56px — some em RECORDING, VALIDATING,
├───────────────────────────────┤         JUDGING, RESULT_REVEAL, REMATCH
│                               │
│ PALCO    Bolha+Score | VS      │  minmax(0, var(--stage-h))
│          | Contagem            │  cede altura quando a reação enche
├───────────────────────────────┤
│ REAÇÃO   grito · comentário    │  1fr — timer, player, métricas, origem,
│          · timer · métricas    │  link, placar
├───────────────────────────────┤
│ AÇÃO     1 CTA + 1 ghost       │  auto — uma ação principal por estado
└───────────────────────────────┘
```

`--stage-h` padrão: `clamp(228px, 38svh, 308px)`. Por estado:
`RESULT` `clamp(168px,24svh,200px)` · `SCOREBOARD`/`DRAW`
`clamp(148px,23svh,196px)` · estados de X1 e resiliência
`clamp(158px,25svh,200px)`.

**A faixa de ação nunca sai do lugar entre estados** — o polegar aprende um alvo
só. Em `max-height: 720px` o palco encolhe um degrau e os respiros da reação
caem; o conteúdo não encolhe. A zona de reação tem `overflow-y: auto` apenas como
rede de segurança.

### 16.2 Desktop

Shell centralizado de **440px**, `--radius-shell` 32px, borda 1px `--border`,
`--shadow-shell`, sobre `--page-bg`. **É o mesmo jogo, não uma versão esticada** —
não expandir componentes só porque há espaço. Navegação por teclado obrigatória:
ordem de tab lógica, `:focus-visible` sempre visível, `Esc` fecha overlay.

### 16.3 Verificação obrigatória

Sem rolagem horizontal em **360, 390, 430 e 600px**. Sem corte vertical em
alturas de **640, 720, 844 e 932px**. Score legível e inteiro dentro da Bolha em
todas elas, inclusive com valor `100`.

---

## 17. Acessibilidade

- Contraste mínimo 4.5:1 (normal) / 3:1 (grande e ícone) **em todos os estados**,
  incluindo hover, focus e active. `disabled` é a única exceção.
- **Nunca depender só de cor:** o vencedor tem posição e movimento além do
  dourado; o empate tem a marca `=` além da simetria de cor; o erro tem texto
  além do vermelho.
- A faixa de reação é `aria-live="polite"` — cada troca de estado é anunciada. O
  cronômetro é `aria-live="off"`, para não tagarelar a cada décimo.
- Overlays são `role="dialog"` `aria-modal="true"`, com título associado, foco
  inicial no primeiro controle e `Esc` para fechar.
- Toda linha tocável de placar tem `aria-label` explicando o que ela toca.
- Alvo mínimo 44px. `:focus-visible` em todo elemento focável.
- `prefers-reduced-motion` respeitado em toda animação, **sem perda de
  informação** (§13.3).

---

## 18. O que NÃO fazer

- Não criar rota, página ou tela para um estado de jogo.
- Não escrever "tela de X" para momentos de partida.
- Não colocar navegação, tab bar ou bottom navigation em lugar nenhum.
- Não usar card, breadcrumb ou gramática de app tradicional no gameplay.
- Não colocar nada além da nota em `RESULT_REVEAL`.
- Não bloquear o caminho até a nota com origem, formulário ou pergunta.
- Não exibir o Auê Score com casa decimal.
- Não deixar a ondulação da Bolha empurrar o número para fora.
- Não passar de 2 aparições do accent por estado.
- Não pintar de verde o wordmark, a barra de métrica, a pílula de link ou o
  player.
- Não usar mais de um CTA primário por estado.
- Não tratar derrota, empate ou nota baixa como erro (`--danger` é técnico).
- Não usar Inter como primeira família de interface; não usar Inter/Roboto/Arial
  como display.
- Não usar waveform tradicional como elemento principal.
- Não usar gradiente ou glow em nenhum artefato.
- Não usar motion decorativo — se não comunica estado, sai.
- Não variar o rótulo de um botão entre sessões.
- Não inventar nome de jogador, nota, duração ou métrica.
- Não reintroduzir feed, perfil social, seguidores, comunidade, ranking global,
  conquistas, campeonatos, temporadas ou assinatura (§19).

---

## 19. Fora do Design System

Os itens abaixo **não existem no produto** e foram removidos deste Design System.
Não são legado, não são referência futura e não devem ser reintroduzidos "por
compatibilidade":

feed · perfil social · seguidores · comunidade · ranking global · conquistas ·
campeonatos · temporadas · assinatura · bottom navigation · roadmap futuro ·
XP e níveis · pódio · superfícies estendidas · navegação tradicional de app.

Se um documento, protótipo ou artefato descrever qualquer um deles como parte do
Auê!, ele é obsoleto — corrigir ou apagar, nunca portar.

**Landing, termos e privacidade continuam sendo páginas** e vivem fora da Arena.
Elas não são estados e não seguem a grade de §16.1.

`/como-jogar` e `/como-arrotar` são páginas públicas de conteúdo (SEO, sem gate
de desktop) e seguem a mesma família visual `desktop-*` da landing —
topbar, eyebrow, pílula, cabeçalho de seção, CTA final e rodapé — via
`LayoutPublico` (`src/features/publico/LayoutPublico.tsx`), responsiva até
375px. `/termos` e `/privacidade` continuam na moldura sóbria de `LayoutLegal`,
de propósito: documento legal não carrega a mesma pegada de divulgação.

---

## 20. Integração futura, opcional — anúncios

O jogo é gratuito, então publicidade é uma possibilidade comercial — mas
**não é parte estrutural do gameplay e não é um estado da máquina de jogo**.
`AD_BREAK` foi removido de §12.

Se e quando anúncios existirem, valem três limites:

1. Só **entre rodadas** — depois do placar, antes da revanche.
2. **Nunca** entre o pedido de microfone e a nota. Do `MIC_PENDING` ao `RESULT` o
   jogador está jogando, e a nota é o produto: ela não divide a tela com anúncio.
3. Integração é camada externa, não muda a grade de §16.1 nem cria estado novo. A
   máquina continua com 19 estados.

Nenhum protótipo, artefato ou spec deste sistema deve tratar inventário
publicitário como requisito de gameplay.

---

## 21. Contrato de implementação

1. Portar `arena.html` como **um** componente com máquina de estados. Nenhuma
   rota por estado.
2. Trocar a simulação por real: `getUserMedia` + `AnalyserNode` (envelope da
   Bolha e detecção de silêncio), classificador de arroto, scoring no backend.
3. Preservar a ordem da cascata do `RESULT` (§13.3).
4. Preservar a regra do `SHARE_ERROR`: falha de rede nunca destrói resultado.
5. Preservar `SESSION_RECOVERY`: recarregar não perde partida.
6. Preservar a origem dos nomes (§10.3). Nome sorteado ou pré-preenchido pelo
   jogo é bug.
7. Não introduzir nada de §19.
8. Verificar os viewports de §16.3.
