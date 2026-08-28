# Auê! — Registro de decisões de produto

**Data:** 2026-08-07
**Decisor:** Luiz
**Base:** avaliação independente de Marcelo (experiência/interface), Thiago (engenharia) e Rian (revisão/qualidade/segurança) sobre o protótipo `789ece07-6123-4280-aaf9-5705e4011684`.
**Status do protótipo na avaliação:** aprovado com ressalvas por Rian, como protótipo — não como produto.

Este arquivo é a fonte de verdade das sete decisões. Onde o protótipo ou o hub (`index.html`) contradisserem este documento, vale este documento.

---

## D1 — Faixa etária e regime legal

**Decisão: 13+, sob LGPD (adolescente), não COPPA.**

A faixa de 13 a 17 é adolescente sob o ECA: não exige consentimento parental pelo Art. 14 §1 da LGPD, mas cai no critério de melhor interesse do menor.

Consequências aceitas:
- Perfil público, seguidores cross-plataforma (`seguidores.html:22-24`) e comentários abertos passam a exigir defesa sob o critério de melhor interesse.
- `legal.html:83` precisa ser reescrito — hoje fixa o corte no padrão americano.
- Classificação etária nas lojas precisa ser coerente com o microcopy (ver lacuna L4).

---

## D2 — Modelo de moderação

**Decisão: pós-publicação, com denúncia, bloqueio e contato publicado.**

Hoje não existe nenhuma superfície de moderação: grep em 50 arquivos não encontra "denunciar", "bloquear" ou "silenciar". `comunidade-comentarios.html:100,135,136` só oferece fechar, escrever e enviar. `legal.html:76` promete remoção de conteúdo que nenhuma tela cumpre.

Entra no escopo:
- Tela/ação de **denunciar** conteúdo (áudio, comentário, post de comunidade).
- Tela/ação de **bloquear usuário**.
- **Contato publicado** — requisito da Apple (App Review 1.2) para UGC.
- Fila de moderação operada por alguém, com tempo de resposta definido.

O feed público permanece no MVP.

**Risco residual assumido:** com 13+, conteúdo inadequado fica visível a adolescentes até alguém denunciar. O tempo de resposta da fila é compromisso operacional, não detalhe de implementação.

---

## D3 — Autenticação e gate etário

**Decisão: convidado livre; gate etário e de conta na fronteira de publicação.**

Corrige o achado C2 de Rian. Estado anterior, incoerente:

| Caminho | Evidência | Destino | Passava pelo gate? |
|---|---|---|---|
| Google | `login.html:87` | `home.html` | Não |
| TikTok | `login.html:91` | `idade.html` | Sim |
| X | `login.html:95` | `idade.html` | Sim |
| Convidado | `login.html:103` | `home.html` | Não |

A premissa narrada em `index.html:174` — idade pedida só quando a conta autenticada não informa data de nascimento — é falsa: o Google OAuth não devolve data de nascimento sem o escopo `user.birthday.read`, raramente concedido.

Novo desenho:
- Entrar, gravar, ver a nota e ver o resultado: **livre, sem conta**.
- Publicar no feed, entrar em comunidade, seguir, comentar, aceitar desafio, criar grupo: **exige conta + idade**.
- `idade.html` sai do onboarding e vira interstício de publicação.
- `login.html` deixa de ser porta de entrada e vira consequência de uma ação.
- A data de nascimento é pedida e guardada pelo Auê!, **nunca herdada do OAuth**.

---

## D4 — "De onde veio?"

**Decisão: depois do resultado, opcional.**

Estado anterior: `gravacao.html:113` → `origem.html:78` → `julgando.html` → `resultado.html` — bloqueante. O hub afirmava o oposto duas vezes (`index.html:207`, `index.html:284`), e `resultado.html` não tinha link para `origem.html`.

Novo desenho:
- `gravacao.html` aponta direto para `julgando.html`.
- A origem vira card opcional em `resultado.html`, com caminho para `origem.html` / `origem-bebida.html` / `origem-comida.html`.
- Entra no escopo o estado "origem não informada" no resultado, no histórico e no ranking.

Preserva o pico de expectativa entre gravar e ver a nota — crítico agora que convidados sem conta entram por aí (D3). Custo aceito: dados de origem mais esparsos e enviesados.

---

## D5 — Controles hoje inertes

**Entram no MVP:**
- **Enviar comentário** (`comunidade-comentarios.html:136`) — sustenta a comunidade mantida em D2; exige persistência e fila de denúncia.
- **Adicionar/remover jogador** (`grupo-criar.html:106,111,114`, `campeonato-criar.html:98,103,106`) — exige convite, aceite e gestão de participantes.
- **Filtro de ranking por grupo** (`ranking.html:90`, `ranking-vazio.html:72`) — exige ranking em duas dimensões desde o backend.

**Sai do MVP:**
- **Sino de notificações** (`home.html:123`, `home-novo.html:82`) — **removido da interface**, não deixado inerte.

**Risco criado:** sem push, o link compartilhado por fora (WhatsApp, story) vira o **único** mecanismo de retorno do produto. Isso promove o player inerte de `desafio.html:125` de melhoria de fidelidade a gargalo do loop assíncrono inteiro — duelo, desafio e vez no grupo dependem dele.

---

## D6 — Termos e Política de Privacidade

**Decisão: URL externa canônica + espelho em `legal.html`.**

