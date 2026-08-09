import { NOMES_DAS_MEDIDAS } from '../../nucleo/fala/julgamento';
import type { MedidasDoArroto } from '../../portas/juiz';

/**
 * As quatro medidas do arroto.
 *
 * **Em linha, nunca em card** — é regra do design system, e ela existe para o
 * gameplay não virar painel de controle. Quatro linhas se leem de uma vez;
 * quatro cards viram um dashboard que ninguém olha.
 *
 * Elas aparecem **depois** do número. Mostrar medida antes da nota é entregar o
 * detalhe antes do resultado, e o resultado é o que a pessoa veio buscar.
 */
interface Props {
  medidas: MedidasDoArroto;
}

const ORDEM = ['grave', 'estouro', 'folego', 'sujeira'] as const;

export function MedidasEmLinha({ medidas }: Props) {
  return (
    <div className="medidas">
      {ORDEM.map((chave) => {
        const valor = Math.round(medidas[chave]);
        return (
          <div className="medida" key={chave}>
            <div className="medida-topo">
              <span>{NOMES_DAS_MEDIDAS[chave]}</span>
              <b>{valor}</b>
            </div>
            {/* A barra é a mesma informação em forma de comprimento: quem bate
                o olho vê o perfil do arroto sem ler quatro números. */}
            <div className="trilho">
              <i style={{ width: `${Math.min(100, Math.max(0, valor))}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
