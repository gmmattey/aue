# AUÊ!
## Art Bible

**Versão:** 1.0  
**Data:** 27 de agosto de 2026  
**Status:** Direção de arte canônica  
**Produto:** Auê!  
**Categoria:** Jogo mobile casual competitivo  
**Direção:** 2D · flat · dark · expressivo · áudio-reativo

Este Art Bible consolida a direção artística do Auê. A máquina de estados segue
[`../jogo/ARENA.md`](../jogo/ARENA.md), a geometria e o comportamento seguem o
protótipo, e os tokens seguem o design system em `design-system/system/`. A
prancha de telas recebida é uma referência de composição para os momentos do
jogo, não uma lista de rotas ou estados novos.

---

# 1. OBJETIVO DESTE DOCUMENTO

Este Art Bible define a linguagem visual do Auê como **videogame**.

Ele existe para responder:

- como o Auê deve parecer;
- como deve se mover;
- como a Bolha deve agir;
- como vitória, derrota, gravação e julgamento devem ser sentidos;
- como criar novos assets sem descaracterizar o jogo;
- como diferenciar o Auê de um aplicativo comum;
- quais efeitos pertencem ao jogo;
- quais efeitos parecem enfeite;
- o que artistas, designers e desenvolvedores podem e não podem inventar.

Este documento **não substitui** as fontes canônicas existentes.

Para implementação:

- `docs/design/prototipo-arena/arena.html` determina geometria e comportamento visual;
- `docs/design/design-system/system/DESIGN.md` determina tokens, componentes e regras;
- `docs/jogo/ARENA.md` determina os estados;
- este Art Bible determina **a direção artística que une tudo isso**.

Quando houver conflito técnico, os documentos canônicos acima vencem.

---

# 2. A FRASE VISUAL DO AUÊ

Se a direção de arte inteira precisasse caber em uma frase:

> **Uma competição idiota apresentada com a seriedade visual de um videogame de verdade.**

O Auê não parece um aplicativo de piada.

O Auê parece um jogo bonito acontecendo em torno de uma situação ridícula.

Essa diferença é fundamental.

O humor está no que acontece.

Não precisamos desenhar privada, cerveja voando, emoji de arroto, cocô ou personagem fazendo careta em cada canto da interface.

---

# 3. IDENTIDADE EMOCIONAL

A experiência visual combina seis sentimentos:

### Pressão

Existe uma tentativa acontecendo.

### Expectativa

O jogo está ouvindo.

### Julgamento

Alguma coisa vai decidir se aquilo foi bom.

### Impacto

A nota precisa entrar como acontecimento.

### Provocação

O resultado existe para ser mostrado a alguém.

### Revanche

Nada deve parecer definitivamente encerrado.

---

# 4. REFERÊNCIAS CULTURAIS

A direção emocional bebe de:

- jogos competitivos locais;
- multiplayer de sofá;
- lan house;
- arcades;
- jogos de luta;
- tela de placar;
- round;
- versus;
- revanche;
- interfaces de jogos dos anos 90 e 2000 reinterpretadas de maneira contemporânea.

Não significa copiar visual retrô.

O Auê não é pixel art.

A herança aparece principalmente em:

- peso da pontuação;
- VS;
- entrada de round;
- vitória;
- derrota;
- placar;
- provocação;
- feedback imediato.

---

# 5. O QUE NÃO É REFERÊNCIA

Evitar linguagem visual de:

- fintech;
- painel SaaS;
- aplicativo corporativo;
- rede social;
- dashboard;
- fitness tracker;
- aplicativo médico;
- laboratório acústico;
- cassino;
- cyberpunk neon genérico;
- aplicativo infantil;
- jogo mobile carregado de moedas e baús.

Se a Arena começar a parecer dashboard com cards, estamos errados.

Se parecer TikTok com arroto, também.

---

# 6. DIREÇÃO GRÁFICA

O Auê é:

**flat, gráfico, contrastado e orgânico.**

A profundidade vem de:

- escala;
- composição;
- movimento;
- deformação;
- sobreposição;
- ritmo;
- timing.

Não de renderização tridimensional.

O visual evita:

