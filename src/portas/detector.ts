import type { AudioCapturado } from './captura';

/**
 * A porta do detector de arroto.
 *
 * ELA FAZ UMA PERGUNTA SÓ: **posso pontuar isso?** A Arena não vê confiança,
 * não vê limiar e não vê nome de classe — número de confiança na tela seria
 * convite para uma discussão que o jogo não quer ter ("mas deu 0,19!").
 *
 * A implementação web é o detector que já existe e já rodou em produção:
 * YAMNet no aparelho, com limiar **medido** (43 clipes reais; maior falso
 * positivo 0,0224, menor arroto 0,7609, corte em 0,2).
 */
export interface DetectorDeArroto {
  /**
   * Começa a preparar o detector.
   *
   * **Não espera e não falha.** É chamado no toque em ARROTAR para os 16 MB do
   * modelo baixarem em paralelo com a gravação, em vez de a espera inteira
   * cair na saída dela.
   */
  preparar(): void;

  /**
   * Posso pontuar isso?
   *
   * `true` quando é arroto — **e também quando o detector não estava lá**.
   * A assimetria é deliberada e vem do fluxo antigo: é a diferença entre "o
   * juiz recusou" e "o juiz não estava lá". Um jogo que para de funcionar
   * porque um arquivo de 16 MB não chegou seria pior que um jogo sem filtro.
   */
  podePontuar(audio: AudioCapturado): Promise<boolean>;
}
