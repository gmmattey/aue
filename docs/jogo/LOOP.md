# Loop principal — Auê

O jogo inteiro é um loop de cinco tempos:

```text
ARROTAR → RECEBER NOTA → DESAFIAR → RESPONDER → REVANCHE
                                                    │
                                                    └──► volta pra ARROTAR
```

Se uma mudança não fortalece um desses cinco tempos, ela provavelmente não é
para agora.

---

## 1. ARROTAR

A pessoa abre e arrota. Um toque.

- sem cadastro, sem onboarding, sem formulário antes do primeiro arroto;
- microfone é a única permissão pedida, e só quando é necessário;
- a captura tem teto de tempo e para sozinha;
- durante a gravação a Bolha reage ao áudio real — é o retorno que diz "tô te
  ouvindo".

Estados: `RECORDING` (e `ORIGIN`, que segura o áudio e pergunta de onde veio).

## 2. RECEBER NOTA

O juiz ouve, decide se aquilo foi arroto mesmo e devolve o **Auê Score**.

- detecção real de arroto antes da nota: conversa, sopro e silêncio não viram
  número;
- a espera é curta e tem teatro — o julgamento é parte da piada;
- a nota entra grande, contando, e só depois abrem as métricas;
- a reação do juiz é escrita em cima da faixa da nota.

Estados: `JUDGING`, `RESULT`.

## 3. DESAFIAR

Nota parada é brinquedo de um minuto. O jogo começa aqui.

- a saída principal do resultado é **chamar alguém no X1**;
- o desafio vira um **link privado**, que se manda no grupo;
- quem desafia assina — o nome é cobrado no ato de humilhar, nunca antes;
- compartilhar sem desafiar existe como alternativa, não como caminho
  principal: é plateia, não briga.

Estados: `CHALLENGE`.

## 4. RESPONDER

O amigo abre o link e cai direto no jogo.

- sem cadastro e sem instalar nada;
- **ouve o arroto que o desafiou antes de responder** — responder no escuro é
  jogar contra um número, não contra alguém;
- grava a resposta, recebe a própria nota;
- os dois entram no placar.

Estados: `VERSUS`, depois `RECORDING → ORIGIN → JUDGING → RESULT`, depois
`SCOREBOARD`.

## 5. REVANCHE

O placar não é o fim, é o convite.

- vitória e derrota terminam com a mesma pergunta: "vai deixar assim?";
- a revanche não recomeça o jogo, continua a mesma disputa;
- cada linha do placar toca o arroto daquela pessoa — a nota do outro deixa de
  ser número e vira prova;
- o link volta para os participantes, e o loop reinicia.

Estados: `SCOREBOARD`, `REMATCH`.

---

## O que o loop exige do produto

| Tempo | Exigência dura |
|---|---|
| Arrotar | um toque, microfone tratado, teto de duração |
| Receber nota | detecção real de arroto, score reprodutível, revelação com peso |
| Desafiar | link privado, imprevisível, que abre em qualquer celular |
| Responder | zero atrito para quem chega pelo link, e o áudio do adversário audível |
| Revanche | estado da disputa preservado entre as rodadas |

## O loop paralelo: disputa local

Mesmo aparelho, gente em volta. Não é outro produto, é o mesmo loop com o
"desafiar/responder" acontecendo por passar o celular na mão em vez de por link.

```text
ARROTAR → NOTA → PASSA O CELULAR → ARROTAR → NOTA → PLACAR → REVANCHE
```

Ver [`REGRAS.md`](REGRAS.md).
