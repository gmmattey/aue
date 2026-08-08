/**
 * Captura do `beforeinstallprompt` e o botão "instalar" que ele habilita.
 *
 * POR QUE ESTE ARQUIVO É IMPORTADO POR EFEITO COLATERAL EM `main.tsx`, ANTES DO
 * `createRoot`
 * ---------------------------------------------------------------------------
 * O evento `beforeinstallprompt` dispara CEDO — em muitos casos antes de o
 * React montar qualquer componente. E ele é disparado UMA vez. Um listener
 * registrado dentro de `useEffect` chega tarde e nunca vê o evento: o botão de
 * instalar simplesmente não aparece, sem erro nenhum, e o sintoma é
 * indistinguível de "o navegador não oferece instalação".
 *
 * Por isso o listener é registrado no escopo do módulo, e o módulo é carregado
 * antes da árvore de React.
 */

/**
 * O evento não está no lib.dom padrão do TypeScript porque não é padrão W3C —
 * é uma extensão do Chromium. Declarar aqui é mais honesto que um `any`: deixa
 * explícito que se está usando algo específico de um motor.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let eventoGuardado: BeforeInstallPromptEvent | null = null;

/** Quem quer ser avisado quando o evento chegar (ou quando ele se gasta). */
const ouvintes = new Set<() => void>();

function avisar() {
  for (const ouvinte of ouvintes) ouvinte();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (evento) => {
    // Sem o preventDefault, o Chrome mostra a própria barrinha de instalação
    // no rodapé e o evento não fica disponível para o nosso botão.
    evento.preventDefault();
    eventoGuardado = evento as BeforeInstallPromptEvent;
    avisar();
  });

  // Instalou (pelo nosso botão ou pelo menu do navegador): o evento não vale
  // mais e o botão precisa sumir, senão fica prometendo o que já aconteceu.
  window.addEventListener('appinstalled', () => {
    eventoGuardado = null;
    avisar();
  });
}

export function instalacaoDisponivel(): boolean {
  return eventoGuardado !== null;
}

export function inscreverEmInstalacao(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/**
 * Abre o diálogo de instalação do navegador.
 *
 * Devolve `false` quando não havia prompt para abrir. O evento é de uso ÚNICO —
 * depois de `prompt()` ele não pode ser reutilizado —, então é descartado aqui
 * de qualquer forma. Sem isso, um segundo toque no botão lançaria.
 */
export async function instalar(): Promise<boolean> {
  const evento = eventoGuardado;
  if (!evento) return false;

  eventoGuardado = null;
  avisar();

  try {
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    return outcome === 'accepted';
  } catch (err) {
    console.error('Falha ao abrir o diálogo de instalação', err);
    return false;
  }
}
