/**
 * A ação do `IDLE`.
 *
 * No protótipo a entrada da Arena não é uma pílula de texto: é o microfone
 * dentro de um botão (`.mic-cta`). O gesto que o jogo pede é falar, e o ícone
 * diz isso antes de qualquer rótulo.
 *
 * O RÓTULO É "ARROTAR", e não o "Clique e arrote!" do protótipo: rótulo de
 * botão é contrato (DESIGN.md §14.2), e num celular ninguém clica.
 */
interface Props {
  onArrotar: () => void;
}

export function GatilhoDeMicrofone({ onArrotar }: Props) {
  return (
    <button type="button" className="gatilho-microfone" onClick={onArrotar}>
      <span className="gatilho-bola" aria-hidden="true">
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
      </span>
      <span className="gatilho-rotulo">Arrotar</span>
    </button>
  );
}
