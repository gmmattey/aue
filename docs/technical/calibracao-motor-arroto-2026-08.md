# Calibração do motor de arroto — lote real de 10/08/2026

**Origem do lote:** 43 arquivos enviados por Luiz para ajuste fino do motor.  
**Privacidade:** os áudios NÃO entram no repositório. Este documento guarda somente medições e rótulos.  
**Objetivo:** calibrar a nota e confirmar que voz/outro som não deve chegar à pontuação.

## Resumo do lote

- 43 arquivos recebidos;
- 8 pares de duplicatas/near-duplicates;
- 35 gravações únicas;
- 3 negativos de voz: `Arroto (5).m4a`, `Arroto (9).m4a`, `Arroto (17).m4a`;
- 32 arrotos únicos usados para calibrar a régua da nota.

Pares que não votam duas vezes na calibração:

1. `Arroto (3)` / `Arroto (4)`;
2. `Arroto (6)` / `Arroto (7)`;
3. `Arroto (11)` / `Arroto (12)` — near-duplicate com correlação de onda > 0,999999999;
4. `Arroto (13)` / `Arroto (14)`;
5. `Arroto (15)` / `Arroto (16)`;
6. `Arroto (18)` / `Arroto (19)`;
7. `Arroto (20)` / `Arroto (21)`;
8. `Arroto (22)` / `Arroto (23)`.

## O defeito encontrado na v1

A v1 usava:

- duração da **gravação inteira**;
- RMS da **gravação inteira**;
- RMS absoluto abaixo de 150 Hz;
- ZCR (textura/sujeira);
- origem declarada.

No lote real, isso produzia duas distorções:

1. esperar antes/depois do arroto aumentava Fôlego porque o motor media o arquivo, não o evento;
2. ZCR saturava fácil e entregava até 20 pontos para uma grandeza que o jogador não entende como qualidade do arroto.

Nos 32 arrotos únicos válidos, usando origem `Espontâneo` só para comparação, a v1 ficou espremida aproximadamente entre **51,8 e 71,8**, com mediana **60,1**. Arrotos acusticamente bem diferentes terminavam com notas parecidas.

## Como a v2 mede o evento

A análise continua local no navegador. O áudio é dividido em janelas de **25 ms**, com passo de **10 ms**.

Um quadro é considerado ativo quando passa pelo maior destes pisos:

- RMS 0,005;
- 25 dB abaixo do pico do próprio clipe.

Buracos de até **120 ms** entre quadros ativos são fechados para não partir um mesmo arroto por uma micro pausa.

Daí saem as três categorias aprovadas de produto:

### FORÇA

Percentil 75 do RMS dos quadros ativos.

A régua de jogo fica:

- `0,03` RMS = 0;
- `0,20` RMS = 100.

Isso evita que silêncio antes/depois derrube artificialmente um arroto forte.

### FÔLEGO

Duração do maior trecho ativo contínuo.

A régua fica:

- `0,40 s` = 0;
- `2,50 s` = 100.

O tempo que a pessoa demora para tocar em `JÁ FOI` não rende ponto.

### GRAVE

Percentil 75, nos quadros ativos, da razão:

`RMS abaixo de 150 Hz / RMS total`

A medição de calibração reproduz o **mesmo BiquadFilter low-pass de 150 Hz do Web Audio, com Q padrão 1**. Não vale calibrar com um filtro offline diferente e depois aplicar outra resposta de frequência no navegador.

A régua fica:

- `0,10` = 0;
- `0,30` = 100.

Usar proporção, em vez de energia grave absoluta, evita que GRAVE seja só uma segunda cópia da FORÇA.

## Fórmula do Auê Score v2

```text
FÔLEGO  30%
FORÇA   30%
GRAVE   30%
ORIGEM  10%
TEXTURA  0%
```

A coluna de textura continua sendo enviada e persistida por compatibilidade com o schema atual, mas **não pesa mais na nota**. Isso remove `Sujeira/Nojeira` da matemática sem uma migração destrutiva de coluna.

A origem continua com a regra já existente:

- Espontâneo = 100;
- Comida = 90;
- Bebida = 80;
- Outro = 80;
- Puxei ar = 0.

Sem rótulo humano de “esse merecia 82 e aquele 57”, não existe evidência para dizer que uma das três categorias acústicas merece valer mais. Por isso a calibração usa **30/30/30**, deixando os 10% de origem intactos.

Nos mesmos 32 arrotos únicos válidos, usando origem `Espontâneo` só para comparação, a v2 se espalha de aproximadamente **34,5 a 97,7**, com mediana **61,6**. O ganho não é “dar notas maiores”: é deixar a régua separar melhor arrotos diferentes.

## Voz não entra na nota

Os três negativos do lote são:

- `Arroto (5).m4a`;
- `Arroto (9).m4a`;
- `Arroto (17).m4a`.

Eles exibem estrutura harmônica/formantes compatíveis com fala e seriam perigosos se a nota acústica fosse usada como detector: pela régua v2, os três têm Fôlego/Grave suficientes para obter uma nota alta.

Por isso **FORÇA · FÔLEGO · GRAVE nunca decidem se foi arroto**. Essa porta continua sendo o YAMNet local (`Burping, eructation`, classe 53).

O limiar do YAMNet permanece **0,20** nesta PR. Ele já foi medido neste mesmo banco com um vão muito largo: maior falso positivo documentado `0,0224`, menor arroto verdadeiro `0,7609`. Mudar o limiar só porque estamos mexendo no score reduziria uma margem que já está boa.

Em outras palavras:

> detector decide **se pode pontuar**; score decide **quanto vale**.

## Tabela por arquivo

`Nota v2` abaixo usa origem **Espontâneo** apenas para permitir comparação entre arquivos. No jogo, a origem informada altera o termo final. Arquivos rotulados como voz são rejeitados antes da nota.

