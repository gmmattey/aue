import type React from 'react';
import { IconeDeMicrofone } from './icones';

/** Alturas das dez barras da onda, na ordem do protótipo (`gravacao.html`). */
const ONDA = ['40%', '70%', '100%', '55%', '85%', '30%', '60%', '45%', '75%', '35%'];

/**
 * O cronômetro escrito: `02,7`.
 *
 * NÃO usa `formatarNota` de `shared/formato/nota.ts`, e a distinção é de
 * domínio: aquilo é a NOTA do arroto, com contrato de uma casa decimal fechado
 * com o Open Design. Isto é um relógio. Emprestar o formatador da nota
 * amarraria o cronômetro a decisões que não são dele (o `NOTA_AUSENTE`, por
 * exemplo, não significa nada aqui).
 *
 * NÃO usa `toFixed` com `replace('.', ',')`, que é como este número seria
 * escrito por reflexo: a sentinela de `nota.test.ts` proíbe aquela chamada em
 * qualquer `.tsx` — inclusive dentro de comentário, porque ela varre o texto do
 * arquivo — justamente porque foi assim que quatro telas passaram a imprimir
 * "91.4". A proibição vale mesmo quando o número não é nota; `Intl` faz o mesmo
 * trabalho, em pt-BR, sem o `replace`.
 *
 * `minimumIntegerDigits: 2` dá o zero à esquerda do protótipo sem `padStart`:
 * um `padStart` depois do arredondamento erra quando a parte inteira cresce.
 */
const CRONOMETRO = new Intl.NumberFormat('pt-BR', {
  minimumIntegerDigits: 2,
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export interface TelaDeGravacaoProps {
  /** Quanto falta, em milissegundos. Vem de `useGravacao`. */
  msRestantes: number;
  /** O teto da gravação, em segundos (`SEGUNDOS_DE_GRAVACAO`). */
  segundosTotais: number;
  onFinalizar: () => void;
  onCancelar: () => void;
}

/**
 * TELA DE GRAVAÇÃO — porte de `gravacao.html`.
 *
 * O que existia antes: um botão escrito "Parar (7s)". Nada dizia que o
 * microfone estava aberto, nada mostrava o tempo passando de forma legível, e a
 * pessoa não tinha como sair sem esperar os dez segundos.
 *
 * O QUE VEIO DO PROTÓTIPO: a pílula "Gravando" com o ponto pulsando, a bolha
 * com os dois anéis, o cronômetro `02,7 / 10s`, a onda de dez barras, a pílula
 * "Origem depois do arroto" e os dois botões (Finalizar / Cancelar).
 *
 * O QUE NÃO VEIO, e por quê:
 *
 *   * A onda NÃO é animada. O motivo está escrito no CSS, e é o mesmo caso do
 *     iPhone mudo que tirou 54,2: animar barras durante a gravação afirma
 *     audição que o app não está medindo.
 *   * O `<a href="home.html">` do canto virou o mesmo "Cancelar" do rodapé. Aqui
 *     não há navegação: cancelar é soltar o microfone e voltar à bolha, e dois
 *     controles com o mesmo efeito em cantos opostos só dividem a atenção.
 *
 * Componente de apresentação puro: não conhece hook, banco nem microfone. Quem
 * solta o stream é o `useGravacao`, através das duas ações que chegam por prop.
 */
export const TelaDeGravacao: React.FC<TelaDeGravacaoProps> = ({
  msRestantes,
  segundosTotais,
  onFinalizar,
  onCancelar,
}) => {
  const decorridos = Math.max(0, segundosTotais * 1000 - msRestantes) / 1000;
  const cronometro = CRONOMETRO.format(decorridos);

  return (
    <section className="fx-centro" data-od-id="recording-hero">
      <span className="fx-pill-rec" data-od-id="rec-indicator">
        <span className="fx-ponto-rec" aria-hidden="true" />
        Gravando
      </span>

      <h1 className="fx-h1">Manda.</h1>

      <div className="fx-bolha-area" data-od-id="bolha-recording" aria-hidden="true">
        <div className="fx-anel" />
        <div className="fx-anel fx-anel-2" />
        <div className="fx-bolha">
          <IconeDeMicrofone />
        </div>
      </div>

      {/*
        `aria-live="off"` de propósito: o cronômetro muda cinco vezes por
        segundo, e anunciar cada mudança tornaria a tela inutilizável com leitor
        de tela. Quem precisa saber que a gravação está correndo tem a pílula
        "Gravando" acima, que é estática e é lida uma vez.
      */}
      <p className="fx-cronometro" data-od-id="rec-timer" aria-live="off">
        {cronometro}
        <span>&nbsp;/ {segundosTotais}s</span>
      </p>

      <div className="fx-onda" aria-hidden="true" data-od-id="waveform">
        {ONDA.map((altura, indice) => (
          <i key={indice} style={{ height: altura }} />
        ))}
      </div>

      {/*
        A pílula é uma PROMESSA, e ela é cumprida: a origem é perguntada na tela
        seguinte, e sem ela o veredito não fecha.
      */}
      <span className="fx-pill-origem" data-od-id="origin-selected">
        Origem depois do arroto
      </span>

      <div className="fx-rodape" style={{ width: '100%' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onFinalizar}
          data-od-id="btn-finalizar"
        >
          PARAR
        </button>
        <button type="button" className="fx-ghost" onClick={onCancelar} data-od-id="btn-cancelar">
          Cancelar
        </button>
      </div>
    </section>
  );
};
