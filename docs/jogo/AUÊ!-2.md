# AUÊ!
## Game Design Document

**Versão:** 1.0  
**Data:** 27 de agosto de 2026  
**Status:** Produção / evolução contínua  
**Categoria:** Casual competitivo social  
**Plataforma principal:** Web mobile  
**Plataformas derivadas:** Android e iOS via empacotamento do mesmo jogo  
**Orientação:** Mobile-first  
**Sessão ideal:** 30 segundos a poucos minutos  
**Jogadores:** 1 jogador iniciando uma provocação, 2 jogadores em X1, 2 a 5 jogadores na Roda

Este GDD consolida o desenho de produto do Auê. A máquina normativa de estados
continua em [`ARENA.md`](ARENA.md), o escopo vigente em
[`../escopo/ESCOPO_ATUAL.md`](../escopo/ESCOPO_ATUAL.md) e a direção visual no
Art Bible [`../design/AUÊ!.md`](../design/AUÊ!.md). A prancha de telas recebida
é referência visual dos momentos descritos aqui, não uma autorização para criar
rotas ou estados adicionais.

---

# 1. RESUMO EXECUTIVO

Auê é um jogo casual competitivo sobre arrotar.

A proposta é deliberadamente simples:

> **Arrote. Receba a nota. Humilhe seus amigos.**

O jogador abre o jogo no celular, grava um arroto, recebe uma nota de 0 a 100 e transforma esse resultado em provocação.

A nota não é o objetivo final.

O objetivo é fazer alguém tentar superá-la.

O núcleo do jogo é:

**ARROTAR → RECEBER NOTA → DESAFIAR → RESPONDER → REVANCHE**

O Auê não tenta transformar arroto em experiência científica, rede social ou simulador complexo. Ele transforma uma brincadeira que já existe entre amigos em uma competição digital rápida.

A situação é idiota.

O produto é levado a sério.

---

# 2. HIGH CONCEPT

## 2.1 Pitch

Um jogo em que o microfone do celular vira juiz de uma competição de arroto.

Você arrota, o Auê decide se aquilo vale, mede características reais do áudio, gera uma nota e pergunta:

**quem vai ter coragem de bater?**

---

## 2.2 Fantasia do jogador

O jogador deve sentir que possui uma habilidade absurda que agora finalmente pode ser medida, exibida e usada para provocar outras pessoas.

O sentimento não é:

> “meu áudio foi analisado.”

É:

> “CARALHO, EU FIZ 94.”

E imediatamente depois:

> “Vou mandar essa porra pro fulano.”

---

# 3. PILARES DO JOGO

## 3.1 Um toque para começar

A primeira interação relevante precisa ser **ARROTAR**.

Não existe:

- cadastro obrigatório;
- tutorial obrigatório;
- formulário;
- criação de perfil;
- seleção de personagem;
- onboarding antes da primeira tentativa.

Quanto maior a distância entre abrir o link e arrotar, pior o Auê fica.

---

## 3.2 A nota precisa parecer justa

A piada só funciona enquanto o jogador acredita que o juiz está realmente ouvindo.

O Auê não pode sortear números.

O áudio deve ser:

1. capturado;
2. validado;
3. identificado como arroto;
4. analisado;
5. transformado em score.

Conversa, silêncio e barulho aleatório não devem ganhar nota.

---

## 3.3 A provocação é o produto

Uma nota isolada diverte por alguns segundos.

Uma nota enviada para outra pessoa cria o jogo.

Por isso, a principal saída do resultado não é “voltar”.

É:

**CHAMAR NO X1**

---

## 3.4 Revanche antes de encerramento

O Auê não deve transmitir sensação de missão concluída.

Vitória, derrota e empate devem produzir uma vontade parecida:

**jogar de novo.**

---

## 3.5 Pouca regra visível

O motor pode ser complexo.

A experiência não.

O jogador precisa entender basicamente:

> maior nota ganha.

