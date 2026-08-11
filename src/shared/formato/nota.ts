/**
 * A NOTA ESCRITA. Fonte única.
 *
 * VÍRGULA, e não ponto. O protótipo (`resultado.html`, `data-od-id="score-value"`)
 * mostra "91,4"; `toFixed(1)` devolvia "91.4". Num app inteiro em português a
 * nota era o único número escrito em inglês, bem no lugar onde o olho para.
 *
 * O comentário acima morava só no `CartaoDaNota.tsx` e valia para UM ponto,
 * enquanto os outros onze escreviam a mesma nota de dois outros jeitos: quatro
 * com `toFixed(1)` cru (BattleView ×2, ChallengeView ×2 — o bug: ponto, em
 * inglês) e seis com `toFixed(1).replace('.', ',')`. O sintoma era a pessoa
 * tirar 91,4 na tela de resultado, mandar o link, e o amigo abrir a batalha e
 * ver "91.4" — o mesmo número, em outro idioma, na mesma sessão de uso. Por
 * isso a proibição passa a viver aqui, onde vale para os doze:
 *
 *   Se algum dia isto falhar num Node sem ICU completo, o conserto é o ambiente
 *   de teste — NUNCA voltar para `toFixed(1).replace('.', ',')`.
 *
 * Mora em `src/shared/` e não em `src/features/audio/` por direção de
 * dependência: `shared` importando de uma feature é o acoplamento que o
 * AGENTS.md barra, e os pontos de uso estão espalhados por várias features —
 * nenhuma é dona da nota.
 *
 * Sem React, sem `db/supabase`, sem import de feature: só `Intl`.
 */

/**
 * O que a tela mostra quando não há nota. NÃO é '' e NÃO é '0,0'.
 *
 * '' deixaria um buraco no layout (a nota é desenhada com `fontSize: 40` em
 * BattleView e ChallengeView), e este repositório já decidiu duas vezes
 * (AudioPlayback, FeedScreen) que ausência se diz em vez de sumir. '0,0' seria
 * mentira grave: zero É uma nota possível — e engraçada — neste jogo, que é
 * exatamente o que a guarda `p.score !== undefined` do LobbyDeTurnos protege.
 */
export const NOTA_AUSENTE = '—';

/**
 * UMA instância para o módulo inteiro, não uma por chamada.
 *
 * `toLocaleString('pt-BR', {...})` constrói um `Intl.NumberFormat` novo a cada
 * chamada, e a nota é desenhada dentro de tela que anima por
 * `requestAnimationFrame` na revelação — seria um formatador novo por quadro.
 * Lista longa paga o mesmo custo vezes o número de linhas.
 *
 * Constante imutável de escopo de módulo: `formatarNota` continua pura
 * (determinística, sem efeito). O preço é que trocar de locale em runtime é
 * impossível — e isso é intencional: a nota tem que sair em pt-BR mesmo num
 * aparelho configurado em inglês, que é o que o `'pt-BR'` fixo já garantia.
 */
const FORMATADOR_DE_NOTA = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * A nota escrita em português: vírgula, uma casa decimal. "91,4".
 *
 * Aceita `string` porque `score` é `numeric` no Postgres e o tipo `number` das
 * interfaces de `db/supabase.ts` é uma promessa que o runtime não assina —
 * `turnos.ts` já fazia `Number(r.score)` por conta própria, e seis dos doze
 * pontos de uso repetiam o mesmo `Number(...)` no meio do JSX.
 *
 * A coerção entra AQUI e não fica com quem chama: `Number(null) === 0` e
 * `Number('') === 0`, então coagir do lado de fora imprime '0,0' para nota
 * ausente sem ninguém notar. Aqui a ausência é decidida ANTES da coerção.
 *
 * Sem segundo parâmetro de casas decimais: a casa única não é configuração, é
 * o contrato com o protótipo Open Design — um parâmetro abriria a porta para a
 * segunda divergência. Sem parâmetro de fallback enquanto nenhum ponto de uso
 * pedir; os quatro sites com valor opcional já resolvem a ausência com guarda
 * de render própria, e `NOTA_AUSENTE` é só a rede de segurança.
 *
 * ATENÇÃO a string JÁ formatada: `formatarNota('91,4')` faz `Number('91,4')` →
 * `NaN` → `NOTA_AUSENTE`. Não é regressão (hoje esse caminho imprime
 * literalmente 'NaN' na tela), mas se um dia um endpoint devolver a nota com
 * vírgula, o sintoma será um travessão no lugar do número — e o culpado é o
 * endpoint, não esta função.
 */
export function formatarNota(valor: number | string | null | undefined): string {
  // `''` é testado junto com nulo de propósito: string vazia é a forma que a
  // ausência assume quando ela vem do banco, e `Number('')` é 0.
  if (valor === null || valor === undefined || valor === '') return NOTA_AUSENTE;

  const numero = Number(valor);

  // `Number.isFinite` e não `isNaN`: cobre `Infinity` no mesmo teste. Devolver
  // 'NaN' ou '∞' na tela é pior do que qualquer alternativa.
  if (!Number.isFinite(numero)) return NOTA_AUSENTE;

  return FORMATADOR_DE_NOTA.format(numero);
}
