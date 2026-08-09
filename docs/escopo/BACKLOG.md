# Backlog imediato — Auê

O que está na fila. Espelho das issues abertas no GitHub.

**Não existe épico, gate nem ordem obrigatória.** Pegue uma, entregue inteira,
abra PR. Se uma ideia não está aqui e não pertence a
[`ESCOPO_ATUAL.md`](ESCOPO_ATUAL.md), registre uma issue nova em vez de
implementar.

---

## A Arena

A superfície de estado único. Hoje o mesmo loop existe como telas React
separadas: o comportamento funciona, o que falta é a Arena.

A [#116](https://github.com/gmmattey/aue/issues/116) é a primeira: ela levanta a
estrutura do [ADR 0001](../technical/adr/0001-arquitetura-oficial-do-aue.md), a
máquina de estados e o `IDLE` funcionando. Comece por ela — as outras encostam
no que ela deixa pronto.

| # | Issue |
|---|---|
| [#116](https://github.com/gmmattey/aue/issues/116) | **A fundação da Arena — a estrutura do ADR, a máquina de estados e o IDLE de verdade** |
| [#84](https://github.com/gmmattey/aue/issues/84) | Arena — montar o shell de estado único · *absorvida pela #116* |
| [#85](https://github.com/gmmattey/aue/issues/85) | Arena — máquina dos dez estados · *a parte declarativa vai na #116* |
| [#86](https://github.com/gmmattey/aue/issues/86) | Arena — Bolha Auê como componente único com modos por estado |
| [#110](https://github.com/gmmattey/aue/issues/110) | Tipografia — Archivo como fonte de interface |

## Arrotar e ser julgado

| # | Issue |
|---|---|
| [#87](https://github.com/gmmattey/aue/issues/87) | Gravação — a Bolha reage ao áudio real dentro da Arena |
| [#88](https://github.com/gmmattey/aue/issues/88) | Gravação — teto de tempo, aviso e saída única |
| [#89](https://github.com/gmmattey/aue/issues/89) | Detecção — recusar o que não é arroto como estado do jogo |
| [#90](https://github.com/gmmattey/aue/issues/90) | Detecção — calibrar o limiar com áudio rotulado de verdade |
| [#91](https://github.com/gmmattey/aue/issues/91) | Origem — escolher em um toque dentro da Arena |
| [#92](https://github.com/gmmattey/aue/issues/92) | Julgamento — espera curta com teatro, sem virar tela de loading |
| [#93](https://github.com/gmmattey/aue/issues/93) | Resultado — revelar a nota com contagem e abrir as métricas depois |

> **#90 está bloqueada por trabalho que não é código.** Sem áudio rotulado por
> gente — inclusive exemplos negativos de propósito, gravados dentro do app — não
> existe calibrar, existe mexer.

## Humilhar

| # | Issue |
|---|---|
| [#94](https://github.com/gmmattey/aue/issues/94) | Desafiar — X1 como saída principal do resultado |
| [#95](https://github.com/gmmattey/aue/issues/95) | Assinatura — cobrar o nome só no ato de humilhar |
| [#96](https://github.com/gmmattey/aue/issues/96) | Link privado — copiável, imprevisível e com prazo real |
| [#97](https://github.com/gmmattey/aue/issues/97) | Resposta — ouvir o arroto do desafiante antes de responder |
| [#98](https://github.com/gmmattey/aue/issues/98) | VERSUS — o estado de quem foi chamado |
| [#99](https://github.com/gmmattey/aue/issues/99) | Placar — linhas que tocam o arroto de cada um |
| [#100](https://github.com/gmmattey/aue/issues/100) | Revanche — continuar a mesma disputa sem recomeçar |
| [#101](https://github.com/gmmattey/aue/issues/101) | Compartilhar — sem prometer o que o navegador não faz |
| [#103](https://github.com/gmmattey/aue/issues/103) | Disputa local — o mesmo loop passando o celular |

## Verdade, celular e publicação

| # | Issue |
|---|---|
| [#102](https://github.com/gmmattey/aue/issues/102) | Erros — um estado honesto para os sete casos |
| [#104](https://github.com/gmmattey/aue/issues/104) | Mobile real — validar a Arena em iPhone e Android de verdade |
| [#105](https://github.com/gmmattey/aue/issues/105) | Preparação Android/iOS — manter o motor separado da tela |
| [#106](https://github.com/gmmattey/aue/issues/106) | Privacidade mínima — prazo real, apagar o próprio áudio e texto honesto |
| [#107](https://github.com/gmmattey/aue/issues/107) | QA — suíte verde, paridade de regra e regressão da Arena |
| [#108](https://github.com/gmmattey/aue/issues/108) | Publicação — colocar a Arena no ar |

## Legado

| # | Issue |
|---|---|
| [#109](https://github.com/gmmattey/aue/issues/109) | Legado — remover o código fora da visão do jogo |

Feed, ranking global, XP, conquistas, perfil social, grupos, comunidades,
ligas/campeonatos, push e assinatura continuam no repositório, desligados por
`src/shared/flags.ts` com padrão desligado.

**Isso é dívida esperando remoção, não roadmap.** Ninguém deve expandir esse
código, e ligar uma dessas flags exigiria uma decisão de produto que hoje não
existe.

---

## O que foi fechado

As 44 issues da visão anterior foram fechadas como `not planned` no
reposicionamento de 2026-08-09: épicos de lançamento e de rede social, conta,
histórico, ranking, XP, conquistas, perfil, feed, seguidores, reações,
comentários, grupos, moderação de comunidade, ligas, temporadas, notificações,
integrações, Auê+ e app nativo — além das issues de UX que estavam escritas em
cima do gate sequencial e da sequência de páginas.

Registro completo em
[`../inventario-do-reposicionamento.md`](../inventario-do-reposicionamento.md).
