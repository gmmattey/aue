# ADR 0003 — A prévia do link

**Status:** aceito
**Data:** 2026-08-10
**Decidiu:** Giam, com conselho do Camillo. Aceito pelo Luiz em 10/08.
**Substitui:** nada
**Altera:** o [ADR 0001](0001-arquitetura-oficial-do-aue.md) §8 item 2, e só
para o caso descrito aqui
**Vale para:** o link que sai do jogo para fora

---

## O problema

O Auê depende de uma pessoa mandar a zoeira para outra. O link é o produto se
espalhando.

Só que o link chega mudo. O WhatsApp, antes de desenhar o cartão da prévia,
manda um robô buscar a página, ler o HTML cru e ir embora — em menos de um
segundo, sem rodar o jogo. O Auê se monta no celular de quem abre, **depois**
que o robô já foi.

Resultado: o robô nunca vê a nota. O cartão que sai é o mesmo para qualquer
batalha.

Para o cartão mostrar `91,4` ou `GIAM 4 × 3 GUINHO`, alguém tem que entregar uma
página **já pronta com aquele resultado** na mão do robô.

### O que foi verificado antes de decidir

Testado na #137, em canal de prévia isolado:

1. **O Firebase Hosting não separa robô de jogador.** Não existe condição por
   user-agent em reescrita. **E falha calado:** ele aceita a regra no formato da
   Vercel sem reclamar e ignora a condição — a regra passa a valer para todo
   mundo. Copiar o `vercel.json` mandaria **todo jogador** que abrisse um link de
   batalha para a página do robô, com deploy verde;
2. **a Edge Function `og-preview` nunca foi publicada.** Responde 404 no projeto
   de produção. O código está no repositório desde o primeiro commit e nunca
   entrou no ar;
3. **o retorno dela está quebrado.** Termina com um `window.location.replace`
   **relativo**, que servido fora do domínio do app manda o jogador para o lugar
   errado;
4. **redirect para URL externa funciona.** `GET /x/ABC123` devolveu 302 com o
   destino certo e o id substituído.

## A decisão em uma frase

> **O link que sai do jogo passa a ser `/x/<código>`, e esse caminho é um
> redirecionamento para uma Edge Function do Supabase que devolve a página da
> prévia e empurra a pessoa para a batalha.**

## 1. O que isso resolve, e por que não precisa farejar user-agent

A pergunta "como distingo o robô do jogador?" **deixa de existir**.

`/x/<código>` é um caminho que só nasce em compartilhamento. Quem chega ali —
robô ou gente — recebe a mesma coisa: uma página pequena com a prévia daquela
batalha. O robô lê e vai embora satisfeito. A pessoa é mandada na hora para
`/d/<código>`, que é o jogo.

Isso é melhor que farejar user-agent, e não é só por ser mais simples: detecção
por user-agent **erra em silêncio**. Robô novo que ninguém previu cai no lado
errado, e o defeito aparece no telefone de outra pessoa, onde ninguém está
olhando. Aqui não há lado errado para cair.

## 2. O que a função pode fazer, e o que ela não pode

Ela é uma **vitrine**. Lê e mostra. Não decide nada.

**Pode:**

- ler a batalha pelo código e montar título, descrição e as marcas de prévia;
- degradar para o cartão genérico quando o código não existe, expirou, ou o
  resultado está escondido.

**Não pode, e isto é a regra que mais importa:**

- **calcular nota.** A nota é a que está gravada. Se a prévia recalcular, passam
  a existir dois lugares decidindo quanto vale um arroto, e um dia eles
  divergem. O ADR 0001 §8 item 8 já proíbe tirar a nota oficial do servidor —
  isto é a mesma regra vista de outro ângulo;
- **escrever qualquer coisa.** Nem contador, nem visita, nem log de quem abriu;
- **mostrar o que o jogo esconde.** Áudio denunciado ou apagado não vira prévia.
  Quem denunciou não precisa ver o arroto sumir da tela e continuar no cartão do
  zap. Vale a RLS, e a função fala com o banco pela chave anônima como todo
  mundo;
- **virar rota de jogo.** Nada de estado, tela ou regra nascendo ali.

## 3. A fronteira não muda

A função é **borda, não camada**. Ela não entra no desenho de quatro camadas do
[ADR 0001](0001-arquitetura-oficial-do-aue.md) §2 e não conhece o núcleo.

O que continua exatamente como está:

- a Arena, o núcleo, as portas e os adaptadores, intocados;
- o cliente do Supabase segue só em `src/plataforma/web/`;
- o app continua uma SPA sem servidor. **Não estamos adotando renderização no
  servidor para o jogo** — só para a página de prévia, que o jogador nunca vê
  como tela.

## 4. Por que isto exige ADR

O [ADR 0001](0001-arquitetura-oficial-do-aue.md) §8 item 2 manda passar por ADR
para "adotar framework de servidor, renderização no servidor ou borda".

Isto é renderização na borda. Pequena, de uma página só, mas é.

**O que este ADR libera é exatamente isso e nada mais:** uma Edge Function que
serve a prévia do link. Não libera renderizar o jogo no servidor, nem mover
regra para a borda, nem Edge Function nova para outro fim — cada uma dessas
volta a exigir decisão.

## 5. O conselho do Camillo

> O que isso quebra daqui a seis meses, e quem vai estar olhando quando quebrar?

