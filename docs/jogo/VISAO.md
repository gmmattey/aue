# Visão do jogo — Auê

O desenho completo de produto está em [`AUÊ!-2.md`](AUÊ!-2.md). Esta visão é a
versão curta e normativa do que cabe no jogo; detalhes adicionais do GDD devem
respeitar a precedência definida em `AGENTS.md`.

## O que é

**Auê é um jogo mobile casual, web-first.**

> **Arrote. Receba a nota. Humilhe seus amigos.**

Abre no navegador do celular, arrota, ganha um número na cara e manda pro grupo.
Não tem cadastro, não tem tutorial, não tem tela de boas-vindas. A primeira coisa
que a pessoa vê já é o botão de arrotar.

## O que não é

Nada disso faz parte do produto — nem agora, nem como épico futuro:

- feed;
- seguidores;
- comunidades;
- campeonatos e ligas;
- temporadas;
- assinatura ou monetização;
- XP e níveis;
- conquistas;
- ranking global;
- perfil social;
- notificações.

Existe código de algumas dessas coisas no repositório, herdado da fase anterior.
Ele está desligado por flag e está na fila para sair — ver
[`../escopo/BACKLOG.md`](../escopo/BACKLOG.md). Código legado não é roadmap.

## Web-first, nativo depois

O alvo é a **web no celular**. É onde um link cai no grupo do WhatsApp e alguém
joga em três segundos sem instalar nada — que é a razão de o Auê existir.

Android e iOS nativos são um destino possível **depois**, não agora. A
consequência prática hoje é só uma: não fechar a porta.

- a Arena é uma superfície de estado único, que empacota fácil;
- o motor de áudio e o de score são módulos, não código de tela;
- nada depende de API que só existe em desktop.

**Não implemente Android/iOS nativo.** Preparar não é começar.

## As quatro coisas que não se negociam

1. **O toque tem que valer.** Abrir e arrotar precisa custar um toque. Cada tela,
   campo ou confirmação a mais é uma pessoa a menos que joga.
2. **A nota tem que ser defensável.** O juiz mede áudio de verdade e recusa o que
   não é arroto. Número tirado do nada mata a graça na segunda rodada.
3. **A humilhação é o produto.** Nota sozinha é brinquedo de um minuto. O jogo
   começa quando ela vira provocação em cima de alguém.
4. **Nada finge funcionar.** Botão sem backend fica desabilitado, erro é dito na
   lata, mock fica marcado.

## Como se parece

A referência visual e comportamental é o protótipo da Arena:

**[`../design/prototipo-arena/arena.html`](../design/prototipo-arena/arena.html)**

Ele não é inspiração solta: é o contrato de como a Arena se comporta, de como a
Bolha reage e de como a nota entra na tela. Ver
[`../design/README.md`](../design/README.md).

A direção artística detalhada está em [`../design/AUÊ!.md`](../design/AUÊ!.md).

## Como fala

Direto, informal, meio ogro, sem papo corporativo. A fonte é
[`VOZ.md`](VOZ.md). Rótulo de botão é contrato e não varia; provocação e reação
variam, porque é o que faz parecer alguém falando.

A piada nunca pode esconder risco, erro, segurança ou privacidade.

## De onde veio

[`HISTORIA.md`](HISTORIA.md). Contexto humano, não requisito.
