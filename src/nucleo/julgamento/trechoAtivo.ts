/**
 * O trecho ativo da gravação — o pedaço que é arroto de verdade.
 *
 * A gravação inteira não pode ser a régua: esperar para tocar em "JÁ FOI" não
 * deixa o arroto melhor. Por isso o motor identifica quadros ativos (25 ms,
 * passo de 10 ms), ignora silêncio de borda e fecha buracos de até 120 ms.
 *
 * Nada aqui depende de navegador: entra `Float32Array` decodificado, sai
 * número. Quem decodifica é `features/audio/engine.ts`, que é o lado que
 * encosta no `OfflineAudioContext`.
 */

/**
 * Abaixo disto não há som útil — é ruído de fundo, e a gravação não pode virar
 * nota. O valor continua sendo 0,005 RMS (~-46 dBFS), validado em aparelho real.
 */
export const RMS_MINIMO_AUDIVEL = 0.005;

export const JANELA_S = 0.025;
export const PASSO_S = 0.010;
export const BURACO_CURTO_S = 0.120;
export const QUEDA_DO_PICO_DB = 25;

/** As três grandezas calibradas no lote real de 2026-08-10. */
export interface MedidasDoTrechoAtivo {
  /** Fôlego — duração, em segundos, do maior trecho ativo contínuo. */
  activeDuration: number;
  /** Força — percentil 75 do RMS dos quadros ativos. */
  activeRms: number;
  /** Grave — percentil 75 da razão low-pass(150 Hz) / RMS nos quadros ativos. */
  bassRatio: number;
}

export function percentile(valores: readonly number[], fracao: number): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const posicao = (ordenados.length - 1) * fracao;
  const inferior = Math.floor(posicao);
  const superior = Math.ceil(posicao);
  if (inferior === superior) return ordenados[inferior];
  const peso = posicao - inferior;
  return ordenados[inferior] * (1 - peso) + ordenados[superior] * peso;
}

function rmsDaJanela(amostras: Float32Array, inicio: number, tamanho: number): number {
  const fim = Math.min(amostras.length, inicio + tamanho);
  if (fim <= inicio) return 0;
  let soma = 0;
  for (let i = inicio; i < fim; i++) soma += amostras[i] * amostras[i];
  return Math.sqrt(soma / (fim - inicio));
}

export function rmsPorQuadro(amostras: Float32Array, sampleRate: number): number[] {
  const tamanho = Math.max(1, Math.round(sampleRate * JANELA_S));
  const passo = Math.max(1, Math.round(sampleRate * PASSO_S));

  if (amostras.length <= tamanho) return [rmsDaJanela(amostras, 0, amostras.length)];

  const valores: number[] = [];
  for (let inicio = 0; inicio + tamanho <= amostras.length; inicio += passo) {
    valores.push(rmsDaJanela(amostras, inicio, tamanho));
  }
  return valores;
}

export function preencherBuracosCurtos(mascara: readonly boolean[]): boolean[] {
  const saida = [...mascara];
  const limite = Math.round(BURACO_CURTO_S / PASSO_S);

  let i = 0;
  while (i < saida.length) {
    if (saida[i]) {
      i++;
      continue;
    }

    let fim = i;
    while (fim < saida.length && !saida[fim]) fim++;
    const tamanho = fim - i;

    if (i > 0 && fim < saida.length && tamanho <= limite) {
      for (let j = i; j < fim; j++) saida[j] = true;
    }
    i = fim;
  }

  return saida;
}

export function maiorTrechoAtivo(mascara: readonly boolean[]): number {
  let atual = 0;
  let maior = 0;

  for (const ativo of mascara) {
    if (ativo) {
      atual++;
      if (atual > maior) maior = atual;
    } else {
      atual = 0;
    }
  }

  if (maior === 0) return 0;
  return JANELA_S + (maior - 1) * PASSO_S;
}

/**
 * Extrai as três grandezas que o jogo mostra como FORÇA, FÔLEGO e GRAVE.
 *
 * O limiar de atividade é relativo ao próprio clipe (25 dB abaixo do pico), mas
 * nunca cai abaixo do piso audível de 0,005 RMS.
 */
export function medidasDoTrechoAtivo(
  original: Float32Array,
  filtrado: Float32Array,
  sampleRate: number,
): MedidasDoTrechoAtivo {
  const rmsOriginal = rmsPorQuadro(original, sampleRate);
  const rmsFiltrado = rmsPorQuadro(filtrado, sampleRate);
  const pico = Math.max(...rmsOriginal, 0);
  const quedaLinear = Math.pow(10, -QUEDA_DO_PICO_DB / 20);
  const limiar = Math.max(RMS_MINIMO_AUDIVEL, pico * quedaLinear);
  const mascara = preencherBuracosCurtos(rmsOriginal.map((valor) => valor >= limiar));

  const ativos: number[] = [];
  const razoesDeGrave: number[] = [];

  for (let i = 0; i < mascara.length; i++) {
    if (!mascara[i]) continue;
    const total = rmsOriginal[i] ?? 0;
    const grave = rmsFiltrado[i] ?? 0;
    ativos.push(total);
    razoesDeGrave.push(Math.min(1, Math.max(0, grave / Math.max(total, 1e-9))));
  }

  return {
    activeDuration: maiorTrechoAtivo(mascara),
    activeRms: percentile(ativos, 0.75),
    bassRatio: percentile(razoesDeGrave, 0.75),
  };
}
