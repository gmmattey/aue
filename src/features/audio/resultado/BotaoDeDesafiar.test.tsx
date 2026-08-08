/**
 * O gate do botão de desafiar, travado em teste.
 *
 * Existe porque a FALHA FECHADA do `BotaoDeDesafiar` é invisível numa leitura
 * rápida: os três ramos são condições irmãs, e o terceiro é a negação literal
 * dos dois primeiros. Trocá-lo por `else` ou por um `switch` com `default`
 * produz exatamente a mesma tela hoje — e amanhã, quando alguém acrescentar um
 * membro a `EstadoDoAudio`, o botão volta a aparecer sem áudio e o defeito que
 * volta é o link de batalha MUDA mandado no WhatsApp.
 *
 * `renderToStaticMarkup` como no `lancamento.smoke.test.ts`: sem DOM, sem
 * efeito, sem rede — o componente é função pura das props, e é isso que o teste
 * também verifica.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { BotaoDeDesafiar } from './BotaoDeDesafiar';
import type { EstadoDoAudio } from './tipos';

const SEM_AUDIO = 'Sem áudio não dá para desafiar';

function desenhar(props: Partial<Parameters<typeof BotaoDeDesafiar>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(BotaoDeDesafiar, {
      estadoAudio: 'inativo',
      linkDesafio: null,
      onDesafiar: () => {},
      ...props,
    }),
  );
}

describe('BotaoDeDesafiar', () => {
  it('com o áudio no ar, o desafio é oferecido e está clicável', () => {
    const html = desenhar({ estadoAudio: 'enviado' });
    expect(html).toContain('data-od-id="btn-desafiar"');
    expect(html).not.toContain('disabled');
    expect(html).not.toContain(SEM_AUDIO);
  });

  it('durante o upload o botão fica, desabilitado, e o rótulo diz por quê', () => {
    // Só o `disabled` não bastava: sem a regra `.btn:disabled` do index.css ele
    // ficava idêntico a um botão clicável. É o texto que comunica.
    const html = desenhar({ estadoAudio: 'enviando' });
    expect(html).toContain('data-od-id="btn-desafiar"');
    expect(html).toContain('disabled');
    expect(html).toContain('Enviando o áudio...');
  });

  it.each<EstadoDoAudio>(['falhou', 'sem-conta', 'apagado', 'inativo'])(
    'em %s não existe botão de desafiar, e a ausência é explicada',
    (estadoAudio) => {
      const html = desenhar({ estadoAudio });
      expect(html).not.toContain('btn-desafiar');
      expect(html).toContain(SEM_AUDIO);
    },
  );

  it('com o link já gerado o botão sai de cena sem virar aviso', () => {
    // O link existe: não há nada a desafiar de novo, e a frase de "sem áudio"
    // seria mentira na tela de quem acabou de criar a batalha.
    const html = desenhar({ estadoAudio: 'enviado', linkDesafio: 'https://aue.app/b/ABC' });
    expect(html).not.toContain('btn-desafiar');
    expect(html).not.toContain(SEM_AUDIO);
  });

  it('quem responde à batalha é avisado de que a rodada dela não entrou', () => {
    // Do lado de quem responde não há botão para esconder — a resposta é
    // automática. Sem esta frase a pessoa veria a nota e a rodada simplesmente
    // não apareceria na batalha.
    const html = desenhar({ estadoAudio: 'falhou', escondeDesafio: true, exigeAudio: true });
    expect(html).not.toContain('btn-desafiar');
    expect(html).toContain('Sua resposta não entrou na batalha');
    expect(html).toContain('role="alert"');
  });

  it('com o desafio escondido e sem exigir áudio, nada é dito', () => {
    const html = desenhar({ estadoAudio: 'falhou', escondeDesafio: true });
    expect(html).toBe('');
  });
});
