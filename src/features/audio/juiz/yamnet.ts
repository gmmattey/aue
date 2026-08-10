import * as tf from '@tensorflow/tfjs-core';
import { loadGraphModel, type GraphModel } from '@tensorflow/tfjs-converter';

import { INDICE_DO_ARROTO, TOTAL_DE_CLASSES } from './classesDoYamnet';

/**
 * O YAMNet rodando dentro do navegador — e ninguém mais fala com o tfjs.
 *
 * ESTE É O ÚNICO MÓDULO DO `src/` QUE IMPORTA TENSORFLOW. É o mesmo princípio
 * que fez `useGravacao` existir: aqui há recurso caro com ciclo de vida (16 MB
 * de pesos, memória de GPU, um backend global). Espalhar `tf.` pelo resto do
 * código faria cada chamador virar co-dono de tudo isso.
 *
 * O ÁUDIO NÃO SAI DAQUI. O modelo é servido pelo nosso próprio domínio
 * (`public/modelos/yamnet/`) e a inferência roda na máquina de quem gravou. Não
 * existe requisição com o áudio dentro, nem para a Google, nem para o Supabase,
 * nem para lugar nenhum — o que viaja é o download dos pesos, no sentido
 * contrário, e uma vez só.
 */

/** De onde os pesos vêm. Nosso domínio, sempre. Ver `PROCEDENCIA.md` ao lado. */
const CAMINHO_DO_MODELO = '/modelos/yamnet/model.json';

/**
 * O tensor de saída que interessa.
 *
 * O grafo publicado pelo Google tem três saídas e elas NÃO são nomeadas de
 * forma útil: `Identity` são os scores `[quadros, 521]` (a sigmoide),
 * `Identity_1` são os embeddings `[quadros, 1024]` e `Identity_2` é o
 * espectrograma log-mel. Pedir pelo nome, em vez de confiar na ordem de
 * `model.outputs`, é o que impede uma troca de versão de nos entregar embedding
 * onde esperávamos score — coisa que não daria erro, só número sem sentido.
 */
const SAIDA_DOS_SCORES = 'Identity';

/** O nome do `Placeholder` de entrada do grafo: onda mono 16 kHz. */
const ENTRADA_DA_ONDA = 'waveform';

/** O modelo falhou em carregar ou em rodar. Quem chama trata como "sem juiz". */
export class ModeloIndisponivelError extends Error {
  constructor(motivo: string, opcoes?: { cause?: unknown }) {
    super(motivo, opcoes);
    this.name = 'ModeloIndisponivelError';
  }
}

/**
 * A promessa do modelo, guardada — não o modelo.
 *
 * Guardar a PROMESSA e não o `GraphModel` é o que faz duas gravações seguidas
 * não baixarem 16 MB duas vezes. Se guardássemos só o resultado, duas chamadas
 * disparadas antes da primeira terminar veriam o cache vazio e abririam dois
 * downloads — e num app onde a pessoa pode tocar em ARROTAR de novo enquanto a
 * anterior ainda analisa, isso acontece.
 *
 * Zerada quando o carregamento FALHA, e só nesse caso: uma queda de rede não
 * pode condenar a aba inteira a nunca mais ter juiz.
 */
let carregando: Promise<GraphModel> | null = null;

/** Registra os backends uma vez só. Ver `prepararBackend`. */
let backendPronto: Promise<void> | null = null;

/**
 * Liga o tfjs.
 *
 * OS DOIS BACKENDS SÃO IMPORTADOS DE PROPÓSITO, e de forma dinâmica. O WebGL é
 * uma ordem de grandeza mais rápido — a diferença, num clipe de dez segundos,
 * é entre uma espera que ninguém nota e uma que interrompe a piada. Mas WebGL
 * em Safari iOS é território de bug conhecido (contexto perdido ao trocar de
 * aba, limite de textura), e um app de arroto não pode morrer por causa disso.
 * O CPU fica atrás como rede, e `pontuarClasseDeArroto` cai nele em execução.
 */
async function prepararBackend(): Promise<void> {
  backendPronto ??= (async () => {
    await Promise.all([
      import('@tensorflow/tfjs-backend-webgl'),
      import('@tensorflow/tfjs-backend-cpu'),
    ]);
    await tf.ready();
  })();
  await backendPronto;
}

