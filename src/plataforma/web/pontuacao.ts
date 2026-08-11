import { AudioMudoError, AudioVazioError, analyzeAudio } from '../../features/audio/engine';
import { calculateScore } from '../../features/audio/rules';
import type { Origin } from '../../features/audio/rules';
import { falaDaNota } from '../../nucleo/nota/faixas';
import type { TipoDeOrigem } from '../../nucleo/origem/origens';
import type { AudioCapturado } from '../../portas/captura';
import type { Nota, Pontuador, ResultadoDaPontuacao } from '../../portas/pontuacao';

/**
 * A conta da nota no navegador.
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
/**
 * A semente do arroto, criada UMA VEZ, no julgamento.
 *
 * A Arena julga antes de gravar: quando o `RESULT` aparece não existe id de
 * banco nenhum para derivar a fala. Então a semente nasce aqui e viaja na
 * `Nota` — a tela, o cartão e o texto do zap leem a mesma escolha, e ninguém
 * re-sorteia na renderização.
 *
 * `Math.random()` fica na plataforma, não no núcleo: `falaDaNota` recebe a
 * semente pronta e continua sendo função pura (`AGENTS.md` §6).
 *
 * O QUE ESTA SEMENTE NÃO É: reproduzível. Ela morre com a sessão — ninguém
 * consegue chegar nela a partir do banco. Por isso ela não pode vazar para nada
 * que outra pessoa vá abrir depois (imagem publicada, prévia de link, resultado
 * de terceiro): ali a fala se deriva de `(nota, id do resultado)`, que é o que
 * o `docs/jogo/REGRAS.md` §"A faixa fala" manda. `fala.derivacao.test.ts` trava
 * a divisão: este arquivo é o ÚNICO que pode inventar semente.
 */
function sementeDoJulgamento(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function criarPontuadorWeb(): Pontuador {
  return {
    async pontuar(audio: AudioCapturado, origem: TipoDeOrigem): Promise<ResultadoDaPontuacao> {
      try {
        const medidas = await analyzeAudio(audio.dados);
        const resultado = calculateScore(medidas, origem as Origin);
        /*
          A fala é escolhida AQUI, uma vez, e viaja com a nota. O
          compartilhamento tem que repetir exatamente esta — sortear de novo
          faria o jogo dizer duas coisas sobre o mesmo arroto.

          `classificacao` carrega a REAÇÃO escolhida, e não o rótulo que o banco
          guarda. Quem grava vê a variedade; a coluna continua determinística.
        */
        const fala = falaDaNota(resultado.score, sementeDoJulgamento());

        const nota: Nota = {
          nota: resultado.score,
          classificacao: fala.reacao,
          frase: fala.fraseDoJuiz,
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
