import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TelaDeConvite } from './TelaDeConvite';

/**
 * O ESTADO "esperando a permissão" (#72).
 *
 * Era um buraco visual: entre tocar em ARROTAR e o prompt nativo aparecer, a
 * tela não mudava nada. Em aparelho lento é um buraco longo, e buraco longo
 * depois de um toque lê como "não pegou" — a pessoa toca de novo.
 */

function montar(pedindoPermissao: boolean): string {
  return renderToStaticMarkup(
    createElement(TelaDeConvite, { onArrotar: () => {}, pedindoPermissao }),
  );
}

describe('TelaDeConvite', () => {
  it('em repouso: bolha, CTA e nenhum aviso de espera', () => {
    const html = montar(false);
    expect(html).toContain('ARROTAR');
    expect(html).toContain('fx-bolha');
    expect(html).not.toContain('fx-bolha-atenta');
    expect(html).not.toContain('Libera o microfone');
    expect(html).not.toContain('disabled');
  });

  it('perguntando: bolha atenta, botão travado e o aviso na tela', () => {
    const html = montar(true);
    expect(html).toContain('fx-bolha-atenta');
    expect(html).toContain('disabled');
    expect(html).toContain('Libera o microfone');
  });

  it('o botão trava enquanto o prompt está aberto — segundo toque mataria o primeiro', () => {
    /*
      `iniciar` começa soltando o stream anterior. Um segundo toque com o prompt
      aberto chamaria `getUserMedia` de novo e derrubaria a pergunta que já
      estava na tela.
    */
    expect(montar(true)).toContain('disabled');
    expect(montar(false)).not.toContain('disabled');
  });

  it('a tela é a MESMA nos dois estados — o que está atrás do prompt não troca', () => {
    /*
      #72 e #69: o prompt nativo aparece por cima, e trocar o que está atrás
      faria a página pular no instante em que a pessoa lê a pergunta. Por isso
      `pedindoPermissao` muda o estado desta tela em vez de levar a outra.

      A prova possível aqui é estrutural: os dois estados renderizam a mesma
      seção, com a mesma bolha e o mesmo CTA.
    */
    for (const html of [montar(false), montar(true)]) {
      expect(html).toContain('data-od-id="invite-hero"');
      expect(html).toContain('data-od-id="bolha-invite"');
      expect(html).toContain('ARROTAR');
    }
  });

  it('não anuncia o prompt nativo como se fosse nosso', () => {
    // A #72 é explícita: "nada de animar o prompt nativo do navegador". O que
    // reage é a bolha, que é nossa.
    expect(montar(true)).not.toMatch(/permitir|bloquear|allow/i);
  });
});
