# ADR 0002 — O Auê nas lojas

**Status:** aceito
**Data:** 2026-08-09
**Decidiu:** Giam
**Substitui:** nada
**Altera:** o [ADR 0001](0001-arquitetura-oficial-do-aue.md) §3 e §8 (itens 5 e 6),
o `AGENTS.md` §7 e o `ESCOPO_ATUAL.md` §2.13 e §3
**Vale para:** todo o repositório

---

## O problema

O ADR 0001 escolheu o Capacitor e mandou **não instalar**. O motivo estava
escrito: "instalar pra deixar preparado" traz dependência nativa, ciclo de build
e Xcode para dentro de um jogo que ainda não tinha a Arena de pé.

A Arena está de pé. Os dez estados rodam em produção, o loop fecha do arroto até
a revanche, e o dono do produto tem conta de desenvolvedor da Play na mão.

A condição que segurava a decisão acabou. Este ADR abre a porta — e escreve
onde ela para, porque porta aberta sem batente é como se transforma um jogo em
dois.

---

## A decisão em uma frase

**O Capacitor entra, envolvendo o mesmo build do Vite, com adaptador nativo
apenas atrás de porta que já existe — e nenhuma tela, nenhuma regra e nenhuma
feature nasce do lado nativo.**

---

## 1. O que passa a ser permitido

O que o ADR 0001 §8 proibia sem revisão formal, e que este ADR libera:

- instalar o Capacitor e as pastas `android/` e `ios/` no repositório;
- plugin nativo, desde que **atrás de porta que já existe** em `src/portas/`;
- publicar na **trilha interna e alfa** da Google Play.

Continua exigindo ADR novo:

- **produção aberta na Play** — o dia em que qualquer um baixa;
- **qualquer coisa na App Store**, inclusive TestFlight;
- **plugin que não sirva a porta existente** — ou seja, capacidade nova;
- anúncio dentro do app, notificação, compra dentro do app, segunda base de
  código, e todo o resto da lista do 0001 §8.

## 2. A fronteira não afrouxa, ela cresce

A regra do 0001 §2 vale igual: API de aparelho vive em `src/plataforma/`. O que
muda é que agora existe mais de uma implementação.

```text
src/plataforma/
├── web/      o que já existe, e continua sendo o produto
└── nativo/   os adaptadores da casca
```

A escolha da montagem acontece em `src/arena/adaptadores.ts`, que já é função e
já recebe tudo por injeção. **Nada fora de `plataforma/` pode importar
Capacitor, plugin ou `@capacitor/*`** — e isso entra em
`src/arquitetura.fronteira.test.ts` junto com o resto, na mesma fatia que
instalar o Capacitor. Fronteira que ninguém checa é decoração (0001 §2).

A porta é a unidade. Adaptador nativo que precise de uma porta nova é sinal de
que o jogo ganhou capacidade — e capacidade nova não é empacotamento, é escopo.

## 3. O que a casca não pode fazer

Isto é o batente da porta:

- **nenhuma tela que o site não tenha.** A Arena é a mesma, os dez estados são
  os mesmos, a copy é a mesma;
- **nenhuma regra de jogo diferente por plataforma.** Nota é nota;
- **nenhuma flag do legado ligada** para "encher" a versão de app;
- **nenhuma segunda base de código**, nem um arquivo de tela em Swift ou Kotlin;
- **a web não vira a versão pobre.** O link que abre sem instalar continua sendo
  o produto (0001 §3), e quem não tem o app joga igual.

## 4. Até onde cada lado vai agora

**Android — até a trilha interna.** A conta existe. A trilha interna entrega o
app instalado de verdade para quem for convidado, sem fila de revisão. É o teste
que vale mais que qualquer emulador.

**iPhone — até o cabo.** Sem conta paga da Apple, o app instala num aparelho
ligado ao Mac e expira em poucos dias. Não vai para o telefone de terceiro, não
tem TestFlight e **não pode abrir o link do desafio** — a capacidade de link
universal depende da conta. Serve para o que importa: provar que microfone,
áudio e juiz funcionam dentro da casca do iPhone.

