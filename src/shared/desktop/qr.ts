/**
 * Geração da matriz de um QR Code.
 *
 * POR QUE UMA DEPENDÊNCIA, E NÃO CÓDIGO NOSSO
 * -------------------------------------------
 * Um QR Code não é um desenho: é Reed–Solomon, escolha de máscara por
 * penalidade, bits de formato e de versão. Uma implementação caseira ligeiramente
 * errada gera um código que ABRE no seu telefone e não abre no de outra pessoa —
 * e não existe jeito de provar isso em CI sem escrever também um decodificador.
 * Um teste que não sabe dizer se o QR está certo é pior do que nenhum.
 *
 * `qrcode-generator` (Kazuhiko Arase, MIT) é a implementação de referência em
 * JavaScript, tem ZERO dependências e é o único pacote acrescentado ao projeto
 * por esta mudança.
 *
 * CARREGADO SOB DEMANDA, de propósito. O `import()` dinâmico faz o bundler pôr o
 * codificador num chunk separado, que só é buscado quando a landing de desktop
 * monta o QR. Quem abre o Auê no celular — que é quase todo mundo — nunca baixa
 * esse código.
 */

/** O recorte da API do pacote que usamos. Ver `dist/qrcode.d.ts`. */
interface QrConstruido {
  addData(dados: string): void;
  make(): void;
  getModuleCount(): number;
  isDark(linha: number, coluna: number): boolean;
}

type FabricaQr = (tipo: number, nivelDeCorrecao: 'L' | 'M' | 'Q' | 'H') => QrConstruido;

/** Linhas de módulos. `true` é módulo escuro. Sempre quadrada. */
export type MatrizQr = boolean[][];

/**
 * Só ASCII.
 *
 * O `qrcode-generator` codifica em modo byte com uma função padrão que joga fora
 * o byte alto de cada caractere (`charCodeAt & 0xff`). Para uma URL isso nunca
 * importa — URLs são ASCII por definição — mas se alguém um dia passar um texto
 * com acento por aqui, o resultado seria um QR que abre um endereço corrompido,
 * em silêncio. Melhor recusar.
 */
function exigirAscii(conteudo: string): void {
  if (!/^[\x20-\x7E]+$/.test(conteudo)) {
    throw new Error('QR: só conteúdo ASCII imprimível (o codificador trunca o resto em silêncio)');
  }
}

/**
 * Codifica `conteudo` e devolve a matriz de módulos.
 *
 * `tipo 0` = versão automática, a menor que couber. Nível de correção `M` (~15%):
 * é o equilíbrio usual para código lido de tela — `L` sofre com reflexo e brilho
 * baixo, `Q`/`H` incham a matriz e deixam os módulos pequenos demais num QR de
 * 150 px.
 */
export async function gerarMatrizQr(conteudo: string): Promise<MatrizQr> {
  exigirAscii(conteudo);

  /*
    O pacote declara `export = qrcode` nos tipos e `export default qrcode` no
    arquivo ESM. As duas formas de interop existem na prática dependendo de quem
    resolve o módulo, então aceitamos as duas em vez de fixar uma e descobrir a
    outra em produção.
  */
  const modulo = await import('qrcode-generator');
  const criar =
    (modulo as unknown as { default?: FabricaQr }).default ?? (modulo as unknown as FabricaQr);

  const qr = criar(0, 'M');
  qr.addData(conteudo);
  qr.make();

  const lado = qr.getModuleCount();
  const matriz: MatrizQr = [];
  for (let linha = 0; linha < lado; linha += 1) {
    const modulos: boolean[] = [];
    for (let coluna = 0; coluna < lado; coluna += 1) {
      modulos.push(qr.isDark(linha, coluna));
    }
    matriz.push(modulos);
  }
  return matriz;
}

/**
 * A margem obrigatória em volta do código, em módulos.
 *
 * Quatro é o que a especificação exige (a "quiet zone"). Não é estética: sem ela
 * o leitor não acha as bordas do código, e o sintoma é um QR que "às vezes lê".
 */
export const MARGEM_EM_MODULOS = 4;

/**
 * Traduz a matriz para um único atributo `d` de `<path>`.
 *
 * Um `<rect>` por módulo daria 600 a 1000 elementos no DOM para nada. Um path
 * só desenha o mesmo e o navegador trata como uma forma.
 */
export function matrizParaPath(matriz: MatrizQr): string {
  const partes: string[] = [];
  for (let linha = 0; linha < matriz.length; linha += 1) {
    for (let coluna = 0; coluna < matriz[linha].length; coluna += 1) {
      if (!matriz[linha][coluna]) continue;
      const x = coluna + MARGEM_EM_MODULOS;
      const y = linha + MARGEM_EM_MODULOS;
      partes.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  return partes.join('');
}

/** Lado do `viewBox`: a matriz mais a margem dos dois lados. */
export function ladoComMargem(matriz: MatrizQr): number {
  return matriz.length + MARGEM_EM_MODULOS * 2;
}
