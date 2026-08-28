# Voz e personalidade do Auê

O GDD [`AUÊ!-2.md`](AUÊ!-2.md) traz exemplos de copy de botões, reações e
momentos. Este arquivo continua definindo os critérios de voz; exemplos novos
precisam passar por eles e não podem inventar capacidade.

Fonte canônica de **como o Auê fala e se comporta**.

Derivado de [`HISTORIA.md`](./HISTORIA.md).

Escopo não mora aqui. Para saber o que pertence ao jogo agora, leia
[`../escopo/ESCOPO_ATUAL.md`](../escopo/ESCOPO_ATUAL.md).

O protótipo [`../design/prototipo-arena/arena.html`](../design/prototipo-arena/arena.html)
mostra esta voz funcionando: os pools de fala por estado e por faixa de nota, e a
regra de que rótulo de botão nunca varia.

---

# A voz em uma frase

O Auê fala como um jovem-adulto carioca que cresceu jogando videogame nos anos 90/2000, está com os amigos no estacionamento do shopping, alguém solta um arroto absurdo e a primeira reação é:

> **CARALHO, QUAL FOI ISSO?**

Não é voz de startup.
Não é marca tentando falar “jovem”.
Não é tiozão aprendendo gíria no TikTok.

É amigo falando com amigo.

---

## 1. Pode falar palavrão. Só não força a barra.

Palavrão aqui é pontuação emocional.

Pode aparecer:

- porra;
- caralho;
- merda;
- puta que pariu;
- tá de sacanagem;
- que porra foi essa?;
- foda;
- deu ruim.

Mas não é para enfiar “caralho” em toda frase como adolescente que descobriu palavrão ontem.

O palavrão entra onde alguém falaria de verdade.

> ❌ “Parabéns, caralho! Seu arroto, porra, foi analisado com sucesso, merda!”
>
> ✅ “Caralho. Veio forte.”

---

## 2. Carioca, mas sem cosplay de carioca

Referências de fala carioca reconhecíveis incluem **coé/qual foi**, **maneiro**, **sinistro**, **irado**, **deu ruim**, **maluco**, **bagulho/parada**, **mó** e **tá de sacanagem**.

Use quando sair natural. Não enfie três dessas na mesma frase só para provar que o produto nasceu no Rio.

> ❌ “Coé mermão, mó bagulho sinistro, tá ligado?”
>
> ✅ “Coé. Vai amarelar agora?”

---

## 3. Tem cheiro de videogame velho e lan house

A referência não é e-sport corporativo. É multiplayer no sofá, lan house, PS2, Counter-Strike, FIFA, Mortal Kombat, Street Fighter e gente acusando o amigo de roubar.

Palavras que cabem naturalmente:

- x1;
- apelão;
- roubado;
- noob;
- round;
- fase;
- boss;
- combo;
- level;
- zerou;
- continue;
- revanche;
- placar;
- GG, quando realmente couber.

“Apelão” e “x1” têm história real na fala gamer BR; não são enfeite inventado para o Auê.

Não transforme tudo em metáfora gamer. “Servidor indisponível” não precisa virar “boss final da infraestrutura”.

---

## 4. Menos título de RPG. Mais reação de gente.

Os nomes de criatura saíram. **Não estão depreciados: não existem mais.** A
faixa da nota fala, e a fala é esta:

| Nota | Reação |
|---:|---|
| 0–19 | **Foi isso?** |
| 20–39 | **Tá fraco, hein.** |
| 40–59 | **Dá pro gasto.** |
| 60–74 | **Aí sim, porra.** |
| 75–84 | **Caralho, veio forte.** |
| 85–94 | **Tá maluco.** |
| 95–99 | **Esse bagulho tá apelão.** |
| 100 | **Tá roubado. Não é possível.** |

Essas oito são o **rótulo** de cada faixa — é o que o banco guarda e o que sai
quando não há de onde derivar outra coisa. Mas cada faixa tem mais de uma fala:
são 42 no total, escritas e pareadas com a frase do juiz em
`src/nucleo/nota/faixas.ts`. Regra de gameplay é assunto de
[`REGRAS.md`](./REGRAS.md); a lista completa vive no código, que é onde ela é
usada.

O princípio é mais importante que a frase exata:

> **parecer reação de amigo, não classe de personagem.**

Quem for escrever uma fala nova: duas orações curtas na frase do juiz, a segunda
desmentindo ou piorando a primeira. A piada é com o arroto ou com o desempenho,
nunca com quem arrotou (§5). Sem emoji.

---

## 5. A piada é com o arroto, não com a pessoa

Pode humilhar o desempenho.
Não humilha característica pessoal.

Pode:

> “Foi isso? Tenta de novo aí.”

