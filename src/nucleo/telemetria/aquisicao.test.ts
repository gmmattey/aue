import { describe, expect, it } from 'vitest';

import { ORIGEM_DIRETA, lerAquisicaoDaURL } from './aquisicao';

function parametros(query: string) {
  return new URLSearchParams(query);
}

describe('lerAquisicaoDaURL', () => {
  it('sem parâmetro nenhum, a origem é direct', () => {
    expect(lerAquisicaoDaURL(parametros(''))).toEqual({
      origem: ORIGEM_DIRETA,
      campanha: null,
      conteudo: null,
    });
  });

  it.each(['tiktok', 'instagram', 'youtube', 'whatsapp', 'google', 'qr', 'x1'])(
    'reconhece a origem "%s"',
    (canal) => {
      expect(lerAquisicaoDaURL(parametros(`?src=${canal}`)).origem).toBe(canal);
    },
  );

  it('não é uma lista fechada: qualquer valor de src vira origem', () => {
    expect(lerAquisicaoDaURL(parametros('?src=kwai')).origem).toBe('kwai');
  });

  it('normaliza a caixa da origem', () => {
    expect(lerAquisicaoDaURL(parametros('?src=TikTok')).origem).toBe('tiktok');
  });

  it('lê campanha e conteúdo junto com a origem', () => {
    expect(
      lerAquisicaoDaURL(parametros('?src=tiktok&campaign=duvido_bater_01&content=video_03')),
    ).toEqual({
      origem: 'tiktok',
      campanha: 'duvido_bater_01',
      conteudo: 'video_03',
    });
  });

  it('src vazio cai para direct', () => {
    expect(lerAquisicaoDaURL(parametros('?src=')).origem).toBe(ORIGEM_DIRETA);
    expect(lerAquisicaoDaURL(parametros('?src=%20%20%20')).origem).toBe(ORIGEM_DIRETA);
  });

  it('campanha e conteúdo ausentes viram null, não string vazia', () => {
    const aquisicao = lerAquisicaoDaURL(parametros('?src=google'));
    expect(aquisicao.campanha).toBeNull();
    expect(aquisicao.conteudo).toBeNull();
  });

  it('corta origem, campanha e conteúdo longos demais em vez de rejeitar', () => {
    const longa = 'a'.repeat(200);
    const aquisicao = lerAquisicaoDaURL(
      parametros(`?src=${longa}&campaign=${longa}&content=${longa}`),
    );
    expect(aquisicao.origem.length).toBeLessThanOrEqual(40);
    expect(aquisicao.campanha?.length).toBeLessThanOrEqual(80);
    expect(aquisicao.conteudo?.length).toBeLessThanOrEqual(80);
  });
});
