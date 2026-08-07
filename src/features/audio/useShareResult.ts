import { useCallback } from 'react';
import html2canvas from 'html2canvas';

export function useShareResult() {
  const shareResult = useCallback(async (elementId: string, challengeLink: string | null) => {
    try {
      const element = document.getElementById(elementId);
      if (!element) throw new Error('Element not found');

      // Generate canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff'
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
