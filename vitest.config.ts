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
 * OBJETO CRU EM VEZ DE `defineConfig`, DE PROPÓSITO:
 * o `vitest` está declarado em `devDependencies` mas ainda NÃO está em
 * `node_modules` (`npm install` depende de autorização do Luiz). O Vitest
 * carrega este arquivo resolvendo os imports a partir da RAIZ DO PROJETO, não
 * do cache do `npx`, então `import { defineConfig } from 'vitest/config'`
 * quebra o startup com ERR_MODULE_NOT_FOUND. Um objeto exportado é aceito do
 * mesmo jeito.
 *
 * Depois do `npm install`, dá para trocar por:
 *     import { defineConfig } from 'vitest/config';
 *     export default defineConfig({ ... });
 * e ganhar autocomplete/checagem das opções.
 */
export default {
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
};
