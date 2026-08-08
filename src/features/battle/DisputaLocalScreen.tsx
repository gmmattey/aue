import React, { useCallback, useMemo, useState } from 'react';

import {
  criarBatalhaPresencial,
  responderBatalha,
  type Batalha,
  type LocalDaDisputa,
  type ResultadoRow,
} from '../../db/supabase';
import { CompartilharEmRede } from '../../shared/components/CompartilharEmRede';
import { AudioRecorder } from '../audio/AudioRecorder';
import { useShareResult } from '../audio/useShareResult';
import { LobbyDeTurnos, type ParticipanteEmTurno } from './LobbyDeTurnos';
import { PodioBanner, ID_DO_PODIO, type ColocacaoNoPodio } from './PodioBanner';
import { calcularTurno, calcularClassificacao } from './turnos';

const MAXIMO_DE_PARTICIPANTES = 5;

const LOCAIS: { valor: LocalDaDisputa; rotulo: string }[] = [
  { valor: 'casa', rotulo: 'Em casa' },
  { valor: 'churrasco', rotulo: 'Churrasco' },
  { valor: 'publico', rotulo: 'Em público' },
  { valor: 'escritorio', rotulo: 'No escritório' },
  { valor: 'outro', rotulo: 'Outro lugar' },
];

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

  /* ----------------------------------------------------------- configuração */
  const [nomes, setNomes] = useState<string[]>(['', '']);
  const [rounds, setRounds] = useState(1);
  const [local, setLocal] = useState<LocalDaDisputa | null>(null);

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
      setBatalha(await criarBatalhaPresencial(limpos, rounds, local));
    } catch (err) {
      console.error('Falha ao criar a disputa presencial', err);
      setErro('Não foi possível abrir a disputa. Tenta de novo.');
    } finally {
      setCriando(false);
    }
  }, [nomes, rounds, local]);

  /* ----------------------------------------------------------------- turnos */

  /** Ver `turnos.ts` — a lógica vive fora daqui para poder ser testada. */
  const turno = useMemo(
    () =>
      batalha
        ? calcularTurno(batalha.participantes, batalha.rodadas, batalha.rounds_total ?? 1)
        : null,
    [batalha],
  );

  const gravar = useCallback(
    async (resultado: ResultadoRow) => {
      if (!batalha || !turno || turno.acabou || !turno.daVez) return;
      try {
        setBatalha(await responderBatalha(batalha.access_code, resultado.id, turno.daVez.id));
        setErro(null);
      } catch (err) {
        console.error('Falha ao registrar o turno', err);
        setErro('A nota saiu, mas não entrou na disputa. Tenta gravar de novo.');
      }
    },
    [batalha, turno],
  );

  /* ------------------------------------------------------------ classificação */

  const classificacao: ColocacaoNoPodio[] = useMemo(
    () => (batalha ? calcularClassificacao(batalha.participantes, batalha.rodadas) : []),
    [batalha],
  );

  const { shareResult } = useShareResult();

  /* ------------------------------------------------------------------ telas */

  if (!batalha) {
    return (
      <Configuracao
        nomes={nomes}
        setNomes={setNomes}
        rounds={rounds}
        setRounds={setRounds}
        local={local}
        setLocal={setLocal}
        onComecar={comecar}
        criando={criando}
        erro={erro}
        onSair={onSair}
      />
    );
  }

  const url = `${window.location.origin}/b/${batalha.access_code}`;
  const nomeDoLocal = LOCAIS.find((l) => l.valor === batalha.venue_type)?.rotulo;

  if (turno?.acabou) {
    return (
      <div className="screen" style={{ paddingBottom: 80, gap: 'var(--space-5)' }}>
        <PodioBanner
          colocacoes={classificacao}
          legenda={[nomeDoLocal, `${batalha.rounds_total} round${(batalha.rounds_total ?? 1) > 1 ? 's' : ''}`]
            .filter(Boolean)
            .join(' · ')}
        />

        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            shareResult({
              elementId: ID_DO_PODIO,
              url,
              titulo: 'Pódio do Auê',
              texto: `${classificacao[0]?.nome} ganhou a disputa de arroto. Olha o pódio.`,
            })
          }
        >
          Compartilhar o pódio
        </button>

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

        <button type="button" className="btn btn-secondary" onClick={() => setBatalha(null)}>
          Nova disputa
        </button>
      </div>
    );
  }

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

          A falha continua DITA na tela pelo próprio `AudioRecorder` (o aviso
          vermelho de `estadoAudio === 'falhou'`); o que não acontece é a
          disputa travar por causa dela.
        */
        <AudioRecorder
          key={`${turno.daVez.id}-${turno.round}`}
          onRecordingComplete={gravar}
          hideChallengeButton
        />
      )}
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
