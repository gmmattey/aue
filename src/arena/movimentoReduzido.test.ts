import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * MOVIMENTO REDUZIDO NO ERROR — a cascata já mordeu uma vez.
 *
 * O bloco de `prefers-reduced-motion` foi escrito com um seletor mais curto do
 * que as regras de peso que ele queria desligar. `@media` não soma
 * especificidade nem muda a ordem da cascata, então o `animation-duration: 1ms`
 * perdia para o atalho `animation` das regras de peso — e quem pede menos
 * movimento no sistema levava o shake de 360ms inteiro.
 *
 * Não dá pra checar isso por leitura sem errar. Estes testes checam por
 * aritmética.
 */

const ARQUIVO = fileURLToPath(new URL('./arena.css', import.meta.url));
// Sem comentário de CSS: comentário no meio da folha entra no recorte do
// seletor e vira ruído dentro do teste.
const FONTE = readFileSync(ARQUIVO, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Recorta o bloco que começa em `abre` (índice da `{`) até a chave que fecha. */
function corpoDoBloco(fonte: string, abre: number): { corpo: string; fim: number } {
  let profundidade = 0;
  for (let i = abre; i < fonte.length; i += 1) {
    if (fonte[i] === '{') profundidade += 1;
    if (fonte[i] === '}') {
      profundidade -= 1;
      if (profundidade === 0) return { corpo: fonte.slice(abre + 1, i), fim: i };
    }
  }
  throw new Error('chave nunca fecha no arena.css');
}

/** Separa a folha em: o que está dentro de `prefers-reduced-motion` e o resto. */
function partirPorMovimentoReduzido(): { reduzido: string; normal: string } {
  const marca = /@media[^{]*prefers-reduced-motion[^{]*\{/g;
  let reduzido = '';
  let normal = '';
  let cursor = 0;
  let achado: RegExpExecArray | null;
  while ((achado = marca.exec(FONTE)) !== null) {
    const abre = achado.index + achado[0].length - 1;
    const { corpo, fim } = corpoDoBloco(FONTE, abre);
    normal += FONTE.slice(cursor, achado.index);
    reduzido += `${corpo}\n`;
    cursor = fim + 1;
    marca.lastIndex = cursor;
  }
  normal += FONTE.slice(cursor);
  return { reduzido, normal };
}

/** Seletores que mexem em `animation` na `.bolha-wrap`, um por entrada. */
function seletoresQueAnimamAPalco(css: string): string[] {
  const regras = /([^{}]+)\{([^{}]*)\}/g;
  const encontrados: string[] = [];
  let achado: RegExpExecArray | null;
  while ((achado = regras.exec(css)) !== null) {
    const [, seletor, corpo] = achado;
    if (!/(^|[\s;])animation(-[a-z]+)?\s*:/.test(corpo)) continue;
    for (const parte of seletor.split(',')) {
      const limpo = parte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
      if (limpo.includes('.bolha-wrap')) encontrados.push(limpo);
    }
  }
  return encontrados;
}

describe('arena.css — movimento reduzido desliga o palco no ERROR', () => {
  it('todo seletor que anima a .bolha-wrap tem gêmeo idêntico dentro do prefers-reduced-motion', () => {
    /*
      Gêmeo IDÊNTICO, não parecido: seletor igual tem especificidade igual, e aí
      a posição no arquivo decide — o bloco reduzido vem depois e ganha. Seletor
      mais curto perde, esteja onde estiver. Foi assim que passou batido.
    */
    const { reduzido, normal } = partirPorMovimentoReduzido();
    const anima = seletoresQueAnimamAPalco(normal);
    const desliga = new Set(seletoresQueAnimamAPalco(reduzido));

    expect(anima.length).toBeGreaterThan(0);
    const orfaos = anima.filter((seletor) => !desliga.has(seletor));
    expect(orfaos, `sem gêmeo no bloco de movimento reduzido: ${orfaos.join(' | ')}`).toEqual([]);
  });

  it('o bloco de movimento reduzido zera a animação em vez de encurtar', () => {
    const { reduzido } = partirPorMovimentoReduzido();
    const regras = /([^{}]+)\{([^{}]*)\}/g;
    let achado: RegExpExecArray | null;
    while ((achado = regras.exec(reduzido)) !== null) {
      const [, seletor, corpo] = achado;
      if (!seletor.includes('.bolha-wrap')) continue;
      expect(corpo).toMatch(/animation\s*:\s*none/);
    }
  });
});

describe('arena.css — o palco não sacode com a nota na tela', () => {
  it('nenhum peso dispara chacoalhar sem exigir data-com-nota="nao"', () => {
    /*
      `RESULT` -> "Vou mandar outro!" -> microfone negado -> `ERROR` peso parede
      COM a nota. Sacudir o palco que segura o número recém-conquistado é
      castigar quem não errou — está escrito no comentário da própria regra, e o
      `parede` tinha ficado de fora do filtro.
    */
    const { normal, reduzido } = partirPorMovimentoReduzido();
    const regras = /([^{}]+)\{([^{}]*)\}/g;
    const culpados: string[] = [];
    let achado: RegExpExecArray | null;
    const folha = `${normal}\n${reduzido}`;
    while ((achado = regras.exec(folha)) !== null) {
      const [, seletor, corpo] = achado;
      if (!/animation\s*:[^;]*chacoalhar/.test(corpo)) continue;
      for (const parte of seletor.split(',')) {
        const limpo = parte.replace(/\s+/g, ' ').trim();
        if (limpo.includes('.bolha-wrap') && !limpo.includes("[data-com-nota='nao']")) {
          culpados.push(limpo);
        }
      }
    }
    expect(culpados, `sacode com nota na tela: ${culpados.join(' | ')}`).toEqual([]);
  });
});
