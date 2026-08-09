import { AudioMudoError, AudioVazioError } from './engine';

/**
 * O que a tela diz quando a análise acústica falha.
 *
 * MÓDULO SEPARADO pelo mesmo motivo declarado em `frasesDoJuiz.ts`: copy não é
 * gravação. Aqui as três mensagens são revisáveis sem abrir o `AudioRecorder`, e
 * `mensagemDeFalhaNaAnalise.test.ts` as trava — antes elas viviam soltas dentro
 * de um ternário aninhado no `onstop`, sem teste nenhum.
 *
 * `AudioMudoError` é o caso de silêncio: gravou, tem duração, mas não tem som.
 * Antes ele não existia e virava NOTA — um iPhone mudo tirou 54,2
 * "Arroto Respeitável". A mensagem sugere o microfone porque a causa quase
 * sempre é essa: telefone longe da boca, ou o navegador entregando um stream
 * vazio.
 */
export function mensagemDeFalhaNaAnalise(erro: unknown): string {
  /*
    A ordem é a mesma do ternário original. Os dois erros são irmãos em
    `engine.ts` (ambos estendem `Error` direto), então nenhum captura o outro —
    mas a precedência fica travada em teste para que continuar assim seja
    verificado, e não lembrado.
  */
  if (erro instanceof AudioMudoError || erro instanceof AudioVazioError) {
    return 'Não saiu som nenhum nessa gravação.';
  }
  return 'Não vou fingir que ouvi. Tenta de novo.';
}
