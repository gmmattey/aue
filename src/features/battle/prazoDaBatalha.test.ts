/**
 * O PRAZO DITO COM O NÚMERO CERTO.
 *
 * O defeito que este arquivo impede de voltar não quebra tela nenhuma: duas
 * telas afirmavam "ele para de funcionar em 7 dias" em texto fixo, e no sexto
 * dia continuavam prometendo sete a quem estava decidindo se mandava o link
 * agora ou amanhã. Ninguém percebe isso lendo o código; percebe no dia em que o
 * amigo abre o link e ele não abre mais.
 *
 * `agora` é injetado em toda asserção — testar prazo contra o relógio da
 * máquina é escrever teste que falha sozinho de madrugada.
 */
import { describe, expect, it } from 'vitest';

import { batalhaExpirou, fraseDoPrazo } from './prazoDaBatalha';

const AGORA = Date.parse('2026-08-08T12:00:00.000Z');

/** Uma data ISO daqui a N milissegundos, como a RPC devolveria. */
function daquiA(ms: number): string {
  return new Date(AGORA + ms).toISOString();
}

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

describe('batalhaExpirou', () => {
  it('a batalha recém-criada, com sete dias pela frente, não expirou', () => {
    expect(batalhaExpirou(daquiA(7 * DIA), AGORA)).toBe(false);
  });

  it('passado o prazo, expirou', () => {
    expect(batalhaExpirou(daquiA(-1), AGORA)).toBe(true);
  });

  it('o instante exato do vencimento já conta como vencido', () => {
    // O servidor usa `expira_em > now()`: no empate, a RPC devolve NULL. A
    // tela precisa concordar com ele, senão mostra gravador para uma batalha
    // que o banco já recusa.
    expect(batalhaExpirou(daquiA(0), AGORA)).toBe(true);
  });

  it('data ilegível ou ausente NÃO tira a batalha do ar', () => {
    // Responder `true` aqui desligaria a atualização automática e trocaria a
    // tela por um aviso de expirado por causa de um formato de data.
    expect(batalhaExpirou(undefined, AGORA)).toBe(false);
    expect(batalhaExpirou(null, AGORA)).toBe(false);
    expect(batalhaExpirou('batalha do arroto', AGORA)).toBe(false);
  });
});

describe('fraseDoPrazo', () => {
  it('conta em dias enquanto houver dias', () => {
    expect(fraseDoPrazo(daquiA(7 * DIA), AGORA)).toBe('Ele para de funcionar em 7 dias.');
    expect(fraseDoPrazo(daquiA(6 * DIA), AGORA)).toBe('Ele para de funcionar em 6 dias.');
  });

  it('arredonda para BAIXO — nunca promete mais do que existe', () => {
    // Seis dias e vinte horas viram "6 dias". Dizer 7 seria a mentira antiga
    // de volta, agora calculada.
    expect(fraseDoPrazo(daquiA(6 * DIA + 20 * HORA), AGORA)).toBe(
      'Ele para de funcionar em 6 dias.',
    );
  });

  it('o singular do último dia não sai "1 dias"', () => {
    expect(fraseDoPrazo(daquiA(DIA + HORA), AGORA)).toBe('Ele para de funcionar em 1 dia.');
  });

  it('faltando horas, fala em horas — não arredonda para "1 dia"', () => {
    expect(fraseDoPrazo(daquiA(5 * HORA), AGORA)).toBe('Ele para de funcionar em 5 horas.');
    expect(fraseDoPrazo(daquiA(HORA + 30 * MINUTO), AGORA)).toBe(
      'Ele para de funcionar em 1 hora.',
    );
  });

  it('faltando minutos, fala em minutos', () => {
    expect(fraseDoPrazo(daquiA(14 * MINUTO), AGORA)).toBe('Ele para de funcionar em 14 minutos.');
    expect(fraseDoPrazo(daquiA(MINUTO), AGORA)).toBe('Ele para de funcionar em 1 minuto.');
  });

  it('no último minuto não vira "0 minutos"', () => {
    expect(fraseDoPrazo(daquiA(30_000), AGORA)).toBe(
      'Ele para de funcionar em menos de um minuto.',
    );
  });

  it('vencido, diz que venceu', () => {
    expect(fraseDoPrazo(daquiA(-HORA), AGORA)).toBe('Este link já parou de funcionar.');
  });

  it('sem data legível, não inventa prazo nenhum', () => {
    const frase = fraseDoPrazo(undefined, AGORA);
    expect(frase).toBe('Ele para de funcionar sozinho quando o prazo vencer.');
    // O ponto do arquivo inteiro: nenhum número chutado.
    expect(frase).not.toContain('7');
  });
});