Métricas existem para dar credibilidade e personalidade à nota, não para obrigar o jogador a estudar acústica.

---

# 4. PÚBLICO

O Auê é pensado principalmente para jovens e adultos acostumados com:

- jogos competitivos;
- humor informal;
- grupos de WhatsApp;
- TikTok, Reels e Shorts;
- multiplayer casual;
- brincadeiras entre amigos;
- churrascos, festas, faculdade, trabalho e encontros sociais.

O jogo não depende de o usuário se considerar gamer.

A regra deve ser compreensível imediatamente por qualquer pessoa:

**arrota e tenta tirar mais que o outro.**

---

# 5. PLATAFORMA

## 5.1 Plataforma principal

A web mobile é a plataforma canônica do Auê.

O jogo precisa funcionar ao receber um link pelo WhatsApp e abrir diretamente no navegador.

Esse comportamento é estratégico porque elimina instalação antes do primeiro contato.

---

## 5.2 Aplicativos

Android e iOS devem empacotar o mesmo jogo.

Não deve existir uma segunda implementação das regras para plataformas nativas.

A arquitetura deve preservar:

- mesmo motor;
- mesma Arena;
- mesmo score;
- mesmas regras;
- mesma experiência.

Capacidades nativas podem ser adicionadas através de adaptadores quando necessário.

---

# 6. CORE LOOP

```text
ARROTAR
   ↓
RECEBER NOTA
   ↓
DESAFIAR
   ↓
RESPONDER
   ↓
PLACAR
   ↓
REVANCHE
   └──────────────► ARROTAR
```

O loop possui cinco tempos principais.

---

# 7. ARROTAR

## Objetivo

Capturar uma tentativa com o menor atrito possível.

## Entrada

Jogador toca em:

**ARROTAR**

## Comportamento

O jogo solicita permissão de microfone somente neste momento.

Se a permissão já foi concedida anteriormente, a gravação começa imediatamente.

Durante a gravação:

- a Bolha reage ao áudio real;
- existe cronômetro;
- existe tempo máximo;
- o jogador pode encerrar manualmente;
- a gravação encerra automaticamente no teto.

O botão principal muda de:

**ARROTAR**

para:

**JÁ FOI**

sem trocar de posição.

## Regra

Nenhum áudio capturado significa nenhuma nota.

---

# 8. VALIDAÇÃO DO ARROTO

Antes da pontuação, o Auê verifica se a gravação parece realmente conter um arroto.

A classificação roda localmente utilizando YAMNet.

O objetivo não é identificar perfeitamente todo som humano.

O objetivo é impedir que qualquer ruído ganhe uma nota absurda.

Devem ser rejeitados:

- silêncio;
- conversa comum;
- sopro;
- gravação vazia;
- ruído claramente incompatível.

O sistema deve preferir ocasionalmente aceitar um arroto duvidoso a rejeitar agressivamente arrotos legítimos.

Falso negativo destrói a diversão mais rapidamente que um falso positivo ocasional.

---

# 9. ORIGEM DO ARROTO

Depois que o áudio é aceito, o jogador informa de onde aquele arroto veio.

A origem é declarada.

O jogo nunca finge detectá-la automaticamente.

Opções:

| Origem | Valor |
|---|---:|
| Espontâneo | 100 |
| Comida | 90 |
| Bebida | 80 |
| Outro | 80 |
| Puxei ar | 0 |

A origem representa 10% do score.

“Puxei ar” é considerado artificial.

“Outro” não pode ser a melhor alternativa nem pode ser punido como tentativa artificial.

A escolha deve acontecer em um toque.

Sem confirmação adicional.

---

# 10. AUÊ SCORE

## 10.1 Regra geral

O resultado é uma nota inteira entre:

**0 e 100**

Não são exibidas casas decimais.

O jogador precisa enxergar um placar, não um relatório laboratorial.

---

## 10.2 Componentes

A versão atual utiliza:

