# Auê!

## Especificação de UX, UI e Layout

**Versão:** 1.0
**Produto:** PWA mobile-first de competição de arrotos
**Documento complementar à Especificação Funcional e Técnica**

---

# 1. Objetivo da Experiência

O Auê! deve parecer um **jogo social competitivo**, e não uma rede social tradicional, gravador de áudio ou aplicativo utilitário.

A experiência deve transmitir:

* irreverência;
* competição;
* espontaneidade;
* suspense;
* recompensa;
* compartilhamento.

A interface deve ser visualmente muito bem executada apesar do caráter absurdo do produto.

A ideia pode ser ridícula.

O design não pode parecer amador.

---

# 2. Referências Conceituais

A experiência deve combinar características de diferentes categorias de produto.

## Wavelength

Referência principal para:

* linguagem de party game;
* elementos grandes;
* interface limpa;
* suspense;
* animações;
* pontuação em destaque;
* experiência de grupo.

## BeReal

Referência para:

* acesso imediato à ação principal;
* ausência de onboarding excessivo;
* baixo atrito;
* ação antes de cadastro.

## Kahoot

Referência para:

* competição presencial;
* placares;
* ranking;
* pódio;
* expectativa antes da revelação do vencedor.

## Duolingo

Referência para:

* XP;
* níveis;
* conquistas;
* celebrações;
* feedback positivo;
* progressão visual.

## Strava

Referência conceitual para:

* desafio entre usuários;
* comparação;
* recordes;
* conquistas;
* ranking competitivo.

---

# 3. Regra Central de UX

A interface deve sempre favorecer o fluxo:

```text
ARROTAR
   ↓
SER JULGADO
   ↓
RIR DO RESULTADO
   ↓
DESAFIAR
   ↓
COMPARTILHAR
```

Qualquer elemento que dificulte esse fluxo deve ser removido ou tornado secundário.

---

# 4. Princípios de Layout

## 4.1 Uma ação principal por tela

Cada tela deve possuir uma hierarquia evidente.

Exemplos:

Home:

**ARROTAR**

Resultado:

**DESAFIAR**

Desafio recebido:

**ACEITAR DESAFIO / ARROTAR**

Competição:

**PRÓXIMO JOGADOR**

---

# 5. Densidade

O Auê! deve ter baixa densidade visual.

Evitar:

* excesso de cards;
* listas longas;
* textos explicativos;
* múltiplos CTAs concorrentes;
* menus complexos;
* widgets pequenos;
* dashboards.

Preferir:

* grandes áreas vazias;
* tipografia grande;
* um elemento visual dominante;
* informações progressivas;
* poucas métricas simultaneamente.

---

# 6. Identidade Visual

## Direção

Visual contemporâneo, energético e propositalmente exagerado.

Não utilizar aparência padrão de aplicativo empresarial.

Referência conceitual:

**party game premium + cultura digital + streetwear + esporte absurdo**

---

# 7. Tema

O tema principal deve ser escuro.

Base:

* fundo quase preto;
* superfícies discretamente elevadas;
* cor de destaque extremamente viva;
* textos claros.

Direção recomendada para cor principal:

**verde-limão ácido / amarelo-esverdeado elétrico.**

Não utilizar verde hospitalar ou “verde vômito” caricatural.

A cor deve transmitir energia.

---

# 8. Paleta Conceitual

## Background

Preto profundo ou carvão.

## Surface

Cinza muito escuro.

## Primary

Verde ácido / lima elétrico.

## Accent

Creme claro ou branco quente.

## Danger

Vermelho vivo para derrotas, falhas ou provocações específicas.

## Gold

Utilizado somente em:

* vitória;
* lendário;
* conquistas especiais;
* ranking.

Evitar excesso de cores sem significado.

---

# 9. Tipografia

O Auê! deve utilizar duas personalidades tipográficas.

## Display

Fonte pesada, larga ou condensada.

Utilizada para:

* Auê Score;
* títulos;
* vencedores;
* ranking;
* chamadas principais.

Exemplo visual:

```text
91,4
```

O número deve possuir grande presença.

## Interface

Sans-serif limpa e altamente legível.

Utilizada para:

* labels;
* métricas;
* navegação;
* instruções;
* botões.

---

# 10. Componentes Visuais

## 10.1 Bolha Auê

Elemento visual central da marca e da experiência de gravação.

A Bolha Auê representa visualmente o som capturado.

Características:

* forma orgânica;
* grande;
* animada;
* responsiva ao áudio;
* não perfeitamente circular.

Durante o repouso:

* movimento sutil;
* pequena pulsação.

Durante a gravação:

**Potência**
→ aumenta expansão da forma.

**Profundidade**
→ deixa a forma mais pesada/larga.

**Duração**
→ mantém a animação sustentada.

**Textura**
→ influencia irregularidade da borda.

A Bolha deve funcionar como assinatura visual do Auê!.

---

# 11. Motion Design

Movimento é parte central da experiência.

Não utilizar animação somente como decoração.

Ela deve comunicar:

* gravação;
* pressão;
* análise;
* suspense;
* vitória;
* derrota;
* conquista.

---

# 12. Estados da Bolha

## Idle

Respiração lenta.

## Preparando

A bolha diminui ligeiramente antes da gravação.

## Gravando

Responde ao sinal de áudio.

## Finalização

Expande e colapsa rapidamente.

## Análise

Transforma-se em elemento de processamento.

## Resultado

Explode ou se abre revelando a nota.

---

# 13. Tela 1 — Splash / Entrada

Objetivo:

Carregar rapidamente e apresentar a marca.

Layout:

```text
┌──────────────────────────────┐
│                              │
│                              │
│            Auê!              │
│                              │
│      Arrote. Seja julgado.   │
│                              │
│                              │
└──────────────────────────────┘
```

Duração curta.

Não utilizar carrossel de onboarding.

---

# 14. Tela 2 — Home

## Objetivo

Levar o usuário a gravar imediatamente.

## Layout

```text
┌──────────────────────────────┐
│ Auê!                     👤  │
│                              │
│                              │
│       PRONTO PRA FAZER       │
│           UM AUÊ?            │
│                              │
│                              │
│          ◉◉◉◉◉◉              │
│        ◉   🎙   ◉            │
│          ◉◉◉◉◉◉              │
│                              │
│          ARROTAR             │
│                              │
│                              │
│    Duelo        Competição   │
│                              │
│                              │
│     Seu melhor: 87,4         │
│                              │
└──────────────────────────────┘
```

## Hierarquia

1. Bolha / botão de arroto.
2. ARROTAR.
3. Duelo.
4. Competição presencial.
5. Melhor score anterior.

---

# 15. Home para Novo Usuário

Se o usuário nunca gravou:

Não mostrar:

* rankings;
* conquistas;
* perfil complexo;
* histórico.

A tela deve continuar praticamente vazia.

CTA:

**ARROTAR**

Microcopy:

> Sua dignidade já foi longe demais.

---

# 16. Tela 3 — Permissão de Microfone

Evitar tela técnica.

Copy sugerida:

**PRECISO OUVIR ESSA PORRA.**

Texto secundário:

O Auê! usa o microfone para analisar seu arroto.

CTA:

**LIBERAR MICROFONE**

Alternativa caso o tom precise ser menos agressivo:

**PRECISO OUVIR ISSO.**

---

# 17. Tela 4 — Calibração

A calibração deve parecer parte do jogo.

Não usar:

> “Inicializando baseline RMS.”

Utilizar:

**XIU.**

**MEDINDO O SILÊNCIO...**

Duração aproximada:

0,5–1 segundo.

Visual:

Bolha pequena e quase imóvel.

---

# 18. Tela 5 — Gravação

## Objetivo

Fazer o momento de gravação parecer performático.

Layout:

```text
┌──────────────────────────────┐
│                              │
│           MANDA.             │
│                              │
│                              │
│        ╭──────────╮          │
│       ╱            ╲         │
│      │      🎙      │        │
│       ╲            ╱         │
│        ╰──────────╯          │
│                              │
│           02.7               │
│                              │
│      ~~~~~~~~~~~~~~          │
│                              │
│         FINALIZAR            │
│                              │
└──────────────────────────────┘
```

A bolha ocupa grande parte da área central.

---

# 19. Visualização de Áudio

Não utilizar waveform tradicional como elemento principal.

A waveform pode existir de forma secundária.

Elemento principal:

**Bolha Auê.**

Isso diferencia o produto de gravadores comuns.

---

# 20. Fim Automático

Se o sistema detectar fim evidente do evento:

Exibir:

**FOI ISSO?**

Opções:

* Sim
* Continuar

Caso o limite de 10 segundos seja alcançado:

Finalização automática.

---

# 21. Tela 6 — Origem

Utilizar bottom sheet.

Não abrir nova tela inteira quando desnecessário.

Layout:

```text
╭─────────────────────────────╮
│ E ISSO VEIO DE ONDE?        │
│                             │
│ 🥤 Refrigerante             │
│ 🍺 Cerveja                  │
│ 🍕 Comida                   │
│ 💨 Puxei ar                 │
│ 😐 Simplesmente aconteceu   │
│ 🤷 Sei lá                   │
╰─────────────────────────────╯
```

Um toque seleciona e avança.

---

# 22. Tela 7 — Análise

Esta tela é uma experiência teatral.

Mesmo que a análise leve poucos milissegundos, a interface pode utilizar aproximadamente 1–2 segundos para construir suspense.

Exemplo:

```text
ANALISANDO O ESTRAGO...

Potência       █████████░
Profundidade   ███████░░░
Duração        ████████░░
Textura        ██████░░░░

JULGANDO...
```

As barras não precisam representar valores finais até a revelação.

---

# 23. Revelação da Nota

A nota não deve simplesmente aparecer.

Sequência sugerida:

1. tela escurece;
2. vibração curta;
3. número começa em zero;
4. cresce rapidamente;
5. desacelera próximo da nota;
6. título aparece;
7. frase do juiz surge;
8. ações são liberadas.

Exemplo:

```text
72
83
89
90
91
91,4
```

---

# 24. Tela 8 — Resultado

Tela mais importante do produto.

Layout:

```text
┌──────────────────────────────┐
│           SEU AUÊ            │
│                              │
│                              │
│            91,4              │
│                              │
│      MONSTRO DO ESGOTO       │
│                              │
│                              │
│ Profundidade             96  │
│ Potência                 88  │
│ Duração                  86  │
│ Textura                  91  │
│                              │
│ Tecnicamente excelente.      │
│ Socialmente indefensável.    │
│                              │
│    DESAFIAR UM AMIGO         │
│                              │
│        Compartilhar          │
│       Tentar de novo         │
│                              │
└──────────────────────────────┘
```

---

# 25. Hierarquia do Resultado

## Elemento 1

Score.

Deve ocupar aproximadamente 25–40% da atenção visual.

## Elemento 2

Título.

## Elemento 3

Frase do juiz.

## Elemento 4

Métricas.

## Elemento 5

CTA de desafio.

---

# 26. Métricas

Não utilizar quatro cards independentes.

Utilizar linhas.

Exemplo:

```text
Profundidade      96
████████████████░

Potência          88
██████████████░░░
```

Compacto e legível.

---

# 27. Conquista Desbloqueada

Se houver conquista:

Não abrir modal imediatamente sobre o resultado.

Mostrar pequena celebração contextual.

Exemplo:

**CONQUISTA DESBLOQUEADA**

🏆 TERREMOTO LOCAL

> Profundidade 95+

CTA secundário:

**VER CONQUISTA**

---

# 28. XP