- bevel;
- textura fotográfica;
- plástico 3D;
- reflexo;
- vidro;
- skeuomorfismo;
- glow decorativo;
- gradiente decorativo.

---

# 7. PALETA PRINCIPAL

## Preto Carvão

`#0a0a08`

É o espaço onde a competição acontece.

Nunca deve parecer preto digital puro sem personalidade.

É escuro, quente e levemente orgânico.

---

## Branco Quebrado

`#f5f3ea`

Texto principal.

Evita o branco `#ffffff` excessivamente digital.

---

## Verde Ácido

`#c6ff00`

É energia.

Não é simplesmente “a cor da marca”.

Representa:

- vida;
- ação;
- captura;
- score;
- possibilidade de interação.

Quanto mais verde espalhado pela tela, menos importante ele fica.

### Regra

Máximo recomendado de **duas aparições dominantes simultâneas**.

Prioridade:

1. Bolha viva;
2. score;
3. CTA principal.

Se Bolha e score já usam verde, o botão pode perder protagonismo cromático.

---

## Ouro

`#f4c430`

Representa:

**vitória.**

Não representa ação normal.

O ouro precisa ser raro para continuar significando alguma coisa.

---

## Vermelho

`#ff3d3f`

Representa falha real:

- microfone;
- erro técnico;
- tentativa inválida;
- envio quebrado.

### Regra importante

**Derrota não é erro.**

Nunca pintar perdedor de vermelho.

Perder faz parte do jogo.

---

# 8. REGRA DE LUZ

O Auê não utiliza iluminação cinematográfica simulada.

Não há:

- glow permanente;
- neon em volta de tudo;
- halo em todo botão;
- gradiente para fingir volume.

O game feel deve nascer de movimento e contraste.

### Exceção conceitual

Efeitos muito breves podem criar sensação de energia durante eventos, desde que sejam construídos com os próprios tokens e desapareçam imediatamente.

Exemplo:

um anel expandindo durante o início da gravação.

Isso é feedback.

Não decoração.

---

# 9. A BOLHA

A Bolha é o coração visual do Auê.

Ela exerce simultaneamente os papéis de:

- mascote;
- logotipo vivo;
- medidor;
- personagem;
- feedback;
- palco;
- reação emocional.

Se a Bolha pudesse ser removida sem alterar a experiência, a implementação está errada.

---

# 10. SILHUETA DA BOLHA

A Bolha é um blob orgânico sob pressão.

Características:

- aproximadamente circular;
- assimétrica;
- poucos lóbulos;
- borda suave;
- peso visual forte;
- leitura clara mesmo pequena.

Ela nunca deve virar:

- estrela;
- ameba cheia de pontas;
- círculo perfeito;
- splash de tinta;
- nuvem;
- slime infantil.

A imperfeição precisa parecer **tensão**, não aleatoriedade.

---

# 11. O PONTO DE EXCLAMAÇÃO

O `!` é parte fundamental da marca.

Ele impede que a Bolha seja percebida apenas como blob abstrato.

Características:

- pesado;
- simples;
- vertical;
- haste levemente afunilada;
- sem inclinação;
- bastante espaço entre haste e ponto;
- alinhamento óptico com a massa da Bolha.

Não adicionar:

- olhos;
- boca;
- dentes;
- braços;
- rosto.

A Bolha é personagem através de **forma e movimento**, não através de antropomorfismo explícito.

---

# 12. PERSONAGEM SEM ROSTO

Uma decisão artística central:

**a Bolha não possui face.**

Isso permite que o mesmo objeto transmita:

- atenção;
- tensão;
- surpresa;
- julgamento;
- vitória;
- derrota;

apenas com:

- escala;
- compressão;
- amplitude;
- velocidade;
- cor;
- timing.

Ela se aproxima mais de um organismo abstrato que de mascote tradicional.

---

# 13. VOCABULÁRIO CORPORAL DA BOLHA

A Bolha possui estados corporais.

## Repouso

Amplitude baixa.

Respiração irregular.

Nunca completamente imóvel.

Sensação:

**“tô aqui.”**

---

## Escuta

Aumenta.

Responde imediatamente ao som.

Sensação:

**“manda.”**

---

## Pressão

Comprime.

O movimento diminui.

Sensação:

**“segurei essa porra.”**

