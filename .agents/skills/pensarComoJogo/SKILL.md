---
name: pensarComoJogo
description: Criterios de game design mobile casual que o Giam usa para julgar se uma mudanca fortalece o jogo Aue.
---

# Skill: pensarComoJogo

Filtro do **Giam**: isto aqui é jogo, ou virou app?

O Auê é um **jogo mobile casual**. Não é rede social, não é feed, não é app de
perfil. A fonte é [`docs/jogo/VISAO.md`](../../../docs/jogo/VISAO.md) e o loop é
[`docs/jogo/LOOP.md`](../../../docs/jogo/LOOP.md):

```text
ARROTAR → RECEBER NOTA → DESAFIAR → RESPONDER → REVANCHE
```

---

## 1. O jogador imaginado

Está **em pé**, com **uma mão**, no ponto de ônibus ou na mesa do bar, com
barulho em volta, com gente olhando, e tem talvez quarenta segundos.

Todo desenho é julgado contra essa pessoa. Não contra alguém sentado num
notebook com fone.

Consequências diretas:

- funciona com uma mão só, na metade de baixo da tela;
- funciona com som ruim ou sem som (o resultado é visual antes de ser sonoro);
- funciona com interrupção — a pessoa é chamada e volta depois;
- não exige leitura longa em nenhum momento.

## 2. O jogador que chega de fora

O jogador imaginado do §1 é quem **já está** no jogo. Tem outro, e ele é o mais
difícil: o que chega de um vídeo de oito segundos, no meio do rolo de vídeos
idiotas, sem saber que o Auê existe.

