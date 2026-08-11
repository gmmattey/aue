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
| **agora** | [#154](https://github.com/gmmattey/aue/issues/154) | **O juiz ainda fala tipo ficha de RPG** — trocar as classificações por reação de gente, 42 falas em baralho. É um pedaço da #86, puxado pra frente |
| depois | [#151](https://github.com/gmmattey/aue/issues/151) | A zoeira viaja como imagem, não como link |
| depois | [#86](https://github.com/gmmattey/aue/issues/86) | Arena — Bolha + game feel: gravação, espera e resultado têm que parecer jogo |
| depois | [#134](https://github.com/gmmattey/aue/issues/134) | Rivalidade — cada arroto vale um round |
| depois | [#138](https://github.com/gmmattey/aue/issues/138) | Desktop — traz gente pro Auê, não tenta virar o jogo |
| em paralelo | [#135](https://github.com/gmmattey/aue/issues/135) | Conteúdo — um arroto de 10s traz gente pro jogo? *(não é desenvolvimento)* |

**A #86 entrou na fila em 11/08** e empurrou a rivalidade pra baixo. A #151 traz
gente de fora; a #86 é o que essa gente encontra quando chega. Hoje o jogo
*"funciona, mas ainda parece um webapp que mede arroto"* — palavras do dono do
produto usando. Trazer desconhecido pra dentro disso é gastar o tiro. **A #151
espalha, a #86 agarra, a #134 faz durar** — e durar é o último problema de quem
ainda não agarrou ninguém.

**A fala do juiz furou tudo**, e é a dor nº 7 da própria #86 (*"o Auê vira NPC
de três falas"*). Veio pra frente porque a #151 vai **imprimir essa frase numa
imagem** que sai do jogo e viaja pra quem nunca ouviu falar dele. Imagem que
saiu não volta.

**A #151 furou a fila em 11/08**, por decisão do Luiz e pela regra
anti-cemitério da #136: ela empurra a rivalidade pra baixo porque **a #151 é o
que faz o jogo se espalhar e a #134 é o que faz o jogo durar** — e sem gente
chegando, durar não serve de muito. A nota vira imagem, e imagem o WhatsApp
mostra sempre, sem robô e sem muro.

**Duas fecharam em 10/08 e a fila andou.** A
[#137](https://github.com/gmmattey/aue/issues/137) entregou o `aue.web.app`, que
virou o endereço oficial — o `aue.vercel.app` continua no ar respondendo todo
link que já circulou. E a [#101](https://github.com/gmmattey/aue/issues/101)
fechou com 14 de 14 depois do teste em celular de verdade.

**O que a #101 provou vale mais que ela.** Quem recebeu o link abriu **direto na
tela de arrotar de volta** — não numa página falando sobre o jogo. É a primeira
evidência a favor da [#135](https://github.com/gmmattey/aue/issues/135): o
caminho de quem chega de fora não tem degrau no meio.

**Não pula a fila.** Terminou e validou → puxa a próxima.

## Travadas por decisão, não por trabalho

Não é fila: é coisa esperando alguém decidir.

| # | Issue | O que trava |
|---|---|---|
| [#142](https://github.com/gmmattey/aue/issues/142) | O `.env.example` mente sobre as flags | Nada trava. É pequeno e é risco: já publicou o jogo errado uma vez. Entra quando alguém tiver dez minutos. |

## Fora da fila, esperando decisão

Estas continuam abertas e a #136 não classificou nenhuma. Não são "próximas
features": ou alguém defende que uma delas empurra algo da fila pra baixo, ou
elas fecham. Vale a regra anti-cemitério.

| # | Issue | O que trava |
|---|---|---|
| [#90](https://github.com/gmmattey/aue/issues/90) | Detecção — calibrar o limiar com áudio rotulado | **A calibração aconteceu** na [#150](https://github.com/gmmattey/aue/issues/150), fechada em 11/08. Falta decidir se a #90 fecha junto ou se sobra pergunta nela. |
| [#102](https://github.com/gmmattey/aue/issues/102) | Erros — um estado honesto para os sete casos | Nada. |
| [#103](https://github.com/gmmattey/aue/issues/103) | Disputa local — o mesmo loop passando o celular | Está atrás de `VITE_FEATURE_DISPUTA_LOCAL`, desligada até rodar de ponta a ponta em telefone real. |
| [#109](https://github.com/gmmattey/aue/issues/109) | Legado — remover o código fora da visão do jogo | Nada. É dívida esperando remoção. |
| [#110](https://github.com/gmmattey/aue/issues/110) | Tipografia — Archivo como fonte de interface | Nada. |

## Trabalho pendurado

Coisa que existe fora da `main` e não pode ser esquecida.

**Confere com `git fetch` antes de olhar contagem de commit aqui.** Referência
velha já fez este arquivo dizer que uma branch com dezesseis commits estava
vazia e "dava pra apagar".

| Onde | O que é | O que fazer |
|---|---|---|
| [PR #139](https://github.com/gmmattey/aue/pull/139) · branch `agent/desktop-landing` · **28 commits** | landing desktop e pesquisa competitiva. É da [#138](https://github.com/gmmattey/aue/issues/138), a última da fila — começou fora de ordem | não mergeia antes da vez dela. Quando chegar, confere se ainda presta ou refaz |
| [PR #147](https://github.com/gmmattey/aue/pull/147) · branch `feat/previa-do-link` · 1 commit | a tentativa do caminho D da [#143](https://github.com/gmmattey/aue/issues/143), que fechou na saída B | não mergeia. Fica de registro: se um dia alguém voltar ao assunto com domínio próprio, a leitura pela RPC, a URL absoluta e os testes aproveitam |
| Supabase, produção | a função descartável `teste-content-type`, publicada só pra isolar a causa da #143 | **apagar.** É lixo publicado, e não morreu com o fechamento da issue |
| Supabase, produção | o `og-preview` continua **não publicado** | fica assim de propósito. A #143 fechou aceitando o cartão genérico |

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

Calibração do motor ([#150](https://github.com/gmmattey/aue/issues/150)) fechou
em 11/08: a nota passou a ser **FORÇA · FÔLEGO · GRAVE**, textura zerada,
calibrada em 32 arrotos únicos de um lote real. Smoke no aparelho: arroto tirou
nota, fala comum foi recusada.

**A migração está aplicada em produção.** A trava do banco aceita as **duas**
fórmulas de propósito — nota velha continua explicada pela v1, nota nova nasce
pela v2, e não existe backfill. Sem isso, os 11 resultados gravados ficariam
impossíveis de ter o áudio apagado e de esconder por denúncia: conferido antes
de aplicar, 11 passavam pela v1 e **zero** pela v2. Quem for mexer ali um dia:
**não "limpe" a check deixando só a v2.** Está escrito no corpo da migração.

Prévia do link ([#143](https://github.com/gmmattey/aue/issues/143)) fechou em
11/08 **por decisão, não por trabalho**: o cartão genérico fica como está. O
caminho aprovado no [ADR 0003](../technical/adr/0003-a-previa-do-link.md) caiu no
ar — a Edge Function não pode servir HTML no domínio compartilhado — e as saídas
restantes cobravam plano pago, segunda plataforma ou o produto rachado em dois
endereços. A saída B sempre esteve escrita: o link viaja e abre, só chega sem
graça. E chegar sem graça passou a importar menos, porque a
[#151](https://github.com/gmmattey/aue/issues/151) faz a nota viajar como
imagem. O ADR 0003 não foi revogado: ele registra o que foi decidido e o que a
realidade respondeu.

Compartilhar ([#101](https://github.com/gmmattey/aue/issues/101)) fechou em
10/08: o `RESULT` da Arena ganhou o `COMPARTILHAR` que o `ARENA.md` sempre
listou, sem criar batalha, com o texto repetindo a mesma frase do juiz da tela.
Junto saiu um defeito que estava em produção — o "Mandar o desafio" do X1 não
abria a folha do sistema e falhava calado.

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
