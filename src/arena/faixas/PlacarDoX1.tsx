import { formatarNota } from '../../shared/formato/nota';
import { FALTA_ELE, FALTA_TU, PRA_BATER, ULTIMO_ROUND } from '../../nucleo/fala/versus';
import type { DesafioAberto, RodadaDoDesafio } from '../../portas/desafios';
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
 * Sem vencedor do round, ninguém fica em ouro. Isso cobre o empate: **empate
 * não é vitória dupla**, e se o ouro aparece quando ninguém ganhou ele para de
 * significar vitória (`ARENA.md`, SCOREBOARD).
 *
 * Cada linha toca o arroto daquela pessoa.
 */
interface Props {
  /**
   * Só as rodadas do ÚLTIMO round.
   *
   * Isto já recebeu a disputa inteira. Com rounds empilhados, listar tudo
   * viraria o histórico rolável que o `ARENA.md` proíbe — e ele nasceria sem
   * ninguém decidir, só porque a lista continuou de pé.
   */
  rodadas: readonly RodadaDoDesafio[];
  buscarEndereco: (audioId: string) => Promise<string | null>;
  onApagar: (resultadoId: string) => Promise<'apagado' | 'naoDeu'>;
}

/**
 * O bloco VS — vai no PALCO, embaixo do placar de vitórias.
 *
 * "A Bolha sai; entra o VS" (`ARENA.md`, SCOREBOARD). Ela some porque aqui o
 * protagonista deixa de ser o personagem e passa a ser o confronto. Com rounds,
 * este bloco mostra **o último round**, e a briga inteira fica no placar acima.
 */
export function BlocoVersus({ desafio }: { desafio: DesafioAberto }) {
  const { ultimoRound, roundAberto } = desafio.placar;
  const [primeira, segunda] = ultimoRound.rodadas;
  const vencedor = ultimoRound.vencedorResultadoId;

  /*
    O lado que ainda não arrotou neste round. É o `Lado` vazio de sempre, só
    que agora ele tem nome: falta quem.
  */
  const faltando = roundAberto ? (roundAberto.deQuem === 'meu' ? FALTA_ELE : FALTA_TU) : null;

  /*
    O round fechou e ninguém venceu: os dois entram um contra o outro e param.
    A SIMETRIA É A INFORMAÇÃO — nenhum dos dois recebe o movimento de vitória.
  */
  const empatou = !roundAberto && !vencedor && ultimoRound.rodadas.length === 2;

  return (
    <div className="versus-caixa">
      <p className="eyebrow">{ULTIMO_ROUND}</p>
      <div className={empatou ? 'versus-bloco versus-empate' : 'versus-bloco'}>
        {/*
          A comparação é com o RESULTADO, não com a rodada. Comparar com o id da
          rodada nunca casava, e o efeito era silencioso: ninguém em ouro, e todo
          placar com cara de empate.
        */}
        <Lado
          rodada={primeira}
          ehLider={!!vencedor && vencedor === primeira?.resultadoId}
          perdeu={!!vencedor && !!primeira && vencedor !== primeira.resultadoId}
          faltando={faltando}
        />
        {/*
          A marca vira `=` quando o round FECHOU sem vencedor: o `VS` prometeria
          um vencedor que não houve. Round aberto continua `VS` — a briga ainda
          está de pé.
        */}
        <div className="versus-marca" aria-hidden="true">
          {roundAberto || vencedor ? 'VS' : '='}
        </div>
        <Lado
          rodada={segunda}
          ehLider={!!vencedor && vencedor === segunda?.resultadoId}
          perdeu={!!vencedor && !!segunda && vencedor !== segunda.resultadoId}
          faltando={faltando}
        />
      </div>
    </div>
  );
}

/**
 * A NOTA QUE PRECISA SER BATIDA — no `VERSUS`, antes de AGUENTA ESSA, e
 * continuando na tela do começo ao fim da gravação da resposta (`RECORDING`
 * e `REMATCH`).
 *
 * Reaproveita a mesma peça do placar (`eyebrow` + `versus-nota`): sem token
 * novo, sem cor nova (`ARENA.md` VERSUS; issue #188). Sem alvo, não existe
 * elemento nenhum — não é espaço vazio segurando lugar.
 */
export function NotaPraBater({ alvo }: { alvo: { nome: string; nota: number } | null }) {
  if (!alvo) return null;

  return (
    <div className="versus-caixa">
      <p className="eyebrow">{PRA_BATER}</p>
      <b className="versus-nota">{formatarNota(alvo.nota)}</b>
    </div>
  );
}

export function LinhasDoPlacar({ rodadas, buscarEndereco, onApagar }: Props) {
  return (
    <>
      <div className="placar">
        {rodadas.map((rodada) => (
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
 * A rodada pode não existir — quando só um arrotou neste round, o placar mostra
 * a briga pela metade em vez de inventar um adversário. **Não mostrar
 * participante que não existe** é regra do estado.
 */
function Lado({
  rodada,
  ehLider,
  perdeu,
  faltando,
}: {
  rodada: RodadaDoDesafio | undefined;
  ehLider: boolean;
  perdeu: boolean;
  faltando: string | null;
}) {
  if (!rodada) {
    return (
      <div className="versus-lado">
        <b className="versus-nota versus-vazio">—</b>
        <span>{faltando ?? 'ninguém ainda'}</span>
      </div>
    );
  }

  const classes = ['versus-lado'];
  if (ehLider) classes.push('versus-lider');
  /* Perdedor NUNCA em `--danger`. O que ele ganha é o movimento, não a cor. */
  if (perdeu) classes.push('versus-perdeu');

  return (
    <div className={classes.join(' ')}>
      <b className="versus-nota">{formatarNota(rodada.nota)}</b>
      <span>{rodada.nome}</span>
    </div>
  );
}
