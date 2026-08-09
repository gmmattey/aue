import React, { useState } from 'react';

import { LobbyDeTurnos, type ParticipanteEmTurno } from '../battle/LobbyDeTurnos';
import { PodioBanner, type ColocacaoNoPodio } from '../battle/PodioBanner';

interface ChampionshipLobbyScreenProps {
  onStartRecordingForTurn?: () => void;
  onBack?: () => void;
}

/**
 * Lobby de campeonato — PROTÓTIPO, atrás de `FLAGS.ligas` e hoje inalcançável.
 *
 * O QUE MUDOU AQUI: nada de comportamento. Os participantes e o pódio
 * continuam sendo os mesmos dados escritos à mão de antes, e a tela continua
 * desligada. O que saiu foram os ~140 linhas de JSX que DESENHAVAM a lista de
 * turnos e o pódio — agora ela consome `LobbyDeTurnos` e `PodioBanner`, os
 * mesmos componentes que a disputa presencial usa com dados reais.
 *
 * O motivo é conservador: com a disputa presencial nascendo, existiriam duas
 * versões do mesmo visual, e a primeira correção feita só de um lado as faria
 * divergir para sempre. Uma fonte visual, dois consumidores.
 *
 * O AVISO DE `flags.ts` CONTINUA VALENDO: ligar `VITE_FEATURE_LIGAS` sem antes
 * plugar esta tela em `getChampionshipLobby` volta a mostrar nomes e notas que
 * não existem no banco.
 */
export const ChampionshipLobbyScreen: React.FC<ChampionshipLobbyScreenProps> = ({
  onStartRecordingForTurn,
  onBack,
}) => {
  const [showPodium, setShowPodium] = useState(false);

  // DADOS DE PROTÓTIPO. Não vêm do banco. Ver o comentário acima.
  const participantes: ParticipanteEmTurno[] = [
    { id: '1', nome: 'Carol', status: 'jogou', nota: 98.1 },
    { id: '2', nome: 'Você', status: 'vez' },
    { id: '3', nome: 'Bruno', status: 'esperando' },
    { id: '4', nome: 'Julia', status: 'esperando' },
  ];

  // `posicao` passou a ser obrigatória no `PodioBanner`: o número do pódio
  // deixou de sair do índice do array para que empate deixe de virar desempate
  // inventado (ver `turnos.ts`). Aqui as três são literais como o resto destes
  // dados de protótipo.
  const podio: ColocacaoNoPodio[] = [
    { nome: 'Carol', nota: 98.1, posicao: 1 },
    { nome: 'Bruno', nota: 95.6, posicao: 2 },
    { nome: 'Rafa', nota: 93.0, posicao: 3 },
  ];

  if (showPodium) {
    return (
      <div className="screen" style={{ paddingBottom: 80, gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowPodium(false)}
            aria-label="Voltar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <PodioBanner colocacoes={podio} />

        <button type="button" className="btn btn-secondary" onClick={() => setShowPodium(false)}>
          Nova rodada
        </button>
      </div>
    );
  }

  return (
    <div className="screen" style={{ paddingBottom: 80, gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {onBack && (
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Sair do lobby">
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
          Galera do Escritório
        </span>
        <span style={{ width: 44 }} />
      </div>

      <LobbyDeTurnos participantes={participantes} />

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        <button type="button" className="btn btn-primary" onClick={onStartRecordingForTurn}>
          Arrotar
        </button>

        <button
          type="button"
          onClick={() => setShowPodium(true)}
          style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}
        >
          Todo mundo já jogou? Ver pódio →
        </button>
      </div>
    </div>
  );
};