XP aparece de forma rápida.

Exemplo:

```text
+35 XP
```

A barra de nível pode subir com animação.

Não bloquear a ação seguinte.

---

# 29. Tela 9 — Compartilhar

Preferencialmente utilizar ação nativa do sistema.

Antes do share sheet, mostrar preview do card.

Exemplo:

```text
╭──────────────────────────────╮
│          Auê!                │
│                              │
│          LUIZ FEZ            │
│            91,4              │
│                              │
│      MONSTRO DO ESGOTO       │
│                              │
│  VOCÊ CONSEGUE FAZER MELHOR? │
╰──────────────────────────────╯
```

CTA:

**COMPARTILHAR**

---

# 30. Tela 10 — Desafio Recebido

Essa página funciona também como aquisição.

Deve possuir o mínimo de distração possível.

Layout:

```text
┌──────────────────────────────┐
│            Auê!              │
│                              │
│                              │
│      LUIZ TE DESAFIOU        │
│                              │
│            87,4              │
│                              │
│      MONSTRO DO ESGOTO       │
│                              │
│             VS               │
│                              │
│              ?               │
│                              │
│    VOCÊ CONSEGUE BATER?      │
│                              │
│       ARROTAR AGORA          │
│                              │
│      Sem cadastro.           │
│                              │
└──────────────────────────────┘
```

Não mostrar cadastro antes da ação.

---

# 31. Tela 11 — Resultado do Duelo

Layout:

```text
┌──────────────────────────────┐
│          RESULTADO           │
│                              │
│      LUIZ        RENAN       │
│                              │
│      87,4        91,2        │
│       😐          👑         │
│                              │
│              VS              │
│                              │
│       RENAN VENCEU           │
│                              │
│ Luiz pediu uma revanche.     │
│ O estômago dele não.         │
│                              │
│       PEDIR REVANCHE         │
│                              │
│        Compartilhar          │
│                              │
└──────────────────────────────┘
```

---

# 32. Vitória

Elementos permitidos:

* confete;
* vibração;
* animação;
* dourado;
* som opcional;
* movimento da Bolha.

Não exagerar na duração.

---

# 33. Derrota

Não tratar derrota como erro.

Ela deve ser engraçada.

Exemplo:

**VOCÊ PERDEU.**

> A dignidade também.

CTA:

**REVANCHE**

---

# 34. Empate

Mensagem:

**EMPATE TÉCNICO DO GÁS**

Visual pode combinar cores dos dois competidores.

---

# 35. Tela 12 — Criar Competição Presencial

Fluxo simples.

```text
NOVO CAMPEONATO

Nome
[ Campeonato do Churrasco ]

Jogadores

Luiz
Felipe
Renan
+ Adicionar

[ COMEÇAR ]
```

Sem necessidade de conta para os convidados.

---

# 36. Tela 13 — Lobby Presencial

Layout:

```text
CAMPEONATO DO CHURRASCO

✓ Luiz
✓ Felipe
→ Renan
  André

VEZ DE RENAN

[ ARROTAR ]
```

Manter foco no próximo participante.

---

# 37. Tela 14 — Resultado Presencial

Usar linguagem de pódio.

```text
🏆 CAMPEÃO DO AUÊ

RENAN

93,2

🥈 Luiz        89,4
🥉 André       82,7
4  Felipe      61,3

Felipe precisa conversar
com o próprio estômago.

[ COMPARTILHAR RESULTADO ]

[ NOVA RODADA ]
```

---

# 38. Pódio

Para 3+ participantes:

Top 3 visualmente destacados.

Primeiro colocado central e maior.

Segundo e terceiro laterais ou abaixo.

---

# 39. Tela 15 — Ranking

Não transformar em dashboard.

Layout:

```text
RANKING

[ Semana ] [ Natural ] [ Vitórias ]

1  👑 Renan       96,2
2     Luiz        94,1
3     Felipe      91,7
4     André       89,3
5     Bruno       87,9
```

