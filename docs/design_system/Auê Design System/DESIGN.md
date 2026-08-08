---
name: "Auê!"
category: Brands
surface: web / PWA mobile-first
status: "Design System de produto — v2 (rodada corretiva)"
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
  silver: "#c7cad1"
  bronze: "#c98a4b"
---

# Auê!

**Arrote. Seja julgado.**

PWA mobile-first de competição de arrotos — um jogo social competitivo, irreverente e visualmente premium, apesar do caráter absurdo do produto. Referências conceituais: Wavelength (party game, suspense, pontuação), BeReal (baixo atrito, ação antes de cadastro), Kahoot (placar, pódio, revelação), Duolingo (XP, níveis, celebração), Strava (comparação, recorde, ranking).

> **Fórmula de referência:** 70% party game · 15% social espontâneo · 10% competição · 5% progressão.
> Não construir um "TikTok de arroto". Construir "um esporte ridículo digital que as pessoas compartilham no TikTok".

Este documento é a especificação canônica de produto. Ele substitui a v1 (brand kit automático raso). Nenhum artefato de marketing (landing, deck, poster, email, newsletter, form) faz parte desta rodada — eles não devem ser regenerados aqui.

---

## 0. Como usar este documento

1. **Tema canônico = escuro.** Não existe "tema padrão claro". O claro, se um dia existir, é a variante — não o contrário.
2. Todo token de cor abaixo é semântico. Nunca usar hex cru fora deste conjunto.
3. A **Bolha Auê** (seção 6) é um componente proprietário do Design System, não um efeito decorativo. Qualquer tela que envolva gravação, análise ou revelação deve usá-la como elemento dominante.
4. Componentes de produto (Auê Score, XP, níveis, conquistas, ranking, duelo, pódio) têm forma própria — nunca usar tabela, card genérico ou componente de admin/dashboard para representá-los.

---

## 1. Paleta de Tokens

### 1.1 Base (neutra)

| Token | Hex | OKLCH (aprox.) | Uso |
| --- | --- | --- | --- |
| `--bg` | `#0a0a08` | `oklch(0.15 0.005 95)` | Fundo de tela — preto carvão, quase preto |
| `--surface` | `#171712` | `oklch(0.22 0.006 95)` | Superfície discretamente elevada (sheet, input, nav) |
| `--surface-2` | `#1f1f18` | `oklch(0.26 0.006 95)` | Segunda elevação (modal sobre sheet, popover) — usar raramente |
| `--fg` | `#f5f3ea` | `oklch(0.96 0.01 95)` | Texto principal sobre fundo escuro |
| `--muted` | `#93917f` | `oklch(0.63 0.015 95)` | Labels, metadados, texto secundário |
| `--border` | `#2b2a22` | `oklch(0.27 0.01 95)` | Divisores sutis — raramente visíveis, nunca decorativos |

### 1.2 Accent (viva)

| Token | Hex | OKLCH (aprox.) | Uso |
| --- | --- | --- | --- |
| `--accent` | `#c6ff00` | `oklch(0.92 0.27 122)` | Verde ácido elétrico — CTA primário, Auê Score, elementos "vivos" (Bolha em gravação, XP). Único accent de uso livre; no máximo 2 aparições por tela. |
| `--accent-strong` | `#a8d900` | `oklch(0.84 0.25 122)` | Hover/active de superfícies em `--accent` (L −0.08) |
| `--accent-on` | `#0a0a08` | — | Texto/ícone sobre `--accent` (sempre carvão, nunca branco) |

### 1.3 Semânticos de estado e progressão

Estes tokens **não existiam na v1** — cobrem sucesso, vitória, derrota, ranking e erro, conforme especificação funcional (seção 8 de `especificacao_ux_ui.md`).

