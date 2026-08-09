---
name: aplicarTomOgro
description: Aplica a voz do Auê definida em docs/produto/VOZ_E_PERSONALIDADE.md sem inventar escopo ou capacidade.
---

# Skill: aplicarTomOgro

Orienta o **Guinho** e o **Marcelinho** a escrever copy e histórias de produto do Auê.

> ## ESTA SKILL NÃO É A FONTE DA VOZ
>
> A fonte canônica é
> [`docs/produto/VOZ_E_PERSONALIDADE.md`](../../../docs/produto/VOZ_E_PERSONALIDADE.md),
> derivada da história real em
> [`docs/produto/HISTORIA_DO_AUE.md`](../../../docs/produto/HISTORIA_DO_AUE.md).
>
> Leia a fonte antes de escrever. Esta skill é procedimento, não segundo manual de personalidade.

## 0. Gate antes da gracinha

Tom não cria feature.

Antes de escrever copy para implementação, confira:

1. [`docs/roadmap/GATE.md`](../../../docs/roadmap/GATE.md) — a Feature está liberada?
2. [`docs/mvp1/CONTRATO_MVP1.md`](../../../docs/mvp1/CONTRATO_MVP1.md) — ela pertence ao lançamento atual?

Feature bloqueada pode ter documentação/protótipo discutido. Não ganha implementação só porque apareceu uma copy boa.

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

A referência atual está em `docs/produto/VOZ_E_PERSONALIDADE.md`:

- 0–19 → **Foi isso?**
- 20–39 → **Tá fraco, hein.**
- 40–59 → **Dá pro gasto.**
- 60–74 → **Aí sim, porra.**
- 75–84 → **Caralho, veio forte.**
- 85–94 → **Tá maluco.**
- 95–99 → **Esse bagulho tá apelão.**
- 100 → **Tá roubado. Não é possível.**

Essas faixas não autorizam mudar score ou servidor de passagem. Quando a Feature #19 for liberada, implementação e testes precisam ser alinhados de ponta a ponta.

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

- avançar o gate;
- mudar escopo;
- ligar feature flag;
- mudar regra de score fora da Feature liberada;
- atacar pessoa em vez do desempenho;
- mentir sobre erro ou capacidade;
- transformar segurança, privacidade ou contrato técnico em piada imprecisa.