| Métrica | Peso |
|---|---:|
| Fôlego | 30% |
| Força | 30% |
| Grave | 30% |
| Origem | 10% |

Total:

**100%**

---

# 11. MÉTRICAS

## 11.1 Fôlego

Representa a duração útil do arroto.

Não conta simplesmente o tamanho total da gravação.

O motor identifica o trecho ativo para evitar que silêncio antes ou depois aumente artificialmente a pontuação.

Faixa de calibração atual:

**0,40 s → 0**

**2,50 s → 100**

---

## 11.2 Força

Representa a intensidade acústica do trecho ativo.

Calibração aproximada:

**RMS 0,03 → 0**

**RMS 0,20 → 100**

---

## 11.3 Grave

Representa a proporção de energia sonora concentrada abaixo de aproximadamente 150 Hz.

Calibração:

**0,10 → 0**

**0,30 → 100**

---

## 11.4 Textura

A métrica de textura existente em versões anteriores não participa mais da pontuação.

Peso:

**0%**

Pode permanecer internamente para compatibilidade técnica, mas não deve influenciar quem ganha.

---

# 12. CALIBRAÇÃO

A régua atual foi construída a partir de áudio real.

A calibração utilizada na versão atual foi baseada em:

- 43 arquivos recebidos;
- 8 pares de duplicatas identificados;
- 3 arquivos de voz;
- 32 arrotos únicos válidos utilizados como base acústica.

O motor deve continuar sendo calibrado com amostras reais quando houver evidência de distorção sistemática.

Mudança na fórmula exige versionamento.

Resultados históricos não devem ser silenciosamente recalculados.

---

# 13. REAÇÃO DO JUIZ

O score possui faixas de reação.

| Nota | Reação-base |
|---:|---|
| 0–19 | Foi isso? |
| 20–39 | Tá fraco, hein. |
| 40–59 | Dá pro gasto. |
| 60–74 | Aí sim, porra. |
| 75–84 | Caralho, veio forte. |
| 85–94 | Tá maluco. |
| 95–99 | Esse bagulho tá apelão. |
| 100 | Tá roubado. Não é possível. |

Cada faixa pode possuir múltiplas frases.

A variação serve para dar sensação de reação humana.

Não deve alterar regra, score ou resultado.

---

# 14. REVELAÇÃO DO RESULTADO

A nota precisa ter peso.

A ordem visual é:

1. score;
2. reação;
3. métricas;
4. provocação;
5. próxima ação.

A primeira revelação pode contar animadamente até o valor final.

A Bolha participa do momento.

O jogador não deve receber primeiro uma tabela com números e depois descobrir quanto tirou.

O resultado precisa parecer placar.

---

# 15. RESULTADO

Depois da nota, as principais possibilidades são:

### Principal

**CHAMAR NO X1**

### Secundária

**COMPARTILHAR**

### Repetição imediata

**Vou mandar outro!**

A hierarquia é intencional.

Compartilhar uma nota gera audiência.

X1 gera jogador.

---

# 16. X1

## 16.1 Conceito

O jogador transforma seu resultado em desafio privado.

O jogo gera um link imprevisível que pode ser enviado diretamente para outra pessoa.

Não existe feed público de desafios.

---

## 16.2 Identidade

O nome do jogador só é solicitado quando passa a ser necessário socialmente.

Exemplo:

ao desafiar alguém.

Nunca antes da primeira tentativa.

O nome é opcional.

Sem nome, o jogador ainda pode continuar.

---

# 17. RECEBENDO UM X1

Quem recebe um desafio abre o link e cai diretamente no confronto.

Não precisa:

- criar cadastro;
- instalar;
- procurar o adversário;
- inserir código.

A tela informa:

- quem desafiou;
- qual nota precisa ser batida;
- áudio do arroto adversário.

Ouvir o arroto adversário é parte obrigatória da experiência.

Competir somente contra “94” seria competir contra uma planilha.

