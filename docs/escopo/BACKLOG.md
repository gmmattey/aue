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
| **agora** | [#101](https://github.com/gmmattey/aue/issues/101) | **Compartilhar — faz essa porra viajar direito** · *código no ar; falta provar em celular de verdade* |
| depois | [#134](https://github.com/gmmattey/aue/issues/134) | Rivalidade — cada arroto vale um round |
| depois | [#138](https://github.com/gmmattey/aue/issues/138) | Desktop — traz gente pro Auê, não tenta virar o jogo |
| em paralelo | [#135](https://github.com/gmmattey/aue/issues/135) | Conteúdo — um arroto de 10s traz gente pro jogo? *(não é desenvolvimento)* |

**A hospedagem fechou em 10/08.** A [#137](https://github.com/gmmattey/aue/issues/137)
entregou o `aue.web.app`, e o endereço oficial do jogo passou a ser ele — o
`aue.vercel.app` continua no ar respondendo todo link que já circulou. Era ela
que segurava a #101, e por isso tinha passado na frente: firmar link no endereço
velho pra trocar o chão depois sai caro.

**A #101 está quase fechada.** Foi cortada em duas em 10/08 — a prévia do
WhatsApp saiu dela e virou a [#143](https://github.com/gmmattey/aue/issues/143).
O que sobrou entrou no [PR #146](https://github.com/gmmattey/aue/pull/146):
`COMPARTILHAR` no resultado da Arena, sem criar batalha, com o texto repetindo a
mesma frase do juiz da tela e o link saindo no endereço novo. Junto saiu um
defeito que estava em produção: o "Mandar o desafio" do X1 não abria a folha do
sistema e falhava calado.

**Falta um requisito, e ele depende de aparelho:** mandar pra alguém de verdade,
de celular de verdade, em Safari iOS e Chrome Android. 13 de 14 atendidos. Não
vira "deve estar ok" — enquanto ninguém chegar lá, a issue fica aberta.

**Não pula a fila.** Terminou e validou → puxa a próxima.

## Travadas por decisão, não por trabalho

Nenhuma das duas abre branch hoje. Não é fila: é coisa esperando alguém decidir.

| # | Issue | O que trava |
|---|---|---|
| [#143](https://github.com/gmmattey/aue/issues/143) | Prévia — o link tem que chegar mostrando a nota | **Decisão de produto, e agora é a segunda.** A de arquitetura foi tomada: o [ADR 0003](../technical/adr/0003-a-previa-do-link.md) escolheu o caminho D. Aí ele caiu no ar — a Edge Function não pode servir HTML, porque o gateway do Supabase força `text/plain` no domínio compartilhado, e quem clicasse veria código-fonte em vez do jogo. Sobraram quatro saídas, com custo escrito na issue. |
| [#142](https://github.com/gmmattey/aue/issues/142) | O `.env.example` mente sobre as flags | Nada trava. É pequeno e é risco: já publicou o jogo errado uma vez. Entra quando alguém tiver dez minutos. |

Na #143 a recomendação está escrita: investigar o **D2** (domínio próprio nas
Edge Functions) antes de decidir, porque é a única saída que preserva o ADR. Se
não afrouxar os cabeçalhos, a escolha real vira **A** (Cloud Function, que o ADR
tinha recusado) ou **B** — aceitar o cartão genérico, que custa zero e já é o
plano B registrado. O link viaja e abre do mesmo jeito; só chega sem graça.

## Fora da fila, esperando decisão

Estas continuam abertas e a #136 não classificou nenhuma. Não são "próximas
features": ou alguém defende que uma delas empurra algo da fila pra baixo, ou
elas fecham. Vale a regra anti-cemitério.

| # | Issue | O que trava |
|---|---|---|
| [#86](https://github.com/gmmattey/aue/issues/86) | Arena — Bolha + game feel: gravação, espera e resultado têm que parecer jogo | Nada. É de dentro da Arena. |
| [#90](https://github.com/gmmattey/aue/issues/90) | Detecção — calibrar o limiar com áudio rotulado | **Trabalho que não é código.** Sem áudio rotulado por gente, incluindo negativos gravados de propósito, não existe calibrar — existe mexer. |
| [#102](https://github.com/gmmattey/aue/issues/102) | Erros — um estado honesto para os sete casos | Nada. |
| [#103](https://github.com/gmmattey/aue/issues/103) | Disputa local — o mesmo loop passando o celular | Está atrás de `VITE_FEATURE_DISPUTA_LOCAL`, desligada até rodar de ponta a ponta em telefone real. |
| [#109](https://github.com/gmmattey/aue/issues/109) | Legado — remover o código fora da visão do jogo | Nada. É dívida esperando remoção. |
| [#110](https://github.com/gmmattey/aue/issues/110) | Tipografia — Archivo como fonte de interface | Nada. |

## Trabalho pendurado

Coisa que existe fora da `main` e não pode ser esquecida.

| Onde | O que é | O que fazer |
|---|---|---|
| branch `agent/desktop-landing` | quatro commits de landing desktop e pesquisa competitiva, nunca mergeados. É da [#138](https://github.com/gmmattey/aue/issues/138), a última da fila — começou fora de ordem | não mergeia antes da vez dela. Quando chegar, confere se ainda presta ou refaz |
| branch `feat/previa-do-link` + [PR #147](https://github.com/gmmattey/aue/pull/147) | a tentativa do caminho D da [#143](https://github.com/gmmattey/aue/issues/143). Aberto, não mergeável — o caminho caiu | fica na branch, não joga fora. Se o D2 vingar, quase tudo aproveita: a leitura pela RPC, a URL absoluta, o `/x/` e os testes |
| branch `chatgpt/ajuste-fino-motor-arroto` | nada à frente da `main` | dá pra apagar |
| Supabase, produção | a função descartável `teste-content-type`, publicada só pra isolar a causa da #143 | **apagar.** É lixo publicado |

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

Hospedagem ([#137](https://github.com/gmmattey/aue/issues/137)) fechou em 10/08:
o jogo está no ar em `aue.web.app` e esse virou o endereço oficial, declarado
num lugar só (`src/shared/enderecoPublico.ts`) com as cópias fora do TypeScript
travadas por teste. O endereço antigo continua respondendo.

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
