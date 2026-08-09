/**
 * A política de privacidade não pode afirmar coisa diferente do que a build faz.
 *
 * O PROBLEMA QUE ISTO RESOLVE
 * ---------------------------
 * A política dizia, numa lista de "o que o Auê não faz": "Não exibe anúncios
 * nesta versão". Ao mesmo tempo, `ResultadoScreen` monta um `<AdBanner>` que
 * liga SOZINHO quando `VITE_ADSENSE_CLIENT` e `VITE_ADSENSE_SLOT_RESULT` são
 * preenchidas e o build é refeito — sem mudar uma linha de código.
 *
 * Ou seja: bastava alguém preencher duas variáveis na Vercel, exatamente como o
 * checklist de lançamento manda fazer, para o app passar a exibir anúncio do
 * Google enquanto o documento legal publicado jurava que não exibia. Ninguém
 * mentiria de propósito; a mentira seria efeito colateral de uma configuração.
 *
 * Por isso a frase da política passa a ser DERIVADA das mesmas variáveis, e
 * `coerenciaDeAnuncios.test.tsx` monta a tela de resultado de verdade para
 * conferir que o que a política diz bate com o que a tela renderiza.
 *
 * VIÉS DELIBERADO PARA O LADO DE DECLARAR
 * ---------------------------------------
 * Basta um slot preenchido (resultado OU feed) para a política assumir que há
 * anúncio. Se alguém preencher só o slot do feed — que está desligado por flag
 * no corte — a política declara anúncios que ninguém vê. Declarar a mais é
 * chato; declarar a menos é o documento legal mentindo. Os dois erros não
 * custam o mesmo.
 */

const CLIENTE = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;
const SLOT_RESULTADO = import.meta.env.VITE_ADSENSE_SLOT_RESULT as string | undefined;
const SLOT_FEED = import.meta.env.VITE_ADSENSE_SLOT_FEED as string | undefined;

/**
 * `true` quando esta build pode servir anúncio do Google a alguém.
 *
 * Espelha a condição de `AdBanner` (`CLIENTE_ADSENSE && adSlot`). É duplicação
 * de regra crítica, e por isso tem contrato de paridade em teste — é o padrão
 * que `AGENTS.md` pede para este caso.
 */
export const ANUNCIOS_ATIVOS = Boolean(CLIENTE) && Boolean(SLOT_RESULTADO || SLOT_FEED);
