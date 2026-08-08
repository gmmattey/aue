import React from 'react';
import type { ScoreResult } from '../rules';

/** Carrega o `data-od-id` do Open Design: `metrics`. */

export interface ParciaisEmBarrasProps {
  /**
   * O objeto inteiro, e não quatro números soltos: assim a ordem de leitura é
   * decidida aqui dentro e nenhum chamador consegue trocá-la sem querer.
   */
  parciais: ScoreResult['partialScores'];
}

/**
 * A ORDEM é do protótipo e é invariante — por isso vive numa constante única,
 * legível de cabo a rabo, em vez de quatro blocos de JSX soltos no meio da
 * tela. `origin` fica de fora de propósito: ele existe no tipo, pesa 10% da
 * nota, e nunca foi mostrado ao usuário.
 */
const ORDEM = [
  ['Profundidade', 'depth'],
  ['Potência', 'power'],
  ['Duração', 'duration'],
  ['Textura', 'texture'],
] as const;

/**
 * PARCIAIS COMO BARRAS, na ordem do protótipo.
 *
 * Eram quatro números numa grade de 4 colunas, na ordem Duração, Potência,
 * Profund., Textura — e "Profund." era abreviação forçada pela largura da
 * coluna. Empilhadas, as barras cabem o nome inteiro e dizem o que a grade não
 * dizia: 92 e 76 viram comprimentos comparáveis, que é a leitura que interessa
 * entre uma rodada e outra.
 *
 * NADA pode ser emitido antes da primeira `.metric-row`, nem envolver as linhas
 * em outro nó: `.metric-row:first-child { border-top: none }` depende de
 * parentesco direto, e um wrapper faria aparecer um filete acima de
 * "Profundidade" que hoje não existe.
 */
export const ParciaisEmBarras: React.FC<ParciaisEmBarrasProps> = ({ parciais }) => (
  <section className="metrics" data-od-id="metrics" style={{ marginTop: 'var(--space-5)' }}>
    {ORDEM.map(([rotulo, chave]) => {
      const valor = parciais[chave];
      return (
        <div className="metric-row" key={rotulo}>
          <div className="metric-head">
            <span>{rotulo}</span>
            <b>{valor.toFixed(0)}</b>
          </div>
          {/*
            `role="img"` com rótulo: a barra é decorativa para quem enxerga (o
            número já está ao lado), mas sem isto o leitor de tela anuncia duas
            divs vazias entre cada parcial.
          */}
          <div className="track" role="img" aria-label={`${rotulo}: ${valor.toFixed(0)} de 100`}>
            {/*
              O clamp é obrigatório e não é decoração: `width` negativa some com
              a barra e acima de 100% ela vaza do cartão fotografado.
            */}
            <div className="fill" style={{ width: `${Math.max(0, Math.min(100, valor))}%` }} />
          </div>
        </div>
      );
    })}
  </section>
);
