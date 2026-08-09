# Arquivo — a visão anterior do Auê

**Nada nesta pasta tem autoridade.**

Estes documentos descrevem o Auê como ele foi pensado antes do reposicionamento
de 2026-08-09: um webapp/PWA com ambição de rede social, governado por um gate
sequencial de Features.

Hoje o Auê é um **jogo mobile casual, web-first** — ver
[`../jogo/VISAO.md`](../jogo/VISAO.md).

Eles ficam versionados porque guardam decisões, medições e justificativas que
custaram trabalho e continuam úteis como contexto histórico. **Não use nenhum
deles como argumento para implementar, ampliar escopo ou reverter uma decisão.**

## O que está aqui

| Documento | O que era | Substituído por |
|---|---|---|
| `CONTRATO_MVP1.md` | contrato de escopo do MVP1 de lançamento | [`../escopo/ESCOPO_ATUAL.md`](../escopo/ESCOPO_ATUAL.md) |
| `especificacao_funcional.md` | visão funcional ampla: feed, seguidores, XP, ligas, temporadas | [`../jogo/VISAO.md`](../jogo/VISAO.md) + [`../jogo/REGRAS.md`](../jogo/REGRAS.md) |
| `especificacao_ux_ui.md` | UX como sequência de páginas | [`../jogo/ARENA.md`](../jogo/ARENA.md) + [`../design/design-system/system/DESIGN.md`](../design/design-system/system/DESIGN.md) |
| `lancamento.md` | checklist de execução do MVP1; o próprio texto já se declarava parcialmente falso | issue de publicação no [backlog](../escopo/BACKLOG.md) |
| `auditoria_de_mercado.md` | hipóteses e sinais de mercado da fase social | — |

Também foram **removidos** no reposicionamento, e existem apenas no histórico do
git:

- `docs/roadmap/GATE.md` — o gate sequencial deixou de existir;
- `docs/squad.md` — o que restava dele vive no [`AGENTS.md`](../../AGENTS.md);
- `.agents/skills/otimizarMonetizacao/` — monetização saiu da visão.

## Coisas destes documentos que continuam valendo

Não porque estão aqui, mas porque foram **migradas** para as fontes atuais:

- a decisão sobre retenção de áudio depois dos 7 dias (o link expira, a gravação
  fica, e isso está escrito na política) → [`../jogo/REGRAS.md`](../jogo/REGRAS.md) §8
  e [`../escopo/ESCOPO_ATUAL.md`](../escopo/ESCOPO_ATUAL.md) §2.14;
- a fórmula do Auê Score e o critério dos pesos de origem → [`../jogo/REGRAS.md`](../jogo/REGRAS.md) §3;
- o que aprendemos sobre o limiar de detecção de arroto → [`../technical/deteccao-de-arroto-yamnet.md`](../technical/deteccao-de-arroto-yamnet.md)
  e a issue [#90](https://github.com/gmmattey/aue/issues/90).
