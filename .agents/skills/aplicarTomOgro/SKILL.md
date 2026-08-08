---
name: aplicarTomOgro
description: Aplica a voz do Aue definida em docs/produto/VOZ_E_PERSONALIDADE.md sem inventar escopo ou capacidade.
---

# Skill: aplicarTomOgro

Orienta o **Guinho** e o **Marcelinho** a escrever copy do Auê.

> ## ESTA SKILL NÃO É A FONTE DA VOZ
>
> A fonte canônica é
> [`docs/produto/VOZ_E_PERSONALIDADE.md`](../../../docs/produto/VOZ_E_PERSONALIDADE.md),
> derivada da história real em
> [`docs/produto/HISTORIA_DO_AUE.md`](../../../docs/produto/HISTORIA_DO_AUE.md).
>
> Leia a fonte antes de escrever. Esta skill é procedimento, não segundo manual
> de personalidade.

## 0. Gate de escopo

Tom não cria feature.

A autoridade do lançamento é
[`docs/mvp1/CONTRATO_MVP1.md`](../../../docs/mvp1/CONTRATO_MVP1.md).

Se a tarefa pede copy para uma feature futura/desligada, escrever texto não é
autorização para expor ou implementar essa feature.

## 1. Antes de escrever

As diretrizes que mais reprovam copy na prática:

- **a piada é sobre o arroto, nunca sobre a pessoa**;
- **humor no tom, verdade no conteúdo**;
- **fala de amigo no churrasco, não de marca**;
- **o absurdo é no tema; a execução continua séria**.

## 2. Ao escrever

- segunda pessoa, direto;
- frases curtas;
- informação primeiro quando houver erro;
- provocação baseada em nota/desempenho;
- nunca usar identidade, corpo ou característica pessoal como alvo;
- nunca inventar capacidade técnica para a frase ficar engraçada.

Exemplo de erro:

> Deu ruim no envio. Sua nota apareceu, mas a batalha não foi criada.

Melhor isso do que uma piada excelente que faz a pessoa acreditar que o link
existe quando não existe.

## 3. Classificações

Os nomes de classificação são regra do produto e precisam continuar coerentes
com servidor e frontend.

Lista atual:

- Arroto de Hamster;
- Tentativa Honesta;
- Arroto Respeitável;
- Pedreiro Certificado;
- Trovão Gastrointestinal;
- Monstro do Esgoto;
- Arma Biológica;
- O ARROTO.

**Não invente patamar novo só na interface.**

Se a classificação oficial mudar, atualize as fontes técnicas e testes
correspondentes; copy não pode criar uma nona faixa clandestina.

## 4. Frases do juiz

Use a fonte implementada de frases do juiz quando existir.

Nova frase precisa:

- caber no patamar correto;
- zoar o arroto;
- não esconder dado;
- não repetir piada corporativa;
- não usar preconceito como atalho para provocação.

## 5. Teste antes de publicar

Use as perguntas da fonte canônica:

1. Um primo falaria isso num churrasco?
2. A piada é com o arroto ou com a pessoa?
3. Está escondendo alguma falha?
4. Dá para tirar metade das palavras?
5. Está inventando capacidade que o produto não tem?

Se falhar em qualquer uma, reescreva.

## 6. O que esta skill NÃO autoriza

- mudar escopo;
- ligar feature flag;
- inventar classificação;
- mudar regra de score;
- reescrever copy existente "de passagem" numa refatoração sem relação;
- transformar documentação técnica em piada a ponto de perder precisão.

Numa tarefa de refatoração, copy melhorável pode ser anotada para tarefa própria
quando a alteração de texto mudaria o diff sem necessidade.