Não pode atacar corpo, gênero, aparência, deficiência, raça, origem, sexualidade ou qualquer característica pessoal.

Se a zoeira deixa de parecer coisa entre amigos e vira ataque pessoal, passou do ponto.

---

## 6. Resultado é placar, não relatório

A pessoa acabou de arrotar. Ela quer saber quanto deu.

Prioridade:

1. nota;
2. reação;
3. provocação;
4. próxima ação.

As métricas explicam depois.

> **91,4**
>
> **Tá maluco.**
>
> “Manda isso no grupo e vê se alguém peita.”

Muito melhor que um parágrafo explicando “performance acústica relativa”.

---

## 7. Revanche é quase obrigação moral

O Auê nunca termina em “pronto”.

Termina em:

- tenta de novo;
- chama no x1;
- manda no grupo;
- responde;
- vai amarelar?;
- pede revanche.

A próxima ação precisa parecer provocação natural, não CTA de funil.

---

## 8. Erro fala a verdade primeiro

Aqui Marcelo manda.

Se deu merda, fala o que deu merda.

> ❌ “Ops! Tivemos uma pequena instabilidade.”
>
> ✅ “Deu ruim no envio. A batalha não foi criada. Tenta de novo.”

Pode ter humor, mas nunca esconder perda de dado, microfone preso, upload falho ou ação que não aconteceu.

---

## 9. UI pode ser bonita pra caralho sem ficar metida

O Auê é uma ideia idiota tratada como produto de verdade.

Então:

- visual pode ser premium;
- animação pode ter impacto;
- score pode entrar com presença;
- pódio pode ser exagerado;
- erro continua legível;
- acessibilidade continua valendo;
- não enche de card e efeito só porque sabe fazer.

A estética não precisa parecer piada. A situação já é a piada.

---

## 10. Rede social não é o sonho secreto

O centro é jogo e provocação.

Prefira:

- batalha;
- x1;
- revanche;
- disputa;
- placar;
- round;
- pódio;
- ranking.

Feed, seguidores, perfil e grupo podem existir no futuro, mas não podem transformar o Auê em Instagram com arroto.

---

## 11. Monetização: sem caô

Se tiver anúncio, é anúncio.
Se tiver Auê+, é Auê+.
Se cobrar, a cobrança funciona de verdade.

Nada de botão fake, assinatura “em breve” fingindo checkout ou anúncio disfarçado de conteúdo.

E ninguém compra nota melhor.

Pay-to-win de arroto seria uma merda até para os nossos padrões.

---

# Como escrever uma issue com a voz certa

Issue do Auê não precisa parecer documento de banco.

Prefira esta ordem:

### Qual é a parada

Conta a situação como alguém do grupo contaria.

### Tem que bater assim

Explica a sensação e o comportamento esperado sem virar manual técnico.

### No protótipo

Aponta as telas/fluxos relacionados.

### Não viaja

Diz claramente no que a feature **não** deve virar.

Critério técnico, segurança, API e detalhe operacional entram onde forem necessários para executar — não precisam dominar a história da issue.

---

# Teste de Guinho

Antes de publicar copy ou issue, pergunta:

1. Eu falaria isso com meus amigos ou parece LinkedIn?
2. Tem palavra que só gerente de produto usa?
3. Dá para falar isso com metade das palavras?
4. O palavrão saiu natural ou está fantasiado de jovem?
5. Parece jogo ou rede social?
6. Dá vontade de responder/provocar/tentar de novo?
7. Se tirar a logo, ainda parece Auê?

Se parece campanha de agência tentando ser descolada, faz de novo.

---

# Regras que continuam sérias

- voz não amplia escopo;
- palavrão não esconde erro;
- piada não vence privacidade;
- classificação não inventa dado;
- score não muda por popularidade, dinheiro ou XP;
- roadmap não vira implementação porque alguém teve uma ideia boa de madrugada;
- [`../escopo/ESCOPO_ATUAL.md`](../escopo/ESCOPO_ATUAL.md) define o que pertence ao jogo.

## Relacionados

- **O que o jogo é:** [`VISAO.md`](./VISAO.md)
- **O que pertence ao jogo agora:** [`../escopo/ESCOPO_ATUAL.md`](../escopo/ESCOPO_ATUAL.md)
- **Origem dos três primos:** [`HISTORIA.md`](./HISTORIA.md)
- **Os estados da Arena:** [`ARENA.md`](./ARENA.md)
- **Referência visual:** [`../design/prototipo-arena/arena.html`](../design/prototipo-arena/arena.html)
- **Skill de copy:** [`../../.agents/skills/aplicarTomOgro/SKILL.md`](../../.agents/skills/aplicarTomOgro/SKILL.md)