| Token | Hex | OKLCH (aprox.) | Uso |
| --- | --- | --- | --- |
| `--gold` | `#f4c430` | `oklch(0.83 0.16 85)` | Vitória, lendário, conquista especial, 1º lugar. Uso restrito — nunca como cor de UI neutra. |
| `--gold-strong` | `#d9ac1c` | `oklch(0.75 0.15 85)` | Hover/active sobre `--gold` |
| `--danger` | `#ff3d3f` | `oklch(0.63 0.22 25)` | Erro técnico real (mic bloqueado, sem áudio, falha de rede) — nunca usado para "derrota" de jogo, que é tratada com humor, não com vermelho de erro |
| `--danger-strong` | `#e11a1c` | `oklch(0.55 0.21 25)` | Hover/active sobre `--danger` |
| `--silver` | `#c7cad1` | `oklch(0.82 0.01 260)` | 2º lugar do pódio |
| `--bronze` | `#c98a4b` | `oklch(0.68 0.09 55)` | 3º lugar do pódio |
| `--xp` | `--accent` | — | Barra de XP e nível usam o accent — progressão é "viva", não uma cor à parte |
| `--offline` | `--muted` sobre `--surface-2` | — | Estado offline é neutro, não é erro (o app "continua funcionando") |

**Regra de contraste:** todo par texto/fundo abaixo é obrigatório e não pode regredir em hover/focus/active:
normal ≥ 4.5:1, texto grande/ícone ≥ 3:1. `--fg` sobre `--bg`/`--surface` ≈ 15:1. `--accent-on` sobre `--accent` ≈ 15:1. `--bg` sobre `--gold` ≈ 9:1. `--fg` sobre `--danger` ≈ 3.9:1 → em texto normal sobre `--danger`, usar `--bg` (não `--fg`) para manter ≥ 4.5:1.

---

## 2. Tipografia

Duas personalidades: **Display** (impacto, pesada/condensada) e **Interface** (sans limpa, legível).

| Papel | Família | Fallbacks | Pesos |
| --- | --- | --- | --- |
| Display | **Anton** | Archivo Black, Impact, system-ui, sans-serif | 400 (única — Anton é mono-peso por design) |
| Interface | **Inter** | system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif | 400, 600, 700 |

Display é usado **exclusivamente** para: Auê Score, títulos de tela, nome do vencedor, ranking (nome + nota), chamadas principais ("MANDA.", "FOI ISSO?"). Interface é usada para: labels, métricas, navegação, instruções, corpo de texto, botões secundários/terciários.

### 2.1 Escala Display (Anton, tracking −1%, line-height apertado)

| Token | Tamanho | Line-height | Uso |
| --- | --- | --- | --- |
| `--text-display-2xl` | 96px (mobile: clamp 64–96px) | 0.92 | Auê Score na tela de Resultado — deve ocupar 25–40% da atenção vertical |
| `--text-display-xl` | 64px | 0.95 | Score em contexto secundário (duelo, desafio recebido) |
| `--text-display-lg` | 48px | 1.0 | Título de tela ("SEU AUÊ", "RESULTADO") |
| `--text-display-md` | 32px | 1.05 | Nome de campeão no pódio, título de conquista |
| `--text-display-sm` | 24px | 1.1 | Números de apoio (ranking, XP grande) |

### 2.2 Escala Interface (Inter)

| Token | Tamanho | Line-height | Peso | Uso |
| --- | --- | --- | --- | --- |
| `--text-body-lg` | 20px | 1.4 | 600 | Botão primário, frase do juiz |
| `--text-body-md` | 16px | 1.5 | 400/600 | Corpo padrão, microcopy, itens de lista |
| `--text-body-sm` | 14px | 1.5 | 400/600 | Labels de métrica, navegação, botão secundário |
| `--text-caption` | 12px | 1.4 | 700, uppercase, tracking +2% | Metadados, badges, timestamps, categoria de conquista |

