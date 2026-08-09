import type React from 'react';

/**
 * O CSS das telas do fluxo de gravação, num `<style>` só.
 *
 * POR QUE NÃO ESTÁ NO `src/index.css`, que é onde mora o CSS da tela de
 * resultado: aquele arquivo é território comum do app, e este passo tinha
 * fronteira declarada em `src/features/audio/**`. Um bloco `<style>` mantém as
 * quatro telas novas autossuficientes — quem apagar a pasta apaga o CSS junto,
 * sem deixar regra órfã no arquivo global.
 *
 * As classes são todas prefixadas `fx-` para não colidirem com as globais. O
 * que já existe em `index.css` (`.btn`, `.btn-primary`, `.btn-secondary`,
 * `.eyebrow`, `.icon-btn`) é REUSADO, não recopiado.
 *
 * Renderizado UMA vez, pelo `AudioRecorder`. Duas instâncias do mesmo `<style>`
 * seriam inofensivas, mas não há razão para ter duas.
 */
export const EstilosDoFluxo: React.FC = () => (
  <style>{`
/* ---------------------------------------------------------------- estrutura */
.fx-centro {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: var(--space-5);
  padding: var(--space-5) 0;
}
.fx-h1 {
  font-family: var(--font-display);
  font-size: clamp(30px, 8vw, 40px);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  text-wrap: balance;
}
.fx-sub {
  font-size: 14px;
  line-height: 1.5;
  color: var(--muted);
  max-width: 30ch;
}
.fx-rodape {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding-top: var(--space-4);
}
.fx-ghost {
  background: none;
  color: var(--muted);
  font-weight: 600;
  font-size: 14px;
  padding: 10px;
  min-height: 44px;
}
.fx-ghost:hover { color: var(--fg); }

/* ------------------------------------------------------------- gravando */
.fx-pill-rec {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  background: var(--surface);
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.fx-ponto-rec {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
  background: var(--danger);
  animation: fx-pulsar 1.1s ease-in-out infinite;
}
.fx-bolha-area {
  position: relative;
  width: 200px;
  height: 200px;
  display: grid;
  place-items: center;
}
.fx-anel {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-full);
  border: 1px solid var(--accent-soft);
}
.fx-anel-2 { inset: -16px; opacity: 0.6; }
.fx-bolha {
  width: 164px;
  height: 164px;
  border-radius: 47% 53% 61% 39% / 55% 45% 55% 45%;
  background: var(--accent);
  display: grid;
  place-items: center;
  animation: fx-respirar 2.4s ease-in-out infinite;
}
.fx-bolha svg { width: 52px; height: 52px; color: var(--bg); }

/*
  A BOLHA QUE OUVE (#56) — enquanto grava, quem manda no transform é o áudio.

  fx-respirar TEM QUE MORRER AQUI. Ela anima scale, e o React escreve scale no
  style inline a cada leitura do microfone. Animação ganha de estilo inline no
  CSS, então sem este animation:none a bolha continuaria respirando o loop de
  2,4s e IGNORARIA o arroto — a tela pareceria reagir e não estaria reagindo,
  que é a mentira de interface que esta casa não deixa passar.

  A duração da transicao tambem vem inline: ela muda conforme a direcao
  (sobe rapido, volta devagar). Ver bolhaQueOuve.ts.

  (Sem crase neste bloco: ele vive dentro de um template literal.)
*/
.fx-bolha-ouvindo { animation: none; }

@media (prefers-reduced-motion: reduce) {
  /*
    Aqui NAO desliga a reacao ao audio: ela e a informacao "o microfone esta
    aberto e te ouvindo", nao enfeite. O que sai e a suavizacao — o tamanho
    passa a acompanhar em degrau, sem deslizar.
  */
  .fx-bolha-ouvindo, .fx-bolha-ouvindo ~ .fx-anel { transition: none !important; }
}
.fx-cronometro {
  font-family: var(--font-mono);
  font-size: 34px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.fx-cronometro span { color: var(--muted); font-size: 18px; }

/*
  A ONDA — hoje ela pertence A TELA SEM SOM, e so a ela.

  Historia, porque ela explica tres reviravoltas e a ultima foi um erro meu:

  1. nasceu PARADA de proposito, porque waveform animada afirmaria audicao que
     o app nao estava medindo (o defeito do iPhone que fez silencio virar 54,2);
  2. na #71 passou a reagir ao microfone de verdade, e deixou de mentir;
  3. na #56 saiu da tela de GRAVACAO por ser redundante com a bolha — duas
     coisas pulsando fazem as duas parecerem enfeite.

  O ERRO: no passo 3 eu apaguei estas regras junto, sem procurar quem mais as
  usava. TelaSemSom usa a classe fx-onda para desenhar as dez barras no chao —
  o argumento visual de "nao houve sinal". Ela foi para producao sem estilo.

  Por isso o seletor volta e o comentario mudou de dono: nao e mais "a onda da
  gravacao", e a onda achatada do erro. Quem quiser apagar de novo: procure os
  usos ANTES.

  (Sem crase neste bloco: ele vive dentro de um template literal.)
*/
.fx-onda {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 28px;
}
.fx-onda i {
  width: 3px;
  border-radius: 2px;
  background: var(--border);
  display: block;
}
.fx-onda i:nth-child(odd) { background: var(--muted); }
.fx-pill-origem {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 16px;
  border-radius: var(--radius-full);
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 13px;
  color: var(--muted);
}

/* ------------------------------------------------------------- julgando */
.fx-metricas {
  width: 100%;
  max-width: 280px;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.fx-metrica { display: flex; flex-direction: column; gap: 7px; }
.fx-metrica-topo {
  display: flex;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}
.fx-trilho {
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--border);
  overflow: hidden;
}
.fx-preenchimento {
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--accent);
  transition: width 0.5s cubic-bezier(0.2, 0, 0, 1);
}
/* Enquanto a análise roda não há número nenhum: varredura, não medida. */
.fx-preenchimento-indefinido {
  width: 35%;
  background: var(--accent-soft);
  animation: fx-varrer 1.2s ease-in-out infinite;
}

.fx-origem { width: 100%; max-width: 340px; display: flex; flex-direction: column; gap: 10px; }
.fx-origem-rotulo {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.fx-origem-grade { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.fx-origem-opcao {
  min-height: 64px;
  padding: 10px 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--fg);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.fx-origem-opcao span { font-size: 20px; line-height: 1; }
.fx-origem-opcao:hover:not(:disabled) { border-color: var(--fg); }
.fx-origem-opcao.selecionada {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}
.fx-origem-opcao:disabled { opacity: 0.5; cursor: not-allowed; }
.fx-julgar-btn { margin-top: 8px; }
.fx-aviso { font-size: 12px; color: var(--muted); min-height: 18px; }

/*
  Campo de nome da tela de julgamento. Deliberadamente discreto: é opcional e
  não pode disputar atenção com o botão de julgar, que é logo acima.
*/
.fx-nome { display: flex; flex-direction: column; gap: 6px; width: 100%; margin-top: 4px; }
.fx-nome-rotulo { font-size: 12px; color: var(--muted); }
.fx-nome-campo {
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--fg);
  font: inherit;
  width: 100%;
}
.fx-nome-campo:disabled { opacity: 0.5; cursor: not-allowed; }

/* --------------------------------------------------- microfone e sem som */
.fx-selo {
  width: 84px;
  height: 84px;
  border-radius: var(--radius-full);
  display: grid;
  place-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
}
.fx-selo svg { width: 34px; height: 34px; color: var(--muted); }
.fx-passos {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}
.fx-passos li {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  font-size: 13.5px;
  line-height: 1.4;
  color: var(--fg);
}
.fx-passos b { font-family: var(--font-mono); color: var(--accent); }

/* --------------------------------------------------------------- animação */
@keyframes fx-pulsar { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
@keyframes fx-respirar { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
@keyframes fx-varrer {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(340%); }
}
@media (prefers-reduced-motion: reduce) {
  .fx-ponto-rec, .fx-bolha, .fx-preenchimento-indefinido { animation: none; }
  .fx-preenchimento { transition: none; }
}
`}</style>
);
