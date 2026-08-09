/**
 * Os CINCO retornos do `useShareResult`, um por um.
 *
 * A regra global do repositório: "nada pode fingir que funciona" — e o
 * contrário dela, que é o defeito real que apareceu aqui, é um toque que não
 * faz nada e não diz nada. A união tem cinco casos, dois deles calam de
 * propósito; o teste existe para que o dia em que um sexto caso entrar, ele
 * caia aqui em vez de virar silêncio na tela.
 *
 * E trava a MENSAGEM: ela dizia "Use os botões abaixo" quando não havia botão
 * nenhum abaixo. Se alguém voltar a citar posição em vez de nome, este arquivo
 * quebra.
 */
import { describe, expect, it } from 'vitest';

import { mensagemDeFalhaAoCompartilhar } from './mensagemDeFalhaAoCompartilhar';
import type { ResultadoDoCompartilhamento } from '../useShareResult';

describe('mensagemDeFalhaAoCompartilhar', () => {
  it('deu certo com imagem: nada a dizer', () => {
    expect(mensagemDeFalhaAoCompartilhar({ ok: true, via: 'imagem' })).toBeNull();
  });

  it('deu certo só com texto: nada a dizer', () => {
    // A folha do sistema abriu. Avisar que a imagem não foi anexada seria
    // ruído sobre uma escolha do sistema operacional, não sobre uma falha.
    expect(mensagemDeFalhaAoCompartilhar({ ok: true, via: 'texto' })).toBeNull();
  });

  it('cancelado: nada a dizer', () => {
    // A pessoa fechou a folha. Acusar erro seria mentira.
    expect(mensagemDeFalhaAoCompartilhar({ ok: false, motivo: 'cancelado' })).toBeNull();
  });

  it.each<ResultadoDoCompartilhamento>([
    { ok: false, motivo: 'indisponivel' },
    { ok: false, motivo: 'falhou', detalhe: 'html2canvas explodiu' },
  ])('$motivo: fala, e cita os botões pelo nome', (resposta) => {
    const mensagem = mensagemDeFalhaAoCompartilhar(resposta);

    expect(mensagem).toBeTruthy();
    // Os nomes que estão de verdade na tela (`CompartilharEmRede`).
    expect(mensagem).toContain('WhatsApp');
    expect(mensagem).toContain('Telegram');
    expect(mensagem).toContain('X');
    expect(mensagem).toContain('Copiar link');
    // A mentira original. "abaixo" só é verdade até a próxima mudança de ordem.
    expect(mensagem).not.toContain('abaixo');
  });

  it('sem Web Share API, a mensagem explica o motivo em vez de acusar falha', () => {
    // É o caso do desktop inteiro. Chamar de erro faria a landing parecer
    // quebrada quando ela está apenas num navegador sem a API.
    expect(mensagemDeFalhaAoCompartilhar({ ok: false, motivo: 'indisponivel' })).toContain(
      'não abre o compartilhamento do sistema',
    );
  });
});
