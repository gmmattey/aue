/**
 * A FAIXA DA NOTA — e o que o jogo fala quando ela sai.
 *
 * Aqui morava um nome de criatura ("Monstro do Esgoto") espalhado por uma
 * cadeia de `if` em `features/audio/rules.ts`, um `Record` com o nome como
 * chave em `frasesDoJuiz.ts` e um `CASE` em SQL. Três donos para a mesma regra,
 * e o `docs/jogo/VOZ.md` §4 dizendo há meses que aquilo era pra ser reação de
 * gente, não classe de personagem. Agora tem um dono só, e é este arquivo.
 *
 * REGRA PURA. Sem navegador, sem Supabase, sem `Math.random()`. A escolha da
 * fala é DERIVADA de uma semente que quem chama passa — o mesmo molde do
 * `escolherFala` em `nucleo/fala/idle.ts`, pelo mesmo motivo: núcleo que
 * sorteia sozinho não é testável sem stub global.
 *
 * POR QUE DERIVAR EM VEZ DE GUARDAR. A mesma fala precisa aparecer na tela, na
 * imagem que o html2canvas fotografa, no texto que vai pro zap e no X1 que o
 * amigo abre sete dias depois no aparelho dele. Todo lugar que imprime a fala
 * de uma linha JÁ GRAVADA tem o id na mão (`linhaSalva.id`,
 * `resultado_desafiante.id`, `rodada.resultado_id`), então `(nota, id)` basta:
 * mesma entrada, mesma saída, em qualquer aparelho, sem coluna nova, sem mexer
 * em RPC e sem memória local.
 *
 * ONDE NÃO EXISTE ID, E O QUE ISSO CUSTA. A Arena julga antes de gravar: no
 * `RESULT` não há linha nenhuma para derivar. Lá a semente nasce no julgamento
 * (`plataforma/web/pontuacao.ts`) e viaja dentro da `Nota` — tela e
 * compartilhamento leem a MESMA escolha, mas ela **não** é reproduzível a
 * partir do banco. Quem for imprimir a fala de um resultado guardado (imagem,
 * prévia de link, resultado de outra pessoa) deriva de `(nota, id)`, nunca da
 * semente da sessão. `fala.derivacao.test.ts` é o cão de guarda disso, e o
 * `docs/jogo/REGRAS.md` §"A faixa fala" conta a mesma história.
 *
 * O PREÇO, ESCRITO: não é baralho. Dois arrotos seguidos podem cair na mesma
 * fala — 1 em 8 no miolo, 1 em 3 nas pontas. Guardar a escolha para virar
 * baralho de verdade está no backlog.
 *
 * OS CORTES NÃO MUDAM. `< 20`, `< 40`, `< 60`, `< 75`, `< 85`, `< 95`, `< 100`
 * e `100` são os mesmos de sempre, espelhados em `public.aue_classification_v1`
 * e travados por `rules.formula.test.ts`.
 */

export interface Fala {
  /** O que vai grande na tela e na imagem. */
  readonly reacao: string;
  /** O veredito de duas orações — a segunda piorando a primeira. */
  readonly fraseDoJuiz: string;
}

export interface Faixa {
  /**
   * O teto EXCLUSIVO da faixa. A última é `Infinity` — nota 100 (e qualquer
   * arredondamento acima dela) cai lá.
   */
  readonly limite: number;
  /**
   * As falas da faixa. **A primeira é o rótulo**: é ela que
   * `public.aue_classification_v1` devolve e que a coluna `classificacao`
   * guarda, porque o CHECK `resultados_classificacao_coerente` exige que a
   * coluna seja exatamente o retorno da função. Fala variada não cabe ali por
   * definição — e não precisa, porque a variação é derivada na leitura.
   *
   * O miolo tem mais falas que as pontas de propósito: é onde quase todo
   * arroto cai.
   */
  readonly baralho: readonly Fala[];
}

