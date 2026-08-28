# Regras de gameplay — Auê

As regras consolidadas de produto estão em [`AUÊ!-2.md`](AUÊ!-2.md). Este
documento continua sendo a referência normativa de gameplay e registra as
decisões que o código precisa obedecer.

O que o jogo mede, como pontua, quem ganha e o que não vale.

Onde este documento e o código divergirem, **o código vence** — e o documento
está errado e precisa ser corrigido. As fontes reais são
`src/features/audio/rules.ts`, `src/features/audio/juiz/` e as migrações em
`supabase/migrations/`.

---

## 1. A gravação

- **Um toque começa.** Nenhum formulário, cadastro ou tutorial antes.
- **Microfone é a única permissão pedida**, e só na hora que é necessária.
- **Tem teto de duração.** Encerrar manualmente, timeout e fim automático saem
  pelo mesmo caminho.
- **A Bolha reage ao áudio real** enquanto grava. Sem isso a pessoa não sabe se o
  jogo está ouvindo.
- **Sem som capturado não vira nota.** Vira `ERROR`.

## 2. Detecção — primeiro decide se foi arroto

Antes de qualquer nota, o áudio passa por uma checagem de que aquilo **é arroto
mesmo**, com o classificador YAMNet rodando local no aparelho. Ver
[`../technical/deteccao-de-arroto-yamnet.md`](../technical/deteccao-de-arroto-yamnet.md).

- conversa, sopro, silêncio e barulho ambiente **não recebem nota**;
- recusar é um estado do jogo (`ERROR`, caso "não é arroto"), não um erro
  técnico;
- **recusar quem arrotou de verdade é pior do que aceitar uma conversa.** Na
  dúvida, o limiar erra para o lado de aceitar;
- a checagem roda no aparelho — o áudio não precisa sair dali para ser
  classificado;
- FORÇA, FÔLEGO e GRAVE **não são detector de arroto**. Elas só entram depois
  que a gravação foi aceita.

## 3. O Auê Score

Nota de **0 a 100**, exibida como inteiro. Casa decimal dá ar de laudo e rouba a
leitura do número grande.

### Fórmula (`aue-score-v2`)

O jogador vê somente três categorias acústicas. As três têm o mesmo peso porque
o lote atual calibra a régua, mas ainda não tem rótulo humano do tipo “este
merecia 82, aquele 57” que justificaria privilegiar uma delas.

| Parcial interna | Peso | O que mede | Rótulo na tela |
|---|---:|---|---|
| `duration` | 30% | maior trecho ativo contínuo | **Fôlego** |
| `power` | 30% | intensidade do trecho ativo | **Força** |
| `depth` | 30% | proporção de energia abaixo de 150 Hz | **Grave** |
| `texture` | 0% | ZCR legado, mantido por compatibilidade | — |
| Origem | 10% | de onde veio, declarado pela pessoa | — |

### A régua foi medida em áudio real

Calibração de 10/08/2026: 43 arquivos recebidos, 8 pares de duplicatas e 3
arquivos de voz. A régua acústica usa **32 arrotos únicos válidos**.

- **Força:** RMS ativo `0,03 → 0` e `0,20 → 100`;
- **Fôlego:** trecho ativo `0,40 s → 0` e `2,50 s → 100`;
- **Grave:** razão grave/total `0,10 → 0` e `0,30 → 100`, usando o mesmo
  BiquadFilter low-pass de 150 Hz do Web Audio (Q padrão 1).

“Trecho ativo” existe para a pessoa não ganhar ponto por ficar esperando antes
ou depois de arrotar. Janelas de 25 ms, passo de 10 ms e pequenos buracos de até
120 ms fazem um mesmo evento continuar sendo um evento.

A tabela completa por arquivo está em
[`../technical/calibracao-motor-arroto-2026-08.md`](../technical/calibracao-motor-arroto-2026-08.md).

### Peso da origem