Nada disso é limitação do código. É o que cada loja libera com o que a gente tem
hoje, e está escrito para ninguém prometer o contrário numa tela.

## 5. O identificador do pacote

Ele é **permanente**: publicado uma vez, nem a Play nem a Apple deixam trocar.
Fica decidido aqui, antes de existir pasta nativa:

```text
com.auegames.aue
```

O `auegames` vem do guarda-chuva que já existe como repositório
(`gmmattey/aue-games`) e serve para os próximos jogos sem inventar convenção
nova a cada um. O domínio correspondente não é nosso hoje; isso **não** impede
publicar, e vale registrar quando sobrar troco — o identificador não muda por
causa disso.

O nome que aparece embaixo do ícone é **Auê!**, o mesmo do manifesto de hoje.

## 6. O juiz vai dentro do pacote

Na web, os 15 MB do YAMNet são baixados sob demanda e cacheados (0001 §4). Num
app, isso é bobagem: o pacote já foi baixado uma vez, pela loja, no Wi-Fi.

Na casca, os pesos são **asset local**. Primeiro arroto sem espera, e julgamento
que não depende da rede. O `globIgnores` e o cache de runtime do service worker
continuam valendo do lado da web, sem mudança.

## 7. Duas máquinas, uma base de código

O desenvolvimento nativo acontece **em dois computadores**, por decisão do dono
do produto: **iPhone no Mac** (Xcode) e **Android no Windows** (Android Studio).
Nenhum dos dois recebe a ferramenta do outro.

Isso não divide o projeto. As pastas `ios/` e `android/` que o Capacitor cria
ficam **versionadas no repositório**, e cada máquina mexe na sua ponta pelo
mesmo `git`. O que muda é operacional, e precisa estar escrito:

- **ninguém valida as duas pontas sozinho.** Uma fatia que toca as duas só está
  pronta quando rodou nas duas máquinas, e o relatório diz em qual rodou;
- **as duas máquinas precisam do mesmo Node** e do mesmo `npm install`. Versão
  diferente gera pasta nativa diferente e conflito bobo;
- **quem gera o pacote assinado da Play é a máquina Windows**, e é lá que a
  chave de assinatura tem que estar guardada — perder essa chave é perder a
  capacidade de atualizar o app publicado.

## 8. O que isso custa

- **Duas ferramentas grandes, uma em cada máquina**: Xcode no Mac, Android
  Studio no Windows. Nenhuma das duas é pequena.
- **O pacote engorda** com o juiz dentro. É a troca certa: ninguém espera 15 MB
  no 4G para receber a primeira nota.
- **Duas coisas para publicar em vez de uma.** Toda mudança de jogo que chegar
  na loja passa por um build nativo, e o site continua saindo na hora.
- **O legado ainda viaja junto** ([#109](https://github.com/gmmattey/aue/issues/109)).
  Não impede a trilha interna; vale terminar antes de qualquer coisa pública.

## 9. Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| **Continuar só PWA** | Resolve instalar, não resolve estar na loja, e no iPhone a permissão do microfone em aba se perde entre sessões. A conta da Play já está paga e parada. |
| **TWA só no Android** | Já recusada no 0001 §9, e pelo mesmo motivo: sobrariam dois jeitos de empacotar em vez de um. |
| **Esperar a #109 sair antes de empacotar** | Trocaria a única incerteza real do plano — microfone dentro da casca do iPhone — por uma faxina que não responde nada. A prova vem primeiro. |
| **Instalar o Capacitor e já mirar a App Store** | Sem conta da Apple não existe caminho, e a regra 4.2 pede valor nativo que ainda não está construído. Prometer data seria mentira. |

---

**Autoridade:** este ADR decide **como o Auê é empacotado e até onde cada loja
vai**. Não decide o que o jogo é, quais estados a Arena tem, nem o que pertence
ao escopo — e, como sempre, código e migração que rodam vencem qualquer
documento, inclusive este.