O texto vive numa URL pública — requisito de submissão da App Store e do Google Play — atualizável sem release. `legal.html` permanece no app como espelho legível offline, gerado da mesma fonte. Se divergirem, vale o externo.

Corrige os quatro `href="#"` de `idade.html:74` e `login.html:107`.

O texto precisa ser reescrito para refletir D1 e D2: `legal.html:76` promete moderação que nenhuma tela cumpre, `legal.html:83` fixa o corte etário errado.

---

## D7 — Cancelamento de assinatura vs. exclusão de conta

**Decisão: duas etapas — desativa agora, apaga ao fim do ciclo.**

Estado anterior, contraditório:
- `assinatura-cancelar.html:118` — "continua com o sem limite até o fim do ciclo já pago"
- `conta-apagar.html:84` — "Assinatura ativa é cancelada na hora"

Novo desenho:
- Ao apagar a conta, o perfil **sai do ar imediatamente** — some do feed, ranking e comunidades.
- A **exclusão definitiva dos dados** ocorre ao fim do ciclo pago.
- Sem reembolso; o período pago não é destruído, é cumprido em modo desativado.

Pendências herdadas do achado A3 de Rian, ainda a tratar: `conta-apagar.html:90-91` faz exclusão em um clique, sem reautenticação, sem confirmação digitada e sem exportação de dados — embora `legal.html:82` prometa o direito, garantido pela LGPD Art. 18.

**Risco residual assumido:** o prazo de exclusão varia conforme o ciclo de cobrança de cada usuário, o que é difícil de defender como prazo razoável sob a LGPD.

---

## Lacunas abertas pelas decisões

Quatro pontos que não existiam antes e precisam de resposta antes do código.

**L1 — A fronteira de publicação precisa ser enumerada por extenso.**
D3 troca um gate único por vários. Lista preliminar: publicar no feed, entrar em comunidade, seguir, comentar, aceitar desafio, criar grupo. Se cada um virar uma checagem solta, o C2 volta em outra forma. Tratar como regra única, aplicada num só ponto.

**L2 — A gravação do convidado sobrevive ao gate?**
Se ele grava, vê a nota e só então é barrado ao publicar, o áudio precisa persistir através do cadastro. Hoje não há persistência nenhuma no protótipo — só `sessionStorage` para um flag em `landing.html:142`.

**L3 — D7 não cobre quem não assina.**
Sem ciclo de cobrança não há "fim do ciclo". Falta o prazo fixo de exclusão para o usuário gratuito.

**L4 — O palavrão no microcopy ficou em aberto.**
Estava embutido em D1; a escolha de 13+ o torna passivo, mas não houve decisão de remover ou manter. Afeta `home.html:143`, `julgando.html:69`, `login.html:85`, `permissao.html:72`, `permissao-negada.html:77` — e a classificação etária nas lojas.

---

## Correções de contradição que não são decisão

Bugs do protótipo, para execução direta:

- `perfil.html:133-138` mostra o usuário como não assinante; `configuracoes.html:92-97` como assinante ativo — a um clique de distância. Alinhar num só estado.
- Melhor pessoal é 87,4 (`perfil.html:115`, `home.html:152`, `ranking.html:152`, `historico.html:75`), mas `resultado.html:105` entrega 91,4 e `duelo-resultado.html:101` entrega 93,8 — acima do "melhor", sem estado de recorde e ausentes do histórico.
- `desafio.html:100,121` põe Luiz com 91,4 em "#3 hoje", enquanto `ranking.html:109-137` tem 93,0 no #3 e 91,9 no #4 — 91,4 seria #5, e Luiz não aparece no ranking.
- `idade.html:78` e `permissao.html:77` são links fixos, tornando `idade-bloqueado.html` e `permissao-negada.html` inalcançáveis pelo fluxo.
- Entrada no sub-fluxo de gravação inconsistente: `grupo-vez.html:117` e `desafio.html:137` passam por `permissao.html`; `duelo-resultado.html:116` e `campeonato-lobby.html:114` pulam direto para `gravacao.html`.

---

## O que continua fora de escopo

Registrado por Rafael como não escopo, e não alterado por estas decisões:

- Consertar a PWA (`manifest.json:13-15` aponta para `icons/` inexistente; não há service worker, então `offline.html` é inalcançável) — será reescrita no MVP.
- Extrair o design system (59,2% do CSS é redundante; `--radius` vale 18px em 23 telas e 24px em `feed.html:12` e `seguidores.html:10`) — otimizar antes de saber quantas telas sobrevivem.
- Corrigir o `innerHTML` com input de usuário em `comunidade.html:244` — registrar como regra vinculante do MVP em vez de corrigir código descartável.
- Self-host das fontes Google (hoje o IP do usuário vai ao Google em 50/50 telas) — item de MVP, não de protótipo.

---

## Próximo passo em aberto

O spike de áudio recomendado por Thiago continua sendo o item de maior risco e **não depende de nenhuma destas sete decisões**: captura e pontuação de áudio não existem em código (zero `getUserMedia`, `MediaRecorder` ou `AudioContext` em 50 arquivos; `gravacao.html:113` finaliza a gravação com um link). Timebox de 5 dias, respondendo: dá para pontuar um arroto no browser? A nota é estável e percebida como justa em ~20 gravações reais? iOS Safari aguenta, ou o produto é nativo?