Mínimos obrigatórios: títulos ≥ 36px em contexto "slide/hero" (splash, revelação), corpo ≥ 24px quando a tela funciona como projeção/apresentação (modo Competição Presencial em tela grande). Em mobile padrão, corpo ≥ 14px, nunca abaixo disso.

---

## 3. Espaçamento, Tamanho e Raio

### 3.1 Grid de espaçamento (base 8px)

`--space-1: 4px` · `--space-2: 8px` · `--space-3: 12px` · `--space-4: 16px` · `--space-5: 24px` · `--space-6: 32px` · `--space-7: 40px` · `--space-8: 48px` · `--space-9: 64px` · `--space-10: 96px`

Densidade baixa por padrão: margens de tela ≥ `--space-5` (24px), respiro vertical entre blocos ≥ `--space-6` (32px). Evitar preencher toda a viewport — áreas vazias são parte da linguagem visual.

### 3.2 Raio

`--radius-sm: 12px` (chips, badges pequenos) · `--radius-md: 20px` (cards/sheets quando estritamente necessários) · `--radius-lg: 24px` (raio padrão de superfícies — "amplamente arredondado") · `--radius-full: 999px` (botão primário tipo pílula, avatar, indicador circular, container da Bolha)

### 3.3 Alvo de toque

Mínimo 44×44px para qualquer elemento tocável. Botão primário: altura mínima 56px.

### 3.4 Elevação

Sem gradientes e sem glow decorativo (ver seção 9). Sombra apenas funcional, para separar camadas de sobreposição (bottom sheet, modal):
`--shadow-sheet: 0 -8px 24px rgba(0,0,0,.45)` · `--shadow-modal: 0 12px 32px rgba(0,0,0,.5)`. Nunca aplicar sombra em cards de conteúdo comuns.

---

## 4. Estados Interativos

Todo elemento focável tem `:focus-visible` com anel de 2px em `--accent` com offset de 2px sobre `--bg`.

| Estado | Regra |
| --- | --- |
| Default | Token base do componente |
| Hover | Desloca L do OKLCH em ±0.08 (superfícies escuras clareiam levemente; `--accent`/`--gold`/`--danger` escurecem para `-strong`). Nunca aproximar o texto do `--muted`. |
| Focus-visible | Anel 2px `--accent`, offset 2px, mantém foreground do estado default |
| Active/Pressed | Escala 0.97 + hover token, transição `--duration-fast` |
| Disabled | Único estado que pode reduzir contraste: opacidade 40% sobre o token default, mantendo a forma |
| Selected (ranking/tab) | Fundo `--surface-2` + borda `--accent` 1px + texto `--fg` (nunca `--muted`) |

Botão primário sólido inverte fundo/texto: default `--accent`/`--accent-on`; hover `--accent-strong`/`--accent-on` (mesmo par, nunca perde contraste).

---

## 5. Componentes de Fundação

### 5.1 Botões

- **Primário**: pílula (`--radius-full`), altura 56px, fundo `--accent`, texto `--accent-on`, peso 700, `--text-body-lg`. Um único primário visível por viewport. Ex.: `ARROTAR`.
- **Secundário**: contorno 1px `--border`, fundo transparente, texto `--fg`. Ex.: `Compartilhar`.
- **Terciário**: apenas texto, `--muted` no estado default, `--fg` no hover (nunca o inverso). Ex.: `Tentar de novo`.
- Nunca dois botões primários na mesma viewport. Nunca 3+ CTAs com o mesmo peso visual.

### 5.2 Navegação principal

Três destinos fixos, sem tabs adicionais: `Ranking` — `ARROTAR` (central, elevado, círculo `--accent` de 64px sobre a barra) — `Perfil`. Desafios, competições, conquistas e configurações são acessados por contexto (nunca por tab).

### 5.3 Métricas (linha, não card)

Cada métrica é uma linha: label (`--text-body-sm`, `--muted`) + valor (`--text-body-sm`, `--fg`, alinhado à direita) + barra de progresso fina (4px, trilho `--border`, preenchimento `--accent`) abaixo. Nunca 4 cards independentes.

