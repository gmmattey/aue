import type { Origin } from '../rules';

/**
 * As opções de origem oferecidas no NÍVEL PRINCIPAL da tela de julgamento.
 *
 * docs/jogo/REGRAS.md §3 exige as opções no nível principal: cerveja,
 * refrigerante, comida, puxando ar e outro. A folha antiga (`OriginSheet`)
 * oferecia "Espontâneo / Pós bebida / Comida / Forçado com ar" e escondia
 * cerveja e refrigerante atrás de um submenu — nenhuma das duas era alcançável
 * em um toque, e "outro" não existia em lugar nenhum.
 *
 * A LISTA FICOU PLANA, e o submenu morreu junto. Três razões:
 *
 * 1. A regra pede todas no nível principal. Submenu é, por definição, um
 *    segundo nível.
 * 2. A folha era um `<div>` sobreposto com scrim clicável; fechar pelo scrim
 *    deixava o fluxo pendurado esperando uma origem que ninguém escolheu, e o
 *    resgate era um botão à parte ("Escolher a origem"). Sem folha, não há o que
 *    fechar por engano: a tela de julgamento espera, e é isso.
 * 3. O segundo nível existia para gravar `subtipo_de_origem` (Vinho, Pizza,
 *    Hambúrguer...), e NENHUMA tela do produto lê aquele campo. Cerveja e
 *    refrigerante continuam gravando subtipo porque agora são opções de
 *    primeiro nível; o resto do detalhe foi embora sem consumidor nenhum sentir
 *    falta.
 *
 * A ORDEM NÃO É POR PONTUAÇÃO, e isso é deliberado. Ela segue o que aconteceu:
 * primeiro o que a pessoa consumiu, depois o arroto que veio sozinho, depois o
 * fabricado, e por último a saída de quem não vai detalhar. Ordenar por peso
 * transformaria a lista num ranking e a declaração num botão de bônus.
 *
 * 'Espontâneo' é a origem que vale 100 e ficou no nível principal de propósito. Tirá-la teria dois efeitos ruins e nenhum bom:
 * o teto de nota cairia de 100 para 90 para todo mundo (a origem pesa 10% e ela
 * é a única que vale 100), e o arroto natural — o caso mais comum do produto —
 * ficaria sem rótulo, empurrado para "Outro".
 */
export interface OpcaoDeOrigem {
  /** Identificador estável para teste e para `data-od-id`. */
  id: string;
  rotulo: string;
  emoji: string;
  tipo: Origin;
  /**
   * Só existe para 'Bebida' e 'Comida': a constraint
   * `resultados_subtipo_de_origem_coerente` (20260807000023) rejeita subtipo em
   * qualquer outra origem, e a RPC o anula antes disso.
   */
  subtipo?: string;
}

export const OPCOES_DE_ORIGEM: readonly OpcaoDeOrigem[] = [
  { id: 'cerveja', rotulo: 'Cerveja', emoji: '🍺', tipo: 'Bebida', subtipo: 'Cerveja' },
  { id: 'refrigerante', rotulo: 'Refri', emoji: '🥤', tipo: 'Bebida', subtipo: 'Refrigerante' },
  { id: 'comida', rotulo: 'Comida', emoji: '🍔', tipo: 'Comida' },
  { id: 'espontaneo', rotulo: 'Espontâneo', emoji: '⚡', tipo: 'Espontâneo' },
  { id: 'ar', rotulo: 'Puxando ar', emoji: '💨', tipo: 'Puxei ar' },
  { id: 'outro', rotulo: 'Outro', emoji: '🤷', tipo: 'Outro' },
];
