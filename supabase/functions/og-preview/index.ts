import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

// Challenge IDs are generated client-side as short uppercase alphanumeric codes
// (see src/db/supabase.ts -> createChallenge). Anything outside this shape is
// rejected before it can reach an HTML/JS context.
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
    // `new URL` throws on a malformed request line. Nothing to preview.
    return new Response('Bad request', { status: 400 });
  }

  let title = 'Desafio Auê!';
  let description = 'Alguém te desafiou para um duelo de arrotos no Auê!';

  // Everything from here on is ENRICHMENT of the preview card. This endpoint is
  // consumed by link crawlers (WhatsApp, Telegram, Twitter): failing with a 500
  // means the shared link renders with no card at all. So any failure — missing
  // env vars, database down, unexpected payload shape — degrades to the generic
  // card above instead of propagating.
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      // `createClient` throws on an empty URL. On Supabase-hosted functions both
      // vars are injected automatically; this only trips on a local/misconfigured
      // deploy, and the log line is the diagnosis.
      console.error('og-preview: SUPABASE_URL / SUPABASE_ANON_KEY are not configured');
      throw new Error('missing supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: challenge, error } = await supabase
      .from('desafios')
      .select('*, challenger_result:resultados!desafios_challenger_result_id_fkey(*)')
      .eq('id', challengeId)
      .single();

    if (error) {
      // PGRST116 (no rows) is the normal "challenge does not exist" path, not an
      // incident. Log the rest.
      if (error.code !== 'PGRST116') {
        console.error('og-preview: error loading challenge:', error);
      }
    } else if (challenge?.challenger_result) {
      const result = challenge.challenger_result;

      // Um resultado escondido por denúncias (migração 20260807000014) não pode
      // voltar a circular pelo card de compartilhamento — seria contornar a
      // moderação pela porta dos fundos. Cai no texto genérico.
      if (result.is_hidden === true) {
        console.log('og-preview: challenge references a hidden result; using generic card');
      } else {
        const score = Number(result.score).toFixed(1);
        const playerName = escapeHtml(result.player_name || 'Alguém');
        const classification = escapeHtml(result.classification || '');
        title = `${playerName} fez ${score} no Auê!`;
        description = `Classificação: ${classification}. Você consegue bater esse recorde?`;
      }
    }
  } catch (err) {
    console.error('og-preview: falling back to the generic card:', err);
  }

  // HTML context: escaped. JS context: serialized as a JSON literal (escaping
  // HTML entities is not a valid defense inside <script>).
  const challengeIdHtml = escapeHtml(challengeId);
  const challengeIdJs = JSON.stringify(`/d/${challengeId}`);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        
        <!-- Open Graph Meta Tags -->
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aue.vercel.app/d/${challengeIdHtml}" />
        <meta property="og:image" content="https://aue.vercel.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <!-- Twitter Card Meta Tags -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:description" content="${description}">
        <meta name="twitter:image" content="https://aue.vercel.app/og-image.png">
      </head>
      <body>
        <h1>${title}</h1>
        <p>${description}</p>
        <script>
          // Redirect the user to the actual app URL
          window.location.replace(${challengeIdJs});
        </script>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