### 5.4 Superfícies

Usar `--surface` apenas quando há necessidade real de agrupamento (bottom sheet, input, nav). A maior parte da tela é `--bg` puro. Bordas (`--border`, 1px) são o recurso preferido para separar conteúdo antes de recorrer a um card.

---

## 6. Bolha Auê — Componente Proprietário

A Bolha é a assinatura visual do produto: representa o som capturado e é o elemento que, junto com tipografia + cor + movimento + score, faz o produto ser reconhecível mesmo sem logo (critério de identidade, seção 64 da especificação funcional).

### 6.1 Geometria base

A Bolha é um blob orgânico gerado a partir de **N pontos de controle** distribuídos em um círculo de raio base `R`, cada um deslocado radialmente por uma função de ruído, conectados por curva suave (Catmull-Rom → Bézier). Nunca é um círculo perfeito, nem em repouso.

```
Para i em [0, N):
  ângulo θ_i = i · (2π / N)
  raio_i = R · (1 + amplitude · noise(θ_i, seed, t))
  ponto_i = (cos θ_i · raio_i, sin θ_i · raio_i)

path = smoothClosedCurve(pontos)
```

- `R` base: 120px em contexto de gravação (Home/Gravação), 160px em Splash, 72px em contexto de resultado inline.
- `N` (nº de pontos) varia com textura — ver 6.3.

### 6.2 Variáveis de entrada (durante gravação)

Quatro sinais normalizados 0–1, lidos do motor de áudio, mapeiam para quatro propriedades visuais:

| Sinal | Propriedade | Fórmula |
| --- | --- | --- |
| **Potência** (amplitude) | Escala (S) | `S = 1 + 0.35 · potência` — expande a bolha até 135% do raio base |
| **Profundidade** (energia grave) | Massa/peso (M) | `larguraX = 1 + 0.25 · profundidade`; desloca o centro de massa dos pontos inferiores +`12px · profundidade` para fora — a forma fica mais "pesada" embaixo |
| **Duração** (tempo sustentado, s) | Piso de escala sustentado | `pisoExtra = min(0.15, 0.02 · segundosSustentados)` somado a S — um som longo deixa a bolha cumulativamente maior |
| **Textura** (energia de alta frequência) | Irregularidade (A, N) | `A = 6px + 34px · textura` (amplitude do ruído); `N = round(3 + 6 · textura)` (nº de saliências, de 3 = liso a 9 = irregular) |

Frequência de atualização: 60fps, com suavização (lerp 0.35 por frame) para evitar tremulação nervosa — a Bolha responde, não treme.

### 6.3 Estados

| Estado | Gatilho | Escala | Cor | Comportamento |
| --- | --- | --- | --- | --- |
| **idle** | app aberto, sem ação | 1.0 ±0.03 | `--surface-2` + preenchimento `--accent` a 8% opacidade | Respiração senoidal, período 4s, `A` baixa (4px), sem input |
| **calibrating** | "XIU. MEDINDO O SILÊNCIO..." | contrai para 0.85 em 300ms ease-in | `--accent` a 40% opacidade | Quase imóvel, `A→0` (aproxima-se do círculo), duração 0,5–1s |
| **recording** | gravação ativa | dirigida pelas fórmulas de 6.2 | `--accent` 100% | Deformação contínua e responsiva ao áudio; ao ultrapassar 8s dos 10s máximos, pulso de aviso (escala +4%, 400ms, 1x) |
| **processing** | finalização + análise | 3 oscilações decrescentes (1.0→1.4→0.9→1.1) em 600ms, depois subdivide em 4 protuberâncias verticais que preenchem de baixo pra cima (uma por métrica: potência/profundidade/duração/textura) | `--accent` → `--fg` (dessatura progressivamente) | Transição teatral de ~1–2s; é a versão "viva" das barras de progresso da tela de Análise |
| **reveal** | início da revelação da nota | contrai para 0.4 em 220ms, depois "abre" — os pontos de controle varrem de dentro para fora em 500ms (easing emphasize) | `--fg` → `--accent` | Sincronizado com o contador de score subindo de 0 até a nota final |
| **victory** | vitória em duelo/competição | assenta em 1.15, ciclo suave 1.15↔1.20 a cada 1.2s (3 ciclos) e assenta | `--gold` | Sem confete acoplado à Bolha (confete é elemento à parte, seção 8.7) |
| **error** | falha técnica (mic bloqueado, sem áudio, sem rede) | cai para 0.9, pico curto de irregularidade (`A` +20px, 150ms) depois achata quase a círculo, shake horizontal ±6px × 4 em 300ms | `--danger` | Some/retorna a idle em 400ms após o shake |

