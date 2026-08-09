# Voz e personalidade do Auê

Fonte canônica de **como o Auê fala e se comporta**.

Derivado de [`HISTORIA_DO_AUE.md`](./HISTORIA_DO_AUE.md). Cada diretriz abaixo
precisa ter raiz na história ou em uma decisão explícita de produto — é isso que
separa personalidade de improviso.

**Não repete biografia.** Quem é quem está na história. Aqui entra só o que uma
decisão de produto, UX ou copy precisa saber.

> Escopo não mora aqui. Para saber o que entra no lançamento, consulte
> [`../mvp1/CONTRATO_MVP1.md`](../mvp1/CONTRATO_MVP1.md).

---

## 1. Fala de amigo no churrasco, não de marca

**Vem de:** humor informal e do jeito direto, competitivo e meio ogro que
Guinho e Marcelo trazem.

- Segunda pessoa, direto: **"você"**. Evite "o usuário" em copy de interface.
- Frases curtas. Se precisa de vírgula demais para caber, provavelmente dá para
  cortar metade.
- **Nunca explicar a piada.** Piada explicada é piada de empresa.
- Evite vocabulário de departamento de marketing quando houver palavra simples:
  _engajamento, jornada, experiência, plataforma, solução_.
- Sem exclamação em série, sem emoji decorativo, sem "Ops!" automático.

> ❌ "Ops! Ocorreu um erro inesperado ao processar sua experiência de áudio."
>
> ✅ "Deu ruim no envio. Grava de novo aí."

## 2. A piada é sobre o arroto, nunca sobre a pessoa

**Vem de:** o Auê ser uma brincadeira entre amigos transformada em produto.

- Zoar o **desempenho** é o produto. Zoar **quem arrotou** não é.
- Nada de piada com corpo, gênero, aparência, condição física, deficiência,
  raça, origem ou qualquer característica pessoal.
- Nota baixa merece deboche do arroto, não do arrotador.
- A provocação precisa sempre deixar uma porta de volta: tentar de novo,
  responder, pedir revanche.

Um erro antigo da skill `aplicarTomOgro` serve de fronteira: ela chegou a
sugerir uma provocação baseada em "homem/mulher de verdade". Isso foi removido.
A disputa é sobre nota, não identidade.

## 3. Hierarquia é parte da brincadeira

**Vem de:** nos arrotos da família, existe placar e existe alguém que ganha.

O Auê não precisa fingir que todo mundo empatou moralmente. Dizer quem ganhou,
quem perdeu e por quanto **é** a diversão.

- Classificação nomeada e progressiva, não barra neutra sem personalidade.
- O placar aparece cedo e sem rodeio.
- Empate usa critério explícito quando a regra permitir desempate.
- Resultado nunca é maquiado para "preservar sentimento".

## 4. Entrar, arrotar, receber nota — nessa velocidade

**Vem de:** diversão antes de burocracia.

- **Nada entre a vontade de arrotar e o arroto.** Sem cadastro obrigatório,
  tutorial longo ou tela de boas-vindas desnecessária.
- Toda tela nova precisa responder: _isso acelera o loop ou atrasa?_ Se atrasa,
  precisa justificar o custo.
- Pedir microfone é aceitável porque o aparelho exige. Qualquer outra fricção
  antes da primeira nota precisa de motivo real.

## 5. Revanche é a continuação natural

**Vem de:** a graça estar em provocar alguém e receber a resposta.

- Todo resultado deve deixar claro o próximo movimento: desafiar, responder,
  compartilhar ou tentar de novo.
- No MVP1, o Auê se espalha por **link de batalha**, não por feed público.
- A batalha deve parecer uma sequência de provocações entre amigos, não uma
  rede social genérica.

## 6. Vocabulário de jogo, não de rede social

**Vem de:** Call of Duty, FIFA e das disputas informais que moldaram a ideia.

Prefira:

- placar;
- nota;
- round;
- pódio;
- revanche;
- disputa;
- desafio;
- batalha.

Evite, especialmente no MVP1:

- post;
- seguidores;
- curtida;
- timeline;
- creator;
- comunidade como termo genérico para tudo.

Essas palavras podem aparecer em documentação de roadmap quando descrevem
features futuras reais. O que não devem fazer é contaminar a identidade do jogo.

## 7. Humor no tom, verdade no conteúdo

**Vem de:** o olhar de QA do Marcelo — "tá, mas e se eu fizer isso aqui?".

Esta diretriz manda nas outras:

- **Piada nunca substitui informação.** Se o áudio não subiu, diga que não
  subiu.
- Nunca fingir que deu certo.
- Nunca esconder falha atrás de deboche.
- Nunca inventar número, prêmio, participante ou ranking para a tela parecer
  cheia.
- Mock só aparece quando estiver explicitamente marcado como demonstração.

## 8. O absurdo é no tema; a execução é séria

O produto pode julgar arroto como "Monstro do Esgoto" e ainda assim tratar
segurança, privacidade, acessibilidade e erro com rigor.

- O visual pode exagerar; a regra não.
- A copy pode zoar; consentimento e privacidade não.
- A animação pode criar suspense; não pode mentir sobre processamento.
- O projeto pode ser hobby; o código publicado não pode parecer exercício de
  tutorial.

## 9. Monetização assumida, nunca disfarçada

**Vem de:** a meta real de fazer o produto pagar suas próprias contas.

- Anúncio pode existir quando fizer sentido para o estágio do produto.
- **Anúncio nunca se disfarça de ação do jogo** nem fica colado em CTA para
  induzir clique acidental.
- Monetização não pode atrasar o loop principal.
- Auê+ e outras formas de cobrança só existem quando houver produto e
  infraestrutura reais para isso; botão falso de compra é proibido.

---

## Teste rápido antes de publicar uma copy

1. Um primo falaria isso num churrasco? Se não, reescreva.
2. A piada é com o arroto ou com a pessoa? Se for com a pessoa, corte.
3. Está escondendo alguma falha? Se está, conserte antes do tom.
4. Dá para tirar metade das palavras? Tente.
5. A frase está inventando capacidade que o produto não tem? Se sim, pare.

## O que este documento NÃO faz

- **Não amplia o MVP1.** Tom não é escopo. A autoridade do lançamento é
  [`../mvp1/CONTRATO_MVP1.md`](../mvp1/CONTRATO_MVP1.md).
- **Não autoriza feature nova.** Uma diretriz de voz descreve COMO o que existe
  se comunica, nunca O QUE passa a existir.
- **Não transforma referência em requisito.** Call of Duty e FIFA são referência
  de sensação competitiva, não lista de funcionalidades a copiar.
- **Não substitui documentação técnica.** RLS, scoring, retenção e arquitetura
  obedecem aos contratos técnicos correspondentes.

## Relacionados

- **O que entra agora:** [`../mvp1/CONTRATO_MVP1.md`](../mvp1/CONTRATO_MVP1.md)
- **Origem e história humana:** [`HISTORIA_DO_AUE.md`](./HISTORIA_DO_AUE.md)
- **Visão funcional ampla:** [`../functional/especificacao_funcional.md`](../functional/especificacao_funcional.md)
- **UX/UI:** [`../especificacao_ux_ui.md`](../especificacao_ux_ui.md)
- **Skill de copy:** [`../../.agents/skills/aplicarTomOgro/SKILL.md`](../../.agents/skills/aplicarTomOgro/SKILL.md)
