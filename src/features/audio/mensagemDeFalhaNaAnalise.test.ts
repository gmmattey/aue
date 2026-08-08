import { describe, expect, it } from 'vitest';

import { AudioMudoError, AudioVazioError } from './engine';
import { mensagemDeFalhaNaAnalise } from './mensagemDeFalhaNaAnalise';

/**
 * As três mensagens da falha de análise, travadas literalmente.
 *
 * Existe porque elas acabaram de SAIR de dentro do `AudioRecorder.tsx` e nenhum
 * teste as cobria — só `engine.ts` e o componente as continham. Mover copy sem
 * teste é como se perde copy: a refatoração passa verde, a mensagem vira outra,
 * e quem descobre é a pessoa cujo arroto não virou nota.
 *
 * Mesmo espírito de `frasesDoJuiz.test.ts`: o objeto do teste é o TEXTO.
 */
describe('mensagem de falha na análise', () => {
  it('silêncio pede para chegar mais perto do microfone', () => {
    // O caso do iPhone que tirou 54,2 sem um único decibel. Ver `engine.ts`.
    expect(mensagemDeFalhaNaAnalise(new AudioMudoError(0.0001))).toBe(
      'Não saiu som nenhum nessa gravação. Chega mais perto do microfone e manda de novo.',
    );
  });

  it('gravação vazia tem mensagem PRÓPRIA, diferente da de silêncio', () => {
    expect(mensagemDeFalhaNaAnalise(new AudioVazioError())).toBe(
      'Não deu para ouvir nada nessa gravação. Tenta de novo, mais perto do microfone.',
    );
  });

  it('qualquer outra falha cai na mensagem genérica', () => {
    expect(mensagemDeFalhaNaAnalise(new Error('decodeAudioData explodiu'))).toBe(
      'Não foi possível analisar o áudio. Tenta gravar de novo.',
    );
    // `unknown` de verdade: o catch do JS não promete receber um Error.
    expect(mensagemDeFalhaNaAnalise('string solta')).toBe(
      'Não foi possível analisar o áudio. Tenta gravar de novo.',
    );
    expect(mensagemDeFalhaNaAnalise(undefined)).toBe(
      'Não foi possível analisar o áudio. Tenta gravar de novo.',
    );
  });

  it('os dois erros de áudio são irmãos — nenhum captura o outro', () => {
    /*
      A precedência do `if` só é inofensiva enquanto isto for verdade. No dia em
      que alguém fizer `AudioMudoError extends AudioVazioError` (ou o contrário),
      uma das duas mensagens some silenciosamente — e este teste quebra apontando
      para a causa em vez de para o efeito.
    */
    expect(new AudioMudoError(0).message).not.toBe('');
    expect(new AudioMudoError(0) instanceof AudioVazioError).toBe(false);
    expect(new AudioVazioError() instanceof AudioMudoError).toBe(false);
  });
});
