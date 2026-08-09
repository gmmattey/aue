import { describe, expect, it } from 'vitest';

import { AudioMudoError, AudioVazioError } from './engine';
import { mensagemDeFalhaNaAnalise } from './mensagemDeFalhaNaAnalise';

/**
 * As duas mensagens da falha de análise, travadas literalmente.
 *
 * Existe porque elas acabaram de SAIR de dentro do `AudioRecorder.tsx` e nenhum
 * teste as cobria — só `engine.ts` e o componente as continham. Mover copy sem
 * teste é como se perde copy: a refatoração passa verde, a mensagem vira outra,
 * e quem descobre é a pessoa cujo arroto não virou nota.
 *
 * Mesmo espírito de `frasesDoJuiz.test.ts`: o objeto do teste é o TEXTO.
 */
describe('mensagem de falha na análise', () => {
  it('silêncio e áudio vazio retornam a mensagem direta de não ter captado som', () => {
    // O caso do iPhone que tirou 54,2 sem um único decibel. Ver `engine.ts`.
    expect(mensagemDeFalhaNaAnalise(new AudioMudoError(0.0001))).toBe(
      'Não saiu som nenhum nessa gravação.',
    );
  });

  it('gravação vazia retorna mensagem da voz do Auê', () => {
    expect(mensagemDeFalhaNaAnalise(new AudioVazioError())).toBe(
      'Não saiu som nenhum nessa gravação.',
    );
  });

  it('qualquer outra falha cai na mensagem de gravação com erro', () => {
    expect(mensagemDeFalhaNaAnalise(new Error('decodeAudioData explodiu'))).toBe(
      'Deu ruim na gravação. Não vou fingir que ouvi. Tenta de novo.',
    );
    // `unknown` de verdade: o catch do JS não promete receber um Error.
    expect(mensagemDeFalhaNaAnalise('string solta')).toBe(
      'Deu ruim na gravação. Não vou fingir que ouvi. Tenta de novo.',
    );
    expect(mensagemDeFalhaNaAnalise(undefined)).toBe(
      'Deu ruim na gravação. Não vou fingir que ouvi. Tenta de novo.',
    );
  });

  it('a falha técnica DIZ o que aconteceu antes de fazer graça', () => {
    /*
      A #53 manda: "quando der erro técnico, fala claro primeiro e zoa depois.
      Não esconde falha atrás de gracinha."

      Este teste existe porque a versão anterior desta PR devolvia SÓ a piada.
      Travar as duas metades separadamente faz a regra ser verificada, e não
      lembrada: quem encurtar a frase para "Não vou fingir que ouvi." quebra
      aqui, com o motivo escrito.
    */
    const mensagem = mensagemDeFalhaNaAnalise(new Error('qualquer coisa'));

    expect(mensagem.startsWith('Deu ruim na gravação.')).toBe(true);
    expect(mensagem).toContain('Não vou fingir que ouvi.');
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
