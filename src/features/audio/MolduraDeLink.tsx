import React from 'react';
import { Link } from 'react-router-dom';

import { cartaoDeLink } from './estilosDeLink';

/**
 * A casca das telas que se abrem a partir de um link compartilhado —
 * `/d/:id` (desafio, legado) e `/b/:code` (batalha).
 *
 * POR QUE ISTO É UM ARQUIVO PRÓPRIO
 * ---------------------------------
 * Esta é a PORTA DE ENTRADA do produto: o link cai no WhatsApp de alguém que
 * muitas vezes nunca ouviu falar do Auê. Já houve um bug exatamente aqui — os
 * estados de "carregando" e "não encontrado" do ChallengeView retornavam um
 * `<div className="screen">` solto, FORA do `.app-shell`: sem o container de
 * 440px, sem fundo escuro, sem cabeçalho e, principalmente, sem nenhuma saída.
 * Link antigo ou código errado caíam ali, e o visitante era perdido numa frase
 * de três palavras.
 *
 * Com duas telas de link, copiar essa casca seria criar duas versões da porta
 * de entrada que divergem na primeira correção feita só de um lado. Por isso
 * ela mora aqui, e as duas importam.
 */

interface MolduraDeLinkProps {
  /**
   * O que aparece como subtítulo, abaixo da marca. Ex.: "Batalha K7M3PQ9XTR".
   *
   * A ordem importa: o título é SEMPRE a marca, e o código vem depois. Quem
   * chega pelo link precisa saber onde está antes de saber qual é o código.
   */
  subtitulo?: string;
  children: React.ReactNode;
}

export const MolduraDeLink: React.FC<MolduraDeLinkProps> = ({ subtitulo, children }) => (
  <div className="app-shell">
    <header className="appbar">
      <Link to="/" style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="appbar-title">Auê!</span>
        {subtitulo && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {subtitulo}
          </span>
        )}
      </Link>
    </header>
    {children}
  </div>
);

/**
 * Explica o produto em uma linha e oferece o caminho para a Home.
 *
 * Fica sempre visível enquanto a disputa não terminou. Antes, o único link para
 * "/" aparecia depois do duelo resolvido: quem não quisesse gravar na hora —
 * sem microfone liberado, em lugar público, sem entender a brincadeira — não
 * tinha para onde ir.
 */
export const Convite: React.FC = () => (
  <div style={{ ...cartaoDeLink, marginTop: 'auto', marginBottom: 0 }}>
    <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 'var(--space-4)' }}>
      Auê é isto: você grava um arroto, recebe uma nota e desafia quem quiser.
    </p>
    <Link to="/" className="btn btn-secondary">
      Gravar o meu
    </Link>
  </div>
);
