import { calculateScore, type Origin } from '../rules';
import type { AudioMetrics } from '../engine';
import { enviarResultado, updateProfile } from '../../../db/supabase';
import { subirAudioDoResultado } from './subirAudioDoResultado';
import type { ParametrosDoEnvio, SetadoresDoEnvio } from './tiposDoEnvio';

/**
 * A sequência do envio, na ordem em que ela precisa acontecer:
 * prévia -> apelido no perfil -> enviarResultado -> veredito oficial na tela ->
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

      `enviar_resultado` (20260807000023) ignora `p_nome_do_jogador` quando há
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

    /*
      `previa.partialScores` continua em inglês de propósito: são as parciais do
      Judgement Engine local (`features/audio/rules.ts`), que espelham
      `aue_nota_v2` — a fórmula vigente, cujos parâmetros SQL herdaram os nomes
      congelados em inglês da v1. O que virou PT foi o CONTRATO com o banco.
    */
    const salva = await enviarResultado({
      duracao: previa.partialScores.duration,
      potencia: previa.partialScores.power,
      profundidade: previa.partialScores.depth,
      textura: previa.partialScores.texture,
      tipoDeOrigem: origem,
      subtipoDeOrigem: subtipo ?? null,
      // Para quem está logado o servidor ignora este campo e o ranking usa
      // o apelido do perfil. Antes daqui saía 'Anônimo' fixo para todo
      // mundo — e o ranking global exibia o mesmo nome em todas as linhas.
      nomeDoJogador: temSessao ? null : nomeExibicao.trim() || null,
    });

    set.setLinhaSalva(salva);
    // Exibir o veredito oficial, não a prévia.
    // À esquerda, o tipo do motor local (`rules.ts`); à direita, a linha do
    // banco. São vocabulários diferentes e continuam assim.
    set.setResultado({
      ...previa,
      score: Number(salva.nota),
      classification: salva.classificacao,
      isArtificial: salva.e_artificial,
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

      `linhaFinal.caminho_do_audio` e não `estadoAudio`: o estado é do React e
      esta closure enxergaria o valor do render anterior. A linha devolvida
      por `enviarAudioDoResultado` é a fonte — com o upload falhado ela é a
      `salva` original, com `caminho_do_audio` nulo.
    */
    if (!exigeAudio || linhaFinal.caminho_do_audio) {
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
