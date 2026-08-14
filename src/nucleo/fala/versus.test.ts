import { describe, expect, it } from 'vitest';

import { escolherFala } from './idle';
import {
  CHAMOU_VOCE,
  GANHOU,
  GANHOU_COMENTARIO,
  GRAVANDO_REVANCHE,
  PERDEU,
  PERDEU_COMENTARIO,
  chamouVoce,
} from './versus';

/**
 * Quem joga direto com o mesmo grupo ouvia o placar travado numa frase só —
 * `GANHOU[0]`/`PERDEU[0]` direto no código, sem sortear nada. Este arquivo
 * prova que os baralhos cresceram e que `chamouVoce` sortou o molde certo
 * (issue #185).
 */

describe('o molde de quem chamou', () => {
  it('tem 5 moldes', () => {
    expect(CHAMOU_VOCE).toHaveLength(5);
  });

  it('troca o {nome} do molde sorteado', () => {
    for (const molde of CHAMOU_VOCE) {
      expect(chamouVoce(molde, 'Giam')).toContain('Giam');
      expect(chamouVoce(molde, 'Giam')).not.toContain('{nome}');
    }
  });

  it('nunca repete o molde que estava na tela', () => {
    const anterior = CHAMOU_VOCE[0];
    const escolhido = escolherFala(CHAMOU_VOCE, anterior, () => 0);
    expect(escolhido).not.toBe(anterior);
  });
});

describe('o placar do X1', () => {
  it('GANHOU e PERDEU têm 6 frases cada', () => {
    expect(GANHOU).toHaveLength(6);
    expect(PERDEU).toHaveLength(6);
  });

  it('GANHOU_COMENTARIO e PERDEU_COMENTARIO viraram pool de 5', () => {
    expect(GANHOU_COMENTARIO).toHaveLength(5);
    expect(PERDEU_COMENTARIO).toHaveLength(5);
  });

  it('GRAVANDO_REVANCHE tem 5 frases', () => {
    expect(GRAVANDO_REVANCHE).toHaveLength(5);
  });

  it('nenhum pool de vitória se mistura com o de derrota', () => {
    for (const frase of GANHOU) {
      expect(PERDEU).not.toContain(frase);
    }
    for (const frase of GANHOU_COMENTARIO) {
      expect(PERDEU_COMENTARIO).not.toContain(frase);
    }
  });

  it('round fechando ganhou-ganhou não repete a frase anterior', () => {
    // Sorteio sempre pedindo o primeiro índice: com o filtro de `escolherFala`
    // isso ainda assim tem que dar frases diferentes, porque a segunda
    // chamada exclui a que já estava na tela.
    const primeira = escolherFala(GANHOU, null, () => 0);
    const segunda = escolherFala(GANHOU, primeira, () => 0);
    expect(segunda).not.toBe(primeira);
    expect(GANHOU).toContain(segunda);
  });
});
