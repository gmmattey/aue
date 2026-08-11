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
/**
 * Um PNG de 1×1 transparente, escrito byte a byte.
 *
 * Serve para uma coisa só: perguntar ao `navigator.canShare` se ele aceita
 * arquivo. A resposta depende do TIPO, não do conteúdo — então não vale gastar
 * um html2canvas para descobrir se dá para compartilhar imagem.
 *
 * Bytes, e não base64 via `atob`: `atob` é mais uma API que pode não existir,
 * e ninguém quer descobrir isso dentro de um try que devolve `false` calado.
 */
const PNG_MINIMO = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

export function criarCompartilhamentoWeb(): Compartilhamento {
  /*
    A resposta não muda no meio da sessão, e a pergunta é feita a cada render
    do resultado. Uma vez basta.
  */
  let respostaSobreArquivo: boolean | null = null;

  return {
    sabeMandarImagem(): boolean {
      if (respostaSobreArquivo !== null) return respostaSobreArquivo;

      try {
        /*
          `canShare` sem `share` não serve de nada, e os dois faltam em
          navegador de desktop inteiro. `File` também pode não existir em
          ambiente de teste — daí o try em volta de tudo.
        */
        if (!navigator.share || !navigator.canShare) {
          respostaSobreArquivo = false;
          return false;
        }

        const amostra = new File([PNG_MINIMO], 'aue.png', { type: 'image/png' });
        respostaSobreArquivo = navigator.canShare({ files: [amostra] });
      } catch {
        respostaSobreArquivo = false;
      }

      return respostaSobreArquivo;
    },

    async copiar(texto: string): Promise<boolean> {
      /*
        `navigator.clipboard` só existe em contexto seguro (HTTPS ou
        localhost), e mesmo existindo o navegador pode recusar quando a
        chamada não vem de um gesto. Os dois casos caem aqui e viram `false` —
        quem chama mostra a verdade em vez de um "copiado!" mentiroso.
      */
      try {
        if (!navigator.clipboard?.writeText) return false;
        await navigator.clipboard.writeText(texto);
        return true;
      } catch {
        return false;
      }
    },

    async compartilhar({
      elementId,
      exigirImagem = false,
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
        /*
          SEM CARTÃO É CAMINHO, NÃO ERRO.

          Quem não pede imagem (`elementId` ausente) vai direto para texto e
          link. E quem pede uma que não está na tela também: degradar é melhor
          que não compartilhar, e o `via` no retorno já conta a verdade para
          quem chamou.

          Isto era o contrário: elemento ausente virava exceção, a exceção caía
          no `catch` como `falhou`, e a folha do sistema nunca abria. O X1 da
          Arena passava um id falso de propósito e não mandava nada.
        */
        const element = elementId ? document.getElementById(elementId) : null;

        if (elementId && !element) {
          /*
            QUEM EXIGIU IMAGEM NÃO CAI PARA TEXTO. Sem esta guarda, a folha do
            sistema abriria com o texto e a pessoa mandaria achando que a nota
            foi junto — "fingir que funciona", que é justamente o que o
            AGENTS.md §7 proíbe.
          */
          if (exigirImagem) {
            return {
              ok: false,
              motivo: 'falhou',
              detalhe: `O cartão "${elementId}" não está na tela.`,
            };
          }
          console.warn(`Compartilhar: "${elementId}" não está na tela. Vai só texto e link.`);
        }

        if (!element) {
          await navigator.share({ title: titulo, text: mensagem, url: link });
          return { ok: true, via: 'texto' };
        }

        // Import dinâmico: o html2canvas é a maior dependência do bundle e só é
        // necessário quando alguém compartilha. Estático, ele entrava no chunk
        // inicial e era baixado por todo mundo que abrisse o app.
        const { default: html2canvas } = await import('html2canvas');

        /*
          ESPERAR A FONTE ANTES DE FOTOGRAFAR.

          O html2canvas rasteriza com o que o navegador tiver carregado naquele
          instante. Se a Anton ainda não chegou, a nota — que é a coisa que
          precisa ser lida na miniatura do zap — sai na fonte de reserva, e
          nada avisa: a imagem fica pronta, bonita e errada.

          `document.fonts` não existe em todo navegador, e a promessa pode
          nunca resolver num aparelho estranho. Nos dois casos seguimos: fonte
          de reserva é degradação, travar o compartilhamento seria defeito.
        */
        await Promise.race([
          document.fonts?.ready ?? Promise.resolve(),
          new Promise((resolve) => setTimeout(resolve, 1200)),
        ]);

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

        /* Mesma regra de cima: exigiu imagem, não sai texto no lugar dela. */
        if (exigirImagem) {
          return {
            ok: false,
            motivo: 'falhou',
            detalhe: 'Este aparelho não aceita mandar arquivo.',
          };
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