O áudio transforma aquele número em provocação.

CTA:

**AGUENTA ESSA**

---

# 18. ROUNDS DO X1

Uma disputa pode possuir vários rounds.

Regras:

- cada revanche abre novo round;
- os dois participantes precisam arrotar para fechar o round;
- maior nota vence;
- empate não dá vitória;
- não existe vitória por W.O.;
- não existe desempate oculto;
- qualquer participante pode pedir revanche;
- o mesmo link preserva a disputa;
- máximo de 50 rounds por disputa.

---

# 19. EMPATE

No confronto direto:

**nota igual = empate.**

As métricas secundárias não podem decidir secretamente a batalha.

Se o jogador viu apenas a nota como regra, perder por um critério escondido pareceria roubo.

Empate deve servir principalmente como combustível para revanche.

---

# 20. PLACAR

O placar apresenta:

- número de vitórias;
- último round;
- nota de cada jogador;
- vencedor do último round;
- áudio correspondente às tentativas mostradas.

Cada linha do placar pode reproduzir o arroto daquele jogador.

A nota deixa de ser apenas número e ganha uma prova sonora.

O histórico completo de todos os rounds não é necessário na experiência atual.

---

# 21. REVANCHE

A revanche não cria uma nova batalha.

Ela continua a existente.

Contexto preservado:

- adversários;
- link;
- placar;
- número do round;
- vitórias.

CTA:

**REVANCHE**

A revanche deve parecer consequência natural da provocação.

---

# 22. DISPUTA LOCAL: RODA

## 22.1 Conceito

Um grupo está fisicamente reunido e usa um único aparelho.

O celular passa de mão em mão.

Fluxo:

```text
ARROTAR
↓
NOTA
↓
PASSA O CELULAR
↓
PRÓXIMO JOGADOR
↓
PLACAR
↓
PÓDIO
```

---

## 22.2 Configuração

Quantidade:

**2 a 5 jogadores**

Rounds:

**1 a 3**

Pode ser informado contexto opcional:

- casa;
- churrasco;
- público;
- escritório;
- outro.

---

## 22.3 Nome

Cada participante pode inserir nome ou apelido.

Caso deixe vazio:

**Arrotador N**

é atribuído automaticamente.

Nomes duplicados não são permitidos.

---

## 22.4 Turno

O jogo informa claramente:

> Agora é você, Rafa.

e:

> Round 2 de 3.

Cada jogador então passa pelo mesmo motor:

**ARROTAR → ORIGEM → JULGAMENTO → RESULTADO**

Não existe uma segunda regra de pontuação para a Roda.

---

# 23. PLACAR DA RODA

O placar utiliza a melhor tentativa de cada participante.

Não usa:

- média;
- última tentativa;
- soma.

Motivo:

o Auê recompensa o melhor arroto da disputa.

Se alguém fizer 98 no primeiro round e 51 no segundo, o 98 continua sendo seu resultado competitivo.

---

# 24. EMPATE NA RODA

Empates compartilham a mesma posição.

Exemplo:

```text
1º João
2º Pedro
2º Carlos
4º Rafa
```

Não existe desempate secreto.

---

# 25. PÓDIO

Ao final da Roda é produzido um pódio compartilhável.

O pódio existe para sair do jogo e chegar ao grupo.

CTA principal:

**MANDAR O PÓDIO**

Saída:

**Acabou essa porra**

retorna para a Arena inicial.

---

# 26. ARENA

Toda a experiência principal ocorre dentro de uma única superfície chamada:

**Arena**

Ela não é uma coleção de páginas.

A Arena permanece visualmente estável enquanto seu estado muda.

Estrutura:

```text
HUD

PALCO / BOLHA / SCORE

REAÇÃO / MÉTRICAS / PLACAR

AÇÃO PRINCIPAL
```

A Bolha permanece como âncora espacial.

O usuário deve sentir que o jogo mudou de situação, e não que foi enviado para outra página.