export const FAIXAS: readonly Faixa[] = [
  {
    limite: 20,
    baralho: [
      { reacao: 'Foi isso?', fraseDoJuiz: 'Ouvimos alguma coisa. Tecnicamente, foi um suspiro.' },
      { reacao: 'Cadê?', fraseDoJuiz: 'Procuramos. Não achamos nada digno de registro.' },
      { reacao: 'Isso foi um suspiro.', fraseDoJuiz: 'Havia ar. Faltou todo o resto.' },
    ],
  },
  {
    limite: 40,
    baralho: [
      { reacao: 'Tá fraco, hein.', fraseDoJuiz: 'A intenção estava lá. O conteúdo, não.' },
      { reacao: 'Fiquei com pena.', fraseDoJuiz: 'Houve esforço. Foi o que houve.' },
      { reacao: 'Nem acordou ninguém.', fraseDoJuiz: 'Atravessou a sala. Ninguém virou a cabeça.' },
      { reacao: 'Isso foi educado demais.', fraseDoJuiz: 'Discreto até o fim. Aqui não é lugar disso.' },
    ],
  },
  {
    limite: 60,
    baralho: [
      { reacao: 'Dá pro gasto.', fraseDoJuiz: 'Cumpre o combinado. Não assusta ninguém.' },
      { reacao: 'Passou raspando.', fraseDoJuiz: 'Ficou no limite. E ficou por lá mesmo.' },
      { reacao: 'Nem fede nem cheira.', fraseDoJuiz: 'Existe. É o que dá pra dizer dele.' },
      { reacao: 'Deu pra ouvir.', fraseDoJuiz: 'Chegou até aqui. Não chegou muito além.' },
      { reacao: 'Quase foi bom.', fraseDoJuiz: 'Faltou pouco. Faltou do mesmo jeito.' },
      { reacao: 'Tá ok. Só isso.', fraseDoJuiz: 'Nenhum reparo. Nenhum elogio.' },
    ],
  },
  {
    limite: 75,
    baralho: [
      { reacao: 'Aí sim, porra.', fraseDoJuiz: 'Foi bom. Ninguém vai lembrar amanhã.' },
      { reacao: 'Agora tu falou.', fraseDoJuiz: 'Chegou na hora certa. Fez o serviço.' },
      { reacao: 'Boa, moleque.', fraseDoJuiz: 'Começou bem. Terminou melhor.' },
      { reacao: 'Isso já é gente grande.', fraseDoJuiz: 'Saiu da categoria de brincadeira.' },
      { reacao: 'Tá valendo.', fraseDoJuiz: 'Dá pra mandar no grupo sem passar vergonha.' },
      { reacao: 'Gostei dessa.', fraseDoJuiz: 'Não foi o melhor da noite. Mas foi bom de ouvir.' },
      { reacao: 'Isso durou, hein.', fraseDoJuiz: 'Segurou até o fim. Isso conta.' },
      { reacao: 'Tem mais de onde veio.', fraseDoJuiz: 'Ainda não é o teu melhor. Tá perto.' },
    ],
  },
  {
    limite: 85,
    baralho: [
      { reacao: 'Caralho, veio forte.', fraseDoJuiz: 'Assustou alguém do lado. E com razão.' },
      { reacao: 'Assustou.', fraseDoJuiz: 'Isso desanda uma mesa inteira.' },
      { reacao: 'Que desgraça foi essa?', fraseDoJuiz: 'Não foi acidente. Foi obra.' },
      { reacao: 'Isso doeu em alguém.', fraseDoJuiz: 'Feio de doer. Do bom.' },
      { reacao: 'Veio com tudo.', fraseDoJuiz: 'Nada segurou no caminho. Saiu inteiro.' },
      { reacao: 'Porra, hein.', fraseDoJuiz: 'Não esperava essa. Fica anotado.' },
      { reacao: 'Ficou feio aqui.', fraseDoJuiz: 'O ambiente piorou. O placar melhorou.' },
      { reacao: 'Calou a mesa.', fraseDoJuiz: 'Ninguém falou depois disso. Ninguém quis.' },
    ],
  },
  {
    limite: 95,
    baralho: [
      { reacao: 'Tá maluco.', fraseDoJuiz: 'Tecnicamente excelente. Socialmente indefensável.' },
      { reacao: 'Tremeu a mesa.', fraseDoJuiz: 'A mesa sentiu. A sala também.' },
      { reacao: 'Isso não é normal.', fraseDoJuiz: 'Fora do que se espera de qualquer um.' },
      { reacao: 'Cachorro latiu na rua.', fraseDoJuiz: 'Chegou longe. Bem além desta sala.' },
      { reacao: 'Que porra foi essa?', fraseDoJuiz: 'Isso vinha guardado faz tempo.' },
      { reacao: 'Sai de perto.', fraseDoJuiz: 'Tu estragou o churrasco de alguém.' },
    ],
  },
  {
    limite: 100,
    baralho: [
      { reacao: 'Esse bagulho tá apelão.', fraseDoJuiz: 'Isso deixou de ser talento. Virou ocorrência.' },
      { reacao: 'Tu treina isso?', fraseDoJuiz: 'Não sai assim por acaso. Alguém andou praticando.' },
      { reacao: 'Isso é dom.', fraseDoJuiz: 'Não é sorte. É outra coisa.' },
      { reacao: 'Agora fudeu.', fraseDoJuiz: 'Depois dessa, a rodada acabou.' },
    ],
  },
  {
    limite: Number.POSITIVE_INFINITY,
    baralho: [
      { reacao: 'Tá roubado. Não é possível.', fraseDoJuiz: 'Não há mais o que julgar. Só reverência.' },
      { reacao: 'Não acredito nisso.', fraseDoJuiz: 'Conferimos duas vezes. Continua absurdo.' },
      { reacao: 'Zerou o jogo.', fraseDoJuiz: 'Chegou no fim. Não tem mais nada aqui em cima.' },
    ],
  },
];

