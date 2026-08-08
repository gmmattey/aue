import React from 'react';
import { BotaoDeDesafiar } from './BotaoDeDesafiar';
import type { EstadoDoAudio } from './tipos';

/**
 * Carrega os `data-od-id` do Open Design: `result-actions`, `btn-compartilhar` e
 * `btn-tentar-de-novo`.
 */

export interface AcoesDoResultadoProps {
  estadoAudio: EstadoDoAudio;
  linkDesafio: string | null;
  escondeDesafio?: boolean;
  exigeAudio?: boolean;
  onDesafiar: () => void;
  onCompartilhar: () => void;
  onTentarDeNovo: () => void;
}

/**
 * AÇÕES — `result-actions` do protótipo: o primário em cima, e os dois
 * secundários lado a lado numa `.btn-row`. Estavam os três empilhados.
 *
 * ORDEM IMPORTA, e ela coincide com a do protótipo. "Compartilhar" vinha
 * primeiro, e sem link de desafio gerado ele compartilha
 * `window.location.origin` (useShareResult) — ou seja, a home, e o link nunca
 * viajava. Só quem adivinhasse a ordem produzia um desafio.
 *
 * A `.btn-row` é montada AQUI, de uma vez: `.btn-row .btn-secondary { flex: 1 }`
 * exige parentesco direto. Um wrapper no meio faz os dois pararem de dividir a
 * largura e virarem botões de tamanhos diferentes.
 */
export const AcoesDoResultado: React.FC<AcoesDoResultadoProps> = ({
  estadoAudio,
  linkDesafio,
  escondeDesafio,
  exigeAudio,
  onDesafiar,
  onCompartilhar,
  onTentarDeNovo,
}) => (
  <section className="actions" data-od-id="result-actions">
    <BotaoDeDesafiar
      estadoAudio={estadoAudio}
      linkDesafio={linkDesafio}
      escondeDesafio={escondeDesafio}
      exigeAudio={exigeAudio}
      onDesafiar={onDesafiar}
    />

    {/*
      A `.btn-row` do protótipo: os dois secundários dividem a largura.

      O rótulo de compartilhar continua DINÂMICO, e é a única divergência
      deliberada de texto nesta tela. O protótipo diz só "Compartilhar", mas ali
      ele leva para uma tela de compartilhamento; aqui ele abre a folha do
      sistema NA HORA, e o que viaja muda conforme exista ou não link de batalha.
      Dizer "Compartilhar" nos dois casos esconderia justamente a diferença que a
      pessoa precisa saber antes de tocar.
    */}
    <div className="btn-row">
      <button
        type="button"
        className="btn btn-secondary"
        data-od-id="btn-compartilhar"
        onClick={onCompartilhar}
      >
        {linkDesafio ? 'Compartilhar a batalha' : 'Compartilhar só a nota'}
      </button>

      <button
        type="button"
        className="btn btn-secondary"
        data-od-id="btn-tentar-de-novo"
        onClick={onTentarDeNovo}
      >
        Tentar de novo
      </button>
    </div>
  </section>
);