---

# 27. ESTADOS DA ARENA

Existem dez estados canônicos.

| Estado | Função |
|---|---|
| IDLE | espera o jogador |
| RECORDING | grava e reage |
| ORIGIN | pergunta a origem |
| JUDGING | processa a tentativa |
| RESULT | revela a nota |
| CHALLENGE | desafio criado |
| VERSUS | desafio recebido |
| SCOREBOARD | placar |
| REMATCH | revanche |
| ERROR | falha ou tentativa inválida |

Estados adicionais não devem ser criados apenas para representar pequenos momentos visuais.

---

# 28. IDLE

Função:

esperar.

Elemento principal:

Bolha viva, respirando.

CTA:

**ARROTAR**

Não pode mostrar:

- login obrigatório;
- tutorial obrigatório;
- cadastro;
- formulário;
- permissão de microfone antecipada.

---

# 29. RECORDING

Função:

confirmar visualmente que o jogo está ouvindo.

Características:

- HUD reduzido;
- Bolha reage ao som;
- cronômetro;
- limite de duração;
- CTA **JÁ FOI**.

Ao sair:

todo recurso de microfone deve ser liberado corretamente.

---

# 30. ORIGIN

Função:

receber a origem declarada.

Cinco opções.

Um toque.

Sem botão “confirmar”.

---

# 31. JUDGING

Função:

transformar espera técnica em pequeno momento dramático.

Não existe CTA.

O jogador precisa sentir:

> agora o juiz está decidindo.

A espera deve ser curta.

---

# 32. RESULT

Função:

entregar a recompensa principal.

Elementos:

- score;
- reação;
- métricas;
- X1;
- compartilhar;
- nova tentativa.

É um dos momentos de maior impacto visual do jogo.

---

# 33. CHALLENGE

Função:

mostrar que o desafio existe e permitir sua distribuição.

Elementos:

- score;
- áudio;
- link;
- compartilhar desafio;
- estado de espera.

Não pode afirmar que o outro viu o desafio.

---

# 34. VERSUS

Função:

receber a provocação.

Elementos:

- adversário;
- nota adversária;
- áudio adversário;
- CTA **AGUENTA ESSA**.

---

# 35. SCOREBOARD

Função:

resolver a disputa e imediatamente provocar continuação.

Elementos:

- placar;
- último round;
- áudios;
- vencedor ou empate;
- revanche.

---

# 36. REMATCH

Função:

começar nova tentativa preservando o contexto da batalha.

Não é um jogo novo.

É a mesma discussão continuando.

---

# 37. ERROR

Função:

dizer a verdade.

Casos incluem:

- microfone negado;
- nenhum áudio;
- não parece arroto;
- falha de análise;
- falha de rede;
- falha ao compartilhar;
- batalha expirada;
- configuração indisponível.

O erro pode ser engraçado.

Nunca pode esconder o que aconteceu.

---

# 38. A BOLHA

A Bolha é personagem funcional do Auê.

Ela não é somente logo ou decoração.

Ela comunica:

- espera;
- escuta;
- energia;
- contenção;
- julgamento;
- impacto;
- vitória;
- derrota.

Durante gravação, sua reação deve estar ligada ao som real.

Isso cria feedback imediato:

**“o jogo está me ouvindo.”**

---

# 39. DIREÇÃO VISUAL

O Auê utiliza linguagem visual de jogo casual premium.

Características:

- fundo escuro;
- verde ácido característico;
- alto contraste;
- números grandes;
- tipografia expressiva;
- interface enxuta;
- pouca ornamentação estrutural;
- movimento com função;
- ausência de excesso de cards.

A situação já é engraçada.

A interface não precisa parecer uma piada visual.

---

# 40. GAME FEEL

O Auê deve parecer vivo.

Feedback esperado:

- Bolha respirando;
- reação ao microfone;
- transições rápidas;
- score entrando com impacto;
- vibração quando disponível;
- pequenos efeitos durante revelação;
- placar com presença;
- mudança visual em vitória e empate.

O jogo não deve parecer um formulário escuro com botões verdes.

Motion serve para reforçar ação e resultado.

Não para decorar tudo que se move.

---

# 41. ACESSIBILIDADE

O jogo deve respeitar:

- contraste;
- áreas de toque adequadas;
- safe areas;
- navegadores móveis reais;
- preferência por movimento reduzido;
- informação que não dependa exclusivamente de animação;
- mensagens de erro legíveis.

Com `prefers-reduced-motion`, a experiência continua compreensível.

---

# 42. ÁUDIO

Áudio é mecânica central, não decoração.

Existem três papéis principais:

### Entrada

o arroto é capturado.

### Prova

o adversário pode ouvir o arroto associado à nota.

### Competição

o áudio transforma uma nota em algo pertencente a uma pessoa.

O jogo não deve tocar áudio inesperadamente sem contexto.

---

# 43. PRIVACIDADE

Arrotos são gravações de áudio de usuários.

Portanto, privacidade é requisito de gameplay.

Regras atuais:

- o áudio não vira acervo público automaticamente;
- gravação para jogar não significa autorização para publicidade;
- gravação não significa autorização para treinamento de modelo;
- o jogador pode apagar o próprio áudio;
- denúncia pode ocultar conteúdo;
- o acesso à batalha pelo link expira;
- a expiração do link não significa exclusão automática do arquivo.

Nenhuma tela pode prometer exclusão automática inexistente.

---

# 44. DURAÇÃO DO LINK

O desafio privado permanece acessível pelo link durante:

**7 dias**

O jogo deve mostrar o tempo real restante.

Não deve simplesmente imprimir “7 dias” depois que parte desse prazo já passou.

---

# 45. DESEMPATE TÉCNICO

Para comparações internas ou ordenação fora da decisão direta de uma batalha, a ordem técnica é:

1. Grave;
2. Força;
3. Fôlego.

Persistindo igualdade:

**Empate Técnico do Gás**

Essa regra não deve decidir silenciosamente vencedor de X1.

---

# 46. VOZ DO AUÊ

A voz deve soar como amigo falando com amigo.

Características:

- informal;
- direta;
- brasileira;
- influência carioca sem caricatura;
- linguagem gamer natural;
- palavrão quando encaixa;
- provocação;
- frases curtas.

Não é:

- linguagem de startup;
- narrador de e-sport corporativo;
- marca tentando falar como adolescente;
- tutorial técnico.

---

# 47. REGRA DA ZOEIRA

A piada ataca:

- arroto;
- desempenho;
- resultado;
- derrota;
- coragem para revanche.

Nunca característica pessoal do jogador.

Humilhar o 23 é jogo.

Humilhar a pessoa é outra coisa.

---

# 48. COPY DOS BOTÕES

Rótulos funcionais devem permanecer previsíveis.

Exemplos canônicos:

**ARROTAR**

**JÁ FOI**

**CHAMAR NO X1**

**COMPARTILHAR**

**AGUENTA ESSA**

**REVANCHE**

**MANDAR O DESAFIO**

**MANDAR O PÓDIO**

As falas ao redor podem variar.

O botão não deve virar caça-palavras para parecer engraçado.

---

# 49. PROGRESSÃO

O Auê atual não possui sistema tradicional de progressão.

Não existem:

- XP;
- níveis;
- skill tree;
- moedas;
- conquistas;
- temporadas;
- battle pass.

A progressão é social e emergente:

**eu consigo bater minha nota?**

**consigo bater meu amigo?**

**ele consegue recuperar a derrota?**

O placar da disputa é a progressão da sessão.

---

# 50. RETENÇÃO

A retenção não deve depender inicialmente de streak, recompensa diária ou notificação.

Os motores de retorno são:

### Revanche

“Eu consigo bater?”

