import type React from 'react';
import { IconeDeMicrofone } from './icones';

/** A onda achatada do protótipo: nada acontecendo, e é esse o recado. */
const ONDA_CHATA = ['15%', '22%', '12%', '25%', '18%', '10%', '20%', '14%', '24%', '16%'];

export interface TelaSemSomProps {
  /**
   * O que a análise disse, palavra por palavra
   * (`mensagemDeFalhaNaAnalise`, travada por teste). Silêncio e gravação vazia
   * compartilham o mesmo texto desde a #57 — a tela não o reescreve nem
   * distingue os dois: para quem gravou, os dois casos são "não veio arroto".
   */
  mensagem: string;
  onTentarDeNovo: () => void;
  onCancelar: () => void;
}

/**
 * SEM SOM — porte de `gravacao-sem-som.html`.
 *
 * O que existia antes: uma linha vermelha de `role="alert"` embaixo do botão de
 * gravar, no meio da tela inicial. Ela dizia a coisa certa e desaparecia no
 * meio do resto.
 *
 * Este é o estado que o `AudioMudoError` produz, e ele merece tela própria por
 * uma razão específica: é o desfecho MAIS COMUM de uma gravação que deu errado
 * — telefone longe da boca, microfone tomado por outro app, permissão concedida
 * com o stream vazio. Foi ele que, antes da guarda em `engine.ts`, virava
 * "54,2 — Arroto Respeitável" num iPhone que não gravou nada.
 *
 * A onda achatada é o argumento visual: dez barras no chão, sem animação. Não é
 * decoração — é a mesma medida que a tela de gravação mostraria, agora dizendo
 * que não houve sinal.
 */
export const TelaSemSom: React.FC<TelaSemSomProps> = ({ mensagem, onTentarDeNovo, onCancelar }) => (
  <section className="fx-centro" data-od-id="no-sound-hero">
    {/*
      O SNAP DO "não peguei nada" (#72, herdado da #57).

      160 ms — a issue pede 140 a 180. Ele roda UMA VEZ, na montagem, e assenta:
      é uma reação, não um estado de alerta piscando. A tela já é o erro; o
      movimento só marca o instante em que ele apareceu.

      Fica no selo e não na tela inteira: sacudir o `.fx-centro` levaria junto o
      título, a mensagem e os botões, e a #69 é clara sobre nada pular de
      posição. Quem reage é o elemento que representa o microfone.
    */}
    <div className="fx-selo fx-snap-erro">
      <IconeDeMicrofone />
    </div>

    <div className="fx-onda" aria-hidden="true" data-od-id="flat-waveform">
      {ONDA_CHATA.map((altura, indice) => (
        <i key={indice} style={{ height: altura }} />
      ))}
    </div>

    <div>
      <h1 className="fx-h1">Coé, não peguei nada aí.</h1>
      {/*
        `role="alert"` fica AQUI, e não numa linha à parte: é a mesma mensagem
        que o parágrafo de erro mostrava antes, no mesmo papel de acessibilidade.
        Duplicá-la nos dois lugares faria o leitor de tela anunciar duas vezes.
      */}
      <p className="fx-sub" role="alert" style={{ marginTop: 'var(--space-3)' }}>
        {mensagem}
      </p>
    </div>

    <div className="fx-rodape" style={{ width: '100%' }}>
      <button
        type="button"
        className="btn btn-primary"
        onClick={onTentarDeNovo}
        data-od-id="btn-tentar-de-novo"
      >
        TENTAR DE NOVO
      </button>
      <button type="button" className="fx-ghost" onClick={onCancelar} data-od-id="btn-cancelar">
        Cancelar
      </button>
    </div>
  </section>
);
