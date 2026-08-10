import { julgarSeEhArroto, pontuacaoLiberada } from '../../features/audio/juiz/julgarSeEhArroto';
import type { AudioCapturado } from '../../portas/captura';
import type { DetectorDeArroto } from '../../portas/detector';

/**
 * O detector de arroto no navegador.
 *
 * ELE NÃO DECIDE NADA NOVO. É ponte para o detector que já existe, já tem
 * testes e **já rodou em produção** no fluxo antigo — o mesmo modelo, o mesmo
 * limiar medido, a mesma política de falha. Esta fatia religa; não reinventa.
 *
 * Mesma dívida declarada do pontuador: `features/audio/juiz/` fica onde está
 * até a limpeza do legado (#109), e este arquivo é o único ponto de contato.
 */

/**
 * O teto da espera na saída da gravação.
 *
 * O `ARENA.md` proíbe ficar preso na conferida. Estourou, a nota passa — pelo
 * mesmo motivo de sempre: o detector é filtro contra trapaça, não pedágio.
 *
 * OITO SEGUNDOS, E O NÚMERO TEM MEDIÇÃO ATRÁS. A primeira versão usava três,
 * por raciocínio de rede: "o modelo começou a baixar no ARROTAR, então já deve
 * estar pronto". O raciocínio estava certo sobre o DOWNLOAD e errado sobre o
 * resto — medido no navegador, com o modelo já baixado, o julgamento inteiro
 * (decodificar, reamostrar para 16 kHz e rodar a rede) levou **2998 ms** num
 * computador de mesa. O teto de três segundos cortava o detector no fio, e num
 * celular ele simplesmente nunca chegaria a responder.
 *
 * O fluxo antigo, que rodou em produção, **não tinha teto nenhum**. Oito
 * segundos continua sendo mais rígido que o que já esteve no ar, e ainda
 * garante que ninguém fique preso para sempre.
 */
export const TETO_DA_CONFERIDA_MS = 8000;

export function criarDetectorWeb(): DetectorDeArroto {
  return {
    preparar(): void {
      /*
        Import dinâmico: o `yamnet.ts` arrasta o tfjs junto, e ele não pode
        entrar no pacote da primeira tela. Aqui o custo é pago por quem tocou
        em ARROTAR — não por quem só abriu o jogo.
      */
      void import('../../features/audio/juiz/yamnet')
        .then(({ prepararOModelo }) => prepararOModelo())
        .catch(() => {
          /* Sem modelo, a nota passa. O julgamento tenta de novo. */
        });
    },

    async podePontuar(audio: AudioCapturado): Promise<boolean> {
      const teto = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(true), TETO_DA_CONFERIDA_MS);
      });

      const julgamento = julgarSeEhArroto(audio.dados)
        .then(pontuacaoLiberada)
        .catch(() => true);

      return Promise.race([julgamento, teto]);
    },
  };
}
