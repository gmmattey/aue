import React from 'react';

import type { RodadaDaBatalha } from '../../db/supabase';
import { ReportButton } from '../../shared/components/ReportButton';
import { formatarNota } from '../../shared/formato/nota';
import { AudioPlayback } from '../audio/AudioPlayback';
import { cartaoDeLink } from '../audio/estilosDeLink';

interface CartaoDeRodadaProps {
  rodada: RodadaDaBatalha;
  /**
   * O que vem antes do nome no topo do cartão.
   *
   * Muda com o tipo de batalha, e por isso é prop e não texto fixo: na remota o
   * que ordena é a POSIÇÃO na sequência ("3º"); na disputa presencial o que a
   * mesa acompanha é o ROUND ("Round 2"), porque as cinco pessoas gravam em
   * volta do mesmo aparelho e a posição absoluta não diz nada a ninguém.
   */
  rotulo: string;
  userId?: string;
}

/**
 * Uma rodada no feed da batalha.
 *
 * SAIU DE DENTRO DO `BattleView` quando a disputa presencial passou a ser
 * renderizada pela mesma rota (`/b/CODIGO`). As duas telas mostram a mesma
 * coisa — nota, classificação, o arroto e o botão de denúncia —, e duas cópias
 * divergiriam na primeira correção feita só de um lado.
 *
 * A posição/round vem antes do nome de propósito: numa batalha de cinco pessoas
 * com três rodadas cada, "quem é" importa menos que "qual dessas é".
 */
export const CartaoDeRodada: React.FC<CartaoDeRodadaProps> = ({ rodada, rotulo, userId }) => (
  <div style={cartaoDeLink}>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 'var(--space-2)',
      }}
    >
      <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>
        {rotulo} · {rodada.apelido}
      </div>
      {rodada.e_artificial && <div style={{ fontSize: 11, color: 'var(--danger)' }}>puxou ar</div>}
    </div>

    <div
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 40,
        color: 'var(--accent)',
        lineHeight: 1.1,
      }}
    >
      {formatarNota(rodada.nota)}
    </div>
    <div style={{ fontSize: 14 }}>{rodada.classificacao}</div>

    {/*
      O item mais importante do cartão. `AudioPlayback` já trata `caminho_do_audio`
      nulo sem desenhar um player mudo — e a frase explica em vez de omitir,
      senão o visitante não distingue "sem som" de "site quebrado".
    */}
    <div style={{ marginTop: 'var(--space-4)' }}>
      <AudioPlayback
        audioPath={rodada.caminho_do_audio}
        rotulo={`Arroto de ${rodada.apelido}`}
        textoQuandoNaoHa="Esta rodada não tem áudio salvo — só a nota."
      />
    </div>

    <div style={{ marginTop: 'var(--space-2)' }}>
      <ReportButton resultId={rodada.resultado_id} userId={userId} />
    </div>
  </div>
);
