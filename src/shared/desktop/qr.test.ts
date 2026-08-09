import { describe, expect, it } from 'vitest';

import { gerarMatrizQr, ladoComMargem, matrizParaPath, MARGEM_EM_MODULOS } from './qr';
import { URL_CANONICA_DA_HOME } from '../enderecoPublico';
import type { MatrizQr } from './qr';

/**
 * O que este arquivo consegue provar — e o que não consegue.
 *
 * CONSEGUE: que a matriz é quadrada, que tem os três padrões de localização
 * (finder patterns) nos cantos certos, que o padrão de sincronismo alterna, que
 * a margem obrigatória entra no desenho, e que o conteúdo codificado é a URL
 * canônica e não outra coisa.
 *
 * NÃO CONSEGUE: afirmar que uma câmera lê. Provar isso exigiria um decodificador
 * de QR no projeto — mais código do que o codificador que estamos usando, e sem
 * ninguém para verificar o decodificador. É por isso que a codificação é feita
 * por uma biblioteca de referência em vez de código nosso: a verificação de
 * verdade acontece apontando um telefone para a tela, e está listada como tal no
 * relatório de entrega.
 *
 * Estas asserções estruturais existem para pegar a falha realista: alguém trocar
 * a biblioteca, mexer na margem, ou passar o conteúdo errado.
 */

const ESPERADO_FINDER: ReadonlyArray<ReadonlyArray<boolean>> = [
  [true, true, true, true, true, true, true],
  [true, false, false, false, false, false, true],
  [true, false, true, true, true, false, true],
  [true, false, true, true, true, false, true],
  [true, false, true, true, true, false, true],
  [true, false, false, false, false, false, true],
  [true, true, true, true, true, true, true],
];

function conferirFinder(matriz: MatrizQr, linha0: number, coluna0: number): void {
  for (let l = 0; l < 7; l += 1) {
    for (let c = 0; c < 7; c += 1) {
      expect(
        matriz[linha0 + l][coluna0 + c],
        `padrão de localização errado em (${linha0 + l}, ${coluna0 + c})`,
      ).toBe(ESPERADO_FINDER[l][c]);
    }
  }
}

describe('geração do QR Code da landing', () => {
  it('produz uma matriz quadrada de tamanho válido para a versão do QR', async () => {
    const matriz = await gerarMatrizQr(URL_CANONICA_DA_HOME);

    expect(matriz.length).toBeGreaterThan(0);
    for (const linha of matriz) expect(linha.length).toBe(matriz.length);

    // Toda versão de QR tem lado 21 + 4*(versão-1): 21, 25, 29, 33...
    expect((matriz.length - 21) % 4).toBe(0);
  });

  it('tem os três padrões de localização nos cantos', async () => {
    // É o que a câmera procura primeiro. Se estes três quadrados não estiverem
    // exatos, não existe leitura — o resto da matriz nem chega a ser tentado.
    const matriz = await gerarMatrizQr(URL_CANONICA_DA_HOME);
    const n = matriz.length;

    conferirFinder(matriz, 0, 0);
    conferirFinder(matriz, 0, n - 7);
    conferirFinder(matriz, n - 7, 0);
  });

  it('tem o padrão de sincronismo alternando entre os cantos', async () => {
    // A linha 6 alterna escuro/claro ligando dois finders. É o que dá ao leitor
    // a escala dos módulos.
    const matriz = await gerarMatrizQr(URL_CANONICA_DA_HOME);
    for (let coluna = 8; coluna < matriz.length - 8; coluna += 1) {
      expect(matriz[6][coluna]).toBe(coluna % 2 === 0);
    }
  });

  it('codificar a mesma URL duas vezes dá o mesmo código', async () => {
    // Máscara escolhida por penalidade é determinística. Se deixasse de ser, o
    // QR mudaria de desenho a cada render sem motivo.
    const a = await gerarMatrizQr(URL_CANONICA_DA_HOME);
    const b = await gerarMatrizQr(URL_CANONICA_DA_HOME);
    expect(a).toEqual(b);
  });

  it('conteúdo diferente gera código diferente', async () => {
    const canonica = await gerarMatrizQr(URL_CANONICA_DA_HOME);
    const outra = await gerarMatrizQr('https://exemplo.invalid/');
    expect(canonica).not.toEqual(outra);
  });

  it('recusa conteúdo não-ASCII em vez de codificar lixo em silêncio', async () => {
    // O codificador em modo byte descarta o byte alto de cada caractere. Um
    // acento aqui viraria um endereço corrompido dentro de um QR que "funciona".
    await expect(gerarMatrizQr('https://aue.vercel.app/ação')).rejects.toThrow(/ASCII/);
  });

  it('o desenho reserva a margem obrigatória dos dois lados', async () => {
    // Sem a "quiet zone" de 4 módulos o leitor não acha a borda do código, e o
    // sintoma é um QR que lê às vezes — o pior tipo de defeito para depurar.
    const matriz = await gerarMatrizQr(URL_CANONICA_DA_HOME);

    expect(ladoComMargem(matriz)).toBe(matriz.length + MARGEM_EM_MODULOS * 2);

    const path = matrizParaPath(matriz);
    // O primeiro módulo escuro é o canto do finder, deslocado pela margem.
    expect(path.startsWith(`M${MARGEM_EM_MODULOS} ${MARGEM_EM_MODULOS}h1v1h-1z`)).toBe(true);
    // E nada é desenhado fora do quadrado da matriz.
    const limite = matriz.length + MARGEM_EM_MODULOS;
    for (const [, x, y] of path.matchAll(/M(\d+) (\d+)/g)) {
      expect(Number(x)).toBeLessThan(limite);
      expect(Number(y)).toBeLessThan(limite);
      expect(Number(x)).toBeGreaterThanOrEqual(MARGEM_EM_MODULOS);
      expect(Number(y)).toBeGreaterThanOrEqual(MARGEM_EM_MODULOS);
    }
  });
});