---

## Julgamento

Encolhe.

Fica concentrada.

Movimento mais contido.

Sensação:

**“deixa eu ver essa merda.”**

---

## Revelação

Expande rapidamente.

Dá lugar ao score.

Sensação:

**“CARALHO.”**

---

## Espera

Volta a respirar lentamente.

Sensação:

**“agora falta o outro.”**

---

## Vitória

Expansão curta, segura e dominante.

O ouro pode assumir papel de destaque.

---

## Derrota

Perde tensão.

Cede levemente para baixo.

Nunca desaparece dramaticamente.

Derrota é engraçada.

Não trágica.

---

# 14. ÁUDIO-REATIVIDADE

Durante gravação, o áudio precisa ter consequência visual imediata.

A energia capturada pelo microfone dirige a Bolha.

Silêncio:

pequena.

Arroto forte:

grande deformação.

Variação:

movimento orgânico.

Isso funciona como um VU Meter integrado ao personagem.

Não criar barra tradicional de volume como elemento principal.

A Bolha **é** o medidor.

---

# 15. PRINCÍPIO DO SQUASH & STRETCH

A Bolha deve obedecer parcialmente à lógica clássica de animação:

compressão antes do impacto;

expansão depois.

Exemplo:

```text
ARROTO TERMINA

Bolha
↓
comprime
↓
segura
↓
julga
↓
EXPLODE NA NOTA
```

Esse pequeno arco físico cria muito mais sensação de videogame que adicionar dez efeitos luminosos.

---

# 16. MOTION LANGUAGE

Toda animação precisa responder:

> o que aconteceu no jogo?

Se não houver resposta clara, provavelmente não precisamos dela.

---

# 17. ENTRADA NA GRAVAÇÃO

Ao começar:

1. botão responde imediatamente ao toque;
2. anel de energia se expande;
3. Bolha aumenta;
4. HUD perde importância;
5. reação ao áudio começa.

Sensação:

**round começou.**

Não deve parecer:

“microfone ativado”.

---

# 18. DURANTE A GRAVAÇÃO

O movimento nunca deve repetir uma animação fixa.

Precisa responder ao som.

Utilizar:

- amplitude;
- deformação;
- pequenas mudanças de escala;
- resposta imediata;
- suavização para evitar jitter.

Não criar carnaval visual.

O jogador precisa olhar para a Bolha e entender o próprio arroto.

---

# 19. FIM DA GRAVAÇÃO

A ação de terminar deve gerar impacto corporal.

Movimento recomendado:

**snap**

A Bolha comprime rapidamente e volta parcialmente.

Duração aproximada:

**460 ms**

Sensação:

algo acabou de ser capturado.

---

# 20. JULGAMENTO

Este é o momento de suspense.

Composição:

- HUD desaparece;
- espaço fica silencioso;
- Bolha contrai;
- movimentos ficam lentos;
- texto curto;
- nenhum spinner tradicional dominando a experiência.

Não usar:

“Analisando áudio... 68%”

Isso transforma jogo em ferramenta.

---

# 21. REVELAÇÃO DA NOTA

Esse é o payoff visual principal.

Precisa ser tratado como:

**evento.**

Não simplesmente atualizar um número na DOM.

Sequência:

```text
silêncio
↓
Bolha segura
↓
pop
↓
score aparece
↓
score conta
↓
reação entra
↓
métricas chegam
↓
ações aparecem
```

Não mostrar tudo ao mesmo tempo.

---

# 22. O SCORE

O Auê Score é objeto visual.

Não é texto.

Características:

- enorme;
- Anton;
- inteiro;
- extremamente legível;
- números tabulares;
- centralizado;
- associado fisicamente à Bolha.

Valores:

`4`

`62`

`94`

`100`

Todos precisam parecer igualmente intencionais.

---

# 23. REGRA DO 100

O layout precisa ser desenhado pensando primeiro no `100`.

Se o 100 couber bem:

1 a 99 também cabem.

Nunca diminuir dinamicamente apenas o score alto de maneira perceptível.

Fazer 100 não pode resultar numa nota visualmente menor que fazer 87.

---

# 24. TIPOGRAFIA

## Display

**Anton**

Uso:

