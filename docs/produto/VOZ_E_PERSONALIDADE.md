# Voz e personalidade do Auê

Fonte canônica de **como o Auê fala e se comporta**.

Derivado de [`HISTORIA_DO_AUE.md`](./HISTORIA_DO_AUE.md). Cada diretriz abaixo
aponta para o que na história a origina — é essa rastreabilidade que separa
personalidade de improviso. Quem for propor uma diretriz nova precisa conseguir
fazer o mesmo.

**Não repete biografia.** Quem é quem está na história. Aqui só entra o que uma
decisão de produto precisa saber.

---

## 1. Fala de amigo no churrasco, não de marca

**Vem de:** _"humor informal, sem parecer escrito por uma empresa tentando ser
engraçada"_ e do jeito direto e "meio ogro" que Guinho e Marcelo trazem.

- Segunda pessoa, direto: **"você"**. Nunca "o usuário".
- Frases curtas. Se precisa de vírgula demais para caber, não é do Auê.
- **Nunca explicar a piada.** Piada explicada é piada de empresa.
- Palavras banidas por soarem a departamento de marketing: _comunidade,
  engajamento, conteúdo, jornada, experiência, plataforma, solução, usuário_.
- Sem exclamação em série, sem emoji decorativo, sem "Ops!".

> ❌ "Ops! Ocorreu um erro inesperado ao processar sua experiência de áudio."
> ✅ "Deu ruim no envio. Grava de novo aí."

## 2. A piada é sobre o arroto, nunca sobre a pessoa

**Vem de:** o Auê ser _"uma brincadeira entre amigos transformada em produto"_ —
campeonatos informais entre primos, colegas de escola e trabalho. Provocação
entre quem se conhece é combinada; humilhação de estranho não é.

- Zoar o **desempenho** é o produto. Zoar **quem arrotou** não é.
- Nada de piada com corpo, gênero, aparência, condição física ou origem.
- Nota baixa merece deboche do arroto, não do arrotador. A pessoa continua
  convidada a tentar de novo — e o botão "Tentar de novo" está ali para isso.

> ⚠️ A skill [`aplicarTomOgro`](../../.agents/skills/aplicarTomOgro/SKILL.md)
> traz hoje o exemplo _"se ele for homem/mulher de verdade"_. É provocação por
> gênero, não por desempenho, e contraria esta diretriz. Fica registrado para
> correção — ver §8.

## 3. Hierarquia é parte da brincadeira

**Vem de:** _"Nos arrotos, porém, precisa reconhecer a hierarquia: Guinho ainda
ganha."_

O Auê não finge que todo mundo é igual. Dizer quem ganhou, quem perdeu e por
quanto **é** a diversão.

- Classificação nomeada e progressiva, não uma barra de progresso neutra.
- O placar aparece cedo e sem rodeio.
- Empate é anticlímax: quando houver, desempate por critério explícito.

## 4. Entrar, arrotar, receber nota — nessa velocidade

**Vem de:** _"diversão antes de burocracia"_, _"entrar, arrotar e receber uma
nota rapidamente"_, _"pouca fricção e nenhuma complexidade desnecessária"_.

- **Nada entre a vontade de arrotar e o arroto.** Sem cadastro, sem tutorial
  obrigatório, sem tela de boas-vindas.
- Toda tela nova precisa responder: _isso acelera o loop ou atrasa?_ Se atrasa,
  precisa de uma justificativa que valha o atraso.
- Pedir permissão de microfone é aceitável porque é o aparelho que exige. Pedir
  qualquer outra coisa antes da primeira nota, não.

## 5. Revanche é o fim de toda tela

**Vem de:** _"incentivar revanche e provocação entre amigos"_.

- Todo resultado termina com o caminho para devolver: desafiar, responder,
  mandar o link.
- O convite é para **uma pessoa específica**, não para um público. O Auê se
  espalha por link no grupo da família, não por feed.

## 6. Vocabulário de jogo, não de rede social

**Vem de:** o gosto por _"jogos competitivos, com ranking, pontuação e disputa"_
— Call of Duty, FIFA — e de o Auê _"não ter nascido para ser uma rede social
genérica com uma piada de arroto por cima"_.

- Diga: **placar, nota, round, pódio, revanche, disputa, desafio**.
- Não diga: post, publicação, seguidores, curtida, timeline, perfil.

## 7. Humor no tom, verdade no conteúdo

**Vem de:** o olhar de QA que pergunta _"tá, mas e se eu fizer isso aqui?"_ — e
do fato de que uma brincadeira só funciona enquanto ninguém se sente enganado.

Esta é a diretriz que mais restringe as outras:

- **Piada nunca substitui a informação.** Se o áudio não subiu, a tela diz que
  não subiu — com bom humor, mas dizendo.
- Nunca fingir que deu certo. Nunca esconder falha atrás de deboche.
- Nunca inventar número, prêmio ou ranking que não existe.

## 8. Monetização assumida, nunca disfarçada

**Vem de:** a meta de _"lançar produtos que, no mínimo, paguem a própria conta
de IA por meio de publicidade"_ — e de isso estar contado abertamente na
história, não escondido.

- Anúncio pode existir e pode ser mencionado com naturalidade. O Auê não precisa
  fingir que é de graça por mágica.
- **Anúncio nunca se disfarça de conteúdo** nem se encosta em botão de ação —
  clique acidental é enganação, além de derrubar a conta.
- Anúncio não atrasa o loop do §4.

---

## Teste rápido antes de publicar uma copy

1. Um primo seu falaria isso num churrasco? Se não, reescreva.
2. A piada é com o arroto ou com a pessoa? Se for com a pessoa, corte.
3. Está escondendo alguma coisa que deu errado? Se está, conserte antes do tom.
4. Dá para tirar metade das palavras? Tire.

## O que este documento NÃO faz

- **Não amplia o MVP.** Tom não é escopo. A autoridade sobre o que entra no
  produto continua sendo
  [`../functional/especificacao_funcional.md`](../functional/especificacao_funcional.md).
- **Não autoriza feature nova.** Uma diretriz de voz descreve COMO o que existe
  se comunica, nunca O QUE passa a existir. Ranking, feed e perfil citados aqui
  como vocabulário continuam atrás das flags que os desligam.
- **Não vira requisito por citação.** Call of Duty e FIFA aparecem como
  referência de sensação, não como funcionalidade a copiar.

## Relacionados

- **Origem e história humana:** [`HISTORIA_DO_AUE.md`](./HISTORIA_DO_AUE.md)
- **Autoridade sobre escopo:** [`../functional/especificacao_funcional.md`](../functional/especificacao_funcional.md)
- **Identidade visual e tokens:** [`../design_system/`](../design_system/)
- **Skill de copy:** [`../../.agents/skills/aplicarTomOgro/SKILL.md`](../../.agents/skills/aplicarTomOgro/SKILL.md)
  — ela dá diretrizes de tom e agora tem uma fonte acima dela. **Pendente:**
  fazer a skill apontar para este documento em vez de manter regra própria, e
  corrigir o exemplo citado no §2. Enquanto não for feito, o tom tem duas
  fontes que podem divergir.
