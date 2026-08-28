/**
 * Config de teste separada do `vite.config.ts` de propósito.
 *
 * O `vite.config.ts` carrega o `VitePWA`, que gera service worker e manifest —
 * trabalho inútil e ruidoso para rodar teste de unidade. O Vitest dá
 * preferência a `vitest.config.ts` quando ele existe, então a config de build
 * fica intocada.
 *
 * Ambiente `node`: os testes atuais são de lógica pura e de leitura de arquivo
 * (`node:fs`). Quando aparecer o primeiro teste de componente React, o caminho
 * é adicionar `environment: 'jsdom'` por arquivo (bloco de comentário
 * `// @vitest-environment jsdom`) em vez de trocar o padrão global — mudar o
 * padrão deixa todo teste de lógica pagando o custo do DOM.
 *
 * Este arquivo exportava um OBJETO CRU porque o `vitest` estava declarado em
 * devDependencies sem estar em `node_modules`, e o import de `vitest/config`
 * quebrava o startup com ERR_MODULE_NOT_FOUND. O pacote está instalado desde o
 * commit e0f2655, então voltamos ao `defineConfig` — que dá checagem de tipo e
 * autocomplete das opções.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    /*
     * `.tsx` entrou junto com o `.ts`: o `BotaoDeDesafiar.test.tsx` escreve JSX
     * e, com o padrão anterior, o arquivo simplesmente não era coletado — o
     * `npm test` passava verde sem nunca ter rodado o teste que trava o gate do
     * botão de desafiar, que é o pior jeito de um teste falhar.
     */
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    /*
     * Chaves FICTÍCIAS do Supabase.
     *
     * `createClient` lança com URL vazia, e `src/db/supabase.ts` é importado em
     * cadeia por quase toda tela — sem isto, qualquer teste que importe um
     * componente quebra no import, e quebraria de forma diferente conforme o
     * `.env` de cada máquina. Nenhum teste faz requisição: a renderização de
     * fumaça é `renderToStaticMarkup`, que não roda efeitos.
     */
    env: {
      VITE_SUPABASE_URL: 'https://exemplo.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'chave-ficticia-de-teste',

      /*
       * FLAGS DESLIGADAS À FORÇA — pelo mesmo motivo das chaves acima.
       *
       * O Vitest carrega `.env.local` junto com o Vite. Quem estivesse
       * o `lancamento.smoke.test.ts` ficar vermelho sem ter mexido em nada — e
       * o mesmo valia para qualquer outra flag, desde sempre. Pior: a suíte
       * passaria a testar um corte de lançamento diferente por máquina.
       *
       * Isto aconteceu de verdade ao construir a Arena; não é precaução
       * teórica. O teste que exige "sem variável, tudo desligado" agora
       * pergunta isso ao código, e não ao computador de quem rodou.
       */
      VITE_FEATURE_LOGIN_SOCIAL: '',
      VITE_FEATURE_DISPUTA_LOCAL: '',
    },
  },
});
