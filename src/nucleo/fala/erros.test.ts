import { describe, expect, it } from 'vitest';

import { CASOS_DE_ERRO, type CasoDeErro } from '../arena/estados';
import { PESOS, ROTULO_DA_NOTA_NO_ERRO, falaDoErro, pesoDoErro, temFalaEscrita } from './erros';

/**
 * A FALA DO ERRO, CASO A CASO.
 *
 * O `ARENA.md` §2 manda quatro coisas do `ERROR`: falar na lata, não culpar
 * quem não tem culpa, sempre oferecer a saída, e reagir com peso diferente
 * conforme o estrago. Este arquivo é o que impede um caso de ficar no genérico
 * e ninguém perceber — que foi exatamente o que aconteceu com o
 * `falhaAoCompartilhar` por três fatias seguidas.
 */
describe('a fala de cada caso de erro', () => {
  it('os sete casos têm fala escrita — nenhum cai no genérico', () => {
    const semFala = CASOS_DE_ERRO.filter((caso) => !temFalaEscrita(caso));
    expect(semFala).toEqual([]);
  });

  it('todo caso diz o que houve e oferece saída', () => {
    for (const caso of CASOS_DE_ERRO) {
      const fala = falaDoErro(caso);
      expect(fala.titulo.length, `${caso} sem título`).toBeGreaterThan(0);
      expect(fala.comentario.length, `${caso} sem comentário`).toBeGreaterThan(0);
      /* Rótulo de botão é contrato: ele diz o que o botão faz. */
      expect(fala.saida.length, `${caso} sem saída`).toBeGreaterThan(0);
    }
  });

  it('nenhuma fala de erro finge que deu certo', () => {
    /*
      A regra do §7 do AGENTS.md, virada teste: falha não vira sucesso por
      copy. Se um dia alguém escrever "pronto!" num estado de erro, cai aqui.
    */
    const proibidas = ['sucesso', 'pronto!', 'tudo certo', 'compartilhado', 'enviado com'];
    for (const caso of CASOS_DE_ERRO) {
      const fala = falaDoErro(caso);
      const texto = `${fala.titulo} ${fala.comentario} ${fala.saida}`.toLowerCase();
      for (const palavra of proibidas) {
        expect(texto.includes(palavra), `${caso} diz "${palavra}"`).toBe(false);
      }
    }
  });

  it('nenhuma fala promete guardar a nota', () => {
    /*
      O outro lado do §7 do AGENTS.md: além de falha não virar sucesso, sucesso
      não pode ser maior do que é. A nota vive na partida aberta e some quando
      a pessoa encerra ou recarrega — dizer "salva" faz ela fechar o jogo
      achando que volta e acha o número lá.
    */
    const proibidas = ['salvo', 'salva', 'guardad'];
    const textos = [ROTULO_DA_NOTA_NO_ERRO];
    for (const caso of CASOS_DE_ERRO) {
      const fala = falaDoErro(caso);
      textos.push(fala.titulo, fala.comentario, fala.saida);
    }
    for (const texto of textos) {
      for (const palavra of proibidas) {
        expect(texto.toLowerCase().includes(palavra), `"${texto}" diz "${palavra}"`).toBe(false);
      }
    }
  });
});

describe('o peso do erro', () => {
  it('todo caso tem peso, e o peso é um dos quatro', () => {
    for (const caso of CASOS_DE_ERRO) {
      expect(PESOS, `${caso} com peso estranho`).toContain(pesoDoErro(caso));
    }
  });

  it('o peso separa quem errou de quem levou falha do jogo', () => {
    /*
      A lista escrita na unha, e não derivada da função: derivar seria o teste
      concordando consigo mesmo. Mudar o peso de um caso é decisão de produto e
      tem que doer aqui.
    */
    const esperado: Record<CasoDeErro, string> = {
      semSom: 'leve',
      naoEhArroto: 'leve',
      microfoneNegado: 'parede',
      falhaNaAnalise: 'quebrou',
      semRede: 'quebrou',
      falhaAoCompartilhar: 'quebrou',
      linkExpirado: 'jaEra',
    };

    for (const caso of CASOS_DE_ERRO) {
      expect(pesoDoErro(caso), caso).toBe(esperado[caso]);
    }
  });
});
