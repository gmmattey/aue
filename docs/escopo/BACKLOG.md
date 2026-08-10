# Backlog imediato — Auê

O que está na fila. Espelho das issues abertas no GitHub.

Se este arquivo divergir das issues, **as issues vencem**. Espelho velho é pior
que espelho nenhum: manda gente começar pelo lugar errado.

Se uma ideia não está aqui e não pertence a [`ESCOPO_ATUAL.md`](ESCOPO_ATUAL.md),
registre uma issue nova em vez de implementar.

---

## A fila ordenada

A ordem é decidida na [#136](https://github.com/gmmattey/aue/issues/136) e em
nenhum outro lugar. Ela é a fonte rápida — este arquivo é conveniência.

| Vez | # | Issue |
|---|---|---|
| **agora** | [#137](https://github.com/gmmattey/aue/issues/137) | **Hospedagem — botar o Auê em `aue.web.app` sem inventar moda** · *no ar, falta validar em celular* |
| depois | [#101](https://github.com/gmmattey/aue/issues/101) | Compartilhar — faz essa porra viajar direito · *cortada: a prévia virou [#143](https://github.com/gmmattey/aue/issues/143)* |
| depois | [#134](https://github.com/gmmattey/aue/issues/134) | Rivalidade — cada arroto vale um round |
| depois | [#138](https://github.com/gmmattey/aue/issues/138) | Desktop — traz gente pro Auê, não tenta virar o jogo |
| em paralelo | [#135](https://github.com/gmmattey/aue/issues/135) | Conteúdo — um arroto de 10s traz gente pro jogo? *(não é desenvolvimento)* |

A hospedagem passou na frente do compartilhar em 10/08: a #101 exige link curto
em `aue.web.app`, e quem traz esse endereço é a #137. Firmar o link no endereço
velho pra trocar o chão depois sai caro. Motivo completo na #136.

**A #101 foi cortada em duas em 10/08.** A prévia do WhatsApp saiu dela e virou
a [#143](https://github.com/gmmattey/aue/issues/143). O que ficou na #101 é
pequeno e quase pronto — botão, cartão e link curto já existem, falta apontar
pro endereço novo, valer no resultado da Arena e ser provado no zap. Misturadas,
uma coisa pequena parecia do tamanho de uma decisão de fronteira.

**Não pula a fila.** Terminou e validou → puxa a próxima.

## Travadas por decisão, não por trabalho

Nenhuma das duas abre branch hoje. Não é fila: é coisa esperando alguém decidir.

| # | Issue | O que trava |
|---|---|---|
| [#143](https://github.com/gmmattey/aue/issues/143) | Prévia — o link tem que chegar mostrando a nota | **Decisão de arquitetura.** O Firebase Hosting não separa o robô do jogador — e aceita a regra da Vercel **sem reclamar**, ignorando a condição. Os quatro caminhos possíveis estão na issue. Giam + Camillo alinham antes de existir código. |
| [#142](https://github.com/gmmattey/aue/issues/142) | O `.env.example` mente sobre as flags | Nada trava. É pequeno e é risco: já publicou o jogo errado uma vez. Entra quando alguém tiver dez minutos. |

## Fora da fila, esperando decisão

Estas continuam abertas e a #136 não classificou nenhuma. Não são "próximas
features": ou alguém defende que uma delas empurra algo da fila pra baixo, ou
elas fecham. Vale a regra anti-cemitério.

| # | Issue | O que trava |
|---|---|---|
| [#86](https://github.com/gmmattey/aue/issues/86) | Bolha Auê como componente único com modos por estado | Nada. É arrumação de dentro da Arena. |
| [#90](https://github.com/gmmattey/aue/issues/90) | Detecção — calibrar o limiar com áudio rotulado | **Trabalho que não é código.** Sem áudio rotulado por gente, incluindo negativos gravados de propósito, não existe calibrar — existe mexer. |
| [#102](https://github.com/gmmattey/aue/issues/102) | Erros — um estado honesto para os sete casos | Nada. |
| [#103](https://github.com/gmmattey/aue/issues/103) | Disputa local — o mesmo loop passando o celular | Está atrás de `VITE_FEATURE_DISPUTA_LOCAL`, desligada até rodar de ponta a ponta em telefone real. |
| [#109](https://github.com/gmmattey/aue/issues/109) | Legado — remover o código fora da visão do jogo | Nada. É dívida esperando remoção. |
| [#110](https://github.com/gmmattey/aue/issues/110) | Tipografia — Archivo como fonte de interface | Nada. |

## Trabalho pendurado

A branch `agent/desktop-landing` tem quatro commits de landing desktop e
pesquisa competitiva, nunca mergeados. É trabalho da [#138](https://github.com/gmmattey/aue/issues/138),
que é a última da fila — começou fora de ordem.

Não mergeia antes da vez dela. Quando chegar, confere se ainda presta ou refaz.

## Legado desligado

Feed, ranking global, XP, conquistas, perfil social, grupos, comunidades,
ligas/campeonatos, push e assinatura continuam no repositório, desligados por
`src/shared/flags.ts` com padrão desligado.

**Isso é dívida esperando remoção, não roadmap.** Ninguém deve expandir esse
código, e ligar uma dessas flags exigiria uma decisão de produto que hoje não
existe. A remoção é a [#109](https://github.com/gmmattey/aue/issues/109).

---

## O que foi fechado

**O loop fechou.** A fundação da Arena ([#116](https://github.com/gmmattey/aue/issues/116)),
gravação, detecção, origem, julgamento, resultado, desafio, link privado,
resposta, VERSUS, placar e revanche ([#87](https://github.com/gmmattey/aue/issues/87)–[#100](https://github.com/gmmattey/aue/issues/100))
foram entregues em 08–09/08. Privacidade mínima ([#106](https://github.com/gmmattey/aue/issues/106)),
preparação Android/iOS ([#105](https://github.com/gmmattey/aue/issues/105)),
QA ([#107](https://github.com/gmmattey/aue/issues/107)) e publicação
([#108](https://github.com/gmmattey/aue/issues/108)) também.

Mobile real ([#104](https://github.com/gmmattey/aue/issues/104)) fechou em 10/08:
o loop foi validado em iPhone e no app web de verdade. A regra de voltar ao
celular quando a mudança encosta em microfone, áudio, share ou desafio entre dois
aparelhos continua no [`AGENTS.md`](../../AGENTS.md) §5.4 — não precisa de issue
aberta pra lembrar.

As 44 issues da visão anterior foram fechadas como `not planned` no
reposicionamento de 09/08: épicos de lançamento e de rede social, conta,
histórico, ranking, XP, conquistas, perfil, feed, seguidores, reações,
comentários, grupos, moderação de comunidade, ligas, temporadas, notificações,
integrações, Auê+ e app nativo — além das issues de UX escritas em cima do gate
sequencial e da sequência de páginas.

Registro completo em
[`../inventario-do-reposicionamento.md`](../inventario-do-reposicionamento.md).
