import React from 'react';

interface AdBannerProps {
  isPremium?: boolean;
  adSlot?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ isPremium = false }) => {
  if (isPremium) return null;

  return (
    <div className="ad-slot" role="complementary" aria-label="Anúncio">
      <span className="ad-slot-label">Anúncio</span>
      <span className="ad-slot-note">Espaço reservado — AdSense in-feed 320×100</span>
    </div>
  );
};
