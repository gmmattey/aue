import { ondaDe16k } from './ondaDe16k';
import { pontuacaoLiberada, vereditoDeArroto, type VereditoDeArroto } from './vereditoDeArroto';

/**
 * "Isso aí foi arroto mesmo?" — a pergunta inteira, de Blob a veredito.
 *
 * É o que o `AudioRecorder` chama, e é a única porta deste diretório para fora.
 * Os três passos moram em módulos separados porque falham por motivos
 * diferentes e se testam de jeitos diferentes: decodificar (`ondaDe16k`),
 * inferir (`yamnet`) e decidir (`vereditoDeArroto`, puro).
 *
 * ESTA FUNÇÃO NÃO LANÇA. Qualquer coisa que dê errado vira
 * `status: 'indisponivel'`, e `pontuacaoLiberada` deixa a gravação passar. O
 * detector é uma trava contra nota em conversa — não é uma dependência da qual
 * o jogo passa a depender para funcionar. Ver a assimetria documentada em
 * `pontuacaoLiberada`.
 */
export async function julgarSeEhArroto(blob: Blob): Promise<VereditoDeArroto> {
  try {
    const onda = await ondaDe16k(blob);

    /*
      IMPORT DINÂMICO, e é decisão de peso, não estilo.

      `yamnet.ts` arrasta o tfjs junto (core, converter e os dois backends).
      Importado no topo, isso entraria no bundle da primeira tela — o app
      inteiro ficaria mais lento para abrir por causa de um modelo que só é
      usado DEPOIS de alguém arrotar, e que boa parte das visitas nunca aciona.

      Aqui o custo é pago no fim da gravação, embaixo da tela "Julgando", que já
      é uma espera declarada.
    */
    const { pontuarClasseDeArroto } = await import('./yamnet');
    const scores = await pontuarClasseDeArroto(onda);

    return vereditoDeArroto(scores);
  } catch (erro) {
    /*
      `console.error` e não silêncio: quando o juiz sumir em produção, isso é a
      única pista. A pessoa não vê nada — para ela o fluxo segue igual ao de
      antes de o detector existir, que é exatamente o comportamento pedido.
    */
    console.error('O juiz não pôde ouvir esta gravação', erro);
    return {
      status: 'indisponivel',
      motivo: erro instanceof Error ? erro.message : 'Falha desconhecida no juiz.',
    };
  }
}

export { pontuacaoLiberada };
export type { VereditoDeArroto };