`prefers-reduced-motion`: remove deformação por ruído (`A = 0` sempre, forma vira um círculo estável), remove oscilações/shake, mantém apenas transição de escala e cor em `--duration-base`. A informação (estado atual) permanece 100% legível via cor + label textual, nunca só por movimento.

### 6.4 O que a Bolha não é

Não é uma waveform tradicional (a waveform pode existir de forma secundária e discreta, nunca como elemento central). Não usa gradiente nem glow — a vivacidade vem de cor sólida + deformação + movimento, não de brilho.

---

## 7. Componentes de Produto

### 7.1 Auê Score

Número em `--text-display-2xl`, `--accent`, centralizado, formato `NN,N` (vírgula decimal, 1 casa). Deve ocupar 25–40% da altura útil da tela de Resultado. Abaixo do número, o **título** (`--text-display-md`, `--fg`, ex.: "MONSTRO DO ESGOTO") e a **frase do juiz** (`--text-body-md`, `--muted`, itálico opcional). Nunca dividir o score em cards menores.

### 7.2 Métricas (ver 5.3)

Quatro linhas fixas na ordem: Profundidade, Potência, Duração, Textura. Rótulo à esquerda, valor à direita, barra fina abaixo — ver 5.3.

### 7.3 XP

Toast compacto, canto superior, entrada por slide+fade `--duration-base`: `+35 XP` em `--text-body-lg` peso 700 `--accent`. Não bloqueia a próxima ação (some sozinho em 2s ou ao toque). Barra de nível (trilho `--border` 6px, preenchimento `--accent`, `--radius-full`) pode animar preenchendo em paralelo, com "pop" (`--easing-emphasize`) se cruzar um nível.

### 7.4 Níveis

Rótulo textual acima da barra de XP: `Nível 11` (`--text-body-sm`, `--muted`) + título de rank opcional. Ao subir de nível: pulso de escala 1→1.08→1 na barra (`--duration-slow`, `--easing-emphasize`) e disparo de toast de XP simultâneo.

### 7.5 Conquistas

Grid 3 colunas (mobile), célula quadrada `--radius-md`, ícone/emoji central. Quatro estados visuais:

| Estado | Aparência |
| --- | --- |
| Desbloqueada | Fundo `--surface`, ícone colorido, borda 1px `--border` |
| Bloqueada | Fundo `--surface` a 60% opacidade, ícone em silhueta `--muted`, sem cor |
| Rara | Como desbloqueada + borda 1px `--accent` + selo `--text-caption` "RARA" no canto |
| Secreta (ainda não obtida) | Fundo `--surface`, glyph `???` centralizado em `--muted`, sem dica de nome |

Celebração de desbloqueio: card contextual pequeno (não modal sobre o resultado) ancorado abaixo do score — `🏆 TÍTULO DA CONQUISTA` + condição, com CTA secundário `VER CONQUISTA`. Entrada por slide-up `--duration-slow`.

### 7.6 Ranking

