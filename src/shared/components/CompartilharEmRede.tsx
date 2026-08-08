import React, { useState } from 'react';

interface CompartilharEmRedeProps {
  /** O link que viaja. É ele que o destinatário vai abrir. */
  url: string;
  /** A frase que acompanha o link. */
  texto: string;
}

/**
 * Botões diretos para WhatsApp, X e Telegram, mais "copiar link".
 *
 * A TENSÃO, E COMO ELA SE RESOLVE
 * -------------------------------
 * Compartilhamento por URL de intent NÃO aceita anexo. Não existe um `wa.me`
 * que mande uma imagem. Só que a imagem não precisa viajar como anexo: ela
 * viaja como o CARTÃO OPEN GRAPH do link. WhatsApp, Telegram e X buscam a URL
 * e renderizam a `og:image` do site.
 *
 * Daí a divisão de trabalho:
 *   - `useShareResult` (folha nativa do sistema) é o caminho principal e o
 *     único que anexa o PNG do cartão de verdade. Funciona em Android e iOS,
 *     que é onde este produto vive.
 *   - Estes botões mandam LINK e TEXTO, e a imagem que aparece do outro lado é
 *     a do Open Graph.
 *
 * CONSEQUÊNCIA QUE NÃO DÁ PARA IGNORAR: enquanto `public/og-image.png` não
 * existir, estes três botões produzem um link pelado. É a diferença entre
 * parecer um produto e parecer um link suspeito no grupo da família.
 *
 * Por isso os rótulos são "Mandar no WhatsApp", e não "Enviar meu card": não
 * prometemos imagem onde ela não está garantida.
 *
 * "COPIAR LINK" NÃO É OPCIONAL. É o único caminho que funciona no desktop e
 * quando o app de destino não está instalado. Era um `alert()` escondido no
 * fundo do poço do `useShareResult`; agora é um botão visível.
 */
export const CompartilharEmRede: React.FC<CompartilharEmRedeProps> = ({ url, texto }) => {
  const [copiado, setCopiado] = useState(false);
  const [erroAoCopiar, setErroAoCopiar] = useState(false);

  const redes = [
    {
      nome: 'WhatsApp',
      // O WhatsApp não tem campo separado para link: texto e URL vão juntos.
      href: `https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`,
    },
    {
      nome: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(texto)}`,
    },
    {
      nome: 'X',
      // `intent/post` é o endpoint atual; `intent/tweet` ainda redireciona,
      // mas usar o nome antigo é apostar num redirect de terceiro.
      href: `https://x.com/intent/post?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}`,
    },
  ];

  const copiar = async () => {
    setErroAoCopiar(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      /*
        `navigator.clipboard` exige contexto seguro e pode ser negado. Falhar em
        silêncio aqui seria o pior caso: a pessoa acha que copiou, cola no
        WhatsApp e não vai nada. O link continua visível na tela para seleção
        manual, e a mensagem diz isso.
      */
      setErroAoCopiar(true);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {redes.map((rede) => (
          <a
            key={rede.nome}
            href={rede.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: '1 1 auto',
              textAlign: 'center',
              padding: '10px 14px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--fg)',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {rede.nome}
          </a>
        ))}

        <button
          type="button"
          onClick={copiar}
          style={{
            flex: '1 1 auto',
            padding: '10px 14px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--fg)',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {copiado ? 'Copiado!' : 'Copiar link'}
        </button>
      </div>

      {erroAoCopiar && (
        <p role="alert" style={{ fontSize: 12.5, color: 'var(--danger)', margin: 0 }}>
          O navegador não deixou copiar. Selecione o link acima e copie à mão.
        </p>
      )}
    </div>
  );
};
