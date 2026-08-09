import { useCallback, useMemo } from 'react';

import { criarCompartilhamentoWeb } from '../../plataforma/web/compartilhamento';
import type { ResultadoDoCompartilhamento } from '../../portas/compartilhamento';

/*
  O CÓDIGO SAIU DAQUI, O HOOK FICOU.

  A implementação — `navigator.share`, `html2canvas`, o `getElementById` —
  mudou para `plataforma/web/compartilhamento.ts`, que é o lado da fronteira
  onde API de navegador pode morar (ADR 0001 §2). O comportamento é o mesmo,
  linha por linha.

  Este arquivo continua existindo, com o mesmo nome e a mesma assinatura, para
  que `AudioRecorder` e `DisputaLocalScreen` não precisassem mudar numa fatia
  cujo assunto é fundação, não compartilhamento. Quando a Arena cobrir o
  resultado, o consumo passa a ser direto pela porta e este hook sai junto com
  as telas velhas (#109).
*/

/** Reexportado: `mensagemDeFalhaAoCompartilhar` e as telas importam daqui. */
export type { ResultadoDoCompartilhamento } from '../../portas/compartilhamento';

interface OpcoesDeCompartilhamento {
  /** Id do nó a virar imagem. `score-card` (nota) ou `podio-card` (pódio). */
  elementId: string;
  /** O link que viaja. Sem ele, vai a home. */
  url?: string | null;
  titulo?: string;
  texto?: string;
}

/**
 * Compartilhar um cartão do app como imagem, pela folha nativa do sistema.
 *
 * É o caminho PRINCIPAL de compartilhamento, e o único que anexa a imagem de
 * verdade — os botões por rede (`CompartilharEmRede`) mandam link e texto, e a
 * imagem que o destinatário vê ali é o cartão Open Graph do site, não este PNG.
 *
 * A função RELATA o que aconteceu, e quem chama decide o que mostrar. Os cinco
 * retornos possíveis estão em `portas/compartilhamento.ts`.
 */
export function useShareResult() {
  const adaptador = useMemo(() => criarCompartilhamentoWeb(), []);

  const shareResult = useCallback(
    (opcoes: OpcoesDeCompartilhamento): Promise<ResultadoDoCompartilhamento> =>
      adaptador.compartilhar(opcoes),
    [adaptador],
  );

  return { shareResult };
}
