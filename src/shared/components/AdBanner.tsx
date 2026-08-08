import React, { useEffect, useRef } from 'react';

const CLIENTE_ADSENSE = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;
const URL_ADSENSE = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

interface AdBannerProps {
  /** Assinante não vê anúncio. Precisa ser passado — o default é o caso comum, não o seguro. */
  isPremium?: boolean;
  /** Id do bloco criado no painel do AdSense. Sem ele, nada é servido. */
  adSlot?: string;
}

/**
 * Bloco de anúncio pronto para produção, inerte até a liberação do Google.
 *
 * COMO SE COMPORTA HOJE (sem conta aprovada):
 *   - não carrega script nenhum do Google;
 *   - não renderiza nada para o usuário final;
 *   - mostra um marcador do lugar APENAS em desenvolvimento, para a colocação
 *     ficar visível a quem mexe no feed.
 *
 * QUANDO A CONTA SAIR: preencher `VITE_ADSENSE_CLIENT` e
 * `VITE_ADSENSE_SLOT_FEED` no ambiente e publicar. Nenhuma mudança de código.
 *
 * Antes, o script vinha fixo no `index.html` com `client=ca-pub-XXXXXXXXXXXXXXXX`
 * — requisição a terceiro em toda visita, com um id que nunca foi válido.
 */
function garantirScriptAdSense(cliente: string) {
  if (document.querySelector(`script[data-aue-adsense="${cliente}"]`)) return;

  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `${URL_ADSENSE}?client=${encodeURIComponent(cliente)}`;
  script.dataset.aueAdsense = cliente;
  document.head.appendChild(script);
}

export const AdBanner: React.FC<AdBannerProps> = ({ isPremium = false, adSlot }) => {
  const configurado = Boolean(CLIENTE_ADSENSE && adSlot);
  const jaEmpurrado = useRef(false);

  useEffect(() => {
    if (isPremium || !configurado || jaEmpurrado.current) return;

    garantirScriptAdSense(CLIENTE_ADSENSE as string);

    try {
      // `adsbygoogle` é criado pelo script; empurrar antes dele chegar é o uso
      // previsto pela própria API (a fila é drenada no carregamento).
      const fila = ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ??= []);
      fila.push({});
      jaEmpurrado.current = true;
    } catch (err) {
      console.error('Falha ao registrar bloco AdSense', err);
    }
  }, [configurado, isPremium]);

  // Assinante nunca vê anúncio — é o que a tela de perfil promete
  // ("Sem anúncios, arrotos ilimitados e favoritos").
  if (isPremium) return null;

  if (!configurado) {
    // Em produção o espaço simplesmente não existe: nada de caixa tracejada
    // dizendo "não configurado" para o usuário no lançamento.
    if (!import.meta.env.DEV) return null;

    return (
      <div className="ad-slot" role="presentation" aria-hidden="true">
        <span className="ad-slot-label">Anúncio</span>
        <span className="ad-slot-note">
          Colocação reservada — invisível em produção até VITE_ADSENSE_CLIENT e o slot serem preenchidos
        </span>
      </div>
    );
  }

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', margin: '16px 0', minHeight: 100 }}
      data-ad-client={CLIENTE_ADSENSE}
      data-ad-slot={adSlot}
      data-ad-format="auto"
      data-full-width-responsive="true"
      aria-label="Anúncio"
    />
  );
};
