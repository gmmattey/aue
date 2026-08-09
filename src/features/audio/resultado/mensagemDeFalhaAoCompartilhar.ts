import type { ResultadoDoCompartilhamento } from '../useShareResult';

/**
 * O que a tela DIZ depois de um toque em "Compartilhar".
 *
 * POR QUE É UMA FUNÇÃO, e não um `if` dentro do AudioRecorder: o contrato do
 * `useShareResult` é uma união de cinco casos, e o jeito de um deles voltar a
 * ser engolido em silêncio é alguém tratar quatro. Aqui a união é percorrida
 * inteira, num arquivo sem React e sem rede, e `mensagemDeFalhaAoCompartilhar.test.ts`
 * trava os cinco. É a mesma forma do `mensagemDeFalhaNaAnalise.ts`, pelo mesmo
 * motivo.
 *
 * `null` significa "não fale nada", e são dois casos, não um:
 *   - deu certo (a folha do sistema abriu — falar seria ruído);
 *   - a pessoa fechou a folha (mudou de ideia; acusar erro seria mentira).
 *
 * A MENSAGEM NÃO CITA POSIÇÃO. O texto anterior era "Use os botões abaixo" e
 * não havia botão nenhum abaixo — a única fileira de redes vivia dentro da
 * caixa do link da batalha, que só existe depois de criar a batalha. Citar
 * "abaixo" volta a ser mentira no dia em que a ordem da tela mudar; citar os
 * botões pelo NOME só é mentira se eles sumirem, e aí o teste de
 * `compartilhamento.test.tsx` cai junto.
 */
export function mensagemDeFalhaAoCompartilhar(
  resposta: ResultadoDoCompartilhamento,
): string | null {
  if (resposta.ok) return null;

  switch (resposta.motivo) {
    case 'cancelado':
      return null;
    case 'indisponivel':
      return 'Seu navegador não abre o compartilhamento do sistema. Use os botões de WhatsApp, Telegram, X ou "Copiar link".';
    case 'falhou':
      return 'Não deu para montar a imagem agora. Use os botões de WhatsApp, Telegram, X ou "Copiar link".';
  }
}