### Provocação

“Fulano me mandou um desafio.”

### Contexto social

“Vamos abrir o Auê aqui.”

### Conteúdo

“Esse cara fez 94. Quanto eu faço?”

O jogo deve tentar criar histórias entre pessoas antes de criar obrigações diárias.

---

# 51. AQUISIÇÃO ORGÂNICA

O próprio gameplay deve gerar aquisição.

Ciclo desejado:

```text
JOGADOR A
↓
ARROTA
↓
RECEBE NOTA
↓
CRIA X1
↓
MANDA LINK
↓
JOGADOR B ENTRA
↓
RESPONDE
↓
NOVO JOGADOR
```

O X1 não é somente multiplayer.

É um canal de aquisição.

---

# 52. CONTEÚDO EXTERNO

Vídeos curtos podem funcionar como porta de entrada para o jogo.

Formato ideal:

```text
ARROTO

94

TÁ MALUCO.

DUVIDO BATER.
```

O conteúdo deve mostrar a brincadeira.

Não explicar o produto como propaganda institucional.

---

# 53. TELEMETRIA DE PRODUTO

A telemetria deve medir o loop, não vigiar o jogador.

Eventos recomendados:

- abriu_arena;
- iniciou_arroto;
- recebeu_nota;
- tentou_novamente;
- compartilhou;
- criou_x1;
- abriu_x1;
- respondeu_x1;
- pediu_revanche;
- concluiu_roda.

Também deve ser possível identificar origem de aquisição de forma anônima, como:

- TikTok;
- Instagram;
- YouTube;
- WhatsApp;
- Google;
- QR;
- X1;
- acesso direto.

O objetivo é responder:

> onde o jogador está desistindo?

---

# 54. MÉTRICA PRINCIPAL

A métrica mais importante do Auê não deve ser somente quantidade de visitas.

A principal pergunta de produto é:

> **Um jogador trouxe outro jogador?**

Indicadores importantes:

### Ativação

Percentual que abriu e chegou a uma nota.

### Propagação

Percentual que compartilhou ou criou X1.

### Conversão do X1

Percentual de convidados que responderam.

### Revanche

Percentual de partidas que geraram novo round.

### Retorno

Percentual de jogadores que voltaram.

---

# 55. MONETIZAÇÃO

Monetização não pertence ao gameplay atual.

Não existem atualmente como requisito:

- assinatura;
- Auê+;
- paywall;
- venda de score;
- anúncios no meio da Arena;
- compra de vantagem.

Qualquer modelo futuro deve preservar uma regra absoluta:

> **dinheiro nunca melhora nota.**

Pay-to-win destruiria a legitimidade da competição.

Monetização futura precisa de decisão específica de produto.

---

# 56. O QUE O AUÊ NÃO É

O Auê atual não é:

- rede social;
- feed de arrotos;
- Instagram de arroto;
- comunidade;
- plataforma de criadores;
- ranking global;
- jogo de XP;
- campeonato;
- liga;
- marketplace;
- serviço de diagnóstico acústico.

Essas ideias não devem aparecer silenciosamente no produto só porque parecem extensões naturais.

---

# 57. ESCOPO DA VERSÃO ATUAL

Pertence ao jogo:

- Arena;
- captura;
- detecção;
- origem;
- score;
- reação;
- métricas;
- compartilhamento;
- X1;
- link privado;
- áudio adversário;
- rounds;
- placar;
- revanche;
- Roda;
- pódio;
- erros;
- privacidade;
- web mobile;
- empacotamento do mesmo jogo para aplicativos.

---

# 58. FORA DO ESCOPO ATUAL

- feed;
- seguidores;
- comentários;
- likes;
- comunidades;
- perfil social;
- ranking global;
- XP;
- níveis;
- conquistas;
- temporadas;
- campeonatos;
- assinatura;
- push;
- mensagens privadas;
- login obrigatório.