Lista simples, uma linha por posição: posição (`--text-body-sm` `--muted`, `w:32px`) · coroa `👑` apenas na 1ª posição · nome (`--text-body-md` `--fg`) · nota (`--text-display-sm`, alinhada à direita, cor `--gold` na 1ª posição, `--fg` nas demais). Filtros como pills horizontais (`Semana` `Natural` `Vitórias`) em `--text-body-sm`, ativo com fundo `--accent`/`--accent-on`. Se o usuário estiver fora da área visível, mostrar linha fixa inferior com fundo `--surface-2` e borda superior `--border`.

### 7.7 Duelo

Layout **VS**: dois blocos espelhados (nome, score em `--text-display-xl`, reação emoji), separados por rótulo central `VS` (`--text-body-sm`, `--muted`, em círculo `--surface` 32px). Vencedor recebe coroa `👑` + cor `--gold` no score; perdedor mantém `--fg` (nunca `--danger` — derrota não é erro, é humor). Resultado: título de vencedor (`--text-display-md`) + microcopy de humor + CTA primário `PEDIR REVANCHE`.

### 7.8 Pódio

Top 3 com 1º colocado central e maior (altura de bloco 100%), 2º e 3º laterais e menores (75% e 60% de altura). Cores por posição: 1º `--gold`, 2º `--silver`, 3º `--bronze`, aplicadas ao número de posição e ao contorno do avatar — nunca ao fundo inteiro do bloco. 4º lugar em diante: lista simples abaixo do pódio, mesma forma do ranking (7.6).

### 7.9 Card compartilhável

Proporção 4:5 (retrato, otimizado para story), fundo `--bg`, wordmark `Auê!` no topo, `NOME FEZ` + score em `--text-display-xl` `--accent`, título em `--text-display-sm`, chamada final `VOCÊ CONSEGUE FAZER MELHOR?` em `--text-body-md` `--muted`. Nunca reproduz o áudio automaticamente — é puramente visual.

---

## 8. Estados de Sistema

### 8.1 Permissão de microfone

Título de impacto em Display (`PRECISO OUVIR ESSA PORRA.` ou alternativa `PRECISO OUVIR ISSO.`), texto de apoio em `--text-body-md` `--muted`, CTA primário `LIBERAR MICROFONE`. Nunca a tela técnica padrão do SO como primeira impressão — o app pede antes com esta tela.

### 8.2 Offline

Faixa compacta no topo, fundo `--surface-2`, texto `--muted`, ícone neutro (não `--danger`): `A INTERNET MORREU.` + `Seu arroto continua funcionando. O resultado será sincronizado depois.` Nunca bloqueia a gravação — grava local e sincroniza depois.

### 8.3 Erro

Usa `--danger` apenas aqui e no estado `error` da Bolha (6.3). Título de impacto + explicação curta + CTA de recuperação:
- Mic bloqueado: `NÃO OUVI NADA.` / `Seu microfone está bloqueado.` / `[ Liberar microfone ]`
- Sem áudio detectável: `CADÊ O ARROTO?` / `Tenta de novo e chega um pouco mais perto.`
- Sem internet (grave): reaproveita 8.2, não é tratado como erro `--danger`.

### 8.4 Loading

Evitar spinner tradicional. Usar a Bolha em estado `processing` (6.3) como elemento de loading contextual, com legenda `PREPARANDO O JULGAMENTO...` em `--text-body-md` `--muted`.

### 8.5 Vazio (novo usuário)

Tela quase vazia — sem ranking, conquistas, perfil complexo ou histórico. Único elemento: Bolha em `idle` + CTA `ARROTAR` + microcopy `Sua dignidade já foi longe demais.`

### 8.6 Permissões negadas permanentemente

Fallback quando o usuário já negou 2×: substitui o CTA `LIBERAR MICROFONE` por instrução de habilitar manualmente nas configurações do navegador/SO, mantendo o tom (`SEU NAVEGADOR TÁ SEGURANDO O ARROTO.`).

