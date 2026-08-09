import type { CasoDeErro } from '../arena/estados';

/**
 * O que o `ERROR` diz.
 *
 * As regras do estado (`docs/jogo/ARENA.md` §2): fala na lata, não culpa a
 * pessoa quando a culpa não é dela, **sempre oferece a saída**, e nunca vira
 * sucesso por copy.
 *
 * SÓ UM CASO TEM FALA NESTA FATIA. Os outros seis existem no tipo e ainda não
 * têm texto escrito — copy é do Giam, e inventar frase para um caso que
 * ninguém desenhou é o jeito mais rápido de o jogo falar merda. Enquanto não
 * chegam, cai no genérico honesto abaixo: diz que deu ruim, sem fingir saber
 * o quê, e oferece a saída do mesmo jeito.
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
  /*
    UMA FRASE PARA OS TRÊS JEITOS DE NÃO TER MICROFONE: a pessoa negou, o
    navegador negou por ela, ou o aparelho não tem microfone nenhum. Do lado de
    quem está jogando é a mesma parede, e o texto não pode mandar "libera nas
    permissões" para quem não tem o que liberar — por isso a segunda frase
    fecha o outro caso em vez de fingir que ele não existe.
  */
  microfoneNegado: {
    titulo: 'Sem microfone não tem jogo.',
    comentario:
      'Libera nas permissões do site e volta. Se esse aparelho não tem microfone, aí não tem jogo mesmo.',
    saida: 'Tentar de novo',
  },

  semSom: {
    titulo: 'Não veio nada.',
    comentario: 'Ou tu não arrotou, ou o microfone tá tapado. Chega mais perto e manda.',
    saida: 'Tentar de novo',
  },

  /*
    Aqui a culpa é do jogo, e o texto diz isso. Erro técnico que sugere
    incompetência de quem está jogando é o jeito mais rápido de perder a pessoa
    num jogo que ela abriu para dar risada.
  */
  semRede: {
    titulo: 'Sem sinal, sem briga.',
    comentario: 'O desafio não foi criado. Confere a internet e tenta de novo.',
    saida: 'Tentar de novo',
  },

  falhaNaAnalise: {
    titulo: 'Deu ruim aqui dentro.',
    comentario: 'O problema foi meu, não teu. Manda de novo.',
    saida: 'Tentar de novo',
  },
};

export function falaDoErro(caso: CasoDeErro): FalaDeErro {
  return ESCRITOS[caso] ?? GENERICO;
}

/** Existe fala escrita para este caso? O teste usa para não passar a mão. */
export function temFalaEscrita(caso: CasoDeErro): boolean {
  return ESCRITOS[caso] !== undefined;
}
