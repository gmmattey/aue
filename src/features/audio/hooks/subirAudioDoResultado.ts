import {
  criarPostDeAudio,
  enviarAudioDoResultado,
  AudioFormatoNaoAceitoError,
  AudioGrandeDemaisError,
  type ResultadoRow,
} from '../../../db/supabase';
import { FLAGS } from '../../../shared/flags';
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
      Publicação no feed — FORA DO CORTE DO MVP, e esta é a barreira
      mais importante de todo o login anônimo.

      Este bloco existe desde antes e nunca chegou a executar: ele
      exige `salva.usuario_id`, e ninguém fazia login. Assim que a sessão
      anônima entrou, ele passou a valer para TODA gravação de TODO
      visitante — cada arroto viraria post público automaticamente, sem
      que ninguém tivesse escolhido isso, num feed que nem está no ar.

      Só volta junto com o feed, e só depois de decidir se publicar é
      automático ou é uma escolha. Ver `FLAGS.feed`.

      Falhar aqui NÃO invalida o upload: o áudio está no bucket e a
      batalha já consegue tocá-lo. Por isso é um try/catch separado.

      Este é o ÚNICO módulo do src que importa `criarPostDeAudio`, e a chamada
      fica literalmente dentro da guarda: um grep prova um call site e uma
      guarda. Tirar o `await` de dentro do `if` "para ficar mais legível" é
      publicar o arroto de todo mundo.
    */
    if (FLAGS.feed) {
      try {
        await criarPostDeAudio(linhaFinal);
        set.setPostadoNoFeed(true);
      } catch (erroPost) {
        console.error('Falha ao publicar no feed', erroPost);
        set.setMotivoFalhaAudio(
          'O áudio foi enviado, mas não entrou no feed. Ele continua valendo no desafio.',
        );
      }
    }

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
