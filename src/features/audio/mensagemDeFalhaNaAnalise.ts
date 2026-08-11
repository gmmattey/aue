import { AudioMudoError, AudioVazioError } from './engine';

/**
 * O que a tela diz quando a análise acústica falha.
 *
 * MÓDULO SEPARADO pelo mesmo motivo declarado em `frasesDoJuiz.ts`: copy não é
 * gravação. Aqui as duas mensagens são revisáveis sem abrir o `AudioRecorder`, e
 * `mensagemDeFalhaNaAnalise.test.ts` as trava — antes elas viviam soltas dentro
 * de um ternário aninhado no `onstop`, sem teste nenhum.
 *
 * `AudioMudoError` é o caso de silêncio: gravou, tem duração, mas não tem som.
 * Antes ele não existia e virava NOTA — um iPhone mudo tirou 54,2
 * "Dá pro gasto.".
 *
 * SÃO DUAS, E NÃO TRÊS, desde a #57: silêncio e gravação vazia dizem a mesma
 * coisa para quem gravou — não houve arroto — e as duas caem na `TelaSemSom`,
 * embaixo do mesmo "Coé, não peguei nada aí.". Distinguir o motivo técnico ali
 * seria informação para o console, não para a pessoa.
 */
export function mensagemDeFalhaNaAnalise(erro: unknown): string {
  if (erro instanceof AudioMudoError || erro instanceof AudioVazioError) {
    return 'Não saiu som nenhum nessa gravação.';
  }
  /*
    A FALHA TÉCNICA DIZ O QUE ACONTECEU ANTES DE FAZER GRAÇA. A #53 é explícita:
    "quando der erro técnico, fala claro primeiro e zoa depois. Não esconde
    falha atrás de gracinha." Sem a primeira frase, um `decodeAudioData` que
    explode devolve só a piada e a pessoa fica sem saber que o problema foi a
    gravação, não o arroto dela.
  */
  return 'Deu ruim na gravação. Não vou fingir que ouvi. Tenta de novo.';
}
