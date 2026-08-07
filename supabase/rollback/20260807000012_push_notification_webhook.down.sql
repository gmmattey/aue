-- =============================================================================
-- ROLLBACK MANUAL de 20260807000012_push_notification_webhook.sql
--
-- NÃO É MIGRAÇÃO. Ver supabase/rollback/README.md.
-- Rodar como owner (postgres). Terceiro da ordem inversa.
--
-- Efeito: as notificações push param de ser disparadas pelo banco. Nada mais
-- quebra — a função `notify_push_event` já era best-effort e nenhum fluxo de
-- negócio depende dela.
--
-- NÃO desfaz nada fora do Postgres:
--   * a Edge Function `send-push` continua publicada e acessível (protegida
--     pelo header `x-webhook-secret`);
--   * os segredos `push_webhook_url` / `push_webhook_secret` continuam no
--     Vault. Removê-los é ação manual e destrutiva:
--       select vault.delete_secret('push_webhook_url');
--       select vault.delete_secret('push_webhook_secret');
--     Deixado comentado de propósito — segredo apagado não volta.
--   * Database Webhooks configurados pelo painel continuam ativos e chamam a
--     função pelo mesmo formato de payload.
--
-- Notificações que já foram enviadas obviamente não são desfeitas.
-- =============================================================================

BEGIN;

-- Ordem inversa da migração: triggers primeiro, função depois (a função não
-- pode ser removida enquanto algum trigger a referenciar).
DROP TRIGGER IF EXISTS on_comentario_notify_push ON public.comentarios;
DROP TRIGGER IF EXISTS on_desafio_notify_push ON public.desafios;

DROP FUNCTION IF EXISTS public.notify_push_event();

COMMIT;
