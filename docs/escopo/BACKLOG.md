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

**A fila de onze acabou em 11–12/08.** Onze issues entraram na `main`, uma
atrás da outra, com plano, revisão adversarial e aceite em cada uma:

| # | O que entrou |
|---|---|
| [#142](https://github.com/gmmattey/aue/issues/142) | o `.env.example` parou de mentir sobre o corte de produção — e virou trava de teste, não parágrafo |
| [#154](https://github.com/gmmattey/aue/issues/154) | o juiz parou de falar tipo ficha de RPG: 42 falas, reação de gente |
| [#110](https://github.com/gmmattey/aue/issues/110) | Anton para impacto, Archivo para interface |
| [#155](https://github.com/gmmattey/aue/issues/155) | a marca deixou de ser bolinha |
| [#151](https://github.com/gmmattey/aue/issues/151) | a nota viaja como imagem, e a zoeira chega inteira |
| [#102](https://github.com/gmmattey/aue/issues/102) | os sete casos de erro com estado honesto |
| [#103](https://github.com/gmmattey/aue/issues/103) | disputa local passando o celular |
| [#138](https://github.com/gmmattey/aue/issues/138) | landing desktop |
| [#134](https://github.com/gmmattey/aue/issues/134) | cada arroto vale um round |
| [#109](https://github.com/gmmattey/aue/issues/109) | o código fora da visão saiu do repositório |
| [#86](https://github.com/gmmattey/aue/issues/86) | a rodada acontece, em vez de ser apresentada |

**Não sobrou fila.** A próxima ordem sai da #136 quando alguém defender a
próxima coisa — e vale a regra anti-cemitério: pra entrar, tem que empurrar
algo pra baixo, destravar uma prioridade, ou ser risco que não dá pra ignorar.

Em paralelo, sem virar desenvolvimento, continua a
[#135](https://github.com/gmmattey/aue/issues/135) — descobrir se conteúdo de
arroto traz jogador ou só plateia.

## O que a fila deixou pendurado

Duas coisas, e nenhuma é código:

**As migrações não foram aplicadas.** A das falas do juiz
(`20260811000002`) e a da rivalidade (`20260811000003`) estão no repositório e
**não estão no banco**. Sem elas, o que está no ar não tem a régua que o código
espera. Os dois arquivos são seguros pra rodar de novo: função é
`CREATE OR REPLACE`, índice é `IF NOT EXISTS`, e o `CHECK` derruba antes de
recriar.

**Nenhuma das onze foi verificada em celular.** A que mais pesa é a #86: o
ambiente de teste não executa animação, então timing de revelação e cascata
passa verde mesmo errado. O defeito do piscão da nota foi pego lendo keyframe,
não rodando teste.

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
  [PR #139](https://github.com/gmmattey/aue/pull/139), fechada sem merge, mas a
  #138 não pede em lugar nenhum — a branch abriu por conta. Dobra a superfície
  de SEO pra manter e ninguém pediu público de fora do Brasil ainda. Se voltar,
  volta como trabalho novo em cima da `main` de hoje: rebase daquela branch
  reverteria o canônico da #137.
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
| [PR #139](https://github.com/gmmattey/aue/pull/139) · branch `agent/desktop-landing` · 28 commits · **fechada em 12/08** | landing desktop e pesquisa competitiva | **resolvido.** A [#138](https://github.com/gmmattey/aue/issues/138) puxou o que prestava arquivo a arquivo (o CSS, a estrutura da landing, a pesquisa). O resto refazia o canônico que a #137 já fez. Sobrou só a versão em inglês, anotada acima. **Falta apagar a branch** (topo `3804683`); os commits continuam alcançáveis pela PR mesmo depois disso |
| [PR #147](https://github.com/gmmattey/aue/pull/147) · branch `feat/previa-do-link` · 1 commit | a tentativa do caminho D da [#143](https://github.com/gmmattey/aue/issues/143), que fechou na saída B | não mergeia, e **a branch fica**. É registro: se um dia alguém voltar ao assunto com domínio próprio, a leitura pela RPC, a URL absoluta e os testes aproveitam |
| Supabase, produção | a função descartável `teste-content-type`, publicada só pra isolar a causa da #143 | **apagar no painel**, em *Edge Functions*. Já está inofensiva — devolve 410 e exige autorização —, mas continua lixo publicado. A ferramenta de linha de comando aqui não tem permissão pra apagar |
| Supabase, produção | o `og-preview` **está publicado** e responde 200 | **decidir se fica.** Não faz mal nenhum hoje: só a branch `feat/previa-do-link` gera o link que aponta pra ele, então ninguém no jogo chega ali. Mas também não serve pra nada, porque a #143 fechou aceitando o cartão genérico |

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

Ficou a suspeita de que o culpado não era o domínio compartilhado, e sim o
cabeçalho montado do jeito errado dentro da função. **Não era.** Conferido de
novo em 13/08, na função publicada: dos dois cabeçalhos que saem do mesmo lugar
do código, o de cache passa inteiro e o de tipo vira `text/plain` do mesmo
jeito. Se a culpa fosse de como o cabeçalho é montado, os dois cairiam juntos. E
mesmo que o tipo fosse corrigido, continua vindo um `sandbox` que bloqueia o
pulo pro jogo. Quem voltar aqui: essa porta já foi testada duas vezes.

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
