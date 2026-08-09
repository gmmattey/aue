import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import webpush from "npm:web-push"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

// VAPID keys come from the function secrets (see .env.example / README).
// `setVapidDetails` throws on empty/invalid keys, so it must not run at import
// time with placeholders — that would make the whole function 500 with an
// opaque boot error instead of a diagnosable message.
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || ''

let vapidConfigured = false
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    vapidConfigured = true
  } catch (error) {
    console.error('Invalid VAPID configuration:', error)
  }
} else {
  console.error('VAPID_SUBJECT / VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not configured')
}

// Hard cap so a malformed request can never fan out to the whole table.
const MAX_SUBSCRIPTIONS_PER_USER = 20

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const aBytes = encoder.encode(a)
  const bBytes = encoder.encode(b)
  // Length is not secret enough to leak meaningfully, but keep the byte loop
  // constant-time for equal-length inputs.
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i]
  }
  return diff === 0
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405)
    }

    // This function runs with the service role key, so it must never be
    // callable by anonymous clients. Callers (Database Webhooks / trusted
    // backends) must present the shared secret.
    //
    // AUTHENTICATION COMES FIRST, ON PURPOSE. The VAPID check used to run
    // before this block, which let an unauthenticated caller tell "push is not
    // configured yet" (503) apart from "push is configured" (401) just by
    // hitting the endpoint. Nothing here answers anything to a caller that
    // cannot prove it is trusted.
    const expectedSecret = Deno.env.get('PUSH_WEBHOOK_SECRET') || ''
    if (!expectedSecret) {
      console.error('PUSH_WEBHOOK_SECRET is not configured')
      return jsonResponse({ error: 'Server misconfigured' }, 500)
    }

    const providedSecret = req.headers.get('x-webhook-secret') || ''
    if (!timingSafeEqual(providedSecret, expectedSecret)) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    if (!vapidConfigured) {
      return jsonResponse({ error: 'Push is not configured (missing VAPID keys)' }, 503)
    }

    const payload = await req.json()
    // Payload comes from the Database Webhook / trigger created in
    // supabase/migrations/20260807000012_push_notification_webhook.sql and
    // follows the Supabase webhook shape: { type, table, schema, record, old_record }.
    const record = payload.record ?? null

    // Setup Supabase Client to fetch push subscriptions and resolve the target
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!supabaseUrl || !supabaseServiceKey) {
      // `createClient` throws on an empty URL, which would surface as an opaque
      // 500 from the catch-all below. Fail with a diagnosable message instead.
      console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured')
      return jsonResponse({ error: 'Server misconfigured' }, 500)
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Resolve the owner (usuario_id) of a `resultados` row.
    const resultOwner = async (resultId: string | null | undefined): Promise<string | null> => {
      if (!resultId) return null
      const { data, error } = await supabase
        .from('resultados')
        .select('usuario_id')
        .eq('id', resultId)
        .maybeSingle()
      if (error) {
        console.error('Error resolving result owner:', error)
        return null
      }
      return data?.usuario_id ?? null
    }

    // Default context
    let title = "Auê Notificação"
    let body = "Você tem uma nova atividade."
    let url = '/'
    let targetUserId: string | null = null

    if (payload.table === 'comentarios') {
      // New comment -> notify the owner of the commented result.
      title = "Novo comentário no seu arroto!"
      body = "Alguém acabou de comentar no seu resultado."
      targetUserId = await resultOwner(record?.result_id)

      // Anonymous results have no owner, and nobody needs a push about their
      // own comment.
      if (!targetUserId) {
        return jsonResponse({ skipped: true, reason: 'result has no owner' })
      }
      if (targetUserId === record?.user_id) {
        return jsonResponse({ skipped: true, reason: 'self comment' })
      }
    } else if (payload.table === 'desafios') {
      // Challenge answered -> notify the challenger.
      // Guard the transition here too, so a misconfigured webhook without a
      // WHEN clause cannot spam on every update.
      const wasOpen = payload.old_record?.resultado_desafiado_id == null
      const isAnswered = record?.resultado_desafiado_id != null
      if (!wasOpen || !isAnswered) {
        return jsonResponse({ skipped: true, reason: 'not a challenge completion' })
      }

      title = "Seu desafio foi respondido!"
      body = "Alguém acabou de encarar o seu Auê. Veja quem venceu."
      url = record?.id ? `/d/${record.id}` : '/'
      targetUserId = await resultOwner(record?.resultado_desafiante_id)

      if (!targetUserId) {
        return jsonResponse({ skipped: true, reason: 'challenger is anonymous' })
      }
    } else {
      // Unknown source: only trusted callers that already hold the shared
      // secret may name the target explicitly.
      targetUserId = payload.targetUserId ?? null
      if (!targetUserId) {
        return jsonResponse({ error: 'Unsupported payload: cannot resolve target user' }, 400)
      }
    }

    // Get subscriptions for target user
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', targetUserId)
      .limit(MAX_SUBSCRIPTIONS_PER_USER)

    if (subscriptionsError) {
      console.error('Error loading push subscriptions:', subscriptionsError)
      return jsonResponse({ error: 'Failed to load subscriptions' }, 500)
    }

    let sent = 0
    if (subscriptions) {
      for (const sub of subscriptions) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth,
            p256dh: sub.p256dh
          }
        }

        try {
          await webpush.sendNotification(pushSubscription, JSON.stringify({
            title,
            body,
            url
          }))
          sent++
        } catch (error) {
          console.error('Error sending push:', error)
          // KNOWN GAP (not fixed here): web-push throws a WebPushError with
          // statusCode 404/410 when the endpoint is permanently gone. Those
          // subscriptions should be deleted from `push_subscriptions`, otherwise
          // they pile up and every future notification retries them forever.
          // Deleting rows is a behaviour change, not an error-path fix, so it is
          // left out of this pass on purpose.
        }
      }
    }

    return jsonResponse({ success: true, sent })
  } catch (err) {
    // The caller already holds the shared secret, so echoing the message is not
    // an information leak — but a thrown non-Error would make `err.message`
    // undefined and JSON.stringify would drop the key, producing an empty 500
    // body with no diagnosis anywhere.
    const message = err instanceof Error ? err.message : String(err)
    console.error('send-push failed:', err)
    return jsonResponse({ error: message }, 500)
  }
})
