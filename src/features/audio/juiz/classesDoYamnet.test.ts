import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  INDICE_DO_ARROTO,
  MID_DA_CLASSE_DE_ARROTO,
  NOME_DA_CLASSE_DE_ARROTO,
  TOTAL_DE_CLASSES,
} from './classesDoYamnet';

/**
 * A AMARRA ENTRE O NOSSO CÓDIGO E O MODELO DE VERDADE.
 *
 * `INDICE_DO_ARROTO = 53` é o único número que liga o Auê à ontologia do
 * AudioSet, e ele é invisível: trocar o modelo em `public/modelos/yamnet/` por
 * outra versão com ordem de classes diferente não quebraria nada de forma
 * perceptível. A inferência continuaria rodando, o score continuaria saindo
 * entre 0 e 1, e o juiz passaria a liberar nota com base na pontuação de outra
 * coisa qualquer.
 *
 * Por isso o teste NÃO reescreve o número: ele lê o `yamnet_class_map.csv` que
 * está publicado junto dos pesos — o mesmo arquivo do repositório oficial
 * `tensorflow/models`, em `research/audioset/yamnet`, byte por byte — e confere.
 *
 * Ele é lento e chato de propósito. É o teste que vai falhar no dia em que
 * alguém atualizar o modelo sem olhar a ontologia.
 */
const CSV = fileURLToPath(
  new URL('../../../../public/modelos/yamnet/yamnet_class_map.csv', import.meta.url),
);

interface Classe {
  indice: number;
  mid: string;
  nome: string;
}

function classesOficiais(): Classe[] {
  const linhas = readFileSync(CSV, 'utf8').trim().split(/\r?\n/);
  const cabecalho = linhas.shift();
  expect(cabecalho?.trim()).toBe('index,mid,display_name');

  return linhas.map((linha) => {
    // O nome vem entre aspas quando tem vírgula, que é o caso do arroto.
    const partes = linha.trim().match(/^(\d+),([^,]+),(.*)$/);
    if (!partes) throw new Error(`linha fora do formato no class map: ${linha}`);
    return {
      indice: Number(partes[1]),
      mid: partes[2],
      nome: partes[3].replace(/^"|"$/g, ''),
    };
  });
}

describe('o mapa de classes do YAMNet oficial', () => {
  const classes = classesOficiais();

  it('tem as 521 classes do AudioSet, em ordem', () => {
    expect(classes).toHaveLength(TOTAL_DE_CLASSES);
    classes.forEach((classe, posicao) => expect(classe.indice).toBe(posicao));
  });

  it('tem "Burping, eructation" — a classe existe mesmo, e é a 53', () => {
    /*
      A pergunta que originou esta feature: o YAMNet sabe o que é arroto? Sabe.
      É a classe 53 do AudioSet, MID /m/03q5_w, e está no modelo que servimos.
    */
    const arroto = classes[INDICE_DO_ARROTO];
    expect(arroto.nome).toBe(NOME_DA_CLASSE_DE_ARROTO);
    expect(arroto.mid).toBe(MID_DA_CLASSE_DE_ARROTO);
  });

  it('só existe UMA classe de arroto — o índice não é ambíguo', () => {
    const candidatas = classes.filter((c) => /burp|eructation/i.test(c.nome));
    expect(candidatas.map((c) => c.indice)).toEqual([INDICE_DO_ARROTO]);
  });
});
