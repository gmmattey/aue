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
>    [`docs/design/design-system/system/DESIGN.md`](../../../docs/design/design-system/system/DESIGN.md),
>    os tokens escritos, para não precisar ler CSS.
>
> **Divergiu? O protótipo vence.** O design system existe para documentar o
> protótipo, não para competir com ele.
>
> [`docs/design/design-system/`](../../../docs/design/design-system/) é o kit de
> marca — logo, símbolo, favicons e paleta estendida. Subordinado ao protótipo.
>
> A §19 do `DESIGN.md` lista o que está **fora** do sistema. Leia antes de
> especificar qualquer coisa que pareça estar lá.

---

## 1. Token existente ou o desenho está errado

Cor, espaço, raio, duração e curva **já existem**. A lista está no design system.

Se o seu desenho precisa de um valor que não existe, a resposta padrão **não** é
criar token. É perguntar por que o desenho fugiu do sistema. Token novo é
decisão consciente e vai escrita no plano, com motivo.

## 2. O que checar em toda especificação

**Esta lista diz o que conferir. Os valores ficam no design system** — copiar
número pra cá só cria uma segunda fonte que envelhece. Cada linha aponta a
seção de `system/DESIGN.md`.

| Conferir | Onde está a regra |
|---|---|
| Cor base e derivação | §2.1, §2.4 |
| **Orçamento do verde** — o accent tem teto de aparições por estado | §2.2 |
| Semânticos, e por que derrota não é `--danger` | §2.3 |
| Contraste | §2.5, §17 |
| Display × Interface, escalas, `tabular-nums` | §3 |
| Espaçamento, raio, **alvo de toque** e elevação | §4 |
| Estados interativos (foco, pressionado, desabilitado) | §5 |
| Tipos de botão e **economia de ação** | §6.1, §6.2 |
| Pílula de utilidade, **métricas em linha e não card** | §6.3, §6.4 |
| **Gameplay não usa card** | §6.6 |
| Bolha: geometria, entrada de áudio, modos, e o que ela não é | §7 |
| HUD | §8 |
| Auê Score, e o fato de **a nota viver dentro da Bolha** | §9 |
| VS, placar tocável, origem dos nomes, compartilhamento | §10 |
| Overlays | §11 |
| Estados da Arena e regras da máquina | §12 |
| Motion: tokens, catálogo e `prefers-reduced-motion` | §13 |
| **Rótulo de botão é contrato**; fala varia | §14.2, §14.3 |
| Erros e recuperação | §15 |
| **Grade fixa de 4 faixas** e verificação mobile | §16 |
| Acessibilidade | §17 |
| **A lista do que não fazer** | §18 |

Duas leituras obrigatórias antes de qualquer spec: **§18 (o que não fazer)** e
**§21 (contrato de implementação)**.

### O que mudou nesta versão do sistema, e costuma passar batido

- **A nota vive dentro da Bolha** (§9.2). Não é mais um número solto abaixo dela.
- **`--danger` existe** (§2.3) — e derrota continua **não** usando ele.
- **`AD_BREAK` está fora.** O design system já dizia (§12.4, §20) e o produto
  decidiu: não é estado, não é momento, **não se especifica nada que dependa
  dele**.
- **A máquina de estados não sai daqui.** O `DESIGN.md` §12 descreve 19 estados;
  a máquina real é a de
  [`docs/jogo/ARENA.md`](../../../docs/jogo/ARENA.md), com dez. Este documento
  manda em token, forma e movimento — não em quais estados existem.

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
