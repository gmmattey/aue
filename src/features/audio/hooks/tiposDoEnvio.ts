import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { AudioMetrics } from '../engine';
import type { Origin, ScoreResult } from '../rules';
import type { ResultadoRow } from '../../../db/supabase';
import type { EstadoDoAudio } from '../resultado/tipos';

/**
 * Contratos do envio do resultado. Arquivo sem NADA em runtime — mesmo padrão
 * de `resultado/tipos.ts`: nenhum valor, nenhum import que sobreviva ao build.
 *
 * A separação dos três pacotes de setters abaixo não é organização: é o
 * invariante "o bloco de áudio nunca apaga o score" virado tipo. Ver
 * `SetadoresDoAudio`.
 */

export interface ParametrosDoEnvio {
  /** Já calculado pelo analyzeAudio no componente. `null` = ainda não há gravação analisada. */
  metricas: AudioMetrics | null;
  userId: string | null;
  temSessao: boolean;
  nomeExibicao: string;
  /**
   * O ref do componente, passado COMO REF e nunca como valor nem como estado.
   * Três razões, nesta ordem de peso:
   * 1. O blob precisa ser lido DEPOIS dos awaits de updateProfile e submitResult,
   *    no instante em que o bloco de áudio começa. Um `blob: Blob | null` no
   *    parâmetro seria o valor do momento da chamada.
   * 2. Ref tem identidade estável entre renders, então não entra em nenhum array
   *    de deps e não faz `enviar` trocar de identidade. Um getter `() => blobRef.current`
   *    daria uma função nova por render.
   * 3. Em estado, cada gravação dispararia um render sem nada novo para desenhar
   *    (o comentário que já está no arquivo) e o valor dentro da closure seria o do
   *    render anterior — a mesma família de defeito do gate de entrega.
   * React 19: useRef<Blob | null>(null) já tipa como RefObject mutável.
   */
  blobRef: RefObject<Blob | null>;
  exigeAudio?: boolean;
  onRecordingComplete?: (dbResult: ResultadoRow) => void;
  /**
   * Só é chamado quando updateProfile deu certo. É o `setApelidoAtual` do
   * componente: `apelidoAtual` decide se o campo de nome aparece, é identidade
   * e não envio — por isso ele não vira estado do hook.
   */
  aoGravarApelido?: (apelido: string) => void;
}

export interface EnvioDoResultado {
  /* leitura — tudo somente-leitura para fora */
  enviando: boolean;
  erro: string | null;
  resultado: ScoreResult | null;
  linhaSalva: ResultadoRow | null;
  estadoAudio: EstadoDoAudio;
  motivoFalhaAudio: string | null;
  apagandoAudio: boolean;
  erroAoApagar: string | null;
  /* ações */
  enviar: (origem: Origin, subtipo?: string) => Promise<void>;
  apagarAudio: () => Promise<void>;
  /** A fatia do hook do que iniciarGravacao e tentarDeNovo já limpavam. Estável. */
  reiniciar: () => void;
}

export interface SetadoresDoAudio {
  setLinhaSalva: Dispatch<SetStateAction<ResultadoRow | null>>;
  setEstadoAudio: Dispatch<SetStateAction<EstadoDoAudio>>;
  setMotivoFalhaAudio: Dispatch<SetStateAction<string | null>>;
}

/**
 * O pacote de áudio NÃO ganha `setResultado` nem `setErro`.
 *
 * O catch do envio faz `setResultado(null)`: qualquer coisa vinda do áudio que
 * chegue lá apaga o veredito oficial que o servidor acabou de calcular e que já
 * está na tela. Sem esses dois setters no tipo, o módulo de áudio é INCAPAZ de
 * apagar o score, mesmo que alguém escreva o código errado.
 */
export interface SetadoresDoEnvio extends SetadoresDoAudio {
  setResultado: Dispatch<SetStateAction<ScoreResult | null>>;
  setErro: Dispatch<SetStateAction<string | null>>;
  setEnviando: Dispatch<SetStateAction<boolean>>;
}

export interface SetadoresDaExclusao extends Pick<SetadoresDoAudio,
  'setLinhaSalva' | 'setEstadoAudio'> {
  setApagandoAudio: Dispatch<SetStateAction<boolean>>;
  setErroAoApagar: Dispatch<SetStateAction<string | null>>;
}