**O que fica mais difícil depois.** O formato `/x/<código>` vira contrato
público no minuto em que o primeiro link cai num grupo de zap. Link que já
circulou não é nosso para mudar. Então o formato se decide **uma vez** — e é por
isso que ele entra num ADR e não numa PR.

**O que é reversível.** Esta é a razão principal de o caminho ser este. Se um
dia a gente quiser sair, o redirecionamento é **uma regra num arquivo de
configuração**. Some a regra, `/x/` para de existir, e os links já espalhados
degradam para o cartão genérico em vez de quebrar. Comparado com ligar máquina
nova no Firebase, ou com rachar o produto em dois endereços, é o único que
desfaz sem cirurgia.

**Onde eu puxaria o freio, e não puxei.** Se a função calculasse a nota, isso
seria um segundo dono da verdade e eu barraria na hora. Como ela só lê o que já
está gravado, não é. A regra do §2 existe para manter assim.

**O pulo a mais.** O jogador passa por um redirecionamento antes de cair no
jogo. É custo real, mas é o mesmo custo que qualquer encurtador de link do mundo
cobra, e ninguém reclama deles. Aceito.

## 6. O que isto custa

- **um pulo a mais** para quem clica, antes do jogo abrir;
- a função precisa ficar **pública**, sem verificação de token — robô não manda
  autorização. Isso é aceitável porque ela só lê o que já é público por link e
  respeita a RLS. **Não** é aceitável para nenhuma outra função;
- mais uma peça que pode cair. Se ela cair, o compartilhamento cai junto — por
  isso o §7 exige que o caminho degrade em vez de quebrar;
- o formato do link fica congelado, conforme o §5.

## 7. Como isto entra sem quebrar quem já jogou

- **`/d/<código>` continua funcionando para sempre.** Todo link que já circulou
  continua abrindo a batalha. `/x/` é adição, não substituição;
- se a função não responder, o compartilhamento **cai de volta** para o link
  direto. Compartilhar não pode depender da prévia estar de pé;
- o retorno da função tem que ser **URL absoluta** do endereço público. O
  relativo de hoje manda o jogador para o lugar errado, e é o defeito descrito
  em [`deploy-vercel-e-og-dinamico.md`](../deploy-vercel-e-og-dinamico.md) §2;
- **nenhum código de batalha vira previsível** por causa disso. O código é o
  mesmo de hoje, com a mesma imprevisibilidade e o mesmo prazo.

## 8. Alternativas descartadas

**Ligar Cloud Function ou Cloud Run no Firebase.** É o jeito nativo da casa
nova, e funcionaria. Recusado porque acrescenta runtime, cobrança e uma segunda
plataforma de código executando — para uma página de prévia. O ADR 0001 §8 item
4 já trata acrescentar backend como decisão grande, e esta não é grande o
suficiente para justificar. Reversibilidade pior: sair dela é desmontar
infraestrutura, não apagar uma linha.

**Aceitar o cartão genérico.** Custo zero e continua sendo uma saída honesta se
este ADR não for aceito. Recusado porque o link é o mecanismo de crescimento do
jogo, e o dono do produto respondeu que a prévia vale o trabalho agora. Fica
registrado como o plano B se a implementação se mostrar mais cara do que parece.

**Deixar os links de batalha no endereço antigo, que sabe farejar user-agent.**
Funcionaria hoje, sem trabalho nenhum. Recusado por criar dois endereços com
responsabilidades diferentes: o produto passaria a morar em duas casas, e a #137
existiu justamente para ter uma. Também fecha porta — o dia de desligar o
endereço antigo nunca chega.

**Gerar imagem por batalha.** Fora de escopo. A função monta título e descrição;
imagem continua sendo o cartão do site. Se um dia a imagem com a nota valer o
trabalho, é outra decisão.

## 8.1. Errata — a rota e a leitura estavam erradas

Descoberto ao implementar, em 10/08. **A decisão não muda; o alvo dela muda.**

Este ADR foi escrito falando de `/d/<código>` e da leitura pela
`obter_desafio`. Os dois vieram do código antigo da Edge Function e **não são o
que o jogo faz hoje**:

- o link que a Arena gera é **`/b/<código>`**, não `/d/`. O `/d/` é a rota do
  duelo legado;
- quem lê a batalha é **`obter_batalha(p_codigo_de_acesso)`**, não
  `obter_desafio`.

A `obter_batalha` ainda resolve de graça duas coisas que o plano ia tratar à
mão: ela **já aplica o prazo** (devolve nada quando expirou) e **já anula o
áudio do que está escondido**. Cada rodada vem com `nota`, `classificacao`,
`esta_escondido` e `apelido`.

Construído em cima do texto original, o `/x/` apontaria para uma rota que o
jogo não usa e leria uma tabela que não guarda as batalhas de hoje — a prévia
nunca sairia do cartão genérico, sem erro em lugar nenhum.

É o `AGENTS.md` funcionando: **comportamento real vence documento de intenção.**

## 9. Como isto foi aceito

1. o dono do produto respondeu que a prévia vale o trabalho agora;
2. o desenho acima foi aceito por ele em 10/08, com o conselho do Camillo já
   incorporado no §5.

O que falta antes de existir código é só o plano da
[#143](https://github.com/gmmattey/aue/issues/143), escrito em cima deste ADR e
com requisitos de aceite conferíveis. Sem plano, não abre branch —
[`AGENTS.md`](../../../AGENTS.md) §5.0.

Este ADR está aceito. Mudar o que está aqui exige ADR novo, não PR.
