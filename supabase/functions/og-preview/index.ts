import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * A PRÉVIA DO LINK — o que o robô do WhatsApp lê antes de desenhar o cartão.
 *
 * Decidida no ADR 0003. O caminho é `aue.web.app/x/<código>`, que o Firebase
 * Hosting redireciona para cá; esta função devolve uma página com a nota
 * daquela batalha e empurra a pessoa para o jogo.
 *
 * POR QUE NINGUÉM FAREJA USER-AGENT AQUI. `/x/` só nasce em compartilhamento.
 * Robô e gente recebem a mesma página — o robô lê e vai embora, a gente é
 * mandada para `/b/<código>` na hora. Detecção por user-agent erra em silêncio
 * com todo bot novo que aparece, e o defeito só apareceria no telefone de
 * outra pessoa.
 *
 * ELA LÊ, NÃO CALCULA (ADR 0003 §2). A nota é a que está gravada. Recalcular
 * aqui criaria um segundo lugar decidindo quanto vale um arroto.
 *
 * ESTA FUNÇÃO NÃO ESCREVE NADA. Nem contador, nem visita, nem log de quem
 * abriu.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

/**
 * O endereço público do jogo.
 *
 * CÓPIA MANUAL de `src/shared/enderecoPublico.ts`. Esta função é Deno e vive
 * fora do TypeScript do app, então o `src/seo-publico.test.ts` — que trava as
 * outras cinco cópias — não alcança esta. Quando o endereço mudar, mude aqui
 * também. Já esqueceram uma vez.
 */
const ORIGEM = Deno.env.get('ORIGEM_PUBLICA') || 'https://aue.web.app';

/**
 * O código de acesso da batalha, como o banco gera: maiúsculas e dígitos.
 *
 * Validado ANTES de chegar perto de HTML ou de JavaScript. Qualquer coisa fora
 * deste formato é recusada em vez de escapada — é mais fácil de conferir do
 * que confiar no escape.
 */
const CODIGO = /^[A-Z0-9]{1,16}$/;

const escaparHtml = (bruto: string) =>
  bruto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/** A nota escrita como o jogo escreve: vírgula, nunca ponto. */
const escreverNota = (nota: number) => nota.toFixed(1).replace('.', ',');

interface Rodada {
  nota: number | null;
  esta_escondido: boolean | null;
}

/** O cartão de sempre, quando não há batalha para mostrar. */
const GENERICO = {
  titulo: 'Auê! — jogo de arroto online',
  descricao: 'Arrota. Recebe a nota. Humilha teus amigos.',
};

/**
 * O texto do cartão a partir das rodadas.
 *
 * SEM NOME DE JOGADOR, de propósito: o cartão é desenhado para o grupo
 * inteiro do zap, e botar o apelido de alguém ali merece uma decisão própria.
 * A `obter_batalha` devolve `apelido`, então quando essa decisão vier, o dado
 * já está na mão.
 *
 * Rodada escondida por denúncia não entra — nem como número. Deixar a nota
 * aparecer seria contornar a moderação pela porta dos fundos.
 */
function cartaoDaBatalha(rodadas: readonly Rodada[]) {
  const notas = rodadas
    .filter((r) => r.esta_escondido !== true && typeof r.nota === 'number')
    .map((r) => r.nota as number)
    .sort((a, b) => b - a);

  if (notas.length === 0) return GENERICO;

  if (notas.length === 1) {
    return {
      titulo: `${escreverNota(notas[0])} no Auê!`,
      descricao: 'Tá maluco. Duvido bater.',
    };
  }

  return {
    titulo: `${escreverNota(notas[0])} × ${escreverNota(notas[1])} no Auê!`,
    descricao: 'Já tem sangue no chão. Vai deixar assim?',
  };
}

serve(async (req) => {
  const url = new URL(req.url);
  /* `codigo` é o nome de hoje; `id` fica aceito porque links velhos usavam. */
  const bruto = url.searchParams.get('codigo') ?? url.searchParams.get('id') ?? '';

  /*
    SEM CÓDIGO VÁLIDO, MANDA PARA A HOME em vez de devolver erro. Uma página de
    erro no lugar do cartão é pior que o cartão genérico: o link chega quebrado
    no grupo e ninguém abre.
  */
  if (!CODIGO.test(bruto)) {
    return paginaDaPrevia(GENERICO, `${ORIGEM}/`);
  }

  const destino = `${ORIGEM}/b/${bruto}`;
  let cartao = GENERICO;

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY não configuradas');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    /*
      PELA RPC, E NÃO POR `select` DIRETO.

      `batalhas` e `resultados` não têm policy de SELECT desde a migração
      20260807000034, e este cliente usa a chave anônima. A versão anterior
      desta função fazia `select` direto e a leitura falhava SEMPRE — o cartão
      caía no genérico em silêncio, pelo `catch`. Publicar aquilo teria
      entregado o cartão de hoje com uma peça a mais para quebrar.

      `obter_batalha` é `SECURITY DEFINER`, tem `GRANT` para `anon`, já aplica
      o prazo de 7 dias (devolve NULL quando expirou) e já anula o áudio do que
      está escondido.
    */
    const { data, error } = await supabase.rpc('obter_batalha', {
      p_codigo_de_acesso: bruto,
    });

    if (error) {
      console.error('og-preview: obter_batalha falhou:', error);
    } else if (data && Array.isArray(data.rodadas)) {
      cartao = cartaoDaBatalha(data.rodadas as Rodada[]);
    }
  } catch (err) {
    /* Cartão genérico e segue o jogo. O link tem que abrir de qualquer jeito. */
    console.error('og-preview: caindo no cartão genérico:', err);
  }

  return paginaDaPrevia(cartao, destino);
});

/**
 * A página que o robô lê e que a pessoa atravessa.
 *
 * O DESTINO É URL ABSOLUTA. Era relativo (`/d/<id>`), e servido fora do
 * domínio do app isso mandava o jogador para um caminho que não existe no
 * domínio do Supabase. Está descrito em `docs/technical/deploy-vercel-e-og-dinamico.md` §2
 * e é o defeito que este arquivo carregava desde o primeiro commit.
 *
 * O `<meta http-equiv="refresh">` acompanha o script: quem tem JavaScript
 * desligado também chega no jogo.
 */
function paginaDaPrevia(
  cartao: { titulo: string; descricao: string },
  destino: string,
): Response {
  const titulo = escaparHtml(cartao.titulo);
  const descricao = escaparHtml(cartao.descricao);
  const destinoHtml = escaparHtml(destino);
  const destinoJs = JSON.stringify(destino);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${titulo}</title>

    <meta property="og:title" content="${titulo}" />
    <meta property="og:description" content="${descricao}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${destinoHtml}" />
    <meta property="og:image" content="${ORIGEM}/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${titulo}" />
    <meta name="twitter:description" content="${descricao}" />
    <meta name="twitter:image" content="${ORIGEM}/og-image.png" />

    <meta http-equiv="refresh" content="0; url=${destinoHtml}" />
    <link rel="canonical" href="${destinoHtml}" />
  </head>
  <body>
    <h1>${titulo}</h1>
    <p>${descricao}</p>
    <p><a href="${destinoHtml}">Abrir o Auê</a></p>
    <script>
      window.location.replace(${destinoJs});
    </script>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      /*
        Prévia é por batalha e muda quando o outro responde. Cache curto: o
        robô do zap guarda o cartão por um tempo de qualquer jeito, e cache
        longo aqui deixaria o placar velho circulando depois da revanche.
      */
      'Cache-Control': 'public, max-age=60',
    },
  });
}