- score;
- reação forte;
- VS;
- nome competitivo;
- contagem;
- CTA principal;
- wordmark.

A função é dar peso de videogame.

---

## Interface

**Archivo**

Uso:

- instrução;
- comentário;
- métrica;
- legenda;
- botão secundário;
- conteúdo operacional.

---

## Mono

Uso muito limitado:

- timer;
- código;
- link;
- pequenas informações técnicas.

Nunca transformar a interface em terminal.

---

# 25. HIERARQUIA

A ordem visual deve ser:

### Durante a tentativa

**Bolha**

### Durante o resultado

**Score**

### Durante o confronto

**VS / placar**

### Durante decisão

**CTA principal**

Nunca tentar fazer tudo disputar atenção simultaneamente.

---

# 26. HUD

O HUD é discreto.

Não é navegação.

Pode conter:

- Auê!;
- sinal de disputa existente;
- menu.

Não criar:

- bottom navigation;
- cinco abas;
- Home;
- Feed;
- Ranking;
- Perfil.

A Arena é o jogo inteiro.

---

# 27. BOTÃO PRINCIPAL

O CTA principal precisa parecer botão de videogame.

Não formulário.

Características:

- grande;
- pesado;
- largura generosa;
- raio moderado;
- Anton;
- caixa alta via estilo;
- resposta física ao toque.

No `:active`:

o botão cede ligeiramente.

Sensação:

**pressionei alguma coisa.**

---

# 28. MICROFONE NA ENTRADA

O estado inicial pode ser ainda mais físico.

O gatilho do microfone pode assumir forma circular central.

Objetivo:

comunicar intuitivamente:

**fala aqui.**

Não precisa parecer formulário.

---

# 29. PLACAR X1

A composição deve remeter a confronto.

Elementos:

```text
LUIZ        GUINHO

87    VS    94
```

Quem venceu recebe ouro.

Quem perdeu continua visualmente digno.

Nada de:

- vermelho no perdedor;
- caveira;
- barra de HP;
- sangue;
- explosão arcade exagerada.

A competição é ridícula, mas clara.

---

# 30. VS

O `VS` é um símbolo de tensão.

Pode:

- comprimir;
- entrar rápido;
- separar os lados;
- participar do choque visual.

Não deve virar logotipo secundário.

---

# 31. VITÓRIA

Código visual:

**ouro.**

Possíveis elementos:

- score vencedor em ouro;
- pequeno `winPop`;
- Bolha mais aberta;
- hierarquia dominante;
- reação textual.

Não usar confete permanente.

Não usar medalha 3D.

Não transformar cada round na final da Copa.

---

# 32. DERROTA

A derrota é uma piada curta.

Código:

- fg normal;
- menor presença;
- Bolha perde pressão;
- reação provocativa;
- revanche muito visível.

Nunca danger/red.

Danger significa erro técnico.

Misturar os dois enfraquece o sistema visual.

---

# 33. EMPATE

Empate precisa parecer incômodo.

Não vitória dupla.

Visual:

```text
88    =    88
```

Mesmo peso nos dois lados.

Sem ouro.

A própria composição deve dizer:

**essa porra não resolveu nada.**

Saída óbvia:

**REVANCHE**

---

# 34. REVANCHE

A revanche deve ter pequeno ritual.

Contagem:

```text
3

2

1
```

Cada número ocupa o palco.

Pode utilizar:

- escala;
- compressão;
- impacto.

Não precisa de uma nova tela.

A Arena continua sendo o mesmo lugar.

---

# 35. A RODA

A Roda representa:

**multiplayer de sofá.**

O visual precisa transmitir:

- gente reunida;
- celular passando de mão em mão;
- turnos;
- placar local;
- expectativa coletiva.

Não criar lobby multiplayer tradicional.

---

# 36. CONTEXTO DA RODA

A localização da brincadeira pode alterar discretamente o fundo.

Possibilidades:

- casa;
- churrasco;
- público;
- escritório;
- outro.

Representação:

ícones lineares grandes e extremamente discretos atrás da Arena.

Não usar ilustração completa de ambiente.

O lugar é contexto.

Não cenário.

---

# 37. ÍCONES DE LOCAL

Estilo:

