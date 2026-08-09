# Design system do Auê

**A fonte destes tokens é
[`prototipo-arena/arena.html`](prototipo-arena/arena.html).** Ele é o protótipo
canônico da Arena e o que vale quando houver divergência. Este documento existe
para não obrigar ninguém a ler CSS para saber o valor de um espaçamento.

O kit de marca em [`design-system/`](design-system/) continua sendo a fonte de
logo, símbolo e paleta estendida — subordinado ao protótipo.

---

## 1. Tokens

### Cor

```css
--bg:          #0a0a08;   /* fundo da Arena */
--surface:     #171712;   /* pílulas, campos, marcas */
--surface-2:   #1f1f18;   /* Bolha em repouso */
--fg:          #f5f3ea;   /* texto */
--muted:       #93917f;   /* apoio, rótulo, desativado */
--border:      #2b2a22;   /* linha, contorno */
--accent:      #c6ff00;   /* o verde do jogo */
--accent-strong: #a8d900;  /* accent pressionado */
--accent-on:   #0a0a08;   /* texto sobre accent */
--gold:        #f4c430;   /* vencedor, líder, aviso de tempo */
```

**Teto do verde: duas aparições por estado.** O accent é reservado aos sinais
vivos do jogo — a Bolha ativa, o Auê Score e o CTA principal. Se ele aparecer em
tudo, para de significar alguma coisa. Por isso o "!" do wordmark, a linha do
link e o player não usam accent.

O ouro do pódio (`--gold`) está fora da paleta registrada da marca. É deliberado:
vitória precisa de uma cor que não seja a cor do jogo inteiro.

### Tipografia

```css
--font-display: 'Anton', 'Archivo Black', Impact, system-ui, sans-serif;
--font-body:    'Archivo', 'Archivo Narrow', 'Inter', system-ui, …;
```

- **Display (Anton)** — wordmark, Auê Score, frase de reação, notas do VS, itens
  de menu. É a voz gritada.
- **Interface (Archivo)** — todo o resto. Grotesca esportiva, ombro reto, sem
  cara de fonte de sistema. Inter só sobra como fallback de emergência.

Números que mudam na tela usam `font-variant-numeric: tabular-nums`, sempre.
Score contando, cronômetro e placar não podem tremer de largura.

> **Delta conhecido:** `src/index.css` usa Inter como `--font-body`. O protótipo
> usa Archivo. Está no [backlog](../escopo/BACKLOG.md).

### Espaço e raio

```css
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
--space-5: 24px;  --space-6: 32px;  --space-7: 40px;  --space-8: 48px;

--radius-sm: 12px;  --radius-lg: 24px;  --radius-full: 999px;
```

### Movimento

```css
--duration-instant: 100ms;  --duration-fast:   160ms;  --duration-base:   240ms;
--duration-slow:    400ms;  --duration-reveal: 900ms;

--easing-standard:   cubic-bezier(.2,.8,.2,1);
--easing-decelerate: cubic-bezier(0,0,.2,1);
--easing-emphasize:  cubic-bezier(.34,1.56,.64,1);
```

`--duration-reveal` é o tempo da contagem do score. É o único momento longo do
jogo, e é longo de propósito.

**`prefers-reduced-motion` não é opcional.** Com ele ligado: a Bolha para de
deformar, a contagem do score vira valor direto, as animações caem para 1 ms e a
espera do julgamento encurta. A informação continua completa.

---

## 2. Layout da Arena

```css
max-width: 440px;           /* a Arena nunca passa disso */
min-height: 100dvh/100svh;  /* svh para o Safari não fazer a tela pular */
grid-template-rows: 56px minmax(0, var(--stage-h)) 1fr auto;
--stage-h: clamp(228px, 38svh, 308px);
padding: env(safe-area-inset-*) …;
```