| Áudio | Rótulo | Duplicata de | Força | Fôlego | Grave | Nota v2* | Ação |
|---|---|---|---:|---:|---:|---:|---|
| Arroto (1).m4a | ARROTO | — | 28.6 | 32.6 | 100.0 | 58.4 | pontuar |
| Arroto (2).m4a | ARROTO | — | 100.0 | 32.6 | 74.1 | 72.0 | pontuar |
| Arroto (3).m4a | ARROTO | — | 62.5 | 90.2 | 19.5 | 61.7 | pontuar |
| Arroto (4).m4a | ARROTO | Arroto (3).m4a | 62.5 | 90.2 | 19.5 | 61.7 | pontuar |
| Arroto (5).m4a | VOZ | — | 51.5 | 100.0 | 100.0 | — | rejeitar antes da nota |
| Arroto (6).m4a | ARROTO | — | 55.0 | 100.0 | 100.0 | 86.5 | pontuar |
| Arroto (7).m4a | ARROTO | Arroto (6).m4a | 55.0 | 100.0 | 100.0 | 86.5 | pontuar |
| Arroto (8).m4a | ARROTO | — | 42.5 | 29.3 | 100.0 | 61.5 | pontuar |
| Arroto (9).m4a | VOZ | — | 43.9 | 100.0 | 100.0 | — | rejeitar antes da nota |
| Arroto (10).m4a | ARROTO | — | 98.8 | 93.6 | 100.0 | 97.7 | pontuar |
| Arroto (11).m4a | ARROTO | — | 51.0 | 100.0 | 35.2 | 65.8 | pontuar |
| Arroto (12).m4a | ARROTO | Arroto (11).m4a | 51.0 | 100.0 | 35.2 | 65.8 | pontuar |
| Arroto (13).m4a | ARROTO | — | 39.5 | 87.4 | 42.3 | 60.8 | pontuar |
| Arroto (14).m4a | ARROTO | Arroto (13).m4a | 39.5 | 87.4 | 42.3 | 60.8 | pontuar |
| Arroto (15).m4a | ARROTO | — | 44.0 | 37.9 | 100.0 | 64.6 | pontuar |
| Arroto (16).m4a | ARROTO | Arroto (15).m4a | 44.0 | 37.9 | 100.0 | 64.6 | pontuar |
| Arroto (17).m4a | VOZ | — | 30.7 | 78.3 | 100.0 | — | rejeitar antes da nota |
| Arroto (18).m4a | ARROTO | — | 57.6 | 76.9 | 20.4 | 56.5 | pontuar |
| Arroto (19).m4a | ARROTO | Arroto (18).m4a | 57.6 | 76.9 | 20.4 | 56.5 | pontuar |
| Arroto (20).m4a | ARROTO | — | 51.5 | 100.0 | 3.9 | 56.6 | pontuar |
| Arroto (21).m4a | ARROTO | Arroto (20).m4a | 51.5 | 100.0 | 3.9 | 56.6 | pontuar |
| Arroto (22).m4a | ARROTO | — | 49.4 | 25.5 | 47.3 | 46.7 | pontuar |
| Arroto (23).m4a | ARROTO | Arroto (22).m4a | 49.4 | 25.5 | 47.3 | 46.7 | pontuar |
| Arroto (24).m4a | ARROTO | — | 54.6 | 61.7 | 13.9 | 49.1 | pontuar |
| Arroto (25).m4a | ARROTO | — | 100.0 | 3.6 | 30.5 | 50.2 | pontuar |
| Arroto (26).m4a | ARROTO | — | 100.0 | 49.8 | 71.1 | 76.3 | pontuar |
| Arroto (27).m4a | ARROTO | — | 100.0 | 100.0 | 36.2 | 80.9 | pontuar |
| Arroto (28).m4a | ARROTO | — | 100.0 | 100.0 | 43.0 | 82.9 | pontuar |
| Arroto (29).m4a | ARROTO | — | 100.0 | 52.1 | 49.3 | 70.4 | pontuar |
| Arroto (30).m4a | ARROTO | — | 0.0 | 100.0 | 100.0 | 70.0 | pontuar |
| Arroto (31).m4a | ARROTO | — | 41.7 | 49.8 | 85.8 | 63.2 | pontuar |
| Arroto (32).m4a | ARROTO | — | 100.0 | 70.7 | 62.5 | 80.0 | pontuar |
| Arroto (33).m4a | ARROTO | — | 100.0 | 23.6 | 31.9 | 56.7 | pontuar |
| Arroto (34).m4a | ARROTO | — | 47.1 | 55.0 | 41.4 | 53.1 | pontuar |
| Arroto (35).m4a | ARROTO | — | 100.0 | 23.6 | 100.0 | 77.1 | pontuar |
| Arroto (36).m4a | ARROTO | — | 29.9 | 66.4 | 100.0 | 68.9 | pontuar |
| Arroto (37).m4a | ARROTO | — | 91.6 | 86.0 | 75.4 | 85.9 | pontuar |
| Arroto (38).m4a | ARROTO | — | 39.3 | 41.2 | 1.1 | 34.5 | pontuar |
| Arroto (39).m4a | ARROTO | — | 23.2 | 79.8 | 6.8 | 42.9 | pontuar |
| Arroto (40).m4a | ARROTO | — | 10.7 | 14.0 | 93.9 | 45.6 | pontuar |
| WhatsApp Audio 2026-04-23 at 23.03.15 (1).ogg | ARROTO | — | 67.4 | 36.0 | 39.4 | 52.8 | pontuar |
| WhatsApp Audio 2026-04-23 at 23.03.15.ogg | ARROTO | — | 60.5 | 41.7 | 0.0 | 40.7 | pontuar |
| WhatsApp Ptt 2026-08-04 at 01.20.23.ogg | ARROTO | — | 17.9 | 64.5 | 12.8 | 38.6 | pontuar |

## Limites desta calibração

Este lote é bom o bastante para parar de usar limites escolhidos no olho, mas ainda não encerra o assunto:

- não existe rótulo humano de “nota ideal” para cada arroto;
- boa parte do banco veio de WhatsApp/celular, não de uma única cadeia de gravação controlada;
- modelos de telefone e distância do microfone mudam RMS;
- novos áudios reais devem entrar como regressão de calibração, sem publicar os arquivos.

A próxima calibração deve comparar a distribuição nova com esta, não substituir números por sensação.