- `24×24`;
- stroke;
- 2 px;
- pontas arredondadas;
- geometria simples;
- monocromáticos;
- baixa opacidade quando usados como background.

Família:

### Casa

telhado + corpo + porta.

### Churrasco

grelha + pés + chama.

### Público

duas pessoas abstratas.

### Escritório

maleta.

### Outro

pin.

---

# 38. PÓDIO DA RODA

O pódio pode ser mais celebratório que o X1.

Ainda assim:

não introduzir troféus 3D ou medalhas douradas gigantes.

Utilizar principalmente:

- escala;
- posição;
- ouro;
- tipografia;
- score.

O melhor arroto é o protagonista.

Não o objeto “troféu”.

---

# 39. METÁFORA CENTRAL

O Auê não representa o arroto literalmente.

Ele representa:

**a pressão que o arroto causa.**

Por isso a Bolha funciona.

Arroto entra.

Pressão aumenta.

Corpo reage.

Nota explode.

Essa abstração é muito mais forte que desenhar ondas saindo de uma boca.

---

# 40. PARTÍCULAS

Partículas não são linguagem primária do Auê.

Podem existir excepcionalmente em momentos importantes.

Se usadas:

- poucas;
- grandes;
- geométricas;
- rápidas;
- derivadas das cores existentes.

Nunca:

- chuva de estrelinhas;
- partículas infinitas;
- glitter;
- confete permanente.

---

# 41. LINHAS DE IMPACTO

Linhas ou anéis radiais podem reforçar:

- início da gravação;
- score muito alto;
- vitória.

Devem durar poucos frames.

São pontuação.

Não papel de parede.

---

# 42. EFEITOS DE SCORE ALTO

Scores altos podem ganhar intensidade progressiva.

Exemplo de linguagem:

### 0–39

revelação contida.

### 40–74

revelação padrão.

### 75–84

pop mais forte.

### 85–94

pequeno impacto extra.

### 95–99

impacto máximo permitido.

### 100

evento raro.

Pode combinar:

- Bolha maior;
- escala do score;
- ouro momentâneo secundário;
- shake mínimo;
- resposta tátil.

Mas a regra estrutural continua igual.

Não criar tela exclusiva para 100.

---

# 43. HAPTICS

Quando disponível:

haptic deve funcionar junto do visual.

Momentos adequados:

- início de gravação;
- captura;
- revelação;
- score muito alto;
- vitória;
- início da revanche.

Nunca vibrar a cada animação.

Haptic vira ruído rapidamente.

---

# 44. SOM DE INTERFACE

O áudio principal já é o arroto.

Portanto, efeitos sonoros do jogo devem ser econômicos.

Pode haver:

- clique grave;
- impacto do score;
- sinal curtíssimo de vitória;
- contagem da revanche.

Não adicionar trilha musical contínua como padrão.

O silêncio antes da nota ajuda o impacto.

---

# 45. ERROS

Erro utiliza vermelho.

Bolha pode:

- tremer;
- comprimir;
- perder forma momentaneamente.

Mas a informação precisa permanecer clara.

Exemplo visual:

`shake` curto de aproximadamente 340 ms.

Depois:

estabilidade.

Nunca manter tudo piscando vermelho.

---

# 46. “NÃO É ARROTO”

Esse é erro de tentativa.

Não punição.

A reação pode ter humor.

Visualmente:

- shake curto;
- sem score;
- nenhum falso número;
- player do áudio quando fizer sentido;
- CTA para tentar novamente.

O jogador precisa entender que o jogo ouviu algo, mas não aceitou.

---

# 47. COMPONENTES SECUNDÁRIOS

Players, links, informações e métricas devem desaparecer visualmente atrás do gameplay.

Estilo:

- surface escura;
- borda discreta;
- sem verde desnecessário;
- tipografia pequena;
- forma simples.

Nunca competir com:

- Bolha;
- score;
- CTA.

---

# 48. MÉTRICAS

FORÇA · FÔLEGO · GRAVE

Devem funcionar como explicação posterior.

Apresentação:

- linear;
- simples;
- mesma família;
- sem cards separados;
- sem velocímetro;
- sem gráfico radar;
- sem dashboard.

A nota é o produto.

As métricas são justificativa.

