---
name: aplicarTomOgro
description: Aplica a voz do Auê definida em docs/jogo/VOZ.md sem inventar escopo ou capacidade.
---

# Skill: aplicarTomOgro

Procedimento do **Giam** — dono da copy — para escrever o texto do Auê. O
**Guinho** usa a mesma skill quando implementa a copy especificada, e o
**Marcelinho** a usa para checar se o texto entregue bate com a voz.

> ## ESTA SKILL NÃO É A FONTE DA VOZ
>
> A fonte canônica é
> [`docs/jogo/VOZ.md`](../../../docs/jogo/VOZ.md), derivada da história real em
> [`docs/jogo/HISTORIA.md`](../../../docs/jogo/HISTORIA.md).
>
> Leia a fonte antes de escrever. Esta skill é procedimento, não segundo manual de personalidade.

**Todo texto passa depois pela
[`matarCheiroDeIA`](../matarCheiroDeIA/SKILL.md).** Voz certa com cheiro de robô
não passa.

## 0. Tom não cria capacidade

Antes de escrever copy para implementação, confira
[`docs/escopo/ESCOPO_ATUAL.md`](../../../docs/escopo/ESCOPO_ATUAL.md): isso
pertence ao jogo?

Uma copy boa não autoriza uma feature. Se a frase promete algo que o jogo não
faz, o problema é a frase.

**Rótulo de botão é contrato e nunca varia.** Provocação, reação e comentário do
juiz variam — é o que faz parecer alguém falando, e não uma tela repetindo a
mesma piada pela décima vez. O protótipo
[`docs/design/prototipo-arena/arena.html`](../../../docs/design/prototipo-arena/arena.html)
mostra como isso funciona na prática, com os pools de fala por estado e por
faixa de nota.

## 1. Antes de escrever

Pensa menos “marca irreverente” e mais:

> jovem-adulto carioca + amigo falando merda + videogame/lan house anos 90/2000.

A voz pode usar palavrão de verdade.
Pode usar “coé”, “qual foi”, “deu ruim”, “tá de sacanagem”, “sinistro”, “maluco”, “bagulho”, “x1”, “apelão”, “roubado”, “noob”, “level”, “zerou” quando sair natural.

Não faça cosplay de carioca nem enfie gíria em toda frase.

A regra é simples:

> **se parece social media de empresa tentando falar jovem, reescreve.**

## 2. Ao escrever

- fala curta;
- pode xingar;
- palavrão entra como reação, não como decoração;
- usa vocabulário de jogo quando couber;
- provocação termina em resposta, revanche ou tentativa nova;
- informação vem primeiro em erro;
- a piada é com o arroto/desempenho, nunca com característica pessoal;
- nunca inventa capacidade técnica pra frase ficar engraçada.

Exemplos:

> ❌ “Parabéns! Seu desempenho atingiu uma classificação extraordinária.”
>
> ✅ “Caralho. Veio forte.”

> ❌ “Ops! Ocorreu um erro inesperado.”
>
> ✅ “Deu ruim no envio. A batalha não foi criada. Tenta de novo.”

> ❌ “Deseja desafiar outro usuário?”
>
> ✅ “Chama no x1.”

## 3. Classificação virou reação

Não use como direção principal os títulos antigos:

- Arroto de Hamster;
- Tentativa Honesta;
- Arroto Respeitável;
- Pedreiro Certificado;
- Trovão Gastrointestinal;
- Monstro do Esgoto;
- Arma Biológica;
- O ARROTO.

Eles ficam depreciados como copy de produto.

A referência atual está em `docs/jogo/VOZ.md`:

- 0–19 → **Foi isso?**
- 20–39 → **Tá fraco, hein.**
- 40–59 → **Dá pro gasto.**
- 60–74 → **Aí sim, porra.**
- 75–84 → **Caralho, veio forte.**
- 85–94 → **Tá maluco.**
- 95–99 → **Esse bagulho tá apelão.**
- 100 → **Tá roubado. Não é possível.**

Essas faixas não autorizam mudar score nem regra de servidor de passagem. Mexer
na nota é assunto de [`docs/jogo/REGRAS.md`](../../../docs/jogo/REGRAS.md) e
exige alinhar TypeScript, SQL e testes de paridade de ponta a ponta.

## 4. Issue também tem voz

Issue funcional não precisa parecer PRD corporativo.

Estrutura preferida:

### Qual é a parada
Conta a situação como alguém do grupo contaria.

### Tem que bater assim
Explica o comportamento e a sensação esperada.

### No protótipo
Aponta telas/fluxos relacionados.

### Não viaja
Diz em que aquilo não deve se transformar.

Critério técnico entra onde precisa, sem engolir a história.

## 5. Teste antes de publicar

1. Guinho falaria isso em voz alta sem parecer que recebeu briefing de agência?
2. Parece Rio de verdade ou caricatura de turista?
3. Tem cheiro de jogo ou de rede social genérica?
4. O palavrão saiu natural?
5. A piada é com o arroto?
6. Está escondendo erro?
7. Dá para cortar metade?
8. Dá vontade de responder, desafiar ou tentar de novo?

Se falhar, reescreve.

## 6. O que esta skill NÃO autoriza

- mudar escopo;
- ligar feature flag;
- mudar regra de score;
- atacar pessoa em vez do desempenho;
- mentir sobre erro ou capacidade;
- transformar segurança, privacidade ou contrato técnico em piada imprecisa.
