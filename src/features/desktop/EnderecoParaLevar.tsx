import React, { useState } from 'react';

import { ENDERECO_LEGIVEL, URL_CANONICA_DA_HOME } from '../../shared/enderecoPublico';

type Estado = 'parado' | 'copiado' | 'semAreaDeTransferencia';
type Idioma = 'pt-BR' | 'en';

const COPY = {
  'pt-BR': {
    falha: 'Seu navegador não deixou copiar automaticamente. O endereço é este:',
    copiado: 'Copiado',
    copiar: 'Copiar',
    statusCopiado: 'Link copiado. Manda para você mesmo e abre no celular.',
    statusParado: 'Ou copie o link e abra no navegador do celular.',
    erroConsole: 'Área de transferência indisponível',
  },
  en: {
    falha: "Your browser couldn't copy the link automatically. Here's the address:",
    copiado: 'Copied',
    copiar: 'Copy',
    statusCopiado: 'Link copied. Send it to yourself and open it on your phone.',
    statusParado: 'Or copy the link and open it in your phone browser.',
    erroConsole: 'Clipboard unavailable',
  },
} as const;

/**
 * O endereço do Auê em texto, com um botão de copiar.
 *
 * O componente é o mesmo nas duas landings. A única variação é a copy: a URL
 * continua sendo a canônica do jogo, porque o objetivo aqui é levar a pessoa da
 * página de aquisição para a Arena no celular — não criar uma segunda origem do
 * produto por idioma.
 *
 * A área de transferência pode não existir ou ser recusada. Nesse caso o
 * componente mostra o endereço completo e diz a verdade em vez de fingir que
 * copiou alguma coisa.
 */
export const EnderecoParaLevar: React.FC<{ idioma?: Idioma }> = ({ idioma = 'pt-BR' }) => {
  const [estado, setEstado] = useState<Estado>('parado');
  const copy = COPY[idioma];

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(URL_CANONICA_DA_HOME);
      setEstado('copiado');
    } catch (err) {
      console.error(copy.erroConsole, err);
      setEstado('semAreaDeTransferencia');
    }
  };

  if (estado === 'semAreaDeTransferencia') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--muted)', margin: 0 }}>
          {copy.falha}
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
          {estado === 'copiado' ? copy.copiado : copy.copiar}
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--muted)', margin: 0 }}
      >
        {estado === 'copiado' ? copy.statusCopiado : copy.statusParado}
      </p>
    </div>
  );
};