| Origem | Peso | Por quê |
|---|---:|---|
| Espontâneo | 100 | veio sozinho, sem empurrão nenhum |
| Comida | 90 | teve ajuda |
| Bebida (cerveja, refri) | 80 | teve mais ajuda |
| Outro | 80 | piso das origens honestas |
| Puxei ar | 0 | fabricado — o único caso artificial |

Duas regras que a tabela protege:

1. **"Outro" nunca pode ser a escolha ótima.** Se a opção genérica pagasse o
   máximo, a origem viraria botão de bônus em vez de declaração.
2. **"Outro" nunca pode valer zero.** Zero é o peso de quem fabricou. Empatar
   "não sei dizer" com "eu forcei" puniria honestidade.

**A origem é informada pela pessoa. O jogo não finge detectá-la.**

### Textura / Nojeira não é placar

A v1 dava 20% da nota para ZCR, mostrado/interpretado como textura ou sujeira.
No banco real essa grandeza saturava fácil e ajudava a comprimir arrotos bem
diferentes em notas parecidas.

Na v2 ela continua persistida para compatibilidade com o schema, mas pesa
**zero**. “Nojo” pode existir como reação/copy; o microfone não ganha um nariz.

### A faixa fala

Os cortes são os de sempre. O que mudou é o texto: nome de criatura saiu, fala
de gente entrou — a tabela do [`VOZ.md`](./VOZ.md) §4, que já era a voz canônica
antes de o banco existir.

| Faixa | Rótulo persistido |
|---|---|
| < 20 | Foi isso? |
| < 40 | Tá fraco, hein. |
| < 60 | Dá pro gasto. |
| < 75 | Aí sim, porra. |
| < 85 | Caralho, veio forte. |
| < 95 | Tá maluco. |
| < 100 | Esse bagulho tá apelão. |
| 100 | Tá roubado. Não é possível. |

**Cada faixa tem mais de uma fala.** São 42 no total (3, 4, 6, 8, 8, 6, 4 e 3,
nessa ordem), e o miolo tem mais porque é onde quase todo arroto cai. Elas vivem
em `src/nucleo/nota/faixas.ts`, pareadas com a frase do juiz.

**Arroto que já é linha gravada tem fala derivada, não sorteada.** A dupla
`(nota, id do resultado)` decide, e decide igual em qualquer aparelho: a tela de
resultado, a imagem que sai fotografada, o texto que vai pro zap e o X1 que o
amigo abre sete dias depois dizem a mesma coisa, porque cada um desses caminhos
tem o id na mão. O preço aceito é que dois arrotos seguidos podem cair na mesma
fala.

**Na Arena é diferente, e é de propósito.** Lá o julgamento acontece antes de
existir linha no banco — não há id para derivar. A fala é escolhida uma vez, no
julgamento, e viaja junto com a nota: tela e texto do compartilhamento leem a
mesma escolha e ninguém re-sorteia na renderização. O que essa fala **não** é:
reproduzível a partir do banco. Quem for imprimir a fala de um resultado
guardado — imagem, prévia de link, resultado de outra pessoa — deriva de
`(nota, id)` e nunca da semente da sessão, senão a imagem diz uma coisa e a tela
diz outra.

**O banco guarda só o rótulo** — a primeira fala de cada faixa, a da tabela
acima. `public.aue_classification_v1` é determinística por CHECK; variação não
cabe naquela coluna e não precisa caber, porque a variação nasce na leitura.

**Arroto gravado antes disso não foi reescrito.** A linha continua com o nome
velho guardado; nenhuma tela lê essa coluna para desenhar.

### Duas verdades sobre o score

1. **A nota local é prévia.** A oficial é recalculada no servidor pela RPC
   `enviar_resultado`, usando `public.aue_nota_v2`. Mudar peso de um lado só
   quebra a gravação em produção; `rules.formula.test.ts` trava a paridade.
2. **v1 continua existindo para explicar o passado.** A migração da v2 não
   reescreve resultados antigos nem redefine `aue_score_v1`.

## 4. Desempate

Quando duas notas empatam, na ordem:

1. Grave;
2. Força;
3. Fôlego.

Persistiu o empate: **Empate Técnico do Gás**.

O vencedor de uma disputa é decidido e persistido **pelo banco**, não pela tela.

**Isto vale para ordenar lista e ranking, não para decidir briga.** Quem está na
frente de um placar — o ouro do X1, a vitória de um round — sai **só da nota**.
Notas iguais viram empate na cara dura, sem ninguém coroado. Desempatar por
grave, força ou fôlego onde a pessoa não viu o critério é roubo aos olhos de
quem perdeu.

## 5. Desafio por link

- desafiar gera um **link privado**;
- o identificador é longo, imprevisível e não enumerável;
- quem abre o link **não precisa de cadastro**;
- quem abre **ouve o arroto que o desafiou antes de responder**;
- a sessão da disputa fica acessível pelo link por **7 dias**;
- passado o prazo, **o link para de abrir a sessão**;
- a tela mostra o prazo **real**, lido do banco, arredondado para baixo — nunca
  um "7 dias" fixo que vira mentira no sexto dia;
- não é feed: quem entra, entra pelo convite daquela disputa.

### A briga é em rounds

- cada revanche **abre um round novo** na mesma briga, no mesmo link;
- quem apertou manda o primeiro arroto do round;
- o round **só fecha quando os dois arrotarem**;
- **nota maior fecha o round e vale uma vitória.** Só a nota decide o round — o
  desempate do §4 não vale aqui, porque critério que a pessoa não viu não pode
  decidir briga;
- notas iguais fecham o round **sem vitória para ninguém**;
- round aberto que ninguém responde fica aberto. **Não existe W.O.**;
- qualquer um dos dois pede revanche, ganhando ou perdendo;
- quem não é um dos dois donos da briga **não entra** por revanche;
- a tela mostra o placar de vitórias e o último round. Não existe histórico de
  rounds anteriores;
- o teto é de **50 rounds** por briga.

## 6. Disputa local

Mesmo aparelho, gente em volta.

- 2 a 5 participantes, com nome ou apelido;
- 1 a 3 rounds definidos antes de começar;
- contexto do rolê opcional (casa, público, escritório, churrasco, outro);
- cada participante arrota na sua vez e recebe a própria nota;
- a origem pode ser informada por tentativa;
- ao fim, ranking e pódio compartilhável.

O placar guarda a **melhor tentativa** de cada um — e o **áudio daquela
tentativa** junto. Guardar a nota sem o áudio correspondente faria o placar tocar
um arroto que não é o da nota exibida.

## 7. Nome do jogador

Não existe cadastro. Enquanto ninguém se nomeia, o placar diz "Você".

**O nome é cobrado no ato de humilhar** — ao desafiar ou compartilhar — porque é
ali que ele deixa de ser enfeite e vira endereço da provocação. Nunca antes, e
nunca como porta de entrada.

Dá para mandar sem nome. Amarelar é uma escolha válida.

## 8. Áudio, privacidade e o que expira

- **o que expira é o acesso pelo link, não a gravação.** Passados os 7 dias o
  link para de abrir; o arquivo é mantido. **Não existe expurgo automático;**
- isso está escrito na política de privacidade com essas palavras, porque
  retenção que a pessoa não consegue ler é retenção escondida;
- **nenhuma tela pode sugerir o contrário** — nada de "some junto com o link";
- **quem gravou pode apagar o próprio áudio** pela tela de resultado;
- denúncia esconde a gravação;
- o áudio não é reusado para finalidade nova, acervo, treinamento de modelo, nem
  exposto fora da disputa que o originou. Qualquer uma dessas coisas é decisão
  nova de produto e privacidade — não consequência desta.

## 9. O que nunca vale

- nota sem áudio;
- nota para o que não é arroto;
- participante, placar ou pódio inventado;
- origem detectada automaticamente;
- prazo prometido diferente do prazo real;
- falha apresentada como sucesso;
- botão que não faz nada aparecendo habilitado.