Mostrar no máximo quantidade razoável por viewport.

---

# 40. Posição do Usuário

Se o usuário estiver fora da área visível:

posição fixa inferior.

Exemplo:

```text
──────────────
127  Luiz   72,4
```

---

# 41. Tela 16 — Perfil

Perfil inicial deve ser simples.

```text
          avatar

          LUIZ

    BARÍTONO GÁSTRICO

      Nível 11

████████████░░░░

Melhor Auê        91,4
Vitórias            12
Conquistas          18

[ Conquistas ]

[ Histórico ]
```

---

# 42. Conquistas

Utilizar grid visual.

Estados:

* desbloqueada;
* bloqueada;
* rara;
* secreta.

Conquistas secretas podem mostrar:

**???**

até serem desbloqueadas.

---

# 43. Histórico

Formato recomendado:

lista cronológica.

```text
HOJE

91,4  Monstro do Esgoto
87,2  Trovão Gastrointestinal
61,8  Pedreiro Certificado

ONTEM

82,1  Trovão Gastrointestinal
```

Não utilizar card enorme por gravação.

---

# 44. Navegação Principal

Para o MVP:

```text
Ranking      ARROTAR      Perfil
```

O botão central de gravação deve possuir maior destaque.

Visualmente:

```text
   🏆          ◉          👤
Ranking     ARROTAR     Perfil
```

---

# 45. Ações Fora da Navegação

Não criar tabs para:

* desafios;
* competições;
* conquistas;
* configurações.

Essas áreas são acessadas por contexto.

---

# 46. Botões

## Primário

Grande.

Alto contraste.

Exemplo:

**ARROTAR**

## Secundário

Menor contraste.

Exemplo:

**Compartilhar**

## Terciário

Texto.

Exemplo:

**Tentar de novo**

Evitar colocar três botões igualmente chamativos.

---

# 47. Ícones

Ícones devem ser simples.

Não depender exclusivamente de emojis como linguagem da interface.

Emojis podem ser usados para humor e categorias.

Exemplo:

🏆 medalha

🤢 reação

💨 artificial

---

# 48. Bordas e Superfícies

Bordas amplamente arredondadas.

Não transformar cada agrupamento em card.

Utilizar surfaces somente quando houver necessidade clara de agrupamento.

---

# 49. Humor

O humor deve aparecer em pontos estratégicos:

* resultado;
* derrota;
* conquista;
* erro;
* compartilhamento;
* competição.

Não colocar piada em cada label.

Caso contrário, a interface vira um palhaço berrando o tempo inteiro.

---

# 50. Microcopy

Características:

* curta;
* direta;
* irreverente;
* facilmente entendida;
* sem texto técnico.

Exemplos:

Gravação:

**MANDA.**

Análise:

**JULGANDO ESSA PORRA...**

Resultado ruim:

**Foi um arroto. Tecnicamente.**

Resultado alto:

**Isso não deveria ter saído de um ser humano.**

---

# 51. Estados de Erro

Erros também devem manter personalidade sem esconder o problema.

## Microfone bloqueado

**NÃO OUVI NADA.**

Seu microfone está bloqueado.

[ Liberar microfone ]

## Sem áudio detectável

**CADÊ O ARROTO?**

Tenta de novo e chega um pouco mais perto.

## Sem internet

**A INTERNET MORREU.**

Seu arroto continua funcionando.

O resultado será sincronizado depois.

---

# 52. Loading

Evitar spinner tradicional quando houver alternativa contextual.

Exemplo:

**PREPARANDO O JULGAMENTO...**

com animação da Bolha.

---

# 53. Mobile First

Viewport prioritária:

360–430 px.

Todos os fluxos essenciais devem funcionar confortavelmente com uma mão.

CTA primário preferencialmente na zona inferior ou central acessível.

---

# 54. Desktop

Desktop deve manter layout centralizado.

Não expandir conteúdo simplesmente porque existe espaço.

