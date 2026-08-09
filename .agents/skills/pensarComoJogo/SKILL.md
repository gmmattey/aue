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

## 2. Os números que importam

| Pergunta | Alvo |
|---|---|
| Do abrir o app até arrotar | o mínimo de toques possível |
| Do arrotar até ver a nota | curto, e o único momento lento é a contagem do score, de propósito |
| Do ver a nota até provocar alguém | um toque |
| Sessão inteira | cabe no tempo de um cigarro |

Se uma mudança **aumenta** qualquer um desses, ela precisa de um motivo muito
bom escrito no plano.

## 3. O que faz o jogo ser bom

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

## 4. O que mata o jogo

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

## 5. Nada de sacanagem com o jogador

- **Não existe pay-to-win.** Ninguém compra nota melhor
  ([`docs/jogo/VOZ.md`](../../../docs/jogo/VOZ.md) §11).
- **Score não muda por popularidade, dinheiro ou tempo de uso.**
- Nada de contagem regressiva falsa, escassez inventada, "só hoje" que não é só
  hoje, ou botão de sair escondido.
- Se um dia tiver anúncio, é anúncio declarado. Se tiver assinatura, ela cobra
  de verdade e entrega de verdade.
- A zoeira é com o arroto, **nunca** com característica pessoal de ninguém.

## 6. O teste

Antes de aprovar um desenho, três perguntas:

1. **Isso faz alguém querer mostrar pro amigo do lado?**
2. **Isso faz alguém querer arrotar de novo agora?**
3. **Se tirar isso, o jogo fica pior de jogar — ou só fica com menos coisa?**

Se a resposta da 3 for "só fica com menos coisa", não entra. Registra no
backlog e segue.

## Relacionados

- **O que o jogo é:** [`docs/jogo/VISAO.md`](../../../docs/jogo/VISAO.md)
- **O loop:** [`docs/jogo/LOOP.md`](../../../docs/jogo/LOOP.md)
- **As regras de pontuação:** [`docs/jogo/REGRAS.md`](../../../docs/jogo/REGRAS.md)
- **O escopo:** [`docs/escopo/ESCOPO_ATUAL.md`](../../../docs/escopo/ESCOPO_ATUAL.md)
- **O fluxo:** [`desenharExperiencia`](../desenharExperiencia/SKILL.md)
