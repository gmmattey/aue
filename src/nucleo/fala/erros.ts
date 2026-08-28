import type { CasoDeErro } from '../arena/estados';

/**
 * O que o `ERROR` diz.
 *
 * As regras do estado (`docs/jogo/ARENA.md` §2): fala na lata, não culpa a
 * pessoa quando a culpa não é dela, **sempre oferece a saída**, e nunca vira
 * sucesso por copy.
 *
 * OS SETE CASOS TÊM FALA ESCRITA, e existe teste cobrando isso. O genérico
 * abaixo continua de pé como rede: se alguém acrescentar um caso ao tipo e
 * esquecer o texto, o jogo diz que deu ruim sem fingir saber o quê — e o teste
 * reprova antes de chegar em qualquer tela.
 */
export interface FalaDeErro {
  /** A frase grande. */
  readonly titulo: string;
  /** O que fazer a respeito. */
  readonly comentario: string;
  /** O rótulo da saída. Contrato: diz o que o botão faz. */
  readonly saida: string;
}

const GENERICO: FalaDeErro = {
  titulo: 'Deu ruim.',
  comentario: 'Não foi culpa tua. Tenta de novo.',
  saida: 'Tentar de novo',
};

const ESCRITOS: Partial<Record<CasoDeErro, FalaDeErro>> = {
  microfoneNegado: {
    titulo: 'PERMISSÃO DE MICROFONE NECESSÁRIA',
    comentario: 'LIBERA PRA GENTE TE OUVIR.',
    saida: 'ABRIR AJUSTES',
  },

  semSom: {
    titulo: 'MICROFONE COM PROBLEMA.',
    comentario: 'VERIFICA E TENTA DE NOVO.',
    saida: 'TENTAR DE NOVO',
  },

  semRede: {
    titulo: 'Sem sinal, sem briga.',
    comentario: 'Não deu para falar com o servidor. Confere a internet e tenta de novo.',
    saida: 'Tentar de novo',
  },

  naoEhArroto: {
    titulo: 'NÃO É ARROTO.',
    comentario: 'TENTA OUTRA VEZ.',
    saida: 'TENTAR DE NOVO',
  },

  linkExpirado: {
    titulo: 'Essa disputa já era.',
    comentario: 'Ou o prazo venceu, ou o link veio torto. Manda um novo.',
    saida: 'Toque para começar',
  },

  falhaNaAnalise: {
    titulo: 'Deu ruim aqui dentro.',
    comentario: 'O problema foi meu, não teu. Manda de novo.',
    saida: 'Tentar de novo',
  },

  /*
    O TEXTO DIZ O QUE FALHOU E O QUE NÃO FALHOU, nessa ordem de importância. A
    pessoa acabou de conquistar a nota e o envio morreu no meio — se a tela só
    disser "não deu", ela vai achar que perdeu o arroto junto.
  */
  /*
    E DIZ ISSO NO PRESENTE, não no futuro. "Tá salva" promete guarda: em PT-BR
    salvo é guardado, e a nota não é guardada em lugar nenhum — ela vive na
    partida aberta e some com "deixa quieto" ou com um recarregar. O texto fala
    do agora, que é o que o jogo tem de fato para entregar.
  */
  falhaAoCompartilhar: {
    titulo: 'Não saiu daqui.',
    comentario: 'A nota não se perdeu. Foi o envio que falhou.',
    saida: 'Tentar de novo',
  },
};

/**
 * A dica de como liberar o microfone.
 *
 * GENÉRICA DE PROPÓSITO, e isso é decisão, não preguiça: o caminho real muda
 * entre Safari no iPhone e Chrome no Android, e escrever o caminho certo
 * exigiria perguntar ao `navigator` — que só vive em `src/plataforma/` (ADR
 * 0001). Abrir porta nova para isso custa mais do que a frase entrega. O fluxo
 * antigo já tinha chegado nessa mesma conclusão.
 */
export const DICA_DO_MICROFONE = 'Configurações do navegador → Permissões → Microfone → Permitir.';

/** A volta para o resultado, quando o erro entrou com a nota na mão. */
export const VER_MINHA_NOTA = 'Ver minha nota';

/** A saída discreta de quem prefere encerrar a partida ali mesmo. */
export const DEIXA_QUIETO = 'Deixa quieto';

/**
 * O rótulo do número no palco do `ERROR`.
 *
 * Não é "sua nota" de novo: aqui a informação que importa é que ela NÃO se
 * perdeu com o erro.
 *
 * E NÃO É "SALVO": a nota não está guardada em canto nenhum — ela existe
 * enquanto a partida existe, e some quando a pessoa encerra ou recarrega.
 * "Salvo" faria a pessoa fechar o jogo achando que volta e acha o número lá.
 * O rótulo fala do agora, que é o que o jogo tem.
 */
export const ROTULO_DA_NOTA_NO_ERRO = 'Tá aqui';

/**
 * O peso do erro — o quanto a Arena reage.
 *
 * O `ARENA.md` §2 manda que "erros de peso diferente reagem com peso
 * diferente", e essa decisão mora aqui, no núcleo, e não na tela: a UI lê o
 * peso para escolher forma da Bolha, animação e cor, mas **não decide quem é
 * grave**. Regra duplicada em dois lugares é como os dois passam a discordar.
 *
 * - `leve` — de novo e pronto. Zoação, não bronca;
 * - `parede` — precisa fazer alguma coisa fora do jogo;
 * - `quebrou` — falha técnica de verdade, e a culpa não é de quem está jogando;
 * - `jaEra` — não tem o que consertar; o que sobrou é arrotar de novo.
 */
export const PESOS = ['leve', 'parede', 'quebrou', 'jaEra'] as const;

export type PesoDoErro = (typeof PESOS)[number];

export function pesoDoErro(caso: CasoDeErro): PesoDoErro {
  switch (caso) {
    case 'semSom':
    case 'naoEhArroto':
      return 'leve';
    case 'microfoneNegado':
      return 'parede';
    case 'falhaNaAnalise':
    case 'semRede':
    case 'falhaAoCompartilhar':
      return 'quebrou';
    case 'linkExpirado':
      return 'jaEra';
  }
}

export function falaDoErro(caso: CasoDeErro): FalaDeErro {
  return ESCRITOS[caso] ?? GENERICO;
}

/** Existe fala escrita para este caso? O teste usa para não passar a mão. */
export function temFalaEscrita(caso: CasoDeErro): boolean {
  return ESCRITOS[caso] !== undefined;
}
