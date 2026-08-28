# Auê! — Game Design Document

**Versão:** 1.0  
**Categoria:** casual competitivo social  
**Plataforma principal:** web mobile  
**Jogadores:** 1, X1 assíncrono e 2–5 jogadores locais  
**Sessão:** segundos a poucos minutos

## 1. High concept

Auê é um jogo em que o microfone do celular vira juiz de uma competição de arroto.

> **Arrote. Receba a nota. Humilhe seus amigos.**

O jogador abre, grava, recebe uma nota real de 0 a 100 e transforma esse resultado em provocação.

A nota não é o fim. O jogo começa quando alguém tenta bater.

## 2. Fantasia do jogador

A fantasia é possuir uma habilidade ridícula que agora finalmente tem placar.

O sentimento desejado:

> “CARALHO, FIZ 94.”

seguido de:

> “Vou mandar essa porra pro fulano.”

Não é “meu áudio foi analisado”. É disputa.

## 3. Pilares

### 3.1 Um toque para começar

Nada antes do primeiro arroto além do necessário para pedir microfone no momento certo.

Sem:

- cadastro obrigatório;
- tutorial obrigatório;
- perfil;
- formulário;
- seleção prévia.

### 3.2 Nota defensável

O jogo deve ouvir áudio real, rejeitar o que claramente não é arroto e produzir score determinístico/versionado.

Número sorteado mata a brincadeira.

### 3.3 Provocação é produto

A saída principal do resultado é **CHAMAR NO X1**.

Compartilhar nota é plateia. X1 gera jogador.

### 3.4 Revanche antes de encerramento

Vitória, derrota e empate empurram naturalmente para outra tentativa.

### 3.5 Regra visível simples

**Maior nota ganha.**

O motor pode ser sofisticado. A pessoa não deve estudar acústica para jogar.

## 4. Core loop

```text
ARROTAR → RECEBER NOTA → DESAFIAR → RESPONDER → PLACAR → REVANCHE
   ▲                                                        │
   └────────────────────────────────────────────────────────┘
```

## 5. Fluxo individual

### 5.1 IDLE

A Arena espera. Bolha viva. CTA: **ARROTAR**.

Não pede nome, login, tutorial ou microfone antes do toque.

### 5.2 RECORDING

Após permissão:

- microfone ativo;
- Bolha responde ao áudio real;
- cronômetro;
- teto de duração;
- CTA **JÁ FOI** na mesma posição funcional do gatilho principal.

Todo caminho de saída libera o microfone.

### 5.3 Validação

Antes da nota:

- houve som?;
- o classificador encontrou arroto?;

Silêncio, conversa comum e gravação inválida não recebem score.

### 5.4 ORIGIN

Após áudio aceito, jogador declara a origem em um toque.

| Origem | Peso |
|---|---:|
| Espontâneo | 100 |
| Comida | 90 |
| Bebida | 80 |
| Outro | 80 |
| Puxei ar | 0 |

A origem nunca é “detectada” pelo jogo.

### 5.5 JUDGING

Momento curto de suspense. Sem CTA. Bolha concentra. Não parecer tela de ferramenta.

### 5.6 RESULT

Ordem:

1. score;
2. reação;
3. métricas;
4. provocação;
5. ações.

Ações:

- **CHAMAR NO X1**;
- **COMPARTILHAR**;
- **Vou mandar outro!**

## 6. Auê Score

Nota inteira de **0 a 100**.

Fórmula v2:

| Métrica | Peso |
|---|---:|
| Fôlego | 30% |
| Força | 30% |
| Grave | 30% |
| Origem | 10% |
| Textura | 0% |

### Fôlego

Maior trecho ativo contínuo. Régua calibrada aproximadamente em `0,40s → 0` e `2,50s → 100`.

### Força

Intensidade do trecho ativo. Régua aproximada `RMS 0,03 → 0`, `RMS 0,20 → 100`.

### Grave

Proporção de energia abaixo de 150 Hz. Régua aproximada `0,10 → 0`, `0,30 → 100`.

### Calibração

Base atual derivada de 32 arrotos únicos válidos dentro de lote real. Mudança de fórmula exige versão e paridade TypeScript/SQL.

## 7. Faixas de reação

| Nota | Rótulo-base |
|---:|---|
| 0–19 | Foi isso? |
| 20–39 | Tá fraco, hein. |
| 40–59 | Dá pro gasto. |
| 60–74 | Aí sim, porra. |
| 75–84 | Caralho, veio forte. |
| 85–94 | Tá maluco. |
| 95–99 | Esse bagulho tá apelão. |
| 100 | Tá roubado. Não é possível. |

As variações de fala dão personalidade, mas nunca mudam regra.

## 8. X1

### 8.1 Criar

