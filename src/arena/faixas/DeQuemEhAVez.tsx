import { formatarNota } from '../../shared/formato/nota';
import { AINDA_NAO, agoraEhVoce, roundDeTotal } from '../../nucleo/fala/roda';
import { calcularClassificacao, type Turno } from '../../nucleo/disputa/turnos';
import type { Roda } from '../../portas/disputaLocal';

/**
 * De quem é a vez, e como a mesa está.
 *
 * Vai na faixa de REAÇÃO, e serve dois momentos do mesmo jeito: o `IDLE` com a
 * roda aberta e o `RESULT` depois do passa-o-celular. É a mesma informação, e
 * duplicá-la em dois componentes seria duas chances de eles discordarem.
 *
 * A ESTRUTURA DE TRÊS ESTADOS veio do `LobbyDeTurnos` do fluxo velho — jogou,
 * é a vez, ainda falta. O que mudou foi a casa e os tokens: aqui é LINHA, não
 * card, e cabe sem rolagem para cinco pessoas, que é a regra da faixa de reação
 * (`ARENA.md` §1).
 *
 * `role="status"` para o leitor de tela anunciar a troca de turno sem roubar o
 * foco de quem está com o telefone na mão.
 */
interface Props {
  roda: Roda;
  turno: Turno;
}

export function DeQuemEhAVez({ roda, turno }: Props) {
  const daVez = turno.daVez;
  /* A melhor nota de cada um — a mesma conta do pódio, para não divergirem. */
  const melhorPor = new Map(
    calcularClassificacao(roda.participantes, roda.arrotos).map((c) => [c.nome, c.nota]),
  );

  return (
    <>
      <h1 className="grito" role="status">
        {agoraEhVoce(daVez?.nome ?? '')}
      </h1>
      <p className="comentario">{roundDeTotal(turno.round, roda.rounds)}</p>

      <div className="roda-fila">
        {roda.participantes.map((pessoa) => {
          const nota = melhorPor.get(pessoa.nome);
          const ehAVez = pessoa.id === daVez?.id;
          return (
            <div
              className={ehAVez ? 'roda-fila-linha roda-fila-vez' : 'roda-fila-linha'}
              key={pessoa.id}
            >
              <span className="roda-fila-nome">{pessoa.nome}</span>
              {/*
                Quem ainda não gravou mostra um travessão, não um zero: zero é
                nota possível neste jogo, e "não jogou" não é "jogou mal".
              */}
              <b className="roda-fila-nota">
                {nota === undefined ? AINDA_NAO : formatarNota(nota)}
              </b>
            </div>
          );
        })}
      </div>
    </>
  );
}