O fato de alguma dessas coisas já ter existido em versões anteriores de código ou documentação não a transforma em roadmap.

---

# 59. REQUISITOS DE QUALIDADE

Uma feature não está pronta porque a tela existe.

Está pronta quando:

- funciona ponta a ponta;
- funciona no celular real;
- erro é tratado;
- não apresenta dado falso;
- não mostra botão que não funciona;
- não quebra a regra do jogo;
- typecheck passa;
- lint passa;
- testes passam;
- build passa;
- mudança relevante foi validada em dispositivo real.

---

# 60. PRINCÍPIOS TÉCNICOS QUE AFETAM GAME DESIGN

Embora este seja um GDD, algumas decisões técnicas são diretamente ligadas à experiência.

## Mesma regra

Score local e oficial precisam permanecer coerentes.

## Fórmula versionada

Uma nova fórmula não pode alterar silenciosamente resultados antigos.

## Áudio ligado à tentativa

Quando um placar mostra uma nota, precisa tocar o áudio daquela tentativa.

## Sem estado fictício

Tela não pode fingir que batalha, upload, share ou score deu certo.

## Link imprevisível

Batalhas privadas não devem ser enumeráveis.

---

# 61. EXPERIÊNCIA IDEAL DE PRIMEIRO USO

Objetivo:

fazer alguém experimentar o conceito antes de precisar entender o produto.

Sequência:

```text
abre
↓
ARROTAR
↓
microfone
↓
grava
↓
origem
↓
julgamento
↓
87
↓
"TÁ MALUCO."
↓
CHAMAR NO X1
```

A pessoa deve entender o Auê jogando.

Não lendo.

---

# 62. EXPERIÊNCIA IDEAL DE QUEM RECEBE UM LINK

```text
abre o link
↓
"Luiz fez 87"
↓
ouve o arroto
↓
AGUENTA ESSA
↓
arrota
↓
recebe nota
↓
placar
↓
REVANCHE
```

Nenhuma etapa de cadastro deve interromper esse caminho.

---

# 63. EXPERIÊNCIA IDEAL DA RODA

```text
grupo reunido
↓
chamar a mesa
↓
nomes
↓
quantidade de rounds
↓
jogador 1
↓
jogador 2
↓
...
↓
próximo round
↓
pódio
↓
MANDAR O PÓDIO
```

A Roda deve parecer jogo de sofá transportado para o celular.

---

# 64. CRITÉRIO PARA NOVAS FEATURES

Antes de entrar no Auê, uma ideia deve responder:

**Ela fortalece ARROTAR, NOTA, DESAFIAR, RESPONDER ou REVANCHE?**

Se não fortalece nenhum desses pontos, provavelmente não pertence ao jogo agora.

Também deve responder:

1. reduz ou aumenta atrito?
2. cria mais partidas?
3. melhora confiança no score?
4. aumenta provocação?
5. aumenta revanche?
6. ajuda um jogador a trazer outro?

“É legal” sozinho não basta.

---

# 65. OBJETIVO DE PRODUTO

O Auê terá encontrado seu núcleo quando jogadores fizerem espontaneamente algo parecido com:

> “Fiz 91 nessa porra. Tenta bater.”

e o outro abrir o link sem precisar de explicação.

Nesse momento, o jogo deixa de depender da curiosidade pela tecnologia.

Passa a depender da disputa entre pessoas.

---

# 66. NORTH STAR

A estrela-guia do Auê é:

## **Arrotos que geram outro arroto.**

Não downloads.

Não contas criadas.

Não páginas vistas.

Não número de features.

Uma sessão de Auê é especialmente valiosa quando provoca a próxima.

---

# 67. DEFINIÇÃO FINAL

Auê é uma brincadeira competitiva transformada em videogame.

O microfone é o controle.

O arroto é a jogada.

A nota é a munição.

O amigo é o próximo adversário.

E a partida só termina quando ninguém tiver mais dignidade ou gás para pedir revanche.
