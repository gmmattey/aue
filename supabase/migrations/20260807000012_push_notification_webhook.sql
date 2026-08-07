-- =============================================================================
-- Correção ALTA (revisão Rian — A4.3)
--
-- A Edge Function `send-push` existia, mas NADA a invocava: não havia trigger
-- nem Database Webhook. A feature de push nunca disparava, mesmo com as chaves
-- VAPID corretas.
--
-- Esta migração cria o gatilho no banco. Ela NÃO configura nada no Supabase
-- remoto e NÃO contém segredo algum: a URL da função e o segredo do webhook
-- são lidos do Supabase Vault em tempo de execução.
--
-- AÇÃO MANUAL NECESSÁRIA (Luiz) — ver README:
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-push',
--                              'push_webhook_url');
--   select vault.create_secret('<mesmo valor de PUSH_WEBHOOK_SECRET>',
--                              'push_webhook_secret');
-- Enquanto esses segredos não existirem, o trigger é um no-op silencioso
-- (apenas um WARNING no log) e nada quebra.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Trigger genérico que replica o formato de payload do Database Webhook do
-- Supabase (`type`, `table`, `schema`, `record`, `old_record`), para que a
-- função `send-push` funcione tanto acionada por este trigger quanto por um
-- Database Webhook configurado pelo painel.
--
-- SECURITY DEFINER: precisa ler `vault.decrypted_secrets` e chamar `net.http_post`,
-- o que o role `authenticated` não pode fazer.
--
-- Todo o corpo está protegido por EXCEPTION WHEN OTHERS: uma falha de
-- notificação NUNCA pode abortar o INSERT do comentário ou a conclusão do
-- desafio. Se pg_net ou o Vault não estiverem disponíveis, o efeito é apenas
-- um WARNING no log.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_push_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault, net, pg_temp
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_url
      FROM vault.decrypted_secrets WHERE name = 'push_webhook_url' LIMIT 1;

    SELECT decrypted_secret INTO v_secret
      FROM vault.decrypted_secrets WHERE name = 'push_webhook_secret' LIMIT 1;

    IF v_url IS NULL OR v_secret IS NULL THEN
      RAISE WARNING 'notify_push_event: segredos push_webhook_url/push_webhook_secret ausentes no Vault; notificação ignorada';
      RETURN NULL;
    END IF;

    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', v_secret
      ),
      body := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', to_jsonb(NEW),
        'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Notificação é best-effort. Nunca derruba a transação de negócio.
    RAISE WARNING 'notify_push_event falhou (%): %', SQLSTATE, SQLERRM;
  END;

  RETURN NULL;  -- AFTER trigger: o valor de retorno é ignorado.
END;
$$;


-- -----------------------------------------------------------------------------
-- Triggers. Criados condicionalmente: `pg_net` existe nos projetos Supabase
-- hospedados, mas pode não existir num Postgres local puro. Sem a extensão, a
-- migração continua aplicável e apenas registra um NOTICE.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN

    -- Novo comentário -> avisar o dono do resultado comentado.
    DROP TRIGGER IF EXISTS on_comentario_notify_push ON public.comentarios;
    CREATE TRIGGER on_comentario_notify_push
      AFTER INSERT ON public.comentarios
      FOR EACH ROW EXECUTE PROCEDURE public.notify_push_event();

    -- Desafio respondido -> avisar o desafiante.
    -- O WHEN garante que só a transição "em aberto -> respondido" dispara.
    DROP TRIGGER IF EXISTS on_desafio_notify_push ON public.desafios;
    CREATE TRIGGER on_desafio_notify_push
      AFTER UPDATE ON public.desafios
      FOR EACH ROW
      WHEN (OLD.challenged_result_id IS NULL AND NEW.challenged_result_id IS NOT NULL)
      EXECUTE PROCEDURE public.notify_push_event();

  ELSE
    RAISE NOTICE 'pg_net não está instalado: triggers de push não foram criados. Instale a extensão (ou configure Database Webhooks pelo painel) e reaplique esta migração.';
  END IF;
END
$$;
