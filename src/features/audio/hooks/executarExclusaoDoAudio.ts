import { removerAudioDoResultado, type ResultadoRow } from '../../../db/supabase';
import type { SetadoresDaExclusao } from './tiposDoEnvio';

/**
 * Tira o áudio do ar a pedido de quem o gravou.
 *
 * A publicação é automática e sem consentimento explícito — decisão de
 * produto —, então o arrependimento tem que ter caminho, e no momento em que
 * ele acontece: aqui, olhando para a gravação que acabou de subir. Sem isto,
 * "exclusão a pedido" dependeria de Luiz abrir o painel do Supabase à mão.
 *
 * NÃO apaga o resultado: a nota, o XP e o ranking continuam. É o áudio que
 * sai do ar, junto com o post de áudio no feed.
 *
 * Mora no mesmo hook do envio por ACOPLAMENTO DE ESCRITA, não por tamanho:
 * escreve em `linhaSalva`, `postadoNoFeed` e `estadoAudio`, que são do envio.
 * Deixá-lo no componente obrigaria o hook a exportar esses setters, e
 * `estadoAudio` escrevível de qualquer lugar é a superfície onde os dois bugs
 * de produção nasceram.
 */
export async function executarExclusaoDoAudio(
  linhaSalva: ResultadoRow,
  set: SetadoresDaExclusao,
): Promise<void> {
  if (!linhaSalva.audio_path) return;

  set.setApagandoAudio(true);
  set.setErroAoApagar(null);
  try {
    const atualizada = await removerAudioDoResultado(linhaSalva);
    set.setLinhaSalva(atualizada);
    set.setPostadoNoFeed(false);
    set.setEstadoAudio('apagado');
  } catch (err) {
    console.error('Falha ao apagar o áudio', err);
    set.setErroAoApagar('Não foi possível apagar o áudio agora. Tenta de novo.');
  } finally {
    set.setApagandoAudio(false);
  }
}
