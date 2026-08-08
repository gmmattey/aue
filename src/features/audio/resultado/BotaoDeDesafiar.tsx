import React from 'react';
import type { EstadoDoAudio } from './tipos';

/** Carrega o `data-od-id` do Open Design: `btn-desafiar`. */

export interface BotaoDeDesafiarProps {
  estadoAudio: EstadoDoAudio;
  linkDesafio: string | null;
  /**
   * O `hideChallengeButton` do AudioRecorder, com nome interno em PT-BR. O nome
   * público da prop do AudioRecorder NÃO muda: BattleView, DisputaLocalScreen e
   * ChallengeView já passam `hideChallengeButton`.
   */
  escondeDesafio?: boolean;
  exigeAudio?: boolean;
  onDesafiar: () => void;
}

/**
 * O BOTÃO ESPERA O ÁUDIO — e a ausência dele é DITA.
 *
 * Ele renderizava sempre, e `criar_batalha` não exige `audio_path`
 * (20260807000030: só checa `can_use_as_challenger`) — então qualquer falha de
 * upload ainda entregava um link bonito para uma batalha MUDA, que a pessoa
 * mandava no WhatsApp sem saber. Foi o que aconteceu no teste com dois
 * telefones: o iPhone não subia `audio/mp4`, e quem abriu o link viu "esta
 * rodada não tem áudio salvo".
 *
 * A correção do formato (`MIMES_ACEITOS_PELO_BUCKET`) fecha aquela causa. Esta
 * fecha a CLASSE: rede caindo no meio do upload, gravação acima de 5 MB, sessão
 * anônima não criada — todas continuavam produzindo o mesmo link mudo.
 *
 * OS TRÊS RAMOS SÃO IRMÃOS E GUARDADOS, nunca um `switch` nem um `else`. O
 * terceiro é a NEGAÇÃO literal dos dois primeiros, e é exatamente isso que um
 * refatorador honesto mais quer "limpar": trocar por `else` parece idêntico
 * hoje e inverte o lado do erro amanhã — um membro novo de `EstadoDoAudio`
 * passaria a RENDERIZAR o botão em vez de escondê-lo, e o defeito que volta é o
 * link de batalha muda no WhatsApp. FALHA FECHADA: só `enviado` libera.
 * `BotaoDeDesafiar.test.tsx` existe para travar isso.
 *
 * Retorna Fragment: os nós são filhos diretos de `.actions` (gap 12px).
 */
export const BotaoDeDesafiar: React.FC<BotaoDeDesafiarProps> = ({
  estadoAudio,
  linkDesafio,
  escondeDesafio,
  exigeAudio,
  onDesafiar,
}) => (
  <>
    {!escondeDesafio && !linkDesafio && estadoAudio === 'enviado' && (
      <button
        type="button"
        className="btn btn-primary"
        data-od-id="btn-desafiar"
        onClick={onDesafiar}
      >
        Desafiar um amigo
      </button>
    )}

    {!escondeDesafio && !linkDesafio && estadoAudio === 'enviando' && (
      /*
        O rótulo muda, e não só o `disabled`. O protótipo não previu este estado,
        e sem a regra `.btn:disabled` (que entrou no index.css com esta tela) um
        `.btn-primary` desabilitado ficava IDÊNTICO a um clicável — a pessoa
        tocava achando que travou. O texto é o que comunica; a opacidade só
        acompanha.
      */
      <button type="button" className="btn btn-primary" data-od-id="btn-desafiar" disabled>
        Enviando o áudio...
      </button>
    )}

    {!escondeDesafio &&
      !linkDesafio &&
      estadoAudio !== 'enviado' &&
      estadoAudio !== 'enviando' && (
        /*
          A ausência do botão é DITA. Some sem explicação e a pessoa conclui que
          o app quebrou — as mensagens do painel de áudio contam que o áudio não
          subiu, mas nenhuma delas liga isso ao desafio que ela veio fazer.
        */
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
          Sem áudio não dá para desafiar: seu amigo abriria o link e não ouviria
          nada. Grave de novo para mandar a batalha.
        </p>
      )}

    {/*
      O MESMO AVISO, do lado de quem RESPONDE — a mesma regra vista do outro
      lado, e por isso mora neste arquivo.

      Aqui não há botão para esconder: a resposta é automática assim que a nota
      sai. Com `exigeAudio`, `onRecordingComplete` não dispara sem áudio — então
      sem esta frase a pessoa gravaria, veria a nota, e a rodada simplesmente não
      apareceria na batalha. Silêncio no lugar do motivo é como o defeito
      original se parecia.
    */}
    {escondeDesafio &&
      exigeAudio &&
      estadoAudio !== 'enviado' &&
      estadoAudio !== 'enviando' && (
        <p role="alert" style={{ fontSize: 13, color: 'var(--danger)', margin: 0 }}>
          Sua resposta não entrou na batalha: sem áudio, quem abrir o link não
          ouviria nada. Grave de novo.
        </p>
      )}
  </>
);
