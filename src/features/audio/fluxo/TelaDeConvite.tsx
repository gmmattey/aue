import type React from 'react';
import { IconeDeMicrofone } from './icones';

export interface TelaDeConviteProps {
  /** Começa a gravação — é o `comecarGravacao` do `AudioRecorder`. */
  onArrotar: () => void;
  /**
   * O navegador está perguntando pelo microfone neste instante.
   *
   * Vem de `useGravacao.pedindoPermissao`. Comprime a bolha e trava o botão —
   * tocar de novo enquanto o prompt está aberto chamaria `getUserMedia` uma
   * segunda vez.
   */
  pedindoPermissao: boolean;
}

/**
 * A TELA DE CONVITE do gravador — a etapa 'inicio'.
 *
 * Ela era um `<button class="btn btn-primary">ARROTAR</button>` solto no meio da
 * coluna, e é por isso que este arquivo existe: a #72 pede que "depois do toque
 * que pede o microfone, a Bolha comprime e volta atenta em 120–180 ms", e não
 * havia Bolha nenhuma aqui em que aplicar isso.
 *
 * Agora a Bolha é a mesma da Home e a mesma da gravação. Ela deixa de ser um
 * enfeite da entrada e vira o fio condutor do fluxo: é ela que convida, que
 * espera a permissão, que ouve o arroto e que reage ao erro.
 *
 * A TELA NÃO DESMONTA ENQUANTO O PROMPT ESTÁ ABERTO, e isso é requisito
 * explícito da #72 (e da #69): o prompt nativo do navegador aparece por cima, e
 * trocar o que está atrás dele faria a página pular no instante em que a pessoa
 * está lendo a pergunta. Por isso `pedindoPermissao` muda o ESTADO desta tela em
 * vez de levar a uma tela nova.
 *
 * E não se anima o prompt: ele é do navegador, não nosso. O que reage é o que é
 * nosso — a bolha atrás dele.
 */
export const TelaDeConvite: React.FC<TelaDeConviteProps> = ({ onArrotar, pedindoPermissao }) => (
  <section className="fx-centro" data-od-id="invite-hero">
    <div className="fx-topo">
      <h1 className="fx-h1">Manda.</h1>
    </div>

    <div className="fx-bolha-area" data-od-id="bolha-invite" aria-hidden="true">
      <div className="fx-anel" />
      <div className="fx-anel fx-anel-2" />
      <div className={`fx-bolha fx-bolha-convite ${pedindoPermissao ? 'fx-bolha-atenta' : ''}`}>
        <IconeDeMicrofone />
      </div>
    </div>

    <button
      type="button"
      className="btn btn-primary"
      onClick={onArrotar}
      /*
        Travado enquanto o prompt está aberto. Um segundo toque chamaria
        `getUserMedia` de novo — e `iniciar` começa soltando o stream anterior,
        então a segunda chamada mataria a primeira no meio da pergunta.
      */
      disabled={pedindoPermissao}
      data-od-id="btn-arrotar"
    >
      ARROTAR
    </button>

    {/*
      A frase existe porque a etapa 'inicio' agora tem um estado em que o botão
      não responde, e um botão morto sem explicação parece defeito. `aria-live`
      porque é a única mudança que um leitor de tela precisa ouvir aqui — a
      compressão da bolha ele não vê.
    */}
    <p className="fx-aviso" aria-live="polite" data-od-id="invite-wait">
      {pedindoPermissao ? 'Libera o microfone aí em cima.' : ' '}
    </p>
  </section>
);
