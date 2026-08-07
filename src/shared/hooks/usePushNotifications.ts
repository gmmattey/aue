import { useEffect, useState } from 'react';
import { supabase } from '../../db/supabase';

// A chave VAPID pública é credencial do projeto e NÃO pode ficar hardcoded.
// Ela vem de `VITE_VAPID_PUBLIC_KEY` (ver .env.example).
const RAW_VAPID_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '') as string;

// Placeholders que já existiram no repositório ou que vêm do .env.example.
// Se algum deles chegar até aqui, a feature está *desconfigurada*, não pronta.
const PLACEHOLDER_KEYS = [
  'BA_REPLACE_ME_WITH_REAL_PUBLIC_VAPID_KEY',
  'YOUR_VAPID_PUBLIC_KEY',
];

/**
 * Uma chave VAPID pública é um ponto P-256 não comprimido (65 bytes) em
 * base64url — 87 caracteres, começando por 'B'. Validar antes de chamar
 * `atob` evita a exceção silenciosa que existia antes (InvalidCharacterError
 * engolido por um `console.error`).
 */
function isValidVapidKey(key: string): boolean {
  if (!key) return false;
  if (PLACEHOLDER_KEYS.includes(key)) return false;
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(key)) return false;
  return key.replace(/=+$/, '').length === 87;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported =
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window;

  const isConfigured = isValidVapidKey(RAW_VAPID_KEY);

  // Falha explícita e visível no console durante o desenvolvimento: antes, a
  // feature aparecia como disponível e simplesmente não funcionava.
  useEffect(() => {
    if (isSupported && !isConfigured) {
      console.warn(
        '[push] VITE_VAPID_PUBLIC_KEY ausente ou inválida. ' +
        'Notificações push estão desabilitadas. Veja .env.example.'
      );
    }
  }, [isSupported, isConfigured]);

  useEffect(() => {
    if (!isSupported || !isConfigured) return;

    let cancelled = false;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) setIsSubscribed(!!subscription);
      })
      .catch((err) => {
        console.error('[push] Falha ao consultar a inscrição atual:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [isSupported, isConfigured]);

  const subscribeToPush = async () => {
    setError(null);

    if (!isSupported) {
      setError('Este navegador não suporta notificações push.');
      return;
    }
    if (!isConfigured) {
      setError(
        'Notificações push não estão configuradas neste ambiente ' +
        '(VITE_VAPID_PUBLIC_KEY ausente ou inválida).'
      );
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Permissão de notificação negada.');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Sem sessão não há onde guardar a inscrição, então o push nunca
        // chegaria. Melhor recusar do que criar uma inscrição órfã.
        setError('Entre na sua conta para ativar as notificações.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(RAW_VAPID_KEY)
      });

      const subData = JSON.parse(JSON.stringify(subscription));
      const { error: upsertError } = await supabase.from('push_subscriptions').upsert({
        user_id: session.user.id,
        endpoint: subData.endpoint,
        p256dh: subData.keys.p256dh,
        auth: subData.keys.auth
      }, { onConflict: 'user_id,endpoint' });

      if (upsertError) {
        // Não deixar o usuário achar que ativou algo que não foi salvo.
        await subscription.unsubscribe().catch(() => undefined);
        throw upsertError;
      }

      setIsSubscribed(true);
    } catch (err) {
      console.error('[push] Erro ao ativar notificações:', err);
      setError('Não foi possível ativar as notificações.');
    }
  };

  return { isSubscribed, subscribeToPush, isSupported, isConfigured, error };
}
