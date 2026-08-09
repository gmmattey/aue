import React from 'react';

import { formatarNota } from '../../shared/formato/nota';

export interface ParticipanteEmTurno {
  id: string;
  nome: string;
  status: 'jogou' | 'vez' | 'esperando';
  nota?: number;
}

interface LobbyDeTurnosProps {
  participantes: ParticipanteEmTurno[];
  /** Ex.: "Round 2 de 3". Some quando não houver. */
  rotuloDoRound?: string;
}

/**
 * A lista de quem já jogou, quem está na vez e quem falta.
 *
 * EXTRAÍDO DE `ChampionshipLobbyScreen`, não copiado. Aquela tela tinha o
 * visual pronto e correto — estados, ícone de concluído, destaque da vez,
 * nota alinhada à direita — mas com os participantes ESCRITOS À MÃO no JSX
 * (Carol 98,1 / Bruno / Julia). Copiar teria criado duas versões do mesmo
 * componente que divergem no primeiro ajuste feito só de um lado; agora a
 * tela de campeonato consome este arquivo com os dados dela, e a disputa
 * presencial consome com os dados reais do banco.
 *
 * Puramente apresentação: nenhum estado, nenhuma chamada de rede. O que ele
 * sabe fazer é desenhar uma lista de pessoas em três estados.
 */
export const LobbyDeTurnos: React.FC<LobbyDeTurnosProps> = ({
  participantes,
  rotuloDoRound,
}) => {
  const daVez = participantes.find((p) => p.status === 'vez');

  return (
    <>
      <div style={{ textAlign: 'center', padding: '8px 0 12px' }}>
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
          {rotuloDoRound ?? 'É a vez de'}
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
          {daVez ? `Vez de ${daVez.nome}` : 'Todo mundo jogou'}
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {participantes.map((p) => {
          const ehDaVez = p.status === 'vez';
          const jaJogou = p.status === 'jogou';

          return (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '13px 10px',
                borderTop: ehDaVez ? 'none' : '1px solid var(--border)',
                background: ehDaVez ? 'var(--accent-soft)' : 'transparent',
                borderRadius: ehDaVez ? 14 : 0,
                margin: ehDaVez ? '2px 0' : 0,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  color: jaJogou || ehDaVez ? 'var(--accent)' : 'var(--muted)',
                }}
                aria-hidden="true"
              >
                {jaJogou ? '✓' : ehDaVez ? '➔' : ''}
              </div>

              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  background: 'var(--border)',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                }}
                aria-hidden="true"
              >
                {p.nome.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {jaJogou ? 'Já jogou' : ehDaVez ? 'Na vez' : 'Aguardando'}
                </div>
              </div>

              {/*
                `!== undefined` e não um truthy check: o original usava
                `{p.nota && ...}`, que esconde a nota de quem tirou 0,0 — e
                zero é um resultado perfeitamente possível (e engraçado) neste
                jogo. Sumir com a nota faria parecer que a gravação falhou.
              */}
              {p.nota !== undefined && (
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15 }}>
                  {formatarNota(p.nota)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};
