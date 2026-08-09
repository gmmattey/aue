import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * TRAVAS DA FOLHA DE ESTILO DO FLUXO — coisas que já quebraram, mais de uma vez.
 *
 * O `EstilosDoFluxo` é CSS dentro de um template literal de TypeScript. Essa
 * escolha tem um custo, e o custo cobra em silêncio.
 */

const ARQUIVO = fileURLToPath(new URL('./EstilosDoFluxo.tsx', import.meta.url));
const FONTE = readFileSync(ARQUIVO, 'utf8');

/**
 * Só o miolo do template literal — o CSS de verdade.
 *
 * Ancorado em `<style>{\`` e NÃO na primeira crase do arquivo: a primeira
 * crase está no JSDoc do topo, que cita `<style>` por escrito. A primeira
 * versão deste helper caiu nessa e acusou crase no CSS quando a crase era do
 * comentário — o teste dando alarme falso é tão ruim quanto não dar alarme.
 */
function corpoDoTemplate(): string {
  const marca = '<style>{`';
  const abre = FONTE.indexOf(marca);
  const fecha = FONTE.lastIndexOf('`');
  return FONTE.slice(abre + marca.length, fecha);
}

describe('EstilosDoFluxo — o CSS mora num template literal', () => {
  it('NENHUMA crase dentro do template — ela encerra a string e quebra o build', () => {
    /*
      ISTO JÁ ACONTECEU TRÊS VEZES, sempre do mesmo jeito: alguém escreve um
      comentário no CSS e cita um seletor ou uma propriedade entre crases, por
      hábito de Markdown. A crase fecha o template literal ali, e o resto do
      arquivo vira código TypeScript inválido.

      O `typecheck` pega — mas só depois de o arquivo já estar escrito, com uma
      mensagem que fala de token inesperado e não de crase. Este teste falha
      dizendo o que é.

      Escreva `.fx-onda` como fx-onda, sem enfeite.
    */
    const corpo = corpoDoTemplate();
    expect(corpo.includes('`'), 'há uma crase dentro do CSS — escreva sem crase').toBe(false);
  });

  it('nada de 100vh nem 100dvh no fluxo — os dois pulam com a barra do navegador', () => {
    /*
      #69. `vh` ignora a barra do Safari e estoura a tela; `dvh` é dinâmico e
      faz o conteúdo saltar quando ela recolhe. A unidade estável é `svh`, e
      quem manda na altura é o `.app-shell` no `index.css`.
    */
    const corpo = corpoDoTemplate();
    expect(corpo).not.toMatch(/\d+dvh/);
    expect(corpo).not.toMatch(/\d+vh\b/);
  });
});

describe('index.css e index.html — o shell', () => {
  const CSS_GLOBAL = readFileSync(fileURLToPath(new URL('../../../index.css', import.meta.url)), 'utf8');
  const HTML = readFileSync(fileURLToPath(new URL('../../../../index.html', import.meta.url)), 'utf8');

  it('o viewport pede viewport-fit=cover — sem ele safe-area-inset é sempre zero', () => {
    /*
      A barra de navegação já usava `env(safe-area-inset-bottom)` e vinha
      recebendo ZERO no iPhone, porque o Safari só expõe os insets quando a
      página declara `viewport-fit=cover`. Parecia respeitar a faixa do gesto e
      não respeitava.
    */
    expect(HTML).toContain('viewport-fit=cover');
  });

  it('o shell usa svh, não dvh — dvh É o pulo da barra do Safari', () => {
    // Sem os comentários: o bloco que EXPLICA a troca cita `100dvh` de
    // propósito, e não é declaração nenhuma. Mesma lição do estilosUsados.
    const semComentarios = CSS_GLOBAL.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(semComentarios).toContain('100svh');
    expect(semComentarios).not.toContain('100dvh');
  });

  it('quem usa safe-area continua usando — a correção do viewport não pode virar desculpa para tirar', () => {
    /*
      Os insets são consumidos nos COMPONENTES, em estilo inline, não no CSS
      global: a barra de navegação reserva a faixa do gesto embaixo e o aviso de
      offline se afasta do notch em cima. `viewport-fit=cover` é o que faz esses
      dois valores deixarem de ser zero.
    */
    const barra = readFileSync(
      fileURLToPath(new URL('../../../shared/components/BottomNav.tsx', import.meta.url)),
      'utf8',
    );
    expect(barra).toMatch(/env\(safe-area-inset-bottom\)/);
  });
});
