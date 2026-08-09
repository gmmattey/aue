import React, { useRef } from 'react';
import { IconeDeMicrofone } from './icones';
import { MS_DA_SAIDA, escalaDaBolha, msDaTransicao } from './bolhaQueOuve';

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
  /** Array de 10 números representando o percentual de altura (0 a 100) para cada barra */
  frequencias: number[];
  onFinalizar: () => void;
  onCancelar: () => void;
  /**
   * O microfone ja fechou e a tela esta nos ultimos 150 ms antes de sair (#56).
   *
   * Vem do `AudioRecorder`, que o liga no unico ponto por onde as tres saidas
   * passam — PARAR, timeout e fim automatico. A tela nao sabe qual foi, e nao
   * precisa saber: a issue exige que as tres tenham a mesma saida.
   */
  saindo: boolean;
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
  frequencias,
  onFinalizar,
  onCancelar,
  saindo,
}) => {
  const decorridos = Math.max(0, segundosTotais * 1000 - msRestantes) / 1000;
  const cronometro = CRONOMETRO.format(decorridos);

  /*
    A ESCALA DA BOLHA, e a duração da transição que leva até ela.

    A duração depende da DIREÇÃO (ver `msDaTransicao`), então preciso do valor
    do quadro anterior. Fica em ref, e não em estado, porque nada é desenhado a
    partir dele: ele só escolhe entre dois números. Em estado, cada leitura do
    microfone — que chega dezenas de vezes por segundo — causaria um render
    extra sem nada de novo na tela.
  */
  const escalaDoAudio = escalaDaBolha(frequencias);
  const escalaAnterior = useRef(escalaDoAudio);
  const msDoAudio = msDaTransicao(escalaDoAudio, escalaAnterior.current);
  escalaAnterior.current = escalaDoAudio;

  /*
    A SAÍDA GANHA DO ÁUDIO, e por isso ela entra aqui e não numa classe CSS.

    O `transform` da bolha é estilo INLINE — ele muda a cada leitura do
    microfone. Uma classe `.fx-bolha-saindo` com `transform` perderia para o
    inline e não faria nada, ou precisaria de `!important` para ganhar. Já
    tropecei nisso duas vezes neste fluxo (a respiração comendo a reação ao
    áudio, e a comprimida do toque na Home); o jeito que não depende de
    resolução de cascata é decidir o valor aqui.

    0.88 é mais fundo que qualquer nível de áudio alcança (o teto é 1.15 e o
    piso 1.005), então a compressão é inconfundível: a bolha não está reagindo
    a um som baixo, ela está encerrando.

    O microfone JÁ FECHOU quando isto acontece — `frequencias` congela no
    último valor lido. Sem esta substituição, a bolha ficaria parada no
    tamanho do último quadro do arroto, que parece travamento, não fim.
  */
  const escala = saindo ? 0.88 : escalaDoAudio;
  const ms = saindo ? MS_DA_SAIDA : msDoAudio;

  return (
    <section className="fx-centro" data-od-id="recording-hero">
      {/*
        Selo e titulo dentro da MESMA zona de altura fixa que o convite usa
        (#69). E o que mantem a Bolha na mesma altura quando a tela troca — sem
        isso, a linha a mais do selo empurraria ela para baixo.
      */}
      <div className="fx-topo">
      <span className="fx-pill-rec" data-od-id="rec-indicator">
        <span className="fx-ponto-rec" aria-hidden="true" />
        {/*
          Depois que o microfone fecha, "Gravando" seria mentira — curta, mas
          mentira, e nesta casa isso nao passa nem por 150 ms.
        */}
        {saindo ? 'Fechando' : 'Gravando'}
      </span>

      <h1 className="fx-h1">Manda.</h1>
      </div>

      {/*
        A BOLHA É O MEDIDOR. Ela cresce com o arroto de verdade — o nível vem
        de `frequencias`, que `useGravacao` mede do stream aberto.

        Os anéis acompanham numa fração da escala. Iguais à bolha, eles
        pareceriam um só objeto grosso; parados, a bolha pareceria descolada
        deles.

        `transform` e `transition` inline porque os dois mudam a cada leitura do
        microfone — é justamente o caso em que estilo inline é o certo, e não
        uma classe nova por valor.
      */}
      <div className="fx-bolha-area" data-od-id="bolha-recording" aria-hidden="true">
        <div
          className="fx-anel"
          style={{ transform: `scale(${1 + (escala - 1) * 0.6})`, transition: `transform ${ms}ms ease-out` }}
        />
        <div
          className="fx-anel fx-anel-2"
          style={{ transform: `scale(${1 + (escala - 1) * 0.35})`, transition: `transform ${ms}ms ease-out` }}
        />
        <div
          className="fx-bolha fx-bolha-ouvindo"
          style={{ transform: `scale(${escala})`, transition: `transform ${ms}ms ease-out` }}
        >
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

      {/*
        A ONDA DE DEZ BARRAS FOI EMBORA — "sem waveform de DJ" é texto da #56.

        Ela não era desonesta (reagia ao áudio real desde a #71), era
        REDUNDANTE: media a mesma coisa que a bolha e disputava a atenção com
        ela. A issue é explícita sobre quem manda nesta tela, e duas coisas
        pulsando ao mesmo tempo fazem as duas parecerem enfeite.

        `frequencias` continua chegando por prop — agora alimenta a bolha.
      */}

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
