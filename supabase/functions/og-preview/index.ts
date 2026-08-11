import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const ORIGEM_CANONICA = 'https://aue.web.app';

const CHALLENGE_ID_PATTERN = /^[A-Z0-9]{1,8}$/;

const escapeHtml = (unsafe: string) => {
  return unsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
};

serve(async (req) => {
  let challengeId: string;

  try {
    const url = new URL(req.url);
    const rawChallengeId = url.searchParams.get('id');

    if (!rawChallengeId) {
      return new Response('Challenge ID is required', { status: 400 });
    }

    if (!CHALLENGE_ID_PATTERN.test(rawChallengeId)) {
      return new Response('Invalid challenge ID', { status: 400 });
    }

    challengeId = rawChallengeId;
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  let title = 'Desafio Auê!';
  let description = 'Alguém te desafiou para um duelo de arrotos no Auê!';

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('og-preview: SUPABASE_URL / SUPABASE_ANON_KEY are not configured');
      throw new Error('missing supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: challenge, error } = await supabase
      .from('desafios')
      .select('*, resultado_desafiante:resultados!desafios_resultado_desafiante_id_fkey(*)')
      .eq('id', challengeId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('og-preview: error loading challenge:', error);
      }
    } else if (challenge?.resultado_desafiante) {
      const result = challenge.resultado_desafiante;

      if (result.esta_escondido === true) {
        console.log('og-preview: challenge references a hidden result; using generic card');
      } else {
        const score = Number(result.nota).toFixed(1);
        const playerName = escapeHtml(result.nome_do_jogador || 'Alguém');
        const classification = escapeHtml(result.classificacao || '');
        title = `${playerName} fez ${score} no Auê!`;
        description = `Classificação: ${classification}. Você consegue bater esse recorde?`;
      }
    }
  } catch (err) {
    console.error('og-preview: falling back to the generic card:', err);
  }

  const challengeIdHtml = escapeHtml(challengeId);
  const challengeIdJs = JSON.stringify(`/d/${challengeId}`);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>

        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="${ORIGEM_CANONICA}/d/${challengeIdHtml}" />
        <meta property="og:image" content="${ORIGEM_CANONICA}/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:description" content="${description}">
        <meta name="twitter:image" content="${ORIGEM_CANONICA}/og-image.png">
      </head>
      <body>
        <h1>${title}</h1>
        <p>${description}</p>
        <script>
          window.location.replace(${challengeIdJs});
        </script>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