Resultado vira batalha privada. Código longo, imprevisível, não enumerável. O link é compartilhado com outra pessoa.

Nome só é solicitado no ato social, nunca para entrar no jogo.

### 8.2 Receber

Quem abre o link:

- não cria conta visual;
- vê quem desafiou e a nota-alvo;
- pode ouvir o arroto adversário;
- toca **AGUENTA ESSA** e responde.

Ouvir o adversário é parte da mecânica. Competir contra número sem áudio vira planilha.

### 8.3 Rounds

- revanche abre novo round;
- round fecha somente com as duas tentativas;
- maior nota vence;
- empate não pontua;
- não existe W.O.;
- qualquer participante pode pedir revanche;
- mesma batalha preserva placar;
- teto atual: 50 rounds.

### 8.4 Empate

No X1, nota igual é empate. Métricas ocultas não podem decidir o vencedor.

## 9. Placar

Mostra:

- vitórias acumuladas;
- último round;
- score de cada lado;
- vencedor ou empate;
- áudio correspondente às tentativas mostradas.

Histórico completo de rounds não é requisito atual.

## 10. Roda — multiplayer local

Mesmo celular, 2–5 pessoas, 1–3 rounds.

Fluxo:

```text
MONTAR A RODA → JOGADOR 1 → NOTA → PASSA O CELULAR → ... → PÓDIO
```

Configuração:

- nome/apelido opcional;
- contexto opcional: casa, churrasco, público, escritório, outro;
- aviso claro de gravação dos participantes.

Se nome ficar vazio: `Arrotador N` sem duplicação.

### Regra de placar

Usa a **melhor tentativa** de cada participante, junto do áudio correspondente.

Empate divide posição de verdade: `1, 2, 2, 4`.

Quem não gravou não aparece.

## 11. Arena

A experiência principal é uma superfície única, não sequência de páginas.

Estados canônicos:

- `IDLE`;
- `RECORDING`;
- `ORIGIN`;
- `JUDGING`;
- `RESULT`;
- `CHALLENGE`;
- `VERSUS`;
- `SCOREBOARD`;
- `REMATCH`;
- `ERROR`.

Momentos visuais intermediários vivem dentro desses estados, não criam novas rotas.

## 12. Bolha

A Bolha é personagem funcional:

- indica vida;
- responde ao áudio;
- segura tensão;
- participa do julgamento;
- entrega score;
- expressa vitória/derrota sem rosto.

## 13. Voz

Direta, informal, jovem-adulta, brasileira, com influência carioca sem caricatura e linguagem gamer natural.

Palavrão é pontuação emocional, não decoração.

A piada é com o arroto e o desempenho, nunca com características pessoais.

## 14. Privacidade de gameplay

- áudio de jogador não vira conteúdo público por padrão;
- gravar para jogar não autoriza publicidade;
- áudio não é usado para treinamento de modelo por consequência;
- jogador pode apagar o próprio áudio;
- denúncia pode ocultar gravação;
- link da batalha expira em 7 dias;
- expirar o link não significa apagar automaticamente o arquivo.

## 15. Plataforma

Web mobile é o produto. Aplicativos são distribuição adicional do mesmo jogo.

O mesmo build deve manter:

- regras;
- score;
- Arena;
- copy;
- experiência.

Nenhuma feature nasce exclusivamente em Swift/Kotlin.

## 16. Retenção

A retenção inicial vem de:

- revanche;
- provocação;
- X1 recebido;
- contexto social presencial;
- conteúdo externo que gera nova tentativa.

Não depende de streak, daily reward ou push.

## 17. Aquisição embutida

```text
JOGADOR A → NOTA → X1 → LINK → JOGADOR B → RESPOSTA → NOVO JOGADOR
```

O X1 é simultaneamente multiplayer e canal de aquisição.

## 18. Telemetria mínima

Medir:

- abriu Arena;
- iniciou arroto;
- recebeu nota;
- tentou de novo;
- compartilhou;
- criou X1;
- abriu X1;
- respondeu X1;
- pediu revanche;
- concluiu Roda.

A pergunta central é **onde o jogador desiste?**

## 19. Monetização

Não pertence ao gameplay atual. Nenhum dinheiro pode melhorar score.

Anúncios, assinatura, compras ou Auê+ exigem decisão específica.

## 20. Fora do escopo

- feed;
- seguidores;
- comunidades;
- campeonatos;
- temporadas;
- assinatura;
- XP;
- níveis;
- conquistas;
- ranking global;
- perfil social;
- push;
- mensagens privadas.

## 21. North Star

**Arrotos que geram outro arroto.**

O produto terá encontrado seu núcleo quando alguém espontaneamente disser:

> “Fiz 91 nessa porra. Tenta bater.”

E o outro abrir o link sem precisar de explicação.
