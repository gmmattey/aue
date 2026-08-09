/**
 * O que as duas páginas legais não podem deixar de dizer.
 *
 * Cada asserção aqui corresponde a uma afirmação que já esteve errada, ausente
 * ou implícita demais — e que, sendo documento publicado, custa caro quando
 * volta a estar.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import type { FC } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import { PoliticaDePrivacidade } from './PoliticaDePrivacidade';
import { TermosDeUso } from './TermosDeUso';

function montar(componente: FC): string {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(componente)));
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('política de privacidade', () => {
  it('diz com todas as letras que o áudio fica guardado sem prazo', () => {
    /*
      DECISÃO DE PRODUTO DE LUIZ: passados os 7 dias, o acesso é bloqueado e o
      arquivo é MANTIDO. O texto anterior dizia apenas "as gravações não são
      apagadas automaticamente" — verdade, mas do tipo que a pessoa completa
      sozinha imaginando um prazo.

      E o inverso é igualmente proibido: NÃO inventar prazo de expurgo. Um prazo
      escrito numa política é promessa que exige código que não existe.
    */
    const html = montar(PoliticaDePrivacidade);
    expect(html).toContain('sem prazo');
    expect(html).toContain('não existe prazo de exclusão automática');
    expect(html).toContain('O arquivo continua guardado');
    // O que expira é o acesso, e isso continua dito.
    expect(html).toContain('O <strong>link</strong> de uma batalha');
  });

  it('não promete sigilo que o app não entrega', () => {
    // A chave anônima do app é pública: qualquer pessoa consegue ouvir qualquer
    // áudio não escondido.
    expect(montar(PoliticaDePrivacidade)).toContain('não é um segredo');
  });

  it('aponta para os termos de uso', () => {
    expect(montar(PoliticaDePrivacidade)).toContain('href="/termos"');
  });
});

describe('termos de uso', () => {
  it('existem, e dizem o que a pessoa aceita', () => {
    // Contrato MVP1 §3.10. Até esta mudança a palavra "termos" não aparecia em
    // `src/`: havia só `/privacidade`, e o contrato pede os dois documentos.
    const html = montar(TermosDeUso);
    expect(html).toContain('gravações feitas por você');
    expect(html).toContain('Moderação');
  });

  it('não inventa cobrança, conta nem verificação de idade', () => {
    /*
      As três armadilhas deste documento, todas presentes no protótipo:

      - "plano opcional pago": Auê+ está desligado por flag e não há provedor de
        pagamento integrado. Cobrança escrita em termos é promessa de cobrar.
      - "suspender contas": não existe conta. O que existe é esconder conteúdo.
      - "conforme verificado na Entrada" (idade): não existe verificação nenhuma.
        A regra pode existir; a alegação de que ela é conferida, não.
    */
    const html = montar(TermosDeUso);
    expect(html).toContain('não existe cobrança');
    expect(html).toContain('não existe conta');
    expect(html).toContain('Não existe verificação de idade');
  });

  it('aponta para a política de privacidade', () => {
    expect(montar(TermosDeUso)).toContain('href="/privacidade"');
  });
});

describe('quem responde, nos dois documentos', () => {
  it('a identificação do responsável está PUBLICADA, não pendente', async () => {
    /*
      Era um aviso vermelho de pendência de lançamento nos dois documentos.
      Luiz fechou a decisão em 2026-08-08: o responsável é a Buildea Labs.

      O teste trava o contrário do que travava antes — presença da
      identificação, e ausência do aviso de "ainda não foi publicada". CNPJ e
      endereço continuam fora de propósito: não foram informados, e política
      publicada não é lugar para número inventado.
    */
    for (const componente of [PoliticaDePrivacidade, TermosDeUso]) {
      const html = montar(componente);
      expect(html).toContain('Buildea Labs');
      expect(html).not.toContain('ainda não foi publicada');
    }
  });

  it('com a variável configurada, o contato aparece nos dois documentos', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_CONTATO_PRIVACIDADE', 'buildealabs@gmail.com');

    const { PoliticaDePrivacidade: Politica } = await import('./PoliticaDePrivacidade');
    const { TermosDeUso: Termos } = await import('./TermosDeUso');

    for (const componente of [Politica, Termos]) {
      const html = montar(componente);
      expect(html).toContain('mailto:buildealabs@gmail.com');
    }
  });

  it('sem a variável, nenhum endereço é inventado — o aviso vermelho aparece', async () => {
    /*
      `VITE_*` é resolvida em tempo de BUILD. Um deploy feito sem
      `VITE_CONTATO_PRIVACIDADE` no environment publica a política com este
      aviso, e configurar a variável depois no painel não conserta: exige build
      novo. Este teste é o registro de que o ramo continua de pé — inventar um
      endereço para "ficar bonito" seria pior do que admitir a falta.
    */
    vi.resetModules();
    vi.stubEnv('VITE_CONTATO_PRIVACIDADE', undefined);

    const { PoliticaDePrivacidade: Politica } = await import('./PoliticaDePrivacidade');
    const html = montar(Politica);

    expect(html).not.toContain('mailto:');
    expect(html).toContain('canal de contato ainda não foi configurado');
  });
});
