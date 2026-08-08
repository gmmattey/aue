import React from 'react';
import { CompartilharEmRede } from '../../../shared/components/CompartilharEmRede';

export interface LinkDaBatalhaProps {
  /**
   * Já não-nulo: a guarda `linkDesafio && (...)` fica no ResultadoScreen, então
   * este componente não precisa se defender de null nem renderizar uma caixa
   * tracejada vazia.
   */
  link: string;
}

/**
 * A caixa tracejada que só existe depois que a batalha foi criada.
 */
export const LinkDaBatalha: React.FC<LinkDaBatalhaProps> = ({ link }) => (
  <div
    style={{
      padding: 'var(--space-4)',
      border: '1px dashed var(--border)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
    }}
  >
    <div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        Link da batalha
      </div>
      <a
        href={link}
        target="_blank"
        rel="noreferrer"
        style={{ wordBreak: 'break-all', color: 'var(--accent)' }}
      >
        {link}
      </a>
    </div>

    {/*
      Os botões por rede ficam AQUI, e não ao lado do "Compartilhar" das ações,
      por um motivo específico: sem link gerado eles mandariam a home. O botão do
      sistema pelo menos leva a imagem do cartão nesse caso; um "Mandar no
      WhatsApp" que envia aue.vercel.app pelado não convida ninguém para batalha
      nenhuma.
    */}
    <CompartilharEmRede
      url={link}
      texto="Te desafiei no Auê. Abre o link, ouve o meu arroto e manda o teu."
    />

    <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
      Quem tiver este link entra na batalha e pode responder. Ele para de
      funcionar em 7 dias.
    </p>
  </div>
);
