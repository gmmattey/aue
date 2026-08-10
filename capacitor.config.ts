import type { CapacitorConfig } from '@capacitor/cli';

/**
 * A casca — decidida no ADR 0002.
 *
 * Ela envolve o MESMO `dist/` que vai para a web. Não existe build de jogo
 * separado para loja, e não pode passar a existir: o dia em que a casca tiver o
 * próprio código de tela, viraram dois jogos.
 *
 * O QUE ESTE ARQUIVO NÃO FAZ: ele não decide nada de jogo. Estado, regra, nota
 * e desafio continuam onde sempre estiveram. Aqui só se declara como o pacote
 * se chama e de onde ele carrega o que já foi construído.
 */
const config: CapacitorConfig = {
  /*
    PERMANENTE. Publicado uma vez, nem a Play nem a Apple deixam trocar —
    ADR 0002 §5. `auegames` é o guarda-chuva dos próximos jogos.
  */
  appId: 'com.auegames.aue',

  /** O que aparece embaixo do ícone. Mesmo nome do manifesto da web. */
  appName: 'Auê!',

  /*
    A pasta que o `vite build` produz. É por isso que `npx cap sync` só faz
    sentido DEPOIS de um build — sincronizar sem build copia o dist velho, e o
    app fica uma versão atrás sem avisar ninguém.
  */
  webDir: 'dist',

  /*
    Mesmo `--bg` do `src/index.css` e do manifesto da web. Sem isto, o branco
    padrão pisca entre a tela de abertura e a Arena, num jogo de fundo preto.
  */
  backgroundColor: '#0a0a08',
};

export default config;
