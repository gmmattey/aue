import React from 'react';

import { formatarNota } from '../../shared/formato/nota';

interface NotaDoTurnoProps {
  /** Quem acabou de arrotar. */
  nome: string;
  round: number;
  roundsTotal: number;
  score: number;
  classificacao: string;
  /** Parciais do motor, 0..100. Os mesmos dois do protótipo. */
  potencia: number;
  comprimento: number;
  /** O arroto não chegou ao Storage. A nota vale; o áudio não existe. */
  audioFalhou: boolean;
  /** Falha ao registrar o turno, já traduzida por `mensagemDeFalhaNoTurno`. */
  erro: string | null;
  /** O turno ainda está sendo gravado no banco. */
  salvando: boolean;
  /** De quem é a próxima vez. `null` quando a disputa acabou. */
  proximo: string | null;
  onAvancar: () => void;
}

/**
 * A NOTA DE QUEM ACABOU DE ARROTAR — e o passo humano antes do próximo turno.
 *
 * ISTO É A CORREÇÃO MAIS IMPORTANTE DA DISPUTA PRESENCIAL, e vale registrar o
 * defeito inteiro porque ele é invisível em qualquer teste que não seja o
 * churrasco:
 *
 *   `executarEnvio` chamava `onRecordingComplete` → a tela trocava a batalha →
 *   o `turno` mudava → a `key` do `AudioRecorder` mudava junto → o React
 *   remontava o gravador e DESTRUÍA a tela de resultado de quem tinha acabado
 *   de arrotar.
 *
 * O cartão da nota aparecia só enquanto o upload rodava e sumia sozinho, sem
 * ninguém tocar em nada, com o telefone ainda na mão da pessoa errada. A nota
 * existia no banco e nunca era lida por quem a tirou — que é o produto inteiro
 * desta tela.
 *
 * A CORREÇÃO NÃO É TÉCNICA, É DE FLUXO. Não adianta segurar o resultado por
 * um timer: numa mesa, o tempo entre arrotar e alguém conseguir olhar a tela
 * varia de dois segundos a meio minuto de gargalhada. O que fecha o turno é um
 * TOQUE — o mesmo "Próximo turno" que o protótipo `disputa-round.html` já
 * previa e que o app não tinha. Enquanto ninguém toca, a nota fica.
 *
 * Componente puro: sem estado, sem efeito, sem rede. Quem grava a rodada é a
 * `DisputaLocalScreen`, e ela faz isso EM PARALELO a esta tela — a mesa lê a
 * nota enquanto o banco recebe o turno.
 */
export const NotaDoTurno: React.FC<NotaDoTurnoProps> = ({
  nome,
  round,
  roundsTotal,
  score,
  classificacao,
  potencia,
  comprimento,
  audioFalhou,
  erro,
  salvando,
  proximo,
  onAvancar,
}) => {
  const acabou = proximo === null;

  return (
    <div className="screen" style={{ paddingBottom: 80, gap: 'var(--space-4)' }}>
      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            margin: 0,
          }}
        >
          Disputa aqui · round {round} de {roundsTotal}
        </p>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 30,
            textTransform: 'uppercase',
            marginTop: 4,
            marginBottom: 0,
          }}
        >
          {nome} mandou.
        </h1>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1,
            color: 'var(--accent)',
          }}
        >
          {formatarNota(score)}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, textTransform: 'uppercase', marginTop: 8 }}>
          {classificacao}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {[
          { rotulo: 'Potência', valor: potencia },
          { rotulo: 'Comprimento', valor: comprimento },
        ].map((parcial) => (
          <div
            key={parcial.rotulo}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '11px 4px',
              borderTop: '1px solid var(--border)',
              fontSize: 14,
            }}
          >
            <span style={{ color: 'var(--muted)' }}>{parcial.rotulo}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {formatarNota(parcial.valor)}
            </span>
          </div>
        ))}
      </div>

      {/*
        O AVISO DE ÁUDIO NÃO PODE SUMIR JUNTO COM O GRAVADOR.

        Quem dizia "o áudio não subiu" era o próprio `AudioRecorder`, e ele
        deixa a tela no instante em que esta aparece. Como a disputa presencial
        NÃO exige áudio de propósito (a mesa já ouviu ao vivo; travar o turno
        pararia o churrasco), a falha é comum o bastante para precisar ser dita
        aqui — senão o pódio compartilhado tem uma rodada muda que ninguém
        avisou.
      */}
      {audioFalhou && (
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
          O áudio não subiu. A nota vale e conta no pódio, mas esse arroto
          ninguém vai conseguir reouvir depois.
        </p>
      )}

      {erro && (
        <p role="alert" style={{ fontSize: 13.5, color: 'var(--danger)', margin: 0 }}>
          {erro}
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary"
        onClick={onAvancar}
        /*
          Travado enquanto o turno não terminou de ser gravado, e só por isso:
          avançar antes faria a tela seguinte calcular a vez com a rodada
          faltando — e passaria o telefone de volta para quem acabou de jogar.
        */
        disabled={salvando}
      >
        {salvando ? 'Guardando...' : acabou ? 'Ver o pódio' : 'Próximo turno'}
      </button>

      {!acabou && !salvando && (
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, textAlign: 'center' }}>
          Agora é a vez de {proximo}. Passa o telefone.
        </p>
      )}
    </div>
  );
};
