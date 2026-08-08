import { useEffect, useState, useSyncExternalStore } from 'react';

import { inscreverEmInstalacao, instalacaoDisponivel } from './instalacao';

export interface Dispositivo {
  /** Sem toque e fora do app instalado. É quem vê a landing. */
  ehDesktop: boolean;
  /** Rodando como app instalado (`display-mode: standalone`). */
  instalado: boolean;
  /** iPhone/iPad em Safari — nunca dispara `beforeinstallprompt`. */
  ehIosSafari: boolean;
}

/**
 * Detecta desktop sem cair nas duas armadilhas clássicas.
 *
 * ARMADILHA 1 — sniffing de user agent. O iPad se declara desktop desde o
 * iPadOS 13 (o UA diz "Macintosh"). Qualquer regra baseada em UA manda o iPad
 * para a tela de "abra no celular", que é justamente onde ele já está.
 *
 * ARMADILHA 2 — largura de viewport. Uma janela estreita no notebook não é um
 * celular, e um telefone na horizontal não é um desktop. Largura descreve a
 * janela, não o aparelho.
 *
 * O que sobra, e é o que de fato importa aqui: o ponteiro é grosseiro? É a
 * pergunta certa porque a decisão é sobre INTERAÇÃO — o Auê é um botão grande
 * que se toca com o dedo, perto da boca.
 *
 * VIÉS DELIBERADO: um notebook com tela sensível ao toque é tratado como
 * celular e ENTRA no app. Os dois erros possíveis não custam o mesmo. Um falso
 * "mobile" mostra o app a quem podia usá-lo; um falso "desktop" bloqueia um
 * usuário legítimo. Erramos sempre para o lado de deixar entrar.
 */
function medir(): Dispositivo {
  if (typeof window === 'undefined') {
    // Renderização em Node (testes por `renderToStaticMarkup`). Assumir mobile
    // é o lado seguro: o teste passa a ver o app, não o muro.
    return { ehDesktop: false, instalado: false, ehIosSafari: false };
  }

  const tocavel =
    window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 1;

  const instalado =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // O Safari no iOS não implementa `display-mode`; usa esta propriedade
    // própria, que não existe no lib.dom padrão.
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  const ua = navigator.userAgent;
  const ehIos = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const ehSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Chromium/.test(ua);

  return {
    ehDesktop: !tocavel && !instalado,
    instalado,
    ehIosSafari: ehIos && ehSafari,
  };
}

export function useDispositivo(): Dispositivo {
  const [dispositivo, setDispositivo] = useState<Dispositivo>(medir);

  useEffect(() => {
    /*
      Reavaliar quando o modo de exibição muda: instalar o app pela barra do
      navegador troca `display-mode` sem recarregar a página. Sem isto, quem
      acabou de instalar continuaria vendo a tela que pede para instalar.
    */
    const consulta = window.matchMedia('(display-mode: standalone)');
    const aoMudar = () => setDispositivo(medir());
    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, []);

  return dispositivo;
}

/**
 * Se o botão de instalar tem o que fazer.
 *
 * `useSyncExternalStore` porque o estado vive fora do React: o evento
 * `beforeinstallprompt` chega antes da árvore montar (ver `instalacao.ts`), e
 * um `useState` sincronizado por efeito perderia o valor inicial em metade dos
 * carregamentos.
 */
export function useInstalacaoDisponivel(): boolean {
  return useSyncExternalStore(
    inscreverEmInstalacao,
    instalacaoDisponivel,
    // No servidor/teste não há prompt nenhum.
    () => false,
  );
}