Área principal recomendada:

aproximadamente 480–600 px.

Elementos secundários podem ocupar áreas laterais futuramente.

---

# 55. Acessibilidade

Obrigatório:

* contraste adequado;
* labels para leitores de tela;
* não depender somente de cor;
* feedback háptico acompanhado de feedback visual;
* suporte a redução de movimento;
* botões com área adequada de toque;
* navegação por teclado no desktop.

---

# 56. Reduce Motion

Com `prefers-reduced-motion`:

* remover deformações fortes;
* reduzir contagem animada;
* remover explosões;
* manter transições simples.

A informação deve permanecer completa.

---

# 57. Áudio da Interface

Sons do produto são opcionais.

Nunca reproduzir automaticamente o arroto gravado após o resultado sem ação explícita do usuário.

Sons de vitória devem respeitar configuração do dispositivo e opção do usuário.

---

# 58. Vídeo

Se vídeo estiver habilitado:

A câmera não deve competir visualmente com a Bolha.

Pode ser apresentada como:

* preview de fundo;
* janela discreta;
* opção separada.

O julgamento continua baseado no áudio.

---

# 59. Social Futuro

Quando feed existir:

não copiar TikTok visualmente.

O feed deve continuar enfatizando:

* score;
* desafio;
* reação;
* competição.

Exemplo:

```text
RENAN

91,2
MONSTRO DO ESGOTO

▶ ouvir

💀 31   🤢 17   👑 8

[ DESAFIAR ]
```

---

# 60. Reações

Reações futuras:

💀 Morri
🤢 Nojento
📢 Trovão
👑 Monstro
🍼 Fraquinho

O botão **Desafiar** deve ser mais importante que reagir.

---

# 61. Ordem de Protótipos

A primeira rodada de design deve produzir somente:

1. Home.
2. Calibração.
3. Gravação.
4. Origem.
5. Análise.
6. Resultado.
7. Desafio recebido.
8. Resultado do duelo.
9. Criar competição presencial.
10. Rodada presencial.
11. Pódio.
12. Ranking.
13. Perfil.

Feed social não deve entrar na primeira rodada.

---

# 62. Protótipos Interativos Obrigatórios

Devem existir três fluxos navegáveis.

## Fluxo A — Primeiro Auê

```text
Home
→ Gravação
→ Origem
→ Análise
→ Resultado
→ Compartilhar
```

## Fluxo B — Desafio

```text
Link
→ Desafio recebido
→ Gravação
→ Resultado
→ Vencedor
→ Revanche
```

## Fluxo C — Presencial

```text
Criar campeonato
→ Jogadores
→ Rodadas
→ Resultado
→ Pódio
```

---

# 63. Critérios de Aprovação Visual

Uma tela deve ser rejeitada se:

* possuir excesso de cards;
* precisar de muito texto para explicar a ação;
* não deixar claro o CTA principal;
* parecer uma rede social genérica;
* parecer um gravador de áudio tradicional;
* parecer um aplicativo corporativo;
* o Auê Score não tiver protagonismo;
* o design depender exclusivamente de emojis para ter personalidade.

---

# 64. Critério de Identidade

Ao esconder logo e nome, a tela de gravação e a tela de resultado ainda devem parecer pertencentes ao Auê!.

A combinação:

**Bolha + tipografia + cor + movimento + score**

deve criar reconhecimento próprio.

---

# 65. Fórmula de Referência

A direção geral pode ser resumida como:

**70% party game**

**15% social espontâneo**

**10% competição**

**5% progressão**

Não construir:

**TikTok de arroto.**

Construir:

**um esporte ridículo digital que as pessoas compartilham no TikTok.**

---

# 66. Definição Visual do Produto

O Auê! deve parecer:

> Um campeonato que jamais deveria existir, produzido por gente que levou a ideia a sério demais.

Essa contradição é a identidade do produto.

---

# 67. Assinatura

**Auê!**

**Arrote. Seja julgado.**
