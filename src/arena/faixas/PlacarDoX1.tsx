import { formatarNota } from '../../shared/formato/nota';
import type { DesafioAberto } from '../../portas/desafios';
import { ApagarMeuArroto } from './ApagarMeuArroto';
import { TocarArroto } from './TocarArroto';

/**
 * O placar — onde a nota do outro vira prova.
 *
 * **QUEM DIZ QUEM GANHOU É O SERVIDOR.** A regra de comparação é versionada no
 * banco; uma tela comparando dois números do próprio jeito seria uma segunda
 * regra esperando divergir da primeira, e a divergência apareceria justo na
 * hora em que alguém perdeu.
 *
 * Sem líder, ninguém fica em ouro. Isso cobre o empate: **empate não é vitória
 * dupla**, e se o ouro aparece quando ninguém ganhou ele para de significar
 * vitória (`ARENA.md`, SCOREBOARD).
 *
 * Cada linha toca o arroto daquela pessoa.
 */
interface Props {
  desafio: DesafioAberto;
  buscarEndereco: (audioId: string) => Promise<string | null>;
  onApagar: (resultadoId: string) => Promise<'apagado' | 'naoDeu'>;
}

/**
 * O bloco VS — vai no PALCO, no lugar da Bolha.
 *
 * "A Bolha sai; entra o VS" (`ARENA.md`, SCOREBOARD). Ela some porque aqui o
 * protagonista deixa de ser o personagem e passa a ser o confronto.
 */
export function BlocoVersus({ desafio }: { desafio: DesafioAberto }) {
  const [primeira, segunda] = desafio.rodadas;
  const lider = desafio.lider;

  return (
    <div className="versus-bloco">
      <Lado rodada={primeira} ehLider={!!lider && lider.rodadaId === primeira?.id} />
      {/* A marca vira `=` no empate: o `VS` promete um vencedor que não houve. */}
      <div className="versus-marca" aria-hidden="true">
        {lider ? 'VS' : '='}
      </div>
      <Lado rodada={segunda} ehLider={!!lider && lider.rodadaId === segunda?.id} />
    </div>
  );
}

export function LinhasDoPlacar({ desafio, buscarEndereco, onApagar }: Props) {
  return (
    <>
      <div className="placar">
        {desafio.rodadas.map((rodada) => (
          <div className="placar-linha" key={rodada.id}>
            <span className="placar-nome">{rodada.nome}</span>
            <TocarArroto
              rotulo={rodada.nome}
              audioId={rodada.audioId}
              motivoSemAudio={rodada.motivoSemAudio}
              buscarEndereco={buscarEndereco}
              compacto
            />
            <b className="placar-nota">{formatarNota(rodada.nota)}</b>
            {/*
              O botão só existe na MINHA linha. E mesmo se alguém forçar a
              tela, o servidor recusa apagar o que não é dela — a checagem de
              dono não mora aqui.

              Some depois de apagado: não há o que apagar duas vezes.
            */}
            {rodada.ehMeu && rodada.audioId ? (
              <ApagarMeuArroto onApagar={() => onApagar(rodada.resultadoId)} />
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Um lado do confronto.
 *
 * A rodada pode não existir — quando só um respondeu, o placar mostra a briga
 * pela metade em vez de inventar um adversário. **Não mostrar participante que
 * não existe** é regra do estado.
 */
function Lado({
  rodada,
  ehLider,
}: {
  rodada: DesafioAberto['rodadas'][number] | undefined;
  ehLider: boolean;
}) {
  if (!rodada) {
    return (
      <div className="versus-lado">
        <b className="versus-nota versus-vazio">—</b>
        <span>ninguém ainda</span>
      </div>
    );
  }

  return (
    <div className={ehLider ? 'versus-lado versus-lider' : 'versus-lado'}>
      <b className="versus-nota">{formatarNota(rodada.nota)}</b>
      <span>{rodada.nome}</span>
    </div>
  );
}
