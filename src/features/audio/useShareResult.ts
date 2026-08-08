import { useCallback } from 'react';

/** O que aconteceu com o pedido de compartilhar. */
export type ResultadoDoCompartilhamento =
  /** Foi para a folha de compartilhamento do sistema, com imagem. */
  | { ok: true; via: 'imagem' }
  /** Foi para a folha do sistema, mas só com texto e link. */
  | { ok: true; via: 'texto' }
  /** O usuário fechou a folha sem escolher. Não é erro. */
  | { ok: false; motivo: 'cancelado' }
  /** O navegador não tem Web Share API. Cabe à tela oferecer outro caminho. */
  | { ok: false; motivo: 'indisponivel' }
  /** Deu errado de verdade. */
  | { ok: false; motivo: 'falhou'; detalhe: string };

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
 * MUDOU: antes esta função engolia todo erro num `console.error`. O usuário
 * tocava em "Compartilhar", nada acontecia, e a tela não dizia nada — inclusive
 * no caso comum de navegador sem Web Share API, onde havia um `alert()` com o
 * link como último recurso. Agora ela RELATA, e quem chama decide o que
 * mostrar. O `alert()` saiu: a tela tem lugar melhor para isso (o botão
 * "Copiar link", que sempre existe ao lado).
 */
export function useShareResult() {
  const shareResult = useCallback(
    async ({
      elementId,
      url,
      titulo = 'Meu Auê',
      texto,
    }: OpcoesDeCompartilhamento): Promise<ResultadoDoCompartilhamento> => {
      const link = url || window.location.origin;
      const mensagem = texto ?? (url ? 'Tenta bater essa no Auê!' : 'Olha o meu Auê!');

      if (!navigator.share) {
        return { ok: false, motivo: 'indisponivel' };
      }

      try {
        const element = document.getElementById(elementId);
        if (!element) throw new Error(`Elemento "${elementId}" não está na tela.`);

        // Import dinâmico: o html2canvas é a maior dependência do bundle e só é
        // necessário quando alguém compartilha. Estático, ele entrava no chunk
        // inicial e era baixado por todo mundo que abrisse o app.
        const { default: html2canvas } = await import('html2canvas');

        // Fundo escuro do app — antes era '#ffffff', que gerava um cartão branco
        // com o texto claro do tema praticamente ilegível.
        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#0a0a08' });

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png');
        });
        if (!blob) throw new Error('Não foi possível gerar a imagem.');

        const file = new File([blob], 'aue.png', { type: 'image/png' });

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: titulo, text: mensagem, url: link, files: [file] });
          return { ok: true, via: 'imagem' };
        }

        await navigator.share({ title: titulo, text: mensagem, url: link });
        return { ok: true, via: 'texto' };
      } catch (err) {
        /*
          Fechar a folha de compartilhamento levanta AbortError. Não é falha —
          é a pessoa mudando de ideia — e tratar como erro faria a tela acusar
          um problema que não existe.
        */
        if (err instanceof DOMException && err.name === 'AbortError') {
          return { ok: false, motivo: 'cancelado' };
        }

        console.error('Falha ao compartilhar', err);
        return {
          ok: false,
          motivo: 'falhou',
          detalhe: err instanceof Error ? err.message : String(err),
        };
      }
    },
    [],
  );

  return { shareResult };
}
