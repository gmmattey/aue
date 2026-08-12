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
| [#110](https://github.com/gmmattey/aue/issues/110) | Tipografia — Archivo como fonte de interface | Nada. |

## Anotado na entrega, sem issue ainda

**O erro fala sempre a mesma frase.** O protótipo tem 2-3 variantes por caso
(`docs/design/prototipo-arena/arena.html:938-971`) e o `erros.ts` tem uma só. Ficou
de fora da [#102](https://github.com/gmmattey/aue/issues/102) de propósito: o
`ARENA.md` pede que cada caso fale na lata, não que fale diferente toda vez, e o
erro é o último lugar onde variar importa. Se um dia entrar, entra junto com o
baralho da fala da nota — o mecanismo é o mesmo.

**A landing de desktop deixou cinco coisas de fora, e cada uma tem motivo.** A
[#138](https://github.com/gmmattey/aue/issues/138) entregou a landing e a página
`/como-arrotar`. O que ficou:

- **Versão em inglês** (`/en/`, `hreflang`, `x-default`). Existe pronta na
  `agent/desktop-landing`, mas a #138 não pede em lugar nenhum — a branch abriu
  por conta. Dobra a superfície de SEO pra manter e ninguém pediu público de
  fora do Brasil ainda.
- **`/arrotos-da-internet`.** A página depende de escolher vídeos reais de
  terceiros, e não existe lista curada nenhuma. Publicar com link inventado é
  interface fingindo que funciona. **A regra de uso já fica decidida aqui, e
  vale quando a página nascer: link com atribuição e título original, crédito
  visível, nunca embed, nunca download, nunca republicação.** Recusado:
  `<iframe>` de TikTok, Reels ou Shorts — traz script e cookie de terceiro pra
  dentro do Auê.
- **Comunidade / grupo de WhatsApp.** Não existe grupo oficial. Recusado:
  seção "em breve" de comunidade, que seria menu fingindo produto.
- **Open Graph em `/privacidade` e `/termos`, e imagem de OG por página.** As
  três páginas de conteúdo (home, `/como-jogar`, `/como-arrotar`) já têm card
  próprio apontando pra elas mesmas, mas dividem a mesma `og-image.png`.
  Ninguém compartilha termo de uso; arte por página é enfeite até alguém
  reclamar do card repetido.
- **Mover `useDispositivo` pra `src/plataforma/`.** Ele lê `window`, `navigator`
  e `matchMedia` direto de dentro de `src/shared/`, o que o
  [ADR 0001](../technical/adr/0001-arquitetura-oficial-do-aue.md) §6 proíbe.
  Dívida anterior à #138, e continua de pé: quem chama é o `App.tsx`. O
  `instalacao.ts` saiu do repositório junto com o botão de instalar, então essa
  parte da dívida acabou de vez em vez de mudar de pasta.
- **Botão de instalar próprio, se um dia fizer sentido.** Enquanto não existir,
  ninguém registra `beforeinstallprompt`: o listener sem consumidor engolia a
  promoção de instalação do próprio navegador — inclusive no Chrome de Android —
  e não oferecia nada no lugar. Se voltar, volta junto com quem chama
  `prompt()`, e provavelmente só no telefone, que é onde instalar o Auê leva pro
  lugar certo. Tem teste barrando o listener órfão.

**Baralho de verdade na fala da nota.** Hoje a fala é derivada de
`(nota, id do resultado)` — pura, sem coluna, sem RPC nova, e igual em toda tela
e em todo aparelho. O preço: dois arrotos seguidos podem cair na mesma fala (1
em 8 no miolo, 1 em 3 nas pontas). Virar baralho de verdade — a pessoa só repete
depois de esgotar a faixa — exige guardar qual par saiu junto do resultado
(coluna nova + parâmetro na RPC `enviar_resultado`) e memória de baralho no
aparelho. **Só vale abrir se o primo reclamar de repetição.**

**O padrão da flag da Arena continua desligado, e a produção precisa ligar.**
Saiu do recorte da [#142](https://github.com/gmmattey/aue/issues/142) de
propósito: inverter o padrão muda o que **todo** build serve — preview, máquina
de quem desenvolve, casca — e pede celular real, não carona numa correção de
texto. Enquanto o fluxo velho estiver de pé, build sem a variável publica o jogo
errado. Isso morre quando a Arena assumir a raiz de vez — a
[#109](https://github.com/gmmattey/aue/issues/109) tirou o que estava pendurado
no shell velho, não o shell.

**O `hospedagem-firebase.md` §2 ainda diz que o canônico é a Vercel.** O
`src/shared/enderecoPublico.ts` já aponta `https://aue.web.app` desde o `56470b1`
— é a fatia 2 da [#137](https://github.com/gmmattey/aue/issues/137) que aconteceu
e não voltou no documento. Mentira diferente da #142, não entrou junto.

**A vitrine ainda diz nome de criatura.**
`docs/design/design-system/aue-design-system-showcase.html`. Não vai pra tela de
ninguém — é vitrine de componente. O mock do feed que estava aqui junto sumiu
com a [#109](https://github.com/gmmattey/aue/issues/109).

## Trabalho pendurado

Coisa que existe fora da `main` e não pode ser esquecida.

**Confere com `git fetch` antes de olhar contagem de commit aqui.** Referência
velha já fez este arquivo dizer que uma branch com dezesseis commits estava
vazia e "dava pra apagar".

| Onde | O que é | O que fazer |
|---|---|---|
| [PR #139](https://github.com/gmmattey/aue/pull/139) · branch `agent/desktop-landing` · **28 commits** | landing desktop e pesquisa competitiva | **não mergeia, e o motivo virou definitivo.** A [#138](https://github.com/gmmattey/aue/issues/138) puxou o que prestava arquivo a arquivo (o CSS, a estrutura da landing, a pesquisa). O resto da branch refaz o canônico que a #137 já fez — mergear reverteria a #137 sem ninguém notar. Sobra dela só a versão em inglês, que está anotada acima. Fechar a PR é decisão do primo |
| [PR #147](https://github.com/gmmattey/aue/pull/147) · branch `feat/previa-do-link` · 1 commit | a tentativa do caminho D da [#143](https://github.com/gmmattey/aue/issues/143), que fechou na saída B | não mergeia. Fica de registro: se um dia alguém voltar ao assunto com domínio próprio, a leitura pela RPC, a URL absoluta e os testes aproveitam |
| Supabase, produção | a função descartável `teste-content-type`, publicada só pra isolar a causa da #143 | **apagar.** É lixo publicado, e não morreu com o fechamento da issue |
| Supabase, produção | o `og-preview` continua **não publicado** | fica assim de propósito. A #143 fechou aceitando o cartão genérico |

## Legado desligado — acabou

Feed, ranking global, XP, conquistas, perfil social, grupos, comunidades,
ligas/campeonatos, push e assinatura **saíram do repositório** na
[#109](https://github.com/gmmattey/aue/issues/109). Foram oito flags e as telas
delas. Sobraram três: `loginSocial`, `disputaLocal` e `arena`, e as três
escondem coisa que ainda vai acontecer.

O banco ficou de pé. A lista do que sobrou sem consumidor, com a decisão
"mantém, não apaga", está em
[`docs/technical/banco-sem-consumidor.md`](../technical/banco-sem-consumidor.md).

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