---

# 49. ESPAÇAMENTO

O Auê precisa respirar.

Base:

8 px.

Margem mobile típica:

24 px.

Evitar preencher todo espaço disponível apenas porque existe.

Espaço negativo cria:

- tensão;
- foco;
- impacto.

O preto também é elemento gráfico.

---

# 50. COMPOSIÇÃO MOBILE

Alvo principal:

360 a 430 px de largura.

A composição precisa sobreviver sem scroll horizontal.

A Arena é construída em quatro faixas:

```text
HUD

PALCO

REAÇÃO

AÇÃO
```

Essas zonas mantêm estabilidade entre estados.

O conteúdo muda.

A arquitetura visual permanece.

---

# 51. DESKTOP

Desktop não deve ampliar a Arena como aplicativo web.

A Arena permanece mobile.

O desktop serve prioritariamente como:

- explicação;
- aquisição;
- SEO;
- passagem para celular.

Quando a Arena for exibida em desktop, deve viver dentro de um shell com largura controlada.

---

# 52. SAFE AREAS

Nenhuma ação importante deve colidir com:

- Dynamic Island;
- notch;
- barra inferior do iPhone;
- controles do navegador;
- navegação Android.

A direção de arte precisa ser bonita no aparelho real, não apenas em screenshot de Figma.

---

# 53. ASSETS VETORIAIS

Preferência:

**SVG.**

Utilizar para:

- Bolha;
- marca;
- ícones;
- fundos da Roda;
- pequenos símbolos.

Motivos:

- escala;
- peso;
- performance;
- fácil tinting pelos tokens;
- adaptação nativa.

---

# 54. RASTER

PNG/WebP apenas quando realmente necessário.

Exemplos possíveis:

- arte promocional;
- imagem de compartilhamento;
- loja;
- conteúdo social.

Elementos permanentes da Arena devem preferencialmente continuar vetoriais/CSS.

---

# 55. ASSET DA BOLHA

A silhueta da marca deve ser gerada a partir da mesma geometria da Bolha do jogo.

Não manter:

- Bolha da marca;
- Bolha do app;
- Bolha do favicon;
- Bolha do marketing;

como quatro desenhos diferentes.

Uma geometria.

Várias aplicações.

---

# 56. ÍCONE DO APP

Base:

- fundo carvão;
- Bolha verde;
- `!` negativo;
- alta ocupação;
- leitura imediata.

Não adicionar texto “AUÊ”.

O símbolo precisa sobreviver sozinho.

---

# 57. SHARE CARDS

Peças compartilhadas precisam parecer **resultado de jogo**.

Hierarquia sugerida:

```text
AUÊ!

94

TÁ MALUCO.

DUVIDO BATER.
```

Opcional:

nome do jogador.

Não transformar card em banner publicitário.

---

# 58. CONTEÚDO SOCIAL

Vídeos e posts devem reutilizar a mesma linguagem visual do jogo:

- fundo carvão;
- Bolha;
- verde;
- Anton;
- score enorme;
- frase curta.

Isso cria reconhecimento entre conteúdo e produto.

Quem toca no vídeo e entra no Auê precisa sentir:

**“é a mesma parada.”**

---

# 59. ANIMAÇÃO PARA CONTEÚDO

Um template social pode seguir:

```text
0.0s      silêncio

0.5s      Bolha aparece

1.0s      arroto começa

1.0–4.0s  Bolha reage ao áudio

4.2s      SNAP

4.5s      94

5.2s      TÁ MALUCO.

6.5s      DUVIDO BATER.

8.0s      AUÊ!
```

A linguagem de aquisição nasce da própria linguagem do gameplay.

---

# 60. NÃO CRIAR PERSONAGENS DESNECESSÁRIOS

O Auê não precisa de elenco de mascotes.

Não criar:

- Rei do Arroto;
- monstro do gás;
- latinha personagem;
- estômago falante;
- juiz humano;
- NPCs.

A Bolha já ocupa o papel de presença viva.

Adicionar personagens altera profundamente a identidade.

---

# 61. NÃO CRIAR INVENTÁRIO VISUAL

Não desenvolver estética de:

- moedas;
- gems;
- caixas;
- skins;
- raridades;
- loot;
- loja;
- tickets;
- energia.

