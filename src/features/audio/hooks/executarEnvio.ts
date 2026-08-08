import { calculateScore, type Origin } from '../rules';
import type { AudioMetrics } from '../engine';
import { submitResult, updateProfile } from '../../../db/supabase';
import { subirAudioDoResultado } from './subirAudioDoResultado';
import type { ParametrosDoEnvio, SetadoresDoEnvio } from './tiposDoEnvio';

/**
 * A sequência do envio, na ordem em que ela precisa acontecer:
 * prévia -> apelido no perfil -> submitResult -> veredito oficial na tela ->
 * áudio -> entrega ao consumidor. Nenhum passo troca de lugar.
 */
export async function executarEnvio(
  origem: Origin,
  subtipo: string | undefined,
  /** `metricas` já garantida não-nula: a guarda `if (!metricas) return` fica no hook. */
  params: ParametrosDoEnvio & { metricas: AudioMetrics },
  set: SetadoresDoEnvio,
): Promise<void> {
  const {
    metricas,
    userId,
    temSessao,
    nomeExibicao,
    blobRef,
    exigeAudio,
    onRecordingComplete,
    aoGravarApelido,
  } = params;

  set.setEnviando(true);
  set.setErro(null);
  try {
    // Prévia local. O valor oficial é o que o servidor recalcula.
    const previa = calculateScore(metricas, origem);
    set.setResultado(previa);

    /*
      O nome digitado vai para o PERFIL, e antes de gravar o resultado.

      `submit_resultado` (20260807000023) ignora `p_player_name` quando há
      `auth.uid()` e usa o apelido do perfil. Com o login anônimo isso
      passou a valer para todo mundo — o campo de nome viraria decoração e
      toda a batalha seria disputada entre "Arrotador a1b2c3" e "Arrotador
      f9e0d1". Escrever no perfil é o caminho que o servidor de fato lê.

      Falha aqui não derruba a gravação: perde-se o nome, não o arroto.
    */
    const nomeEscolhido = nomeExibicao.trim();
    if (nomeEscolhido && userId) {
      try {
        await updateProfile(userId, { apelido: nomeEscolhido });
        aoGravarApelido?.(nomeEscolhido);
      } catch (erroNome) {
        console.error('Falha ao salvar o apelido', erroNome);
      }
    }

    const salva = await submitResult({
      duration: previa.partialScores.duration,
      power: previa.partialScores.power,
      depth: previa.partialScores.depth,
      texture: previa.partialScores.texture,
      originType: origem,
      originSubtype: subtipo ?? null,
      // Para quem está logado o servidor ignora este campo e o ranking usa
      // o apelido do perfil. Antes daqui saía 'Anônimo' fixo para todo
      // mundo — e o ranking global exibia o mesmo nome em todas as linhas.
      playerName: temSessao ? null : nomeExibicao.trim() || null,
    });

    set.setLinhaSalva(salva);
    // Exibir o veredito oficial, não a prévia.
    set.setResultado({
      ...previa,
      score: Number(salva.score),
      classification: salva.classification,
      isArtificial: salva.is_artificial,
    });

    /*
      O blob é lido AQUI, uma única vez, e não no começo da função: entre a
      chamada e este ponto houve dois awaits (perfil e resultado), e o ref é
      justamente o que garante o valor do instante certo.

      `subirAudioDoResultado` nunca lança — ver o docblock dela. Um `await`
      novo fora daquele try interno traria a falha de Storage para o catch
      abaixo, que faz `setResultado(null)`.
    */
    const linhaFinal = await subirAudioDoResultado(salva, blobRef.current, set);

    /*
      Só entrega ao consumidor o que ele consegue usar.

      `linhaFinal.audio_path` e não `estadoAudio`: o estado é do React e
      esta closure enxergaria o valor do render anterior. A linha devolvida
      por `enviarAudioDoResultado` é a fonte — com o upload falhado ela é a
      `salva` original, com `audio_path` nulo.
    */
    if (!exigeAudio || linhaFinal.audio_path) {
      onRecordingComplete?.(linhaFinal);
    }
  } catch (err) {
    console.error('Falha ao registrar o resultado', err);
    set.setResultado(null);
    set.setErro('Não foi possível registrar seu Auê. Tenta de novo.');
  } finally {
    set.setEnviando(false);
  }
}
