import type { CapturaDeAudio, PedidoDeMicrofone } from '../../portas/captura';

/**
 * O microfone no navegador.
 *
 * Este arquivo é um dos poucos autorizados a chamar API de navegador
 * (`docs/technical/adr/0001-arquitetura-oficial-do-aue.md` §2). O resto do
 * jogo fala com a porta.
 *
 * O QUE ELE GARANTE:
 *
 * 1. **Um stream por vez.** Pedir duas vezes sem soltar devolve o mesmo — dois
 *    streams vivos significam dois indicadores de microfone no sistema e um
 *    deles sem dono.
 * 2. **Soltar é idempotente.** Todo caminho de saída chama `soltar()`, e
 *    caminho de saída não tem tempo de conferir se o outro já chamou.
 * 3. **Parar as trilhas, não só largar a referência.** Coletor de lixo não
 *    apaga a luzinha do microfone; `track.stop()` apaga.
 */
export function criarCapturaWeb(): CapturaDeAudio {
  let stream: MediaStream | null = null;

  return {
    async pedir(): Promise<PedidoDeMicrofone> {
      if (stream) return { ok: true };

      const midia = navigator.mediaDevices;
      if (!midia?.getUserMedia) {
        /*
          Acontece de verdade: página servida sem HTTPS, WebView antiga, ou
          navegador com a API desligada. Para o jogo é o mesmo buraco de não
          ter aparelho — o que muda é só a frase, e ela é decidida lá na
          Arena.
        */
        return { ok: false, motivo: 'semAparelho' };
      }

      try {
        stream = await midia.getUserMedia({ audio: true });
        return { ok: true };
      } catch (erro) {
        return traduzir(erro);
      }
    },

    soltar(): void {
      if (!stream) return;
      for (const trilha of stream.getTracks()) {
        trilha.stop();
      }
      stream = null;
    },

    estaVivo(): boolean {
      return stream !== null;
    },
  };
}

/**
 * O que o navegador levanta, traduzido para o que o jogo precisa saber.
 *
 * Os nomes vêm do padrão e são os mesmos nos três navegadores que importam.
 * `SecurityError` entra junto de `NotAllowedError` porque, do lado de quem
 * está jogando, política de permissão bloqueando e pessoa dizendo não são a
 * mesma frustração: não tem microfone.
 */
function traduzir(erro: unknown): PedidoDeMicrofone {
  const nome = erro instanceof Error ? erro.name : '';

  if (nome === 'NotAllowedError' || nome === 'SecurityError' || nome === 'PermissionDeniedError') {
    return { ok: false, motivo: 'negado' };
  }
  if (nome === 'NotFoundError' || nome === 'DevicesNotFoundError' || nome === 'OverconstrainedError') {
    return { ok: false, motivo: 'semAparelho' };
  }

  return {
    ok: false,
    motivo: 'falhou',
    detalhe: erro instanceof Error ? erro.message : String(erro),
  };
}
