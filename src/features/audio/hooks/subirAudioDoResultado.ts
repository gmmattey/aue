import {
  enviarAudioDoResultado,
  AudioFormatoNaoAceitoError,
  AudioGrandeDemaisError,
  type ResultadoRow,
} from '../../../db/supabase';
import type { SetadoresDoAudio } from './tiposDoEnvio';

/**
 * ÁUDIO — daqui para baixo nada pode derrubar o resultado.
 *
 * A linha já está persistida e o veredito já está na tela quando esta função é
 * chamada. Por isso ela NUNCA LANÇA e SEMPRE devolve uma linha: uma falha de
 * Storage sai daqui como `salva` (com `caminho_do_audio` nulo) mais um aviso na tela,
 * nunca como exceção que caia no catch de `executarEnvio` e apague o score que
 * o servidor acabou de calcular.
 *
 * Acontece ANTES de `onRecordingComplete` de propósito: quem consome (o
 * ChallengeView) precisa receber a linha COM `caminho_do_audio`, senão o duelo é
 * exibido sem o áudio que acabou de subir.
 *
 * Devolve `ResultadoRow` e não um booleano de propósito: é este retorno que o
 * chamador usa no gate de entrega. Nas TRÊS saídas de falha ('sem-conta', sem
 * blob e catch) o retorno é a `salva` original — devolver outra coisa entrega
 * ao ChallengeView um duelo mudo.
 *
 * Não recebe leitura de `estadoAudio`, só o setter: aqui não existe variável de
 * estado do React para alguém confundir com o retorno.
 */
export async function subirAudioDoResultado(
  salva: ResultadoRow,
  /** Lido de `blobRef.current` pelo chamador, uma única vez, depois do submitResult. */
  blob: Blob | null,
  set: SetadoresDoAudio,
): Promise<ResultadoRow> {
  if (!salva.usuario_id) {
    // Policy de INSERT do bucket é `TO authenticated` (20260807000013).
    // Não há contorno, e não vamos exigir conta sem avisar: o resultado
    // anônimo continua existindo, só que mudo.
    set.setEstadoAudio('sem-conta');
    return salva;
  }

  if (!blob) {
    set.setEstadoAudio('falhou');
    set.setMotivoFalhaAudio('A gravação não estava mais disponível para envio.');
    return salva;
  }

  set.setEstadoAudio('enviando');
  set.setMotivoFalhaAudio(null);
  try {
    const linhaFinal = await enviarAudioDoResultado(salva, blob);
    set.setLinhaSalva(linhaFinal);
    set.setEstadoAudio('enviado');

    /*
      Aqui existia a publicação automática no feed, atrás de flag. O feed saiu
      do produto (#109) e o ramo saiu junto — junto com a função de publicar,
      que era chamada só daqui.

      Isto não é detalhe de faxina: com sessão anônima, aquele ramo ligado
      publicaria o arroto de todo visitante sem que ninguém escolhesse isso.
      Se um dia o jogo voltar a publicar áudio de gente, a pessoa escolhe na
      cara dura — não por flag que alguém ligou no painel.
    */
    return linhaFinal;
  } catch (erroAudio) {
    console.error('Falha ao enviar o áudio', erroAudio);
    set.setEstadoAudio('falhou');
    set.setMotivoFalhaAudio(
      // O terceiro ramo é `null`, não uma frase genérica: `null` faz o
      // PainelDoAudio exibir o texto padrão dele.
      erroAudio instanceof AudioFormatoNaoAceitoError
        ? `Seu navegador gravou em ${erroAudio.mime}, um formato que o Auê ainda não aceita.`
        : erroAudio instanceof AudioGrandeDemaisError
          ? 'A gravação passou do limite de 5 MB.'
          : null,
    );
    return salva;
  }
}
