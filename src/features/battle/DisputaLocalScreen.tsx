import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  criarBatalhaPresencial,
  obterBatalha,
  responderBatalha,
  type Batalha,
  type LocalDaDisputa,
  type ResultadoRow,
} from '../../db/supabase';
import { CompartilharEmRede } from '../../shared/components/CompartilharEmRede';
import { AudioRecorder } from '../audio/AudioRecorder';
import { useShareResult } from '../audio/useShareResult';
import { mensagemDeFalhaAoCompartilhar } from '../audio/resultado/mensagemDeFalhaAoCompartilhar';
import { LobbyDeTurnos, type ParticipanteEmTurno } from './LobbyDeTurnos';
import { rotuloDoLocal } from './locais';
import { NotaDoTurno } from './NotaDoTurno';
import { PodioBanner, ID_DO_PODIO, type ColocacaoNoPodio } from './PodioBanner';
import { calcularTurno, calcularClassificacao } from './turnos';
import { mensagemDeFalhaNoTurno } from './mensagemDeFalhaNoTurno';
import { esquecerDisputa, guardarDisputa, lerDisputaGuardada } from './disputaGuardada';

const MAXIMO_DE_PARTICIPANTES = 5;

const LOCAIS: { valor: LocalDaDisputa; rotulo: string }[] = [
  { valor: 'casa', rotulo: 'Em casa' },
  { valor: 'churrasco', rotulo: 'Churrasco' },
  { valor: 'publico', rotulo: 'Em público' },
  { valor: 'escritorio', rotulo: 'No escritório' },
  { valor: 'outro', rotulo: 'Outro lugar' },
];

/** A nota que está na tela esperando alguém tocar em "Próximo turno". */
interface NotaPendente {
  nome: string;
  round: number;
  resultado: ResultadoRow;
}

/**
 * Disputa presencial: até 5 pessoas, um aparelho só, até 3 rounds.
 *
 * A DIFERENÇA PARA A BATALHA REMOTA não é de interface, é de identidade. Lá,
 * cada participante tem o próprio telefone e o próprio `auth.uid()`. Aqui, as
 * cinco pessoas compartilham um aparelho — logo, uma sessão só. Quem separa
 * uma da outra é `participantes_batalha` (20260807000031); sem ela, o ranking
 * seria "Arrotador a1b2c3" contra ele mesmo cinco vezes.
 *
 * ONDE MORA O ESTADO: no banco, não aqui. Poderia ser tudo `useState` — a
 * disputa acontece numa sentada só — mas os áudios PRECISAM ser guardados, e
 * áudio só existe atrelado a um `resultados.id`. Guardar em memória e
 * sincronizar depois exigiria um segundo caminho de gravação. Assim cada turno
 * é um `submit_resultado` + upload normais, iguais aos do resto do app.
 *
 * O QUE FICA NO APARELHO é só o `access_code` (ver `disputaGuardada.ts`). Sem
 * ele, apagar a tela no meio de 5 pessoas × 3 rounds jogava fora o endereço de
 * 15 gravações que estavam salvas o tempo todo — a disputa recomeçava do zero
 * porque o número da mesa se perdeu, não porque as notas se perderam.
 *
 * AS TRÊS TELAS desta disputa, em ordem de precedência de render:
 *
 *   1. a nota do turno (`NotaDoTurno`), que só sai com um toque;
 *   2. o pódio, quando todo mundo cumpriu todos os rounds;
 *   3. o lobby com o gravador, que é o estado normal.
 *
 * A ORDEM IMPORTA: a nota vem antes do pódio de propósito, senão o último
 * arroto da disputa nunca seria lido — a tela pularia direto para o ranking.
 *
 * O QUE ESTA TELA NÃO FAZ: não pede login, não pede consentimento e não sabe
 * quem são as pessoas além do apelido que alguém digitou. Quem opera o
 * aparelho é responsável por avisar a mesa de que está gravando — está dito na
 * política de privacidade e repetido aqui embaixo, no lugar onde os nomes são
 * digitados.
 */
