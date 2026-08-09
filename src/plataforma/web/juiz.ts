import { AudioMudoError, AudioVazioError, analyzeAudio } from '../../features/audio/engine';
import { fraseDoJuiz } from '../../features/audio/frasesDoJuiz';
import { calculateScore } from '../../features/audio/rules';
import type { Origin } from '../../features/audio/rules';
import type { TipoDeOrigem } from '../../nucleo/origem/origens';
import type { AudioCapturado } from '../../portas/captura';
import type { Juiz, NotaDoJuiz, Veredito } from '../../portas/juiz';

/**
 * O juiz no navegador.
 *
 * ELE NÃO CALCULA NADA. Ele é a ponte entre a Arena e as duas coisas que já
 * existem e já são testadas: o motor de extração (`features/audio/engine.ts`,
 * que decodifica o áudio e mede) e a fórmula (`features/audio/rules.ts`, que
 * é espelhada em SQL e tem teste de paridade).
 *
 * POR QUE OS DOIS CONTINUAM ONDE ESTÃO. `rules.ts` tem dez arquivos
 * importando, um teste de paridade com o banco e outro travando o caso do
 * silêncio; `engine.ts` é a matemática mais delicada do repositório. Mudar os
 * dois de pasta no mesmo dia em que a Arena passa a usá-los seria dobrar o
 * risco em troca de arrumação. Eles migram junto com a limpeza do legado
 * (#109), e **até lá este arquivo é o único ponto de contato** — a Arena não
 * importa nada de `features/`.
 *
 * É desvio declarado do alvo de pastas do ADR 0001 §2, não descuido.
 */
export function criarJuizWeb(): Juiz {
  return {
    async julgar(audio: AudioCapturado, origem: TipoDeOrigem): Promise<Veredito> {
      try {
        const medidas = await analyzeAudio(audio.dados);
        const resultado = calculateScore(medidas, origem as Origin);

        const nota: NotaDoJuiz = {
          nota: resultado.score,
          classificacao: resultado.classification,
          /*
            A frase é sorteada AQUI, uma vez, e viaja com a nota. O
            compartilhamento tem que repetir exatamente esta.

            `fraseDoJuiz` devolve `null` se a classificação não casar com
            nenhuma faixa — hoje impossível, porque as faixas cobrem 0 a 100.
            O fallback existe para não haver caminho em que a tela mostre
            "null" no lugar da zoeira.
          */
          frase: fraseDoJuiz(resultado.classification) ?? resultado.classification,
          medidas: {
            // Os nomes de rua do protótipo, mapeados nas parciais da fórmula.
            grave: resultado.partialScores.depth,
            estouro: resultado.partialScores.power,
            folego: resultado.partialScores.duration,
            sujeira: resultado.partialScores.texture,
          },
        };

        return { ok: true, nota };
      } catch (erro) {
        /*
          O motor tem guarda própria contra silêncio, com piso mais exigente
          que o da gravação — um arroto pode passar na conferida da saída e
          ainda assim ser recusado aqui. Não é falha do jogo, e a Arena precisa
          saber distinguir para não acusar defeito onde não houve.
        */
        if (erro instanceof AudioMudoError || erro instanceof AudioVazioError) {
          return { ok: false, motivo: 'semAudio' };
        }

        return {
          ok: false,
          motivo: 'falhou',
          detalhe: erro instanceof Error ? erro.message : String(erro),
        };
      }
    },
  };
}
