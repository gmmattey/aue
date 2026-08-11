import { NOMES_DAS_MEDIDAS, ORDEM_DAS_MEDIDAS } from '../../nucleo/fala/julgamento';
import type { MedidasDoArroto } from '../../portas/pontuacao';

/**
 * As três medidas do arroto: FORÇA · FÔLEGO · GRAVE.
 *
 * **Em linha, nunca em card** — é regra do design system, e ela existe para o
 * gameplay não virar painel de controle.
 *
 * ERAM QUATRO. `Sujeira` saiu porque o motor v2 zerou o peso da textura na
 * conta: continuar mostrando uma barra para ela é dizer que aquilo conta,
 * quando não conta mais. O número segue existindo no contrato e no banco —
 * quem sumiu foi a barra, não o dado.
 *
 * Elas aparecem **depois** do número, no penúltimo passo da cascata
 * (`nucleo/arena/revelacao.ts`). Medida antes da nota é entregar o detalhe
 * antes do resultado.
 */
interface Props {
  medidas: MedidasDoArroto;
}

export function MedidasEmLinha({ medidas }: Props) {
  return (
    <div className="medidas">
      {ORDEM_DAS_MEDIDAS.map((chave) => {
        const valor = Math.round(medidas[chave]);
        return (
          <div className="medida" key={chave}>
            <div className="medida-topo">
              <span>{NOMES_DAS_MEDIDAS[chave]}</span>
              <b>{valor}</b>
            </div>
            {/* A barra é a mesma informação em forma de comprimento: quem bate
                o olho vê o perfil do arroto sem ler três números. */}
            <div className="trilho">
              <i style={{ width: `${Math.min(100, Math.max(0, valor))}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
