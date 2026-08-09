import type React from 'react';
import { IconeDeMicrofone } from './icones';

/**
 * A onda achatada, igual à da `TelaSemSom`.
 *
 * MESMO DESENHO DE PROPÓSITO, apesar de o motivo ser outro: as duas telas dizem
 * "isso aqui não vira nota", e quem está com o telefone na mão não precisa
 * aprender dois vocabulários visuais para o mesmo desfecho. O que muda é o
 * texto, que é onde a diferença de fato está.
 */
const ONDA_CHATA = ['15%', '22%', '12%', '25%', '18%', '10%', '20%', '14%', '24%', '16%'];

export interface TelaNaoEhArrotoProps {
  onTentarDeNovo: () => void;
  onCancelar: () => void;
}

/**
 * TEVE SOM, MAS NÃO TEVE ARROTO — o veredito do juiz (#19).
 *
 * A `TelaSemSom` cobre "não chegou sinal nenhum". Esta cobre o caso oposto e
 * novo: chegou som, o modelo ouviu, e o que havia ali era conversa, risada,
 * assobio ou a televisão ligada.
 *
 * POR QUE NÃO REUSAR A `TelaSemSom` COM OUTRO TEXTO: as duas dizem coisas
 * incompatíveis. "Coé, não peguei nada aí" num áudio em que a pessoa FALOU alto
 * é o app mentindo sobre o que aconteceu — e mandaria a pessoa chegar mais perto
 * do microfone, que é justamente o conselho que não resolve nada aqui. O
 * AGENTS.md proíbe interface que finge saber a causa; dizer o motivo certo é o
 * outro lado da mesma regra.
 *
 * O TOM NÃO ACUSA DE TRAPAÇA. É "não achei arroto", não "você tentou me
 * enganar" — porque o juiz erra, e chamar de picareta quem arrotou de verdade é
 * pior do que deixar uma conversa passar (é a mesma assimetria que escolheu o
 * limiar em `vereditoDeArroto.ts`). Por isso o botão principal é TENTAR DE NOVO
 * e o texto trata a recusa como coisa do juiz, não defeito da pessoa.
 */
export const TelaNaoEhArroto: React.FC<TelaNaoEhArrotoProps> = ({
  onTentarDeNovo,
  onCancelar,
}) => (
  <section className="fx-centro" data-od-id="not-a-burp-hero">
    {/* Mesmo snap de 160 ms da `TelaSemSom`: marca o instante, não fica piscando. */}
    <div className="fx-selo fx-snap-erro">
      <IconeDeMicrofone />
    </div>

    <div className="fx-onda" aria-hidden="true" data-od-id="flat-waveform">
      {ONDA_CHATA.map((altura, indice) => (
        <i key={indice} style={{ height: altura }} />
      ))}
    </div>

    <div>
      <h1 className="fx-h1">Isso não foi arroto, chefe.</h1>
      <p className="fx-sub" role="alert" style={{ marginTop: 'var(--space-3)' }}>
        Ouvi a gravação inteira e não achei arroto nenhum. Sem arroto, não tem
        nota — manda de novo, agora de verdade.
      </p>
    </div>

    <div className="fx-rodape" style={{ width: '100%' }}>
      <button
        type="button"
        className="btn btn-primary"
        onClick={onTentarDeNovo}
        data-od-id="btn-tentar-de-novo"
      >
        TENTAR DE NOVO
      </button>
      <button type="button" className="fx-ghost" onClick={onCancelar} data-od-id="btn-cancelar">
        Cancelar
      </button>
    </div>
  </section>
);