/**
 * Em que faixa a nota caiu.
 *
 * As faixas cobrem a reta inteira: nota negativa (que a fórmula não produz, mas
 * o tipo permite) cai na primeira, e qualquer coisa a partir de 100 cai na
 * última. **Não existe nota sem faixa**, e é por isso que não existe mais o
 * caso "sem veredito" que o `frasesDoJuiz` tratava devolvendo `null`.
 */
export function faixaDaNota(nota: number): Faixa {
  return FAIXAS.find((faixa) => nota < faixa.limite) ?? FAIXAS[FAIXAS.length - 1];
}

/**
 * O rótulo da faixa — a primeira fala, e nada mais.
 *
 * É o que vai para a coluna `classificacao` e o que
 * `public.aue_classification_v1` devolve. Os dois lados são comparados por
 * `rules.formula.test.ts`.
 */
export function rotuloDaFaixa(nota: number): string {
  return faixaDaNota(nota).baralho[0].reacao;
}

/**
 * Espalha a semente em 32 bits (FNV-1a).
 *
 * Id de resultado é UUID, e UUID consecutivo compartilha prefixo. Somar código
 * de caractere daria índices grudados; isto não dá. `>>> 0` a cada volta porque
 * multiplicação em JS estoura o inteiro de 32 bits e vira float.
 */
function embaralhar(semente: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < semente.length; i++) {
    hash ^= semente.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * A fala do arroto: sempre a mesma para a mesma dupla `(nota, semente)`.
 *
 * A semente é o id do resultado. **Semente vazia devolve o rótulo** — a fala
 * número 1, que é justamente a tabela do `docs/jogo/VOZ.md` §4. Não é sorteio
 * de reserva: é o mesmo texto que o banco guardou, e serve para a janela curta
 * em que a tela já tem a nota e ainda não tem o id.
 */
export function falaDaNota(nota: number, semente: string): Fala {
  const { baralho } = faixaDaNota(nota);
  if (semente.length === 0) return baralho[0];
  return baralho[embaralhar(semente) % baralho.length];
}
