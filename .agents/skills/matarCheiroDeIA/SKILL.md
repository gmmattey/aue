---
name: matarCheiroDeIA
description: Filtro obrigatorio contra linguagem e formato tipicos de IA em copy, issue, PR, commit e conversa do Aue.
---

# Skill: matarCheiroDeIA

Filtro final de **tudo que é escrito no Auê**: copy do jogo, issue, PR, commit,
mensagem pro primo, texto de erro, README.

Não é sobre estilo bonito. É sobre uma coisa só:

> **Se dá pra sentir que um robô escreveu, refaz.**

O Auê é um jogo de arroto feito por três primos. Nada aqui pode soar como
assistente virtual de banco.

Esta skill não é a fonte da voz — a fonte é
[`docs/jogo/VOZ.md`](../../../docs/jogo/VOZ.md). Aqui é a **lista do que mata**.

---

## 1. Palavras e frases banidas

### Abertura de robô

"Claro!" · "Com certeza!" · "Ótima pergunta!" · "Perfeito!" · "Excelente!" ·
"Vamos lá!" · "Boa!" seguido de explicação · repetir a pergunta antes de
responder · "Aqui está o que eu fiz" · "Segue abaixo" · "Vamos mergulhar em"

### Fechamento de robô

"Espero que ajude!" · "Fico à disposição" · "Qualquer dúvida, é só chamar" ·
"Em resumo," · "Concluindo," · "## Conclusão" · "Me avise se quiser que eu
ajuste" · oferecer três próximos passos que ninguém pediu

### Vocabulário de release note

robusto · poderoso · elegante · seamless · sem esforço · intuitivo · escalável ·
otimizar · alavancar · potencializar · impulsionar · elevar · desbloquear ·
maximizar · jornada do usuário · experiência fluida · solução completa ·
de forma eficiente e eficaz · valor agregado · alinhado com · leve e rápido

### Corporativês

"Como usuário, eu quero…" · critérios de aceitação · definition of done ·
entregável · stakeholder · alinhamento · sinergia · impacto no negócio ·
priorização estratégica · nice to have · quick win · MVP como adjetivo de
qualidade

### Muleta de estrutura

- **"Não é X. É Y."** — funciona uma vez. Três vezes no mesmo texto é tique.
- **"Não apenas X, mas também Y."**
- **"X — e isso muda tudo."**
- **"A verdade é que…"** / **"O ponto é…"** / **"Vale notar que…"**
- **"É importante lembrar que…"**
- travessão dramático em toda frase — o texto vira gagueira com pausa cara

## 2. Formatos banidos

- **Emoji abrindo cada bullet.** Um emoji porque coube, tudo bem. Um por linha, não.
- **Tudo virando lista.** Se era um parágrafo de três frases, é um parágrafo de
  três frases.
- **Negrito espalhado.** Negrito marca o que decide. Se metade do texto está em
  negrito, nada está.
- **Tabela pra duas informações.** Tabela é pra comparar, não pra enfeitar.
- **A tríade eterna.** Nem tudo tem exatamente três itens. Se tem dois, são dois.
- **Título em tudo.** Bilhete de três frases não tem `## Contexto`.
- **Resumo do que acabou de ser dito**, logo embaixo do que foi dito.
- **Disclaimer preventivo** — "vale lembrar que isso pode variar" — quando
  ninguém perguntou.
- **Hedge empilhado** — "talvez possa eventualmente". Ou é, ou não é, ou não se
  sabe e fala que não se sabe.

## 3. O que fazer no lugar

| Cheiro de IA | Auê |
|---|---|
| "Ops! Tivemos uma pequena instabilidade." | "Deu ruim no envio. A batalha não foi criada." |
| "Parabéns! Sua gravação foi processada com sucesso." | "91. Tá maluco." |
| "Otimizamos a experiência de compartilhamento." | "Agora o link abre mais rápido." |
| "Deseja tentar novamente?" | "Vai amarelar?" |
| "Sua sessão expirou. Por favor, faça login novamente." | "Caiu a sessão. Entra de novo." |
| "Estamos processando sua solicitação…" | "Julgando…" |

## 4. Copy do jogo tem regra extra

Além de tudo acima, copy que vai pra tela obedece
[`docs/jogo/VOZ.md`](../../../docs/jogo/VOZ.md) — inclusive:

- **rótulo de botão nunca varia** (é contrato); provocação e reação variam;
- **erro fala a verdade primeiro**, humor depois, e nunca esconde perda de dado;
- **a piada é com o arroto, não com a pessoa**;
- **voz não cria capacidade** — não escreve copy de coisa que não existe.

E aplica a [`aplicarTomOgro`](../aplicarTomOgro/SKILL.md), que é o procedimento
de escrever com essa voz.

## 5. O teste

Lê em voz alta. Uma pergunta:

> **Isso cabe num áudio de WhatsApp pro grupo dos primos?**

Se cabe, tá bom. Se parece post de LinkedIn, campanha de agência ou changelog de
SaaS, refaz.

Segundo teste, pra copy e issue — o **Teste de Guinho**, em
[`docs/jogo/VOZ.md`](../../../docs/jogo/VOZ.md).

## 6. Uma coisa que não é cheiro de IA

Texto **claro e organizado** não é cheiro de IA. Um passo a passo de verdade,
uma tabela que compara opções de verdade, um relatório de teste que separa o que
foi verificado do que não foi — isso é trabalho bem feito.

O cheiro é o enfeite: a estrutura que existe porque enche o olho, não porque
alguém precisava dela.

## Relacionados

- **A voz:** [`docs/jogo/VOZ.md`](../../../docs/jogo/VOZ.md)
- **Escrever copy:** [`aplicarTomOgro`](../aplicarTomOgro/SKILL.md)
- **Falar com o primo:** [`conversarComOPrimo`](../conversarComOPrimo/SKILL.md)
- **Issue, PR e commit:** [`registrarIssue`](../registrarIssue/SKILL.md)