async function obterModelo(): Promise<GraphModel> {
  carregando ??= (async () => {
    await prepararBackend();
    return loadGraphModel(CAMINHO_DO_MODELO);
  })().catch((erro: unknown) => {
    // Zera para a PRÓXIMA gravação poder tentar de novo. Sem isto, um 404
    // momentâneo ou um túnel de metrô desligaria o juiz até recarregar a aba.
    carregando = null;
    throw new ModeloIndisponivelError('Não deu para carregar o juiz.', { cause: erro });
  });
  return carregando;
}

/**
 * Roda o modelo e devolve o score da classe de arroto, um por quadro de 0,96 s.
 *
 * Devolve SÓ a coluna 53, e não a matriz inteira, por dois motivos: são 521
 * números por quadro que ninguém aqui usa (um clipe de dez segundos traria mais
 * de dez mil), e porque assim o índice da classe fica confinado a este arquivo
 * e ao teste que o trava — quem decide (`vereditoDeArroto`) recebe uma lista de
 * números e não precisa saber que o AudioSet existe.
 */
/**
 * Começa a baixar o modelo, sem esperar e sem quebrar quem chamou.
 *
 * POR QUE ISTO EXISTE: são 16 MB. Baixados só na hora de julgar, a espera
 * inteira cai exatamente onde o `ARENA.md` proíbe ficar preso — na saída da
 * gravação. Chamado no toque em ARROTAR, o download corre em paralelo com o
 * arroto e costuma estar pronto quando o dedo solta.
 *
 * Não devolve promessa de propósito: quem chama não deve esperar nem tratar
 * erro. Se falhar, a próxima tentativa é o julgamento de verdade, e lá a
 * política já é deixar a nota passar.
 *
 * Idempotente porque `obterModelo` guarda a promessa: chamar dez vezes baixa
 * uma vez.
 */
export function prepararOModelo(): void {
  void obterModelo().catch(() => {
    /* O julgamento tenta de novo e, se não der, libera a nota. */
  });
}

export async function pontuarClasseDeArroto(onda: Float32Array): Promise<number[]> {
  const modelo = await obterModelo();

  const executar = (): tf.Tensor => {
    const entrada = tf.tensor1d(onda, 'float32');
    try {
      return modelo.execute({ [ENTRADA_DA_ONDA]: entrada }, SAIDA_DOS_SCORES) as tf.Tensor;
    } finally {
      /*
        O `finally` cobre os dois caminhos, e o de erro é o que importa: um
        kernel que estoura no WebGL deixaria o tensor de entrada preso na
        memória da GPU, e a segunda tentativa (no CPU) somaria mais um.
      */
      entrada.dispose();
    }
  };

  let scores: tf.Tensor;
  try {
    scores = executar();
  } catch (erro) {
    /*
      A QUEDA PARA O CPU acontece AQUI, na execução, e não na inicialização —
      porque é aqui que dá errado. O `tf.ready()` do WebGL passa numa aba cujo
      contexto vai ser perdido dois segundos depois, e kernel faltando só
      aparece quando o grafo roda de verdade.

      Uma tentativa só: se o CPU também falhar, o problema não é o backend.
    */
    if (tf.getBackend() === 'cpu') {
      throw new ModeloIndisponivelError('O juiz não conseguiu rodar.', { cause: erro });
    }
    console.warn('YAMNet falhou no WebGL; caindo para o CPU.', erro);
    await tf.setBackend('cpu');
    try {
      scores = executar();
    } catch (erroNoCpu) {
      throw new ModeloIndisponivelError('O juiz não conseguiu rodar.', { cause: erroNoCpu });
    }
  }

  try {
    const [quadros, classes] = scores.shape;
    /*
      A saída MUDOU DE FORMA: ou o modelo em `public/` não é o YAMNet, ou o
      nome da saída passou a apontar para outro tensor. Recusar aqui é o que
      impede o app de ler embedding como se fosse score — número plausível,
      veredito aleatório. Ver a nota de `INDICE_DO_ARROTO`.
    */
    if (classes !== TOTAL_DE_CLASSES) {
      throw new ModeloIndisponivelError(
        `O juiz devolveu ${classes} classes em vez de ${TOTAL_DE_CLASSES}.`,
      );
    }

    const matriz = (await scores.array()) as number[][];
    const porQuadro: number[] = new Array<number>(quadros);
    for (let q = 0; q < quadros; q++) porQuadro[q] = matriz[q][INDICE_DO_ARROTO];
    return porQuadro;
  } finally {
    scores.dispose();
  }
}

/** Só para teste: esquece o modelo e o backend já resolvidos. */
export function __esquecerOModelo(): void {
  carregando = null;
  backendPronto = null;
}