### 8.7 Vitória (celebração)

Confete como camada independente sobre a tela (não acoplado à Bolha), paleta limitada a `--accent` + `--gold` + `--fg` (nunca arco-íris genérico), vibração curta, duração total ≤ 1.5s, respeitando configuração de som do dispositivo.

---

## 9. Motion — Especificação

### 9.1 Tokens

`--duration-instant: 100ms` · `--duration-fast: 160ms` · `--duration-base: 240ms` · `--duration-slow: 400ms` · `--duration-reveal: 900ms`
`--easing-standard: cubic-bezier(.2,.8,.2,1)` · `--easing-decelerate: cubic-bezier(0,0,.2,1)` · `--easing-emphasize: cubic-bezier(.34,1.56,.64,1)`

### 9.2 Regras

- Movimento sempre comunica algo (gravação, pressão, análise, suspense, vitória, derrota, conquista) — nunca é decoração pura.
- Nunca gradiente. Nunca glow. A vivacidade vem de cor sólida + forma + timing.
- Sequência de revelação da nota (seção 23 da especificação funcional): tela escurece (`--duration-fast`) → vibração curta → número sobe de 0 até a nota em `--duration-reveal` com `--easing-decelerate` → título aparece (`--duration-base`, fade+slide 8px) → frase do juiz (`--duration-base`, atraso de 120ms) → ações liberadas (fade, `--duration-fast`).
- `prefers-reduced-motion`: remove deformações fortes da Bolha, remove explosões/confete, reduz contagem numérica animada para 2 passos (0 → valor final), mantém transições simples de opacidade/posição. A informação nunca depende exclusivamente do movimento.

---

## 10. Responsividade

### 10.1 Mobile (360–430px) — prioridade

Todos os fluxos essenciais operáveis com uma mão. CTA primário na zona inferior ou central acessível (última `--space-8` da viewport). Margem lateral `--space-5` (24px). Navegação principal fixa no rodapé, altura 64px + safe-area.

### 10.2 Desktop

Conteúdo centralizado em coluna única, largura 480–600px, fundo `--bg` preenchendo o restante sem decoração adicional. Não expandir componentes apenas porque há espaço. Navegação por teclado obrigatória: ordem de tab lógica, `:focus-visible` sempre visível. Áreas laterais reservadas para uso futuro (não usadas nesta rodada).

### 10.3 Tablet / apresentação (Competição Presencial)

Quando a tela funciona como projeção para o grupo (Lobby, Rodada, Pódio), corpo ≥ 24px e títulos ≥ 36px, mesma coluna central de 480–600px ampliada proporcionalmente.

---

## 11. Acessibilidade

Contraste mínimo 4.5:1 (texto normal) / 3:1 (texto grande e ícones) em todos os estados. Nunca depender só de cor (ranking usa posição numérica + coroa, não só cor dourada; erro usa texto, não só vermelho). Feedback háptico sempre acompanhado de feedback visual equivalente. `prefers-reduced-motion` respeitado em toda animação (ver 9.2). Alvo de toque mínimo 44px. Navegação por teclado completa no desktop, com foco visível.

---

## 12. Identidade — Símbolo Bolha Viva

A rota de identidade permanece **Bolha Viva**, evoluída nesta rodada: a bolha orgânica sob pressão combinada com um **`!` pesado integrado ao símbolo** — o elemento que remove a ambiguidade de "blob genérico de startup orgânica". O símbolo final é **flat e vetorial**, cor única (`--accent` sobre `--bg`, ou `--bg` sobre `--accent` na variante invertida), **sem gradiente, sem glow, sem sombra, sem volume 3D** — a regra "sem gradientes, sem glow" agora é respeitada tanto na documentação quanto no arquivo de símbolo (contradição da v1 corrigida).

