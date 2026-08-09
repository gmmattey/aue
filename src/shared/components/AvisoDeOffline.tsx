import React, { useState, useSyncExternalStore } from 'react';

/**
 * O aviso de que a internet caiu.
 *
 * O PROBLEMA QUE ELE RESOLVE. O Auê é um PWA instalável, e um PWA instalado
 * ABRE OFFLINE: o service worker serve o shell do cache e a Home aparece
 * inteira, com o botão de gravar funcionando. A pessoa grava, ouve o silêncio de
 * sempre, e só descobre que estava sem rede quando o envio falha — depois de já
 * ter arrotado. Antes desta tela, o único sinal de que existia rede era o erro
 * no fim.
 *
 * NÃO BLOQUEIA NADA, e isso é a decisão. O protótipo
 * (`docs/opendesign_prototype/.../offline.html`) desenha um banner por cima do
 * app com um botão "continuar mesmo assim" — ou seja, um aviso, não um muro. Foi
 * o que foi seguido.
 *
 * O QUE O TEXTO NÃO DIZ, E O PROTÓTIPO DIZIA. O protótipo promete "o resultado
 * será sincronizado depois". ISSO NÃO EXISTE: não há fila de envio, não há
 * repetição automática, e o áudio gravado offline morre com a aba. Prometer
 * sincronização que ninguém implementou é exatamente o tipo de mentira que o
 * `AGENTS.md` proíbe — então o texto diz o que de fato acontece.
 *
 * SOBRE `navigator.onLine`. Ele mente para cima: em portal cativo de hotel ou
 * com o cabo ligado num roteador sem internet, ele diz `true`. Não mente para
 * baixo — `false` significa que o aparelho sabe que não tem rede. Por isso o
 * componente só age no `false`, e a ausência do aviso nunca é usada como prova
 * de que há conexão. O erro de envio continua sendo a verdade final.
 */

function inscrever(aoMudar: () => void): () => void {
  window.addEventListener('online', aoMudar);
  window.addEventListener('offline', aoMudar);
  return () => {
    window.removeEventListener('online', aoMudar);
    window.removeEventListener('offline', aoMudar);
  };
}

function estadoAtual(): boolean {
  return navigator.onLine;
}

/**
 * `true` (conectado) na renderização em servidor/teste: sem `navigator` não há
 * o que afirmar, e o lado seguro é não desenhar um aviso de rede caída para
 * quem está lendo HTML estático.
 */
function estadoNoServidor(): boolean {
  return true;
}

/**
 * Não exportado de propósito. Enquanto o único consumidor for este aviso, um
 * hook público de "tem rede?" convidaria outras telas a decidir comportamento a
 * partir de `navigator.onLine` — que mente para cima. Quem precisa saber se o
 * envio funciona pergunta ao envio.
 */
function useEstaOnline(): boolean {
  return useSyncExternalStore(inscrever, estadoAtual, estadoNoServidor);
}

export const AvisoDeOffline: React.FC = () => {
  const online = useEstaOnline();
  /*
    Dispensa por SESSÃO DE QUEDA, não para sempre. O estado é resetado quando a
    rede volta (abaixo), então uma nova queda mostra o aviso de novo — o
    contrário faria a pessoa dispensar uma vez e nunca mais ser avisada.
  */
  const [dispensado, setDispensado] = useState(false);

  if (online) {
    // Voltou: o aviso pode aparecer de novo na próxima queda.
    if (dispensado) setDispensado(false);
    return null;
  }

  if (dispensado) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'max(12px, env(safe-area-inset-top))',
        left: 12,
        right: 12,
        zIndex: 100,
        margin: '0 auto',
        maxWidth: 416,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        padding: '14px 16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 20px 40px -16px rgba(0, 0, 0, 0.6)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            margin: 0,
          }}
        >
          A internet morreu.
        </p>
        <p
          style={{
            fontSize: 12.5,
            lineHeight: 1.45,
            color: 'var(--muted)',
            margin: '3px 0 0',
          }}
        >
          Dá para gravar e ouvir a nota — a análise é feita aqui no aparelho. O
          que não vai é mandar para a batalha: sem rede, a gravação não é salva e
          não fica esperando. Volte quando a conexão voltar.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDispensado(true)}
        aria-label="Dispensar o aviso de conexão"
        style={{
          flexShrink: 0,
          background: 'transparent',
          border: 0,
          color: 'var(--muted)',
          fontSize: 18,
          lineHeight: 1,
          padding: 6,
          minHeight: 32,
          minWidth: 32,
        }}
      >
        ×
      </button>
    </div>
  );
};
