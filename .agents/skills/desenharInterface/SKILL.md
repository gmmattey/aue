---
name: desenharInterface
description: Procedimento do Giam para especificar a UI do Aue a partir do design system e do prototipo, antes do Guinho implementar.
---

# Skill: desenharInterface

Procedimento do **Giam** para transformar a experiência desenhada em
**especificação visual** — a coisa que o Guinho recebe e constrói.

Giam desenha. Guinho implementa. Quem constrói o componente usa a
[`criarComponenteUI`](../criarComponenteUI/SKILL.md).

> ## AS DUAS FONTES
>
> 1. **O protótipo** —
>    [`docs/design/prototipo-arena/arena.html`](../../../docs/design/prototipo-arena/arena.html).
>    Abre no navegador antes de especificar qualquer coisa. Tem menu de revisão
>    (☰ → "Revisão do protótipo") que pula pra qualquer estado.
> 2. **O design system** —
>    [`docs/design/DESIGN_SYSTEM.md`](../../../docs/design/DESIGN_SYSTEM.md),
>    os tokens escritos, para não precisar ler CSS.
>
> **Divergiu? O protótipo vence.** O design system existe para documentar o
> protótipo, não para competir com ele.
>
> [`docs/design/design-system/`](../../../docs/design/design-system/) é o kit de
> marca — logo, símbolo, paleta estendida. Subordinado ao protótipo, e com
> seções (XP, níveis, conquistas, ranking) que **saíram da visão**.

---

## 1. Token existente ou o desenho está errado

Cor, espaço, raio, duração e curva **já existem**. A lista está no design system.

Se o seu desenho precisa de um valor que não existe, a resposta padrão **não** é
criar token. É perguntar por que o desenho fugiu do sistema. Token novo é
decisão consciente e vai escrita no plano, com motivo.

## 2. O que checar em toda especificação

### Cor

- **Teto do verde: duas aparições por estado.** O accent é da Bolha ativa, do
  Auê Score e do CTA principal. Se ele aparece em tudo, para de significar.
- `--gold` é vitória e aviso de tempo. Não é decoração.
- Desabilitado é o **único** estado que pode baixar contraste.

### Tipo

- Display (Anton) é voz gritada: wordmark, Auê Score, reação, notas do VS, menu.
- Interface (Archivo) é todo o resto.
- Número que muda na tela usa `tabular-nums`. Score contando, cronômetro e
  placar não podem tremer de largura.

### Espaço e forma

- A Arena tem `max-width: 440px`. Nunca passa disso.
- Quatro faixas fixas: HUD 56px, palco, reação, ação. **A grade não muda entre
  estados.**
- Alvo de toque mínimo **44px**. CTA principal **56px**.
- `safe-area-inset` e `svh` — a barra de ação não invade o gesto do iPhone.

### Movimento

- Duração e curva saem dos tokens. `--duration-reveal` é a contagem do score, e
  é longa de propósito — é o único momento lento do jogo.
- **`prefers-reduced-motion` não é opcional.** Ligado: Bolha para de deformar,
  score vira valor direto, animação cai pra 1ms, espera encurta. A informação
  continua inteira.

### Componentes que já têm forma decidida

- **Bolha Auê** — nove modos, um por sensação. Ela **não é spinner**, não é
  decoração e **não muda de posição** entre estados.
- **Métricas** — linha, nunca card. Rótulo de rua (Grave, Estouro, Fôlego,
  Sujeira), não laudo.
- **Placar** — uma linha por competidor, e cada linha é um botão que toca o
  arroto daquela pessoa.
- **Botões** — `btn-primary`, `btn-outline`, `btn-ghost`, `origin`. Dois CTAs
  dividem a linha; um sozinho ocupa tudo. Nada de meio botão órfão.
- **Rótulo de botão é contrato e nunca varia.** O que varia é provocação, reação
  e comentário do juiz.

### Acessibilidade — entra no desenho, não depois

- foco visível: contorno accent 2px com deslocamento;
- zona de reação é `aria-live="polite"`; o cronômetro é `aria-live="off"`;
- toda linha do placar diz de quem é o arroto;
- controle é `<button>`, campo é `<input>`, título mantém hierarquia.

## 3. A saída

A especificação que o Guinho recebe:

```text
ESTADO: qual estado, e qual faixa muda
FORMA:  componente usado, e se é existente ou novo
TOKENS: cor, espaço, raio, tipo, duração — pelos nomes
MEDIDA: alvo de toque, largura, altura, limites
MOVIMENTO: o que anima, quanto tempo, qual curva
REDUCED MOTION: o que vira
A11Y: foco, live region, rótulo, contraste
PROTÓTIPO: qual arquivo e qual estado mostram isso funcionando
NÃO FAZ: o que não pode aparecer
```

Se você não conseguiu apontar o protótipo, ou o desenho é novo de verdade — e aí
isso vai escrito e justificado — ou você não procurou direito.

## Relacionados

- **O fluxo antes da forma:** [`desenharExperiencia`](../desenharExperiencia/SKILL.md)
- **O texto:** [`aplicarTomOgro`](../aplicarTomOgro/SKILL.md)
- **Quem constrói:** [`criarComponenteUI`](../criarComponenteUI/SKILL.md)
- **Celular real:** [`garantirMobileReal`](../garantirMobileReal/SKILL.md)
