import { JA_FOI } from '../../nucleo/fala/gravacao';

/**
 * A ação da rodada solo — do toque no microfone até o `JÁ FOI`.
 *
 * No protótipo a entrada da Arena não é uma pílula de texto: é o microfone
 * dentro de um botão (`.mic-cta`). O gesto que o jogo pede é falar, e o ícone
 * diz isso antes de qualquer rótulo.
 *
 * **É UM BOTÃO SÓ, DO COMEÇO AO FIM DA GRAVAÇÃO.** Aperta para começar, aperta
 * para encerrar — mesmo nó, mesma posição, mesmo tamanho. O que muda é o
 * ícone, o rótulo e o peso. Antes disto o gatilho sumia e uma pílula nascia no
 * lugar dele, e a rodada parecia duas telas trocando em vez de uma cena
 * mudando de estado.
 *
 * Gravando ele vira contorno em vez de bola de accent: nesse momento a Bolha e
 * o cronômetro já são os dois verdes do estado, e um terceiro estouraria o
 * orçamento do design system §2.2.
 *
 * O RÓTULO É CONTRATO (DESIGN.md §14.2): "Arrotar" é sempre "Arrotar" e
 * "Já foi" é sempre "Já foi". Nenhum dos dois é sorteado.
 */
interface Props {
  /** `arrotar` no `IDLE`; `jaFoi` enquanto grava. */
  modo: 'arrotar' | 'jaFoi';
  onTocar: () => void;
  /**
   * O rótulo de quem ainda não começou a gravar, quando não for "Arrotar".
   *
   * Na roda o botão é MANDA: quem está com o telefone na mão acabou de ler o
   * próprio nome logo acima, e "Arrotar" ali soaria como se o jogo estivesse
   * começando de novo.
   *
   * Gravando ele NÃO manda: ali o rótulo é `JÁ FOI` e ponto. É o mesmo botão do
   * começo ao fim da gravação, e quem aperta para encerrar precisa ler sempre a
   * mesma coisa, na roda ou fora dela.
   */
  rotulo?: string;
}

export function GatilhoDeMicrofone({ modo, onTocar, rotulo = 'Arrotar' }: Props) {
  const gravando = modo === 'jaFoi';


  return (
    <button
      type="button"
      className="gatilho-microfone"
      data-modo={modo}
      onClick={onTocar}
    >
      <span className="gatilho-bola" aria-hidden="true">
        {gravando ? (
          /* Quadrado de parada: a forma que todo mundo já sabe ler. */
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor" stroke="none" />
            <path d="M5 10.5a7 7 0 0 0 14 0" />
            <path d="M12 17.5V21" />
          </svg>
        )}
      </span>
      {/*
        A `key` no rótulo é o baque da troca: o React troca o nó de texto, a
        animação de CSS reinicia, e a mudança de ARROTAR para JÁ FOI acontece
        com um tranco em vez de aparecer trocada sem ninguém ver.
      */}
      <span className="gatilho-rotulo" key={modo}>
        {gravando ? JA_FOI : rotulo}
      </span>
    </button>
  );
}
