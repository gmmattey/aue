import { ORIGEM_CANONICA } from '../../shared/enderecoPublico';

/**
 * O endereço que vai dentro do link do desafio.
 *
 * O QUE ACONTECEU, E POR QUE ISTO EXISTE
 * --------------------------------------
 * O link nascia sempre com `https://aue.vercel.app` cravado. Em produção isso
 * está certo. Em qualquer outro lugar, está errado de dois jeitos ao mesmo
 * tempo — e os dois morderam no primeiro teste de verdade do X1:
 *
 * 1. **o link levava para outro build.** O desafio foi criado num preview, com
 *    a Arena ligada, e o link mandava para a produção, onde a chave está
 *    desligada e quem atende é o fluxo antigo;
 * 2. **o link levava para outro BANCO.** Preview fala com o `aue-staging`,
 *    produção fala com o `Auê`. A batalha existia — no banco errado. Daí o
 *    "batalha não encontrada", que é verdade: naquele banco ela não existe
 *    mesmo.
 *
 * A ORIGEM DE ONDE O JOGO ESTÁ RODANDO resolve os dois: em produção ela É o
 * endereço canônico, e em preview ela mantém a briga inteira dentro do preview.
 *
 * Isto NÃO é voltar ao `window.location.origin` solto que o
 * `useShareResult` já teve e que gerava link morto: lá o problema era mandar
 * `localhost` para o telefone de outra pessoa. Aqui o alvo é o mesmo endereço
 * público de onde a pessoa abriu o jogo — se ela conseguiu abrir, quem recebe
 * também consegue.
 */
export function origemDoJogo(): string {
  if (typeof window === 'undefined') return ORIGEM_CANONICA;

  const origem = window.location?.origin;
  /*
    `file://`, `about:blank` e afins não servem de link para ninguém. Nesses
    casos o endereço canônico é o único palpite honesto.
  */
  if (!origem || !/^https?:\/\//.test(origem)) return ORIGEM_CANONICA;

  return origem;
}