export const DisputaLocalScreen: React.FC<{ onSair?: () => void }> = ({ onSair }) => {
  const [batalha, setBatalha] = useState<Batalha | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  /** Enquanto a disputa guardada no aparelho está sendo relida do banco. */
  const [restaurando, setRestaurando] = useState(true);

  /* ----------------------------------------------------------- configuração */
  const [nomes, setNomes] = useState<string[]>(['', '']);
  const [rounds, setRounds] = useState(1);
  const [local, setLocal] = useState<LocalDaDisputa | null>(null);
  /**
   * O lugar escrito à mão quando o contexto é "outro".
   *
   * `venue_type` é um CHECK de cinco valores; "outro" só diz que nenhum dos
   * quatro serviu. O banner exibia literalmente "Outro lugar" — que é pior do
   * que não dizer nada, porque ocupa a linha da legenda para informar zero.
   * Agora ou tem o nome que a pessoa deu, ou a legenda não fala de lugar.
   */
  const [lugarLivre, setLugarLivre] = useState('');

  /* ------------------------------------------------------------- em disputa */
  const [notaDoTurno, setNotaDoTurno] = useState<NotaPendente | null>(null);
  const [salvandoTurno, setSalvandoTurno] = useState(false);
  const [erroAoCompartilhar, setErroAoCompartilhar] = useState<string | null>(null);
  /** Primeiro toque em "Encerrar" só arma o segundo. Ver o botão. */
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false);

  /* ------------------------------------------------------------- retomada */

  /**
   * Retoma a disputa que ficou pela metade.
   *
   * O CENÁRIO REAL, e o motivo de isto existir: churrasco, telefone passando
   * de mão em mão, tela apagando, alguém apertando "voltar". Qualquer um
   * desses eventos derrubava o `useState` e levava junto o `access_code` — o
   * único jeito de voltar às 15 gravações que já estavam no banco.
   *
   * Só batalha PRESENCIAL é retomada aqui: um código de batalha remota tem
   * `participantes` vazio e faria o turno nascer acabado.
   */
  useEffect(() => {
    const guardada = lerDisputaGuardada();
    if (!guardada) {
      setRestaurando(false);
      return;
    }

    let ativo = true;

    obterBatalha(guardada.codigo)
      .then((encontrada) => {
        if (!ativo) return;
        if (encontrada && encontrada.battle_type === 'presencial') {
          setBatalha(encontrada);
          if (guardada.lugar) setLugarLivre(guardada.lugar);
          return;
        }
        /*
          `null` é código inexistente OU batalha vencida — o banco não
          distingue os dois de propósito. Nos dois casos o bilhete no aparelho
          não vale mais, e insistir nele deixaria a tela presa para sempre.
        */
        esquecerDisputa();
        setErro('A disputa de antes venceu ou sumiu. Começa outra.');
      })
      .catch((err) => {
        console.error('Falha ao retomar a disputa guardada', err);
        if (!ativo) return;
        /*
          NÃO apaga o que está guardado: falha de rede não é prova de que a
          disputa acabou, e apagar aqui destruiria uma disputa viva por causa
          de um sinal ruim de churrasco — que é o ambiente esperado.
        */
        setErro('Não deu para retomar a disputa de antes. Confere a internet e recarrega a tela.');
      })
      .finally(() => {
        if (ativo) setRestaurando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const comecar = useCallback(async () => {
    const limpos = nomes.map((n) => n.trim()).filter(Boolean);

    if (limpos.length < 2) {
      setErro('Uma disputa precisa de pelo menos duas pessoas.');
      return;
    }
    // Checagem local do que o banco também impõe (índice único). Aqui ela
    // existe para a mensagem ser boa: o erro do Postgres diria "violação de
    // restrição única", que não ajuda ninguém no meio de um churrasco.
    const repetido = new Set(limpos.map((n) => n.toLowerCase())).size !== limpos.length;
    if (repetido) {
      setErro('Dois participantes com o mesmo nome deixam o ranking indecifrável. Diferencie.');
      return;
    }

    setCriando(true);
    setErro(null);
    try {
      const nova = await criarBatalhaPresencial(limpos, rounds, local);
      const lugar = local === 'outro' ? lugarLivre.trim() : '';
      guardarDisputa({ codigo: nova.access_code, lugar: lugar || undefined });
      setBatalha(nova);
    } catch (err) {
      console.error('Falha ao criar a disputa presencial', err);
      setErro('Não foi possível abrir a disputa. Tenta de novo.');
    } finally {
      setCriando(false);
    }
  }, [nomes, rounds, local, lugarLivre]);

  /** Volta para a configuração e larga o que estava guardado no aparelho. */
  const encerrar = useCallback(() => {
    esquecerDisputa();
    setBatalha(null);
    setNotaDoTurno(null);
    setErro(null);
    setErroAoCompartilhar(null);
    setConfirmandoEncerrar(false);
    setNomes(['', '']);
    setRounds(1);
    setLocal(null);
    setLugarLivre('');
  }, []);

  /* ----------------------------------------------------------------- turnos */

  /** Ver `turnos.ts` — a lógica vive fora daqui para poder ser testada. */
  const turno = useMemo(
    () =>
      batalha
        ? calcularTurno(batalha.participantes, batalha.rodadas, batalha.rounds_total ?? 1)
        : null,
    [batalha],
  );

  /**
   * Registra o turno e — antes disso — põe a nota na tela.
   *
   * A ORDEM É A CORREÇÃO. `setNotaDoTurno` acontece ANTES do `await`, então a
   * nota aparece no mesmo quadro em que o gravador some. Enquanto ela estiver
   * na tela, a troca de `batalha` não remonta nada que o usuário esteja
   * lendo — o pulo do `AudioRecorder` que apagava o resultado de quem tinha
   * acabado de arrotar deixa de ter para onde pular. O detalhe inteiro do
   * defeito está no `NotaDoTurno`.
   */
  const gravar = useCallback(
    async (resultado: ResultadoRow) => {
      if (!batalha || !turno || turno.acabou || !turno.daVez) return;

      const daVez = turno.daVez;
      setNotaDoTurno({ nome: daVez.apelido, round: turno.round, resultado });
      setErro(null);
      setSalvandoTurno(true);

      try {
        setBatalha(await responderBatalha(batalha.access_code, resultado.id, daVez.id));
      } catch (err) {
        console.error('Falha ao registrar o turno', err);
        const falha = mensagemDeFalhaNoTurno(err);
        setErro(falha.mensagem);

        /*
          Quando o banco sabe mais que a tela (nota duplicada, round já
          fechado), reler é o que faz o turno andar. Sem isto a mesa ficava
          presa na mesma pessoa, tentando de novo o que já tinha dado certo.
        */
        if (falha.resincronizar) {
          try {
            const atual = await obterBatalha(batalha.access_code);
            if (atual) setBatalha(atual);
          } catch (erroDaReleitura) {
            console.error('Falha ao reler a disputa', erroDaReleitura);
          }
        }
      } finally {
        setSalvandoTurno(false);
      }
    },
    [batalha, turno],
  );

  /** O toque que fecha o turno. É a única saída da tela de nota. */
  const avancarTurno = useCallback(() => {
    setNotaDoTurno(null);
    setErro(null);
    // Desarma o "Encerrar" que alguém tenha tocado uma vez no turno anterior.
    // Um botão que continua armado entre turnos vira uma armadilha para o
    // próximo, que nem viu o primeiro toque.
    setConfirmandoEncerrar(false);
  }, []);

  /* ------------------------------------------------------------ classificação */

  const classificacao: ColocacaoNoPodio[] = useMemo(
    () => (batalha ? calcularClassificacao(batalha.participantes, batalha.rodadas) : []),
    [batalha],
  );

  const { shareResult } = useShareResult();

  const url = batalha ? `${window.location.origin}/b/${batalha.access_code}` : '';

  /**
   * Compartilha o PNG do pódio, e DIZ quando não dá.
   *
   * O retorno era descartado: num navegador sem Web Share API — todo desktop e
   * parte do Android — tocar em "Compartilhar o pódio" não fazia nada e não
   * falava nada. A função que traduz os cinco casos da união é a mesma do
   * fluxo individual, importada e não copiada: duplicá-la garantiria que um
   * dos dois lados fica para trás no próximo caso novo.
   */
  const compartilharPodio = useCallback(async () => {
    const resposta = await shareResult({
      elementId: ID_DO_PODIO,
      url,
      titulo: 'Pódio do Auê',
      texto: `${classificacao[0]?.nome} ganhou a disputa de arroto. Olha o pódio.`,
    });

    setErroAoCompartilhar(mensagemDeFalhaAoCompartilhar(resposta));
  }, [classificacao, shareResult, url]);

  /* ------------------------------------------------------------------ telas */

  if (restaurando) {
    return (
      <div className="screen" style={{ paddingBottom: 80, justifyContent: 'center', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>Retomando a disputa...</p>
      </div>
    );
  }

  if (!batalha) {
    return (
      <Configuracao
        nomes={nomes}
        setNomes={setNomes}
        rounds={rounds}
        setRounds={setRounds}
        local={local}
        setLocal={setLocal}
        lugarLivre={lugarLivre}
        setLugarLivre={setLugarLivre}
        onComecar={comecar}
        criando={criando}
        erro={erro}
        onSair={onSair}
      />
    );
  }

  /*
    O lugar da legenda: o nome que a pessoa deu quando escolheu "outro", ou o
    rótulo do chip. "Outro lugar" nunca vai para o banner.
  */
  const nomeDoLocal =
    batalha.venue_type === 'outro'
      ? lugarLivre.trim() || undefined
      : /*
          O rótulo vem de `locais.ts`, e não do `LOCAIS` daqui: a tela que
          RECEBE o link do pódio (`/b/CODIGO`) escreve o mesmo texto, e duas
          buscas independentes divergem na primeira troca de palavra. O array
          local continua existindo para os botões, onde a ORDEM é decisão de
          interface.
        */
        (rotuloDoLocal(batalha.venue_type) ?? undefined);

  /* 1. A nota de quem acabou de arrotar. Só sai com um toque. */
  if (notaDoTurno) {
    return (
      <NotaDoTurno
        nome={notaDoTurno.nome}
        round={notaDoTurno.round}
        roundsTotal={batalha.rounds_total ?? 1}
        score={Number(notaDoTurno.resultado.score)}
        classificacao={notaDoTurno.resultado.classification}
        potencia={Number(notaDoTurno.resultado.power)}
        comprimento={Number(notaDoTurno.resultado.duration)}
        audioFalhou={!notaDoTurno.resultado.audio_path}
        erro={erro}
        salvando={salvandoTurno}
        proximo={turno?.acabou ? null : (turno?.daVez?.apelido ?? null)}
        onAvancar={avancarTurno}
      />
    );
  }

  /* 2. O pódio. */
  if (turno?.acabou) {
    return (
      <div className="screen" style={{ paddingBottom: 80, gap: 'var(--space-5)' }}>
        <PodioBanner
          colocacoes={classificacao}
          legenda={[nomeDoLocal, `${batalha.rounds_total} round${(batalha.rounds_total ?? 1) > 1 ? 's' : ''}`]
            .filter(Boolean)
            .join(' · ')}
        />

        <button type="button" className="btn btn-primary" onClick={compartilharPodio}>
          Compartilhar o pódio
        </button>

        {erroAoCompartilhar && (
          <p role="alert" style={{ fontSize: 13, color: 'var(--danger)', margin: 0 }}>
            {erroAoCompartilhar}
          </p>
        )}

        {/*
          Os botões de rede mandam LINK, não imagem — intent por URL não anexa
          arquivo. Quem recebe vê o cartão Open Graph do site e, abrindo,
          escuta os arrotos da disputa. Quem quiser mandar a IMAGEM do pódio
          usa o botão acima, que abre a folha do sistema.
        */}
        <CompartilharEmRede
          url={url}
          texto={`${classificacao[0]?.nome} ganhou a disputa de arroto no Auê. Ouve aí.`}
        />

        <button type="button" className="btn btn-secondary" onClick={encerrar}>
          Nova disputa
        </button>
      </div>
    );
  }

  /* 3. O lobby com o gravador — o estado normal da disputa. */
  return (
    <div className="screen" style={{ paddingBottom: 80, gap: 'var(--space-4)' }}>
      <LobbyDeTurnos
        rotuloDoRound={`Round ${turno?.round} de ${batalha.rounds_total}`}
        participantes={batalha.participantes.map<ParticipanteEmTurno>((p) => {
          const melhor = classificacao.find((c) => c.nome === p.apelido)?.score;
          const jogadas = turno?.acabou ? 0 : (turno?.gravacoesPor.get(p.id) ?? 0);
          return {
            id: p.id,
            nome: p.apelido,
            status:
              p.id === turno?.daVez?.id
                ? 'vez'
                : jogadas >= (turno?.round ?? 1)
                  ? 'jogou'
                  : 'esperando',
            score: melhor,
          };
        })}
      />

      {erro && (
        <p role="alert" style={{ fontSize: 13, color: 'var(--danger)' }}>
          {erro}
        </p>
      )}

      {/*
        `key` força a remontagem entre turnos.

        O AudioRecorder já zera o próprio estado ao começar uma gravação nova,
        mas sem isto a tela do Bruno abriria mostrando a nota da Carol até ele
        tocar em gravar — e num jogo de passar o telefone, isso é a nota errada
        na mão da pessoa errada.

        A remontagem deixou de APAGAR resultado de alguém: desde o
        `NotaDoTurno`, quando a batalha troca é aquela tela que está no ar, e
        este gravador só volta a existir depois do toque em "Próximo turno".
      */}
      {turno?.daVez && (
        /*
          SEM `exigeAudio`, e a ausência é a decisão.

          Nos fluxos remotos (`/b/` e `/d/`) o áudio é o produto: o amigo abriu
          o link para ouvir, então resultado mudo não entra. Aqui as cinco
          pessoas estão na mesma sala e JÁ OUVIRAM o arroto ao vivo — o áudio é
          registro do pódio, não a experiência. Bloquear o turno até o upload
          dar certo pararia a mesa inteira num churrasco com sinal ruim, e a
          disputa não teria como avançar.

          A falha continua DITA na tela, agora pelo `NotaDoTurno` — que é onde
          ela pode ser lida com calma, e não no gravador que sai de cena no
          mesmo instante.
        */
        <AudioRecorder
          key={`${turno.daVez.id}-${turno.round}`}
          onRecordingComplete={gravar}
          hideChallengeButton
        />
      )}

      {/*
        ENCERRAR EM DOIS TOQUES.

        Precisa existir porque a disputa agora sobrevive a fechar o app: sem
        uma saída, quem abandonou uma disputa pela metade nunca mais
        conseguiria começar outra — a tela retomaria a antiga para sempre.

        Dois toques em vez de `window.confirm`: o diálogo do navegador rouba a
        tela inteira no celular e é o tipo de coisa que se aceita no reflexo.
        Aqui o primeiro toque só troca o rótulo do próprio botão.
      */}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => (confirmandoEncerrar ? encerrar() : setConfirmandoEncerrar(true))}
      >
        {confirmandoEncerrar ? 'Toca de novo pra largar essa disputa' : 'Encerrar esta disputa'}
      </button>
    </div>
  );
};

/* -------------------------------------------------------------------------- */

interface ConfiguracaoProps {
  nomes: string[];
  setNomes: React.Dispatch<React.SetStateAction<string[]>>;
  rounds: number;
  setRounds: (n: number) => void;
  local: LocalDaDisputa | null;
  setLocal: (l: LocalDaDisputa | null) => void;
  lugarLivre: string;
  setLugarLivre: (v: string) => void;
  onComecar: () => void;
  criando: boolean;
  erro: string | null;
  onSair?: () => void;
}

const Configuracao: React.FC<ConfiguracaoProps> = ({
  nomes,
  setNomes,
  rounds,
  setRounds,
  local,
  setLocal,
  lugarLivre,
  setLugarLivre,
  onComecar,
  criando,
  erro,
  onSair,
}) => (
  <div className="screen" style={{ paddingBottom: 80, gap: 'var(--space-5)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {onSair && (
        <button type="button" className="icon-btn" onClick={onSair} aria-label="Sair da disputa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        Disputa aqui
      </span>
      <span style={{ width: 44 }} />
    </div>

    <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
      Um aparelho, todo mundo em volta. Cada um arrota na sua vez e recebe a
      nota. No fim sai o pódio.
    </p>

    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <h2 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--muted)', margin: 0 }}>
        Quem vai disputar
      </h2>

      {nomes.map((nome, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={nome}
            maxLength={40}
            placeholder={`Participante ${i + 1}`}
            aria-label={`Nome do participante ${i + 1}`}
            onChange={(e) =>
              setNomes((atuais) => atuais.map((n, j) => (j === i ? e.target.value : n)))
            }
            style={{
              flex: 1,
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--fg)',
              font: 'inherit',
            }}
          />
          {nomes.length > 2 && (
            <button
              type="button"
              className="icon-btn"
              aria-label={`Tirar participante ${i + 1}`}
              onClick={() => setNomes((atuais) => atuais.filter((_, j) => j !== i))}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}

      {nomes.length < MAXIMO_DE_PARTICIPANTES && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setNomes((atuais) => [...atuais, ''])}
        >
          Mais um
        </button>
      )}

      {/*
        O aviso fica AQUI, ao lado dos nomes, e não escondido na política:
        quem digita os nomes é quem tem como avisar a mesa. É o único ponto do
        app em que uma pessoa registra o áudio de outra.
      */}
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
        Avise a galera: cada arroto fica guardado no Auê e quem tiver o link da
        disputa consegue ouvir.
      </p>
    </section>

    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <h2 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--muted)', margin: 0 }}>
        Quantos rounds
      </h2>
      <div style={{ display: 'flex', gap: 8 }}>
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRounds(n)}
            aria-pressed={rounds === n}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: rounds === n ? 'var(--accent)' : 'var(--surface)',
              color: rounds === n ? 'var(--bg)' : 'var(--fg)',
              fontWeight: 700,
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
        Todo mundo joga uma vez por round. Vale a melhor nota de cada um.
      </p>
    </section>

    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <h2 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--muted)', margin: 0 }}>
        Onde é a disputa <span style={{ textTransform: 'none' }}>(opcional)</span>
      </h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {LOCAIS.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            // Tocar de novo desmarca: é opcional, então tem que dar para voltar
            // atrás sem recarregar a tela.
            onClick={() => setLocal(local === opcao.valor ? null : opcao.valor)}
            aria-pressed={local === opcao.valor}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border)',
              background: local === opcao.valor ? 'var(--accent)' : 'var(--surface)',
              color: local === opcao.valor ? 'var(--bg)' : 'var(--fg)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>

      {/*
        "OUTRO" SEM NOME É PIOR QUE NADA.

        O chip existe porque o contrato (§3.8) pede a quinta opção, e o banco
        guarda os cinco valores fixos. Só que o banner do pódio imprimia
        "Outro lugar" na legenda — uma linha inteira do artefato que viaja para
        o grupo gasta para dizer "não é nenhum dos quatro".

        O campo é do APARELHO, não do banco: `venue_type` é CHECK e não aceita
        texto livre (ver `disputaGuardada.ts`). A disputa presencial acontece
        inteira neste celular, que é onde este rótulo precisa existir.
      */}
      {local === 'outro' && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            Onde vocês estão? Aparece no banner do pódio.
          </span>
          <input
            type="text"
            value={lugarLivre}
            maxLength={30}
            placeholder="Laje do Rian, van da firma, praia..."
            aria-label="Nome do lugar da disputa"
            onChange={(e) => setLugarLivre(e.target.value)}
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--fg)',
              font: 'inherit',
            }}
          />
        </label>
      )}
    </section>

    {erro && (
      <p role="alert" style={{ fontSize: 13.5, color: 'var(--danger)' }}>
        {erro}
      </p>
    )}

    <button type="button" className="btn btn-primary" onClick={onComecar} disabled={criando}>
      {criando ? 'Abrindo...' : 'Começar a disputa'}
    </button>
  </div>
);