Distinção importante: o **símbolo/logo** é estático (marca, favicon, ícone de app). A **Bolha Auê componente** (seção 6) é o elemento animado e audio-reativo dentro do produto. Não são o mesmo artefato — o símbolo não deforma em tempo real; o componente sim.

Arquivos do símbolo: `assets/aue-bolha-mark.svg` (padrão, verde sobre carvão) e `assets/aue-bolha-mark-inverted.svg` (variante invertida, carvão sobre verde). Demonstração viva de todos os componentes desta especificação: `aue-design-system-showcase.html`.

---

## 13. O que NÃO fazer

- Não usar aparência de app corporativo/dashboard/admin.
- Não usar quatro cards de métrica independentes.
- Não usar waveform tradicional como elemento principal.
- Não usar gradiente ou glow em nenhum artefato de marca (símbolo, Bolha, UI).
- Não colocar piada em todo label — humor em pontos estratégicos (resultado, derrota, conquista, erro, compartilhamento, competição).
- Não depender exclusivamente de emoji para ter personalidade.
- Não tratar derrota como erro técnico (`--danger` é reservado a falhas reais).
- Não usar mais de um CTA primário por viewport.
- Não usar Inter/Roboto/Arial como display — Display é sempre Anton.

---

## 14. Cobertura vs. `especificacao_ux_ui.md` — checklist de fechamento

| Requisito da especificação funcional | Coberto nesta v2 | Onde |
| --- | --- | --- |
| Auê Score especificado | ✅ | 7.1 |
| XP e níveis | ✅ | 7.3, 7.4 |
| Conquistas (desbloqueada/bloqueada/rara/secreta) | ✅ | 7.5 |
| Ranking + posição fixa fora da área visível | ✅ | 7.6 |
| Duelo | ✅ | 7.7 |
| Pódio (1º central, cores por posição) | ✅ | 7.8 |
| Navegação principal (Ranking / ARROTAR / Perfil) | ✅ | 5.2 |
| Permissões (mic, negação permanente) | ✅ | 8.1, 8.6 |
| Offline | ✅ | 8.2 |
| Loading/erros com personalidade | ✅ | 8.3, 8.4 |
| Estados interativos (hover/focus/active/disabled) | ✅ | 4 |
| Responsividade 360–430px + desktop + apresentação | ✅ | 10 |
| Componentes e variantes de botão/nav/métrica | ✅ | 5 |
| Bolha Auê como componente (não decoração) | ✅ | 6 |
| Estados da Bolha (idle/calibrating/recording/processing/reveal/victory/error) | ✅ | 6.3 |
| Relação potência/profundidade/duração/textura → deformação | ✅ | 6.2 |
| Motion como especificação (não vibe) | ✅ | 9 |
| Tema escuro canônico (não variante) | ✅ | 0, 1 |
| Tokens semânticos (sucesso/vitória/derrota/erro/ranking) | ✅ | 1.3 |
| Escala tipográfica completa | ✅ | 2 |
| Spacing/sizing/radii | ✅ | 3 |
| Card compartilhável | ✅ | 7.9 |
| Símbolo com `!` integrado, flat, sem gradiente/glow | ✅ | 12 |
| Telas finais de produto (Home, Gravação, etc.) | ❌ — fora de escopo desta rodada, por decisão explícita | — |
| Feed social / reações públicas | ❌ — fora de escopo do MVP conforme especificação (seção 59–60) | — |
| Áudio da interface (sons de UI) | ⚠️ parcialmente — regra de "nunca autoplay do arroto gravado" está documentada (8.7, seção 57 da spec), mas biblioteca de sons não foi definida nesta rodada | — |
| Vídeo (câmera durante gravação) | ⚠️ regra de não competir com a Bolha está documentada (spec seção 58), mas não há componente de preview de câmera nesta rodada — não fazia parte do pedido | — |

Itens marcados ⚠️ são candidatos naturais da próxima rodada, quando as telas finais de produto forem desenhadas.
