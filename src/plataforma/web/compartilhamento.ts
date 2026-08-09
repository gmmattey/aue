import { ORIGEM_CANONICA } from '../../shared/enderecoPublico';
import type {
  Compartilhamento,
  PedidoDeCompartilhamento,
  ResultadoDoCompartilhamento,
} from '../../portas/compartilhamento';

/**
 * Compartilhar pela folha nativa do sistema.
 *
 * ISTO É O `useShareResult` DE SEMPRE, MUDADO DE LUGAR. Nem uma vírgula de
 * comportamento diferente — os testes que já existiam continuam valendo sem
 * terem sido tocados. O que muda é o endereço: `navigator.share` e
 * `document.getElementById` passam a morar do lado permitido da fronteira
 * (ADR §2), e o hook em `features/audio/useShareResult.ts` virou uma casca
 * fina por cima daqui.
 *
 * O ENDEREÇO QUE VIAJA quando não há link de batalha vem de `shared/`, e não é
 * escrito de novo: `window.location.origin` mandaria para fora o endereço em
 * que a pessoa ESTAVA — `localhost` no desenvolvimento, a URL de preview num
 * deploy de branch. Link morto do lado de quem recebe, e o defeito só aparece
 * lá, no telefone de outra pessoa.
 */
export function criarCompartilhamentoWeb(): Compartilhamento {
  return {
    async compartilhar({
      elementId,
      url,
      titulo = 'Meu Auê',
      texto,
    }: PedidoDeCompartilhamento): Promise<ResultadoDoCompartilhamento> {
      const link = url || ORIGEM_CANONICA;
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
  };
}