- Acima de 560px a Arena vira um cartão flutuante com raio de 32px e borda.
- Abaixo de 720px de altura, o palco encolhe e os espaços apertam — a zona de
  reação continua cabendo sem rolagem.
- `viewport-fit=cover` + `env(safe-area-inset-*)`: a barra de ação não invade a
  faixa do gesto do iPhone.

**Alvo de toque mínimo: 44px.** CTA principal: 56px.

---

## 3. Componentes

### Botões

| Tipo | Uso | Forma |
|---|---|---|
| `btn-primary` | a ação do estado | fundo accent, texto escuro, 56px, pílula, caixa alta |
| `btn-outline` | alternativa de mesmo peso | contorno, 56px |
| `btn-ghost` | saída lateral, sem peso | só texto, 44px, `--muted` |
| `origin` | alvo de origem | contorno, 56px, raio grande, grade 2 colunas |

Quando resultado mostra dois CTAs lado a lado, eles dividem a linha; com um só,
ele ocupa a largura inteira. Nada de meio botão órfão.

**Rótulo de botão é contrato e nunca varia.** Provocação, reação e comentário do
juiz variam.

### Bolha Auê

Blob SVG de N pontos, interpolação Catmull-Rom fechada convertida em Bézier
cúbica. Cada modo define amplitude, número de pontos, escala, preenchimento e
contorno:

| Modo | Sensação |
|---|---|
| `idle` | respirando, quase parada |
| `recording` | grande, agitada, **dirigida pelo áudio real** |
| `holding` | comprimida — segurando o que saiu |
| `judging` | pequena, concentrada |
| `yielding` | se abre e entrega o palco ao número |
| `waiting` | quase parada — vivo, sem resposta ainda |
| `playing` | agitada em tom mais baixo — é lembrança, não ao vivo |
| `victory` | ouro |
| `defeat` | apagada |

**A Bolha não é loading spinner, não é decoração e não muda de posição entre
estados.**

### Métricas

**Linha, nunca card.** Rótulo à esquerda, valor à direita, trilha de 4px embaixo.
Rótulo de rua — Grave, Estouro, Fôlego, Sujeira — não laudo técnico.

### Auê Score

Display, accent, `clamp(76px, 23vw, 104px)`, tabular. Inteiro, sem casa decimal:
87 bate mais rápido que 87,4.

### Placar

Uma linha por competidor, ordenada, separada por borda superior. Cada linha é um
**botão que toca o arroto daquela pessoa**. A linha líder marca nome em `--fg`,
nota em `--gold` e ganha a etiqueta "Líder". Enquanto toca, a nota vira contagem
regressiva e uma barra fina corre no rodapé da linha.

### Pílulas de link e player

Mesma família: 56px, `--surface`, borda, raio total. Uma leva o link com botão
copiar; a outra leva play, rótulo, tempo e barra de progresso.

### Sobreposições

Cobrem a Arena inteira com `--bg` a 94% e desfoque leve. Topo com wordmark e
fechar, corpo centrado, ação embaixo. Fecham no `Esc` e devolvem o foco.

---

## 4. Acessibilidade

- foco visível em tudo: contorno accent de 2px com deslocamento;
- controles são `<button>`, campos são `<input>`, títulos mantêm hierarquia;
- a zona de reação é `aria-live="polite"` — o que o jogo diz é anunciado;
- o cronômetro é `aria-live="off"`: contagem a cada 100 ms viraria metralhadora
  de leitor de tela;
- toda linha do placar tem `aria-label` dizendo de quem é o arroto;
- desabilitado é o **único** estado que pode baixar contraste.

## 5. Fora do sistema atual

O `design-system/DESIGN.md` traz seções de XP (7.3), Níveis (7.4), Conquistas
(7.5) e Ranking (7.6). **Essas quatro saíram da visão do produto** — ver
[`../jogo/VISAO.md`](../jogo/VISAO.md). Continuam no kit como registro do
trabalho de marca; não são componentes a construir.
