---
name: desenharExperiencia
description: Procedimento do Giam para desenhar a UX do Aue dentro da maquina de estados da Arena, sem inventar tela.
---

# Skill: desenharExperiencia

Procedimento do **Giam** para desenhar **o que acontece** — fluxo, estado,
sensação e saída — antes de qualquer pixel e antes de qualquer código.

> ## ESTA SKILL NÃO É A FONTE DA ARENA
>
> As fontes são, nesta ordem:
>
> 1. [`docs/escopo/ESCOPO_ATUAL.md`](../../../docs/escopo/ESCOPO_ATUAL.md) — o
>    que pertence ao jogo agora;
> 2. [`docs/jogo/ARENA.md`](../../../docs/jogo/ARENA.md) — **quais estados
>    existem**, o que cada um faz, o que não pode e para onde sai. Só este
>    arquivo define a máquina;
> 3. [`docs/jogo/LOOP.md`](../../../docs/jogo/LOOP.md) — o loop;
> 4. [`docs/design/prototipo-arena/arena.html`](../../../docs/design/prototipo-arena/arena.html)
>    — como cada estado se parece e se comporta. Abre no navegador.
>
> **Protótipo, design system e handoff não criam, não renomeiam e não removem
> estado.** Onde eles descreverem uma máquina diferente da `ARENA.md` — e o
> material atual descreve, com 19–20 estados —, vale a `ARENA.md`.
>
> **`AD_BREAK` está fora.** Não é estado, não é momento, e não se desenha nada
> que dependa dele.
>
> **Não existe outro arquivo de protótipo.** Se um HTML aparecer ao lado do
> `arena.html`, é resíduo de exportação antiga — apaga, não porta.

---

## 0. Escopo antes de tudo

Leia [`docs/escopo/ESCOPO_ATUAL.md`](../../../docs/escopo/ESCOPO_ATUAL.md).

> Isto é um comportamento do jogo, ou é uma ideia tentando entrar pela porta do
> design?

Fora do escopo: registra no backlog. Não desenha.

## 1. A Arena é uma superfície de estado

Não existe "tela nova". Existe **estado**, ou mudança dentro de um estado que já
existe. Os dez estados vivem em
[`docs/jogo/ARENA.md`](../../../docs/jogo/ARENA.md): `IDLE`, `RECORDING`,
`ORIGIN`, `JUDGING`, `RESULT`, `CHALLENGE`, `VERSUS`, `SCOREBOARD`, `REMATCH`,
`ERROR`.

A estrutura é fixa — HUD, palco, reação, ação. **Ela não muda entre estados.** O
que muda é o conteúdo de cada faixa e o modo da Bolha.

Se o seu desenho precisa de uma quinta faixa, de rolagem no meio do jogo ou de
uma rota nova, o desenho está errado. Volta.

## 2. As perguntas

Para cada mudança, responda por escrito:

1. **Qual estado muda?** Muda o conteúdo, a saída, ou nasce transição nova?
2. **O que o jogador está sentindo** quando entra nesse estado? E quando sai?
3. **Quantos toques** até o resultado? Dá pra tirar um?
4. **Qual é a saída?** Todo estado tem saída. Estado sem saída é bug de design.
5. **E se der ruim?** Sem rede, sem microfone, permissão negada, link morto,
   parceiro sumiu. Cada um vai pra onde?
6. **Qual é a provocação depois?** O Auê nunca termina em "pronto" — termina em
   tenta de novo, chama no x1, manda no grupo, vai amarelar
   ([`docs/jogo/VOZ.md`](../../../docs/jogo/VOZ.md) §7).
7. **Com `prefers-reduced-motion` ligado**, o que acontece? A informação
   continua completa?
8. **O que isso NÃO deve virar?** Escreve. Isso vira o "Não viaja" da issue.

## 3. Regras que não se negociam

- **Nada finge que funciona.** Botão sem backend fica desabilitado. Mock fica
  marcado. Falha não vira sucesso por copy.
- **Estado nunca fica preso.** Sempre tem como sair, cancelar ou tentar de novo.
- **Recurso sensível tem começo e fim visíveis.** Microfone, gravação, timer e
  áudio tocando: o jogador enxerga que ligou e enxerga que desligou.
- **Erro conta a verdade** antes da piada
  ([`docs/jogo/VOZ.md`](../../../docs/jogo/VOZ.md) §8).
- **Resultado é placar, não relatório.** Nota, reação, provocação, próxima ação.
  Métrica explica depois.
- **A Arena não é feed.** Se o desenho começa a parecer perfil, timeline ou
  seguidores, parou — está fora da visão.

## 4. A saída

O que sai daqui entra no plano do Giam
([`AGENTS.md`](../../../AGENTS.md) §5.0) e na issue:

```text
ESTADO: qual estado da Arena, e o que muda nele
ANTES:  o que o jogador vê e sente ao entrar
AÇÃO:   o que ele faz, em quantos toques
DEPOIS: o que ele vê, e qual é a provocação
DEU RUIM: cada falha e pra onde ela leva
REDUCED MOTION: o que muda
NÃO VIAJA: no que isso não pode virar
```

Depois disso é que entra a [`desenharInterface`](../desenharInterface/SKILL.md).

## Relacionados

- **Como isso vira forma:** [`desenharInterface`](../desenharInterface/SKILL.md)
- **Se é jogo bom:** [`pensarComoJogo`](../pensarComoJogo/SKILL.md)
- **O texto:** [`aplicarTomOgro`](../aplicarTomOgro/SKILL.md)
- **A arquitetura:** [`arquitetarModulo`](../arquitetarModulo/SKILL.md)
- **Quem implementa:** [`criarComponenteUI`](../criarComponenteUI/SKILL.md)
