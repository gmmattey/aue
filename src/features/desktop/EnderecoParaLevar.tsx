import React, { useState } from 'react';

import { ENDERECO_LEGIVEL, URL_CANONICA_DA_HOME } from '../../shared/enderecoPublico';

type Estado = 'parado' | 'copiado' | 'semAreaDeTransferencia';

/**
 * O endereço do Auê em texto, com um botão de copiar.
 *
 * POR QUE ELE EXISTE MESMO TENDO QR CODE. O QR resolve para quem tem o telefone
 * na mão e a câmera funcionando. Ele não resolve para: quem usa leitor de tela,
 * quem está num monitor com reflexo, quem quer mandar o link para OUTRA pessoa
 * pelo WhatsApp Web da mesma tela, e quem está num navegador que não instala
 * PWA — o Firefox e o Safari de desktop não disparam `beforeinstallprompt`, e
 * até agora essas pessoas terminavam a landing sem nenhuma forma de levar o
 * endereço para o celular além de digitar da cabeça.
 *
 * A ÁREA DE TRANSFERÊNCIA PODE NÃO EXISTIR — e não pode fingir que existiu.
 * `navigator.clipboard` só é exposta em contexto seguro (HTTPS ou localhost) e
 * pode ser recusada por política do navegador. Quando falha, o componente para
 * de oferecer o botão e passa a mostrar o endereço COMPLETO, selecionável, com a
 * instrução de copiar à mão. Um "copiado!" sobre nada é exatamente o tipo de
 * mentira de interface que o Auê não faz.
 */
export const EnderecoParaLevar: React.FC = () => {
  const [estado, setEstado] = useState<Estado>('parado');

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(URL_CANONICA_DA_HOME);
      setEstado('copiado');
    } catch (err) {
      console.error('Área de transferência indisponível', err);
      setEstado('semAreaDeTransferencia');
    }
  };

  if (estado === 'semAreaDeTransferencia') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--muted)', margin: 0 }}>
          Seu navegador não deixou copiar automaticamente. O endereço é este:
        </p>
        <code
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--fg)',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            userSelect: 'all',
            wordBreak: 'break-all',
          }}
        >
          {URL_CANONICA_DA_HOME}
        </code>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 8px 8px 12px',
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--muted)',
          }}
        >
          {ENDERECO_LEGIVEL}
        </span>
        <button
          type="button"
          onClick={copiar}
          style={{
            flexShrink: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            background: 'transparent',
            border: 0,
            padding: '6px 10px',
            minHeight: 32,
          }}
        >
          {estado === 'copiado' ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      {/*
        `aria-live`: quem usa leitor de tela precisa ouvir que a cópia aconteceu.
        A troca do rótulo do botão sozinha não é anunciada de forma confiável.
      */}
      <p
        role="status"
        aria-live="polite"
        style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--muted)', margin: 0 }}
      >
        {estado === 'copiado'
          ? 'Link copiado. Manda para você mesmo e abre no celular.'
          : 'Ou copie o link e abra no navegador do celular.'}
      </p>
    </div>
  );
};
