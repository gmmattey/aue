import { useCallback, useState } from 'react';
import type { Origin, ScoreResult } from '../rules';
import type { ResultadoRow } from '../../../db/supabase';
import type { EstadoDoAudio } from '../resultado/tipos';
import { executarEnvio } from './executarEnvio';
import { executarExclusaoDoAudio } from './executarExclusaoDoAudio';
import type { EnvioDoResultado, ParametrosDoEnvio } from './tiposDoEnvio';

/**
 * O ÚNICO dono dos nove estados do envio.
 *
 * Não contém corpo de operação nenhum: declara estado, monta o pacote de
 * setters e delega. Os corpos vivem em `executarEnvio`, `subirAudioDoResultado`
 * e `executarExclusaoDoAudio` — assim a ordem do envio se lê num arquivo só, e
 * o bloco de áudio não enxerga `setResultado`.
 *
 * Para fora, o retorno é só leitura: nenhum setter sai daqui. `estadoAudio`
 * escrevível de qualquer lugar é exatamente como os dois bugs de produção
 * nasceram.
 */
export function useEnvioDoResultado(params: ParametrosDoEnvio): EnvioDoResultado {
  /*
    Desestruturado no topo porque o objeto de parâmetros é um literal novo a
    cada render: usar `params` nas deps faria `enviar` trocar de identidade
    sempre. Os CAMPOS é que entram nos arrays abaixo, e são os mesmos que o
    useCallback do AudioRecorder já tinha.
  */
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

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ScoreResult | null>(null);
  const [linhaSalva, setLinhaSalva] = useState<ResultadoRow | null>(null);

  const [estadoAudio, setEstadoAudio] = useState<EstadoDoAudio>('inativo');
  /** Motivo específico da falha de áudio. Nunca substitui o estado acima. */
  const [motivoFalhaAudio, setMotivoFalhaAudio] = useState<string | null>(null);
  const [postadoNoFeed, setPostadoNoFeed] = useState(false);
  const [apagandoAudio, setApagandoAudio] = useState(false);
  /**
   * Erro do "Apagar meu áudio", separado de `motivoFalhaAudio`.
   *
   * Reaproveitar aquele campo escondia esta mensagem: no estado 'enviado' com o
   * post publicado, o ramo exibido é o de sucesso, e a falha ao apagar não
   * apareceria em lugar nenhum — a pessoa pediria para apagar e a tela não
   * diria nada.
   */
  const [erroAoApagar, setErroAoApagar] = useState<string | null>(null);

  const enviar = useCallback(
    async (origem: Origin, subtipo?: string) => {
      if (!metricas) return;

      /*
        O pacote de setters é montado AQUI DENTRO, e não em useMemo nem em
        variável de módulo: setter de useState é estável, objeto literal não é.
        Fora do corpo do callback ele entraria nas deps e `enviar` trocaria de
        identidade a cada render.
      */
      await executarEnvio(
        origem,
        subtipo,
        {
          metricas,
          userId,
          temSessao,
          nomeExibicao,
          blobRef,
          exigeAudio,
          onRecordingComplete,
          aoGravarApelido,
        },
        {
          setEnviando,
          setErro,
          setResultado,
          setLinhaSalva,
          setEstadoAudio,
          setMotivoFalhaAudio,
          setPostadoNoFeed,
        },
      );
    },
    /*
      Mesmíssima lista que o `enviarComOrigem` tinha. `blobRef` e
      `aoGravarApelido` são estáveis e não mudam nada. Estabilizar isto com ref
      ou com deps vazias faria o envio submeter as métricas da gravação anterior
      ou o nome digitado antes — silenciosamente, sem erro na tela.
    */
    [exigeAudio, metricas, nomeExibicao, onRecordingComplete, temSessao, userId, blobRef, aoGravarApelido],
  );

  const apagarAudio = useCallback(async () => {
    if (!linhaSalva) return;

    await executarExclusaoDoAudio(linhaSalva, {
      setLinhaSalva,
      setEstadoAudio,
      setPostadoNoFeed,
      setApagandoAudio,
      setErroAoApagar,
    });
  }, [linhaSalva]);

  /**
   * A fatia do hook do que `iniciarGravacao` e `tentarDeNovo` já limpavam —
   * nada do que o componente ainda possui (métricas, link, folha de origem).
   * Só chama setter, por isso as deps são vazias e a identidade é estável.
   */
  const reiniciar = useCallback(() => {
    setErro(null);
    setResultado(null);
    setLinhaSalva(null);
    setEstadoAudio('inativo');
    setMotivoFalhaAudio(null);
    setPostadoNoFeed(false);
    setErroAoApagar(null);
  }, []);

  return {
    enviando,
    erro,
    resultado,
    linhaSalva,
    estadoAudio,
    motivoFalhaAudio,
    postadoNoFeed,
    apagandoAudio,
    erroAoApagar,
    enviar,
    apagarAudio,
    reiniciar,
  };
}
