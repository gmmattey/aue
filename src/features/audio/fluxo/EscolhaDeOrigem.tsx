import type React from 'react';
import type { Origin } from '../rules';
import { OPCOES_DE_ORIGEM } from './origens';

export interface EscolhaDeOrigemProps {
  /**
   * Recebe o par que a RPC `submit_resultado` espera: `origin_type` e, quando
   * houver, `origin_subtype`.
   */
  onEscolher: (tipo: Origin, subtipo?: string) => void;
  /**
   * Trava os botões enquanto não há o que enviar (análise correndo) ou enquanto
   * o envio está em curso.
   *
   * NÃO É ENFEITE: se a pessoa tocasse numa origem antes de a análise terminar,
   * `useEnvioDoResultado.enviar` cairia no `if (!metricas) return` e o toque
   * sumiria sem erro, sem tela e sem nota. Botão desabilitado diz a verdade;
   * botão que não faz nada, não.
   */
  desabilitado: boolean;
}

/**
 * AS OPÇÕES DE ORIGEM, no nível principal, dentro da tela de julgamento.
 *
 * Substitui a folha inferior (`OriginSheet`), que tinha dois problemas de
 * contrato e um de fluxo:
 *
 *   * cerveja e refrigerante — duas das cinco opções obrigatórias do §3.4 —
 *     estavam escondidas atrás de "Pós bebida";
 *   * "outro" não existia em lugar nenhum;
 *   * fechar a folha pelo scrim deixava o fluxo pendurado, e o resgate era um
 *     botão separado ("Escolher a origem") que só aparecia em algumas
 *     combinações de estado.
 *
 * Aqui não há nada para fechar por engano: a tela de julgamento É a pergunta, e
 * ela espera. Ver `origens.ts` para a lista e o critério da ordem.
 */
export const EscolhaDeOrigem: React.FC<EscolhaDeOrigemProps> = ({ onEscolher, desabilitado }) => (
  <div className="fx-origem" data-od-id="judging-origin">
    <span className="fx-origem-rotulo" id="rotulo-da-origem">
      De onde veio?
    </span>

    <div className="fx-origem-grade" role="group" aria-labelledby="rotulo-da-origem">
      {OPCOES_DE_ORIGEM.map((opcao) => (
        <button
          key={opcao.id}
          type="button"
          className="fx-origem-opcao"
          disabled={desabilitado}
          onClick={() => onEscolher(opcao.tipo, opcao.subtipo)}
          data-od-id={`origin-choice-${opcao.id}`}
        >
          <span aria-hidden="true">{opcao.emoji}</span>
          {opcao.rotulo}
        </button>
      ))}
    </div>
  </div>
);