Isso não é hipótese de marketing. Antes do jogo existir, um arroto de menos de
dez segundos, sem cara e sem nota, bateu perto de noventa mil views
([#135](https://github.com/gmmattey/aue/issues/135)). A pergunta em aberto é uma
só: **aquilo traz jogador ou só traz plateia?**

Quem chega assim:

- não tem contexto, não leu nada e não pediu para estar ali;
- veio de link, no navegador, sem instalar nada;
- decide em segundos se arrota ou fecha;
- **não vai criar conta, não vai ler tutorial e não vai esperar.**

Consequências de desenho, e elas valem para toda mudança:

- **o link tem que cair dentro do jogo**, não numa apresentação do jogo;
- o caminho de quem chega frio é o mesmo do §1, só que mais curto ainda:
  abriu → arrotou → nota. Qualquer coisa entre o link e o microfone é suspeita;
- **o que sai do jogo pra fora é arroto, nota e provocação.** "94,2 · Duvido
  bater" é o formato. Voz de propaganda — "conheça a experiência inovadora" —
  não é só feio, é o que faz o vídeo morrer;
- o que a pessoa vê antes de abrir (cartão, prévia, thumb) é a primeira tela do
  jogo, mesmo não sendo tela.

## 3. Audiência não é jogador

**View não prova jogo.** Noventa mil pessoas podem assistir um arroto e nenhuma
querer jogar — aí o que existe é conteúdo, não jogo.

Serve de régua pra dentro também. Número que prova comportamento: abriu,
arrotou, recebeu nota, chamou outra pessoa. Número que só faz bem pro ego: view,
clique, impressão, tempo de tela.

Quando alguém — inclusive você — usar um número pra defender uma decisão, a
pergunta é **qual comportamento ele prova**. Se não prova nenhum, é enfeite, e
vale o §5: número que não muda decisão nem provocação não entra.

E vale a ordem: **testa a hipótese antes de construir a igreja.** Experimento
pequeno primeiro, infraestrutura depois — nunca o contrário. Nada de feed,
perfil de criador, marketplace ou assinatura porque um vídeo foi bem.

## 4. Os números que importam

| Pergunta | Alvo |
|---|---|
| Do abrir o app até arrotar | o mínimo de toques possível |
| Do arrotar até ver a nota | curto, e o único momento lento é a contagem do score, de propósito |
| Do ver a nota até provocar alguém | um toque |
| Sessão inteira | cabe no tempo de um cigarro |

Se uma mudança **aumenta** qualquer um desses, ela precisa de um motivo muito
bom escrito no plano.

## 5. O que faz o jogo ser bom

- **Feedback imediato.** Todo toque responde na hora — visual, sonoro ou háptico.
  Se algo demora, o jogo mostra que está fazendo, não trava mudo.
- **A nota é o clímax.** A contagem existe pra criar tensão. Não encurta "pra
  ficar mais eficiente".
- **A provocação é o motor.** O jogo termina em desafio, nunca em "pronto"
  ([`docs/jogo/VOZ.md`](../../../docs/jogo/VOZ.md) §7).
- **A vergonha é o combustível.** Arrotar na frente dos outros é a graça. O
  desenho não pode esconder a pessoa — mas também não pode expor ninguém que não
  quis.
- **Perder tem que ser engraçado**, não frustrante. Nota baixa é piada, não
  punição.
- **Dá pra jogar do lado.** Duas pessoas no mesmo celular é jogo de verdade
  (disputa local, [`ESCOPO_ATUAL.md`](../../../docs/escopo/ESCOPO_ATUAL.md)
  §2.9).

## 6. O que mata o jogo

- **Cadastro antes da diversão.** Ninguém cria conta pra descobrir se é legal.
- **Tutorial que ensina o que é óbvio.** Arrota. Pronto, aprendeu.
- **Tela de espera sem tensão.** Espera pode existir se for parte da piada.
- **Menu com mais de um nível.** Jogo casual não tem submenu.
- **Progressão que castiga quem falta.** Streak, energia, vida que regenera:
  nada disso entra.
- **Número que não muda nada.** Se um contador não altera decisão nem
  provocação, ele é enfeite.
- **Virar rede social.** Feed, seguidores, perfil, comunidade, campeonato,
  ranking global, XP, níveis e conquistas estão **fora do escopo** — e não são
  épicos futuros ([`ESCOPO_ATUAL.md`](../../../docs/escopo/ESCOPO_ATUAL.md) §3).

## 7. Nada de sacanagem com o jogador

- **Não existe pay-to-win.** Ninguém compra nota melhor
  ([`docs/jogo/VOZ.md`](../../../docs/jogo/VOZ.md) §11).
- **Score não muda por popularidade, dinheiro ou tempo de uso.**
- Nada de contagem regressiva falsa, escassez inventada, "só hoje" que não é só
  hoje, ou botão de sair escondido.
- Se um dia tiver anúncio, é anúncio declarado. Se tiver assinatura, ela cobra
  de verdade e entrega de verdade.
- A zoeira é com o arroto, **nunca** com característica pessoal de ninguém.
- **Gravou pra jogar não é a mesma coisa que autorizou publicar.** O arroto de
  um jogador não vira conteúdo do Auê por tabela. Se um dia o jogo publicar
  áudio de gente, a pessoa escolhe isso na cara dura, sabendo onde vai parar.
  Essa parte não tem piada ([`AGENTS.md`](../../../AGENTS.md) §7).

## 8. O teste

Antes de aprovar um desenho, quatro perguntas:

1. **Isso faz alguém querer mostrar pro amigo do lado?**
2. **Isso faz alguém querer arrotar de novo agora?**
3. **Quem chega frio nisso, sem contexto nenhum, consegue arrotar em segundos?**
4. **Se tirar isso, o jogo fica pior de jogar — ou só fica com menos coisa?**

Se a resposta da 4 for "só fica com menos coisa", não entra. Registra no
backlog e segue.

## Relacionados

- **O que o jogo é:** [`docs/jogo/VISAO.md`](../../../docs/jogo/VISAO.md)
- **O loop:** [`docs/jogo/LOOP.md`](../../../docs/jogo/LOOP.md)
- **As regras de pontuação:** [`docs/jogo/REGRAS.md`](../../../docs/jogo/REGRAS.md)
- **O escopo:** [`docs/escopo/ESCOPO_ATUAL.md`](../../../docs/escopo/ESCOPO_ATUAL.md)
- **O fluxo:** [`desenharExperiencia`](../desenharExperiencia/SKILL.md)
