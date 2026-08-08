---
name: aplicarTomOgro
description: Aplica a voz do Aue definida em docs/produto/VOZ_E_PERSONALIDADE.md ao escrever copy de interface, provocacoes e patamares de gamificacao.
---

# 👹 Skill: aplicarTomOgro

Orienta o **Guinho** e o **Marcelinho** a escrever a copy do Auê.

> ## ⚠️ ESTA SKILL NÃO É A FONTE DA VOZ
>
> A fonte canônica é **[`docs/produto/VOZ_E_PERSONALIDADE.md`](../../../docs/produto/VOZ_E_PERSONALIDADE.md)**,
> derivado da história real do projeto em
> [`docs/produto/HISTORIA_DO_AUE.md`](../../../docs/produto/HISTORIA_DO_AUE.md).
>
> **Leia aquele documento antes de escrever qualquer texto.** Esta skill é o
> procedimento de aplicá-lo, não um segundo conjunto de regras — quando duas
> fontes descrevem o mesmo tom, uma delas fica desatualizada e ninguém sabe qual.

---

## 🎯 O que esta skill faz

Transformar as diretrizes de voz em texto de tela, e verificar o resultado antes
de ele existir no produto.

---

## 📋 Procedimento

### 1. Antes de escrever
Abrir `docs/produto/VOZ_E_PERSONALIDADE.md`. As oito diretrizes são o contrato.
As três que mais reprovam copy na prática:

- **§2 — a piada é sobre o arroto, nunca sobre a pessoa.** Zoar desempenho é o
  produto; zoar corpo, gênero, aparência ou condição não é.
- **§7 — humor no tom, verdade no conteúdo.** Piada nunca substitui informação.
  Se algo falhou, o texto diz o que falhou; o bom humor vem junto, não no lugar.
- **§1 — fala de amigo no churrasco, não de marca.** Sem "usuário", sem
  "comunidade", sem "Ops!", sem explicar a piada.

### 2. Ao escrever
- Segunda pessoa, direto. Frases curtas.
- **Erro fala como gente E diz o que houve.** "Deu ruim no envio: seu arroto não
  subiu, então ninguém vai conseguir ouvir. Grava de novo aí." — o deboche não
  come a informação.
- **Provocação é entre amigos e é sobre a NOTA.** O convite é para bater o
  placar, nunca para provar o que a pessoa é.

### 3. Patamares de gamificação
Os nomes de classificação **já existem** e são calculados no servidor
(`aue_classification_v1`, migração `20260807000011`, espelhada em
`src/features/audio/rules.ts`). São oito:

`Arroto de Hamster` · `Tentativa Honesta` · `Arroto Respeitável` ·
`Pedreiro Certificado` · `Trovão Gastrointestinal` · `Monstro do Esgoto` ·
`Arma Biológica` · `O ARROTO`

**Não invente patamar novo em copy.** A faixa que decide cada um está no SQL e
no TypeScript, com teste de paridade travando os dois — um nome inventado na
interface não bate com o que o banco devolve, e a tela passa a mentir. Mudar a
lista é mudar as duas fontes e o teste, não escrever um texto.

Cada patamar tem uma frase de juiz em `src/features/audio/frasesDoJuiz.ts`, e
`frasesDoJuiz.test.ts` exige que nenhum fique sem frase e que não exista frase
órfã.

### 4. Antes de publicar — o teste de quatro perguntas
Está em `VOZ_E_PERSONALIDADE.md` e vale repetir aqui porque é o passo final:

1. Um primo seu falaria isso num churrasco? Se não, reescreva.
2. A piada é com o arroto ou com a pessoa? Se for com a pessoa, corte.
3. Está escondendo alguma coisa que deu errado? Se está, conserte antes do tom.
4. Dá para tirar metade das palavras? Tire.

---

## 🚫 O que esta skill NÃO autoriza

- **Mudar escopo.** Tom não é feature. A autoridade sobre o que entra no produto
  é [`docs/functional/especificacao_funcional.md`](../../../docs/functional/especificacao_funcional.md).
- **Reescrever copy existente "de passagem".** Numa tarefa de refatoração ou
  correção, copy melhorável se ANOTA, não se muda: misturar mudança de texto com
  mudança de comportamento esconde as duas na revisão.
