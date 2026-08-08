import { useCallback } from 'react';

export function useShareResult() {
  const shareResult = useCallback(async (elementId: string, challengeLink: string | null) => {
    try {
      const element = document.getElementById(elementId);
      if (!element) throw new Error('Element not found');

      // Import dinâmico: o html2canvas é a maior dependência do bundle e só é
      // necessário quando alguém compartilha. Estático, ele entrava no chunk
      // inicial e era baixado por todo mundo que abrisse o app.
      const { default: html2canvas } = await import('html2canvas');

      // Fundo escuro do app — antes era '#ffffff', que gerava um cartão branco
      // com o texto claro do tema praticamente ilegível.
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#0a0a08'
      });

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });

      if (!blob) throw new Error('Failed to generate image blob');

      const file = new File([blob], 'aue-score.png', { type: 'image/png' });

      // Check if navigator.canShare is available and supports files
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Meu Auê Score!',
          text: challengeLink ? 'Tenta bater meu recorde no Auê!' : 'Olha meu Auê Score!',
          url: challengeLink || window.location.origin,
          files: [file]
        });
      } else {
        // Fallback for browsers that don't support file sharing
        // Could open the image in a new tab or trigger download, but for MVP we fallback to text
        if (navigator.share) {
          await navigator.share({
            title: 'Meu Auê Score!',
            text: challengeLink ? 'Tenta bater meu recorde no Auê!' : 'Olha meu Auê Score!',
            url: challengeLink || window.location.origin,
          });
        } else {
          // If Web Share API is completely unavailable
          alert(`Compartilhe este link: ${challengeLink || window.location.origin}`);
        }
      }
    } catch (err) {
      console.error('Error sharing result:', err);
    }
  }, []);

  return { shareResult };
}