Esses elementos fariam o jogo parecer outro gênero.

---

# 62. NÃO GAMIFICAR A INTERFACE À FORÇA

Game feel não significa adicionar:

- barra de XP;
- level;
- estrela;
- troféu;
- confete;
- medalha;
- fogo;
- raio;
- badge.

O próprio loop já é jogo.

Precisamos dar peso ao que existe, não colar ícones de videogame em cima.

---

# 63. PROIBIDO: CARDZIFICAÇÃO

Evitar transformar cada informação em uma caixa.

Errado:

```text
[ SCORE ]

[ FORÇA ]

[ FÔLEGO ]

[ GRAVE ]

[ COMPARTILHAR ]
```

Correto:

informação vivendo no palco e nas faixas da Arena.

O fundo escuro é a superfície.

---

# 64. GAME FEEL SEM GLOW

Quando alguém disser:

> “Está parecendo aplicativo, coloca glow.”

A resposta não deve ser automaticamente adicionar glow.

Primeiro verificar:

- Bolha reage?
- botão cede?
- captura tem impacto?
- julgamento tem suspense?
- score entra?
- score conta?
- vitória tem peso?
- derrota cede?
- revanche ritualiza?
- audio e visual estão sincronizados?

Se não, o problema é comportamento.

Não iluminação.

---

# 65. DENSIDADE

Regra:

**um momento, uma coisa importante.**

IDLE:

ARROTAR.

RECORDING:

Bolha.

JUDGING:

espera.

RESULT:

score.

VERSUS:

rival.

SCOREBOARD:

quem ganhou.

REMATCH:

3 · 2 · 1.

A tela não precisa mostrar tudo o que sabe o tempo inteiro.

---

# 66. ANIMATION BUDGET

Evitar várias animações simultâneas.

Por estado:

### 1 movimento principal

Exemplo: deformação da Bolha.

### 1 movimento de suporte

Exemplo: timer.

### 1 evento de impacto

Exemplo: score pop.

Se cinco elementos estiverem pulando simultaneamente, nenhum está comunicando nada.

---

# 67. PERFORMANCE

Animação bonita que engasga é arte quebrada.

Priorizar:

- transform;
- opacity;
- SVG eficiente;
- requestAnimationFrame;
- deformação controlada;
- poucos elementos simultâneos.

Testar em celulares medianos.

Não apenas MacBook.

---

# 68. REDUCED MOTION

Com movimento reduzido:

- score aparece diretamente;
- Bolha fica estável;
- transições encurtam;
- informação permanece;
- vitória continua visualmente clara;
- empate continua legível.

Motion nunca pode carregar sozinho uma regra.

---

# 69. CHECKLIST DE UMA NOVA ARTE

Antes de aprovar qualquer novo elemento, perguntar:

1. Parece Auê sem precisar escrever Auê?
2. Parece jogo ou aplicativo?
3. Está usando verde porque precisa ou porque ficou bonito?
4. A Bolha continua protagonista?
5. Existe algum gradiente sem função?
6. Existe glow decorativo?
7. Criamos um card sem necessidade?
8. Criamos uma segunda família de ícones?
9. Está adicionando personagem desnecessário?
10. Funciona em 360 px?
11. Continua compreensível sem motion?
12. A piada está na situação ou tentamos desenhar a piada?

---

# 70. CHECKLIST DE UM NOVO ESTADO VISUAL

Um novo comportamento da Arena deve verificar:

- Bolha permanece na mesma âncora;
- HUD respeita a regra do momento;
- apenas uma ação principal;
- accent dentro do orçamento;
- sem rota nova;
- reação legível;
- sem scroll horizontal;
- sem conteúdo inventado;
- erro honesto;
- motion possui função;
- reduced motion funciona.

---

# 71. DO

Faça:

- preto dominar;
- verde ser raro;
- números enormes;
- Bolha reagir;
- silêncio ter valor;
- animação preparar payoff;
- ouro significar vitória;
- botão responder ao toque;
- usar tipografia como elemento gráfico;
- deixar espaço vazio;
- tratar o arroto como jogada.

---

# 72. DON'T

Não faça:

