# Regras de gameplay — Auê

O que o jogo mede, como pontua, quem ganha e o que não vale.

Onde este documento e o código divergirem, **o código vence** — e o documento
está errado e precisa ser corrigido. As fontes reais são
`src/features/audio/rules.ts`, `src/features/audio/juiz/` e as migrações em
`supabase/migrations/`.

---

## 1. A gravação

- **Um toque começa.** Nenhum formulário, cadastro ou tutorial antes.
- **Microfone é a única permissão pedida**, e só na hora que é necessária.
- **Tem teto de duração.** A captura para sozinha; PARAR, timeout e fim
  automático saem pelo mesmo caminho.
- **A Bolha reage ao áudio real** enquanto grava. Sem isso a pessoa não sabe se o
  jogo está ouvindo.
- **Sem som capturado não vira nota.** Vira `ERROR`.

## 2. O juiz — primeiro decide se foi arroto

Antes de qualquer nota, o áudio passa por uma checagem de que aquilo **é arroto
mesmo**, com o classificador YAMNet rodando local no aparelho. Ver
[`../technical/deteccao-de-arroto-yamnet.md`](../technical/deteccao-de-arroto-yamnet.md).

- conversa, sopro, silêncio e barulho ambiente **não recebem nota**;
- recusar é um estado do jogo (`ERROR`, caso "não é arroto"), não um erro
  técnico;
- **recusar quem arrotou de verdade é pior do que aceitar uma conversa.** Na
  dúvida, o limiar erra para o lado de aceitar;
- a checagem roda no aparelho — o áudio não precisa sair dali para ser
  classificado.

## 3. O Auê Score

Nota de **0 a 100**, exibida como inteiro. Casa decimal dá ar de laudo e rouba a
leitura do número grande.

### Fórmula (`aue-score-v1`)

Cinco parciais, cada uma normalizada em 0–100 e depois pesada:

| Parcial | Peso | O que mede | Rótulo na tela |
|---|---|---|---|
| Duração | 25% | quanto tempo durou (teto em 5 s) | Fôlego |
| Profundidade | 25% | energia de graves | Grave |
| Potência | 20% | intensidade (RMS) | Estouro |
| Textura | 20% | aspereza (taxa de cruzamentos por zero) | Sujeira |
| Origem | 10% | de onde veio, declarado pela pessoa | — |

### Peso da origem

| Origem | Peso | Por quê |
|---|---|---|
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

### Classificação

| Faixa | Título |
|---|---|
| < 20 | Arroto de Hamster |
| < 40 | Tentativa Honesta |
| < 60 | Arroto Respeitável |
| < 75 | Pedreiro Certificado |
| < 85 | Trovão Gastrointestinal |
| < 95 | Monstro do Esgoto |
| < 100 | Arma Biológica |
| 100 | O ARROTO |

### Duas verdades sobre o score

1. **A nota local é prévia.** A oficial é recalculada no servidor pela RPC
   `submit_resultado`, com a mesma fórmula versionada em SQL. Mudar peso,
   normalização ou faixa **de um lado só** quebra a gravação em produção — a
   constraint rejeita. `origem.paridade.test.ts` e `rules.formula.test.ts` travam
   os dois lados.
2. **Os limites de normalização são heurísticos.** Duração 0–5 s, potência
   0–0,3, grave 0–0,2, textura 0–0,05 foram escolhidos no olho. Calibrar de
   verdade exige áudio rotulado por gente, e isso ainda não existe. Enquanto não
   existir, mexer nos limites é chute com cara de número. O jogo **não** chama
   isso de medição científica em dB e não finge precisão física.

## 4. Desempate

Quando duas notas empatam, na ordem:

1. profundidade (grave);
2. potência;
3. duração.

Persistiu o empate: **Empate Técnico do Gás**.

O vencedor de uma disputa é decidido e persistido **pelo banco**, não pela tela.

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