- glow em volta de tudo;
- gradiente “gamer”;
- interface cyberpunk;
- cards demais;
- barra inferior;
- avatar genérico;
- moeda;
- XP;
- troféus gratuitos;
- mascotes extras;
- partículas constantes;
- animação sem função;
- dezenas de cores;
- vermelho para derrota;
- verde no wordmark;
- verde em tudo;
- dashboard de métricas;
- precisão visual de laboratório;
- telas independentes para cada estado.

---

# 73. TESTE DA SILHUETA

Desligue:

- texto;
- marca;
- score;
- ícones.

Apenas a composição deve permitir reconhecer momentos diferentes.

RECORDING deve parecer mais energético que IDLE.

JUDGING mais comprimido que RECORDING.

RESULT mais aberto que JUDGING.

VICTORY mais dominante que DEFEAT.

Se todos parecem a mesma tela mudando texto, falta direção de jogo.

---

# 74. TESTE EM PRETO E BRANCO

Retire temporariamente as cores.

A hierarquia ainda precisa funcionar através de:

- tamanho;
- peso;
- posição;
- movimento;
- espaçamento.

Cor reforça hierarquia.

Não cria hierarquia do zero.

---

# 75. TESTE DO VERDE

Transforme temporariamente todo accent em branco.

Pergunta:

a interface continua clara?

Se a resposta for não, provavelmente dependemos demais da cor.

---

# 76. TESTE DO JOGO

Mostre somente cinco segundos de:

- gravação;
- julgamento;
- resultado.

Uma pessoa deve perceber que está vendo um jogo mesmo sem entender a regra.

Essa sensação deve vir de:

**resposta → tensão → payoff.**

Não de decoração gamer.

---

# 77. PIPELINE DE ARTE

Toda mudança visual relevante deve seguir:

```text
INTENÇÃO DE GAMEPLAY
↓
ART BIBLE
↓
PROTÓTIPO CANÔNICO
↓
DESIGN SYSTEM / TOKEN
↓
IMPLEMENTAÇÃO
↓
CELULAR REAL
↓
REVISÃO
```

Não fazer:

```text
IDEIA
↓
CSS ALEATÓRIO
↓
PRODUÇÃO
```

---

# 78. ORGANIZAÇÃO DE ASSETS

Estrutura recomendada:

```text
art/
├── brand/
│   ├── bolha-mark
│   └── wordmark
│
├── arena/
│   ├── bolha/
│   ├── effects/
│   └── backgrounds/
│
├── icons/
│   ├── actions/
│   └── roda/
│
├── share/
│   ├── score-card/
│   ├── podium/
│   └── x1/
│
├── store/
│   ├── android/
│   └── ios/
│
└── social/
    ├── vertical/
    └── templates/
```

Não duplicar assets existentes apenas para adaptar tamanho.

A adaptação deve ser derivada quando possível.

---

# 79. PRIORIDADES DE PRODUÇÃO ARTÍSTICA

## Prioridade S

A Bolha.

Se ela não estiver excelente, não adianta polir o resto.

## Prioridade A

- score;
- gravação;
- julgamento;
- revelação;
- VS;
- placar;
- revanche.

## Prioridade B

- Roda;
- pódio;
- compartilhamento;
- erros.

## Prioridade C

- landing;
- lojas;
- assets promocionais;
- conteúdo social.

Marketing não deve evoluir mais rápido que a expressão visual do próprio jogo.

---

# 80. ASSINATURA VISUAL

O Auê precisa ser reconhecível por apenas quatro coisas:

### Preto carvão

o palco.

### Verde ácido

a energia.

### Bolha

a presença.

### Número gigante

a competição.

Se precisarmos de muito mais para alguém reconhecer o produto, a identidade está diluída.

---

# 81. REGRA FINAL

Sempre que houver dúvida entre:

**adicionar alguma coisa**

ou

**dar mais peso ao que já existe**

prefira dar mais peso ao que já existe.

O Auê não precisa parecer um jogo porque colocamos elementos de videogame em cima dele.

Ele precisa parecer um jogo porque:

**você toca, ele reage.  
você arrota, ele sente.  
ele julga.  
a nota explode.  
alguém perde.  
alguém pede revanche.**

Essa é a arte do Auê.
