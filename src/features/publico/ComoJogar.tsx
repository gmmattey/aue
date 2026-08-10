import React from 'react';
import { Link } from 'react-router-dom';

import { LayoutLegal, Secao } from '../legal/LayoutLegal';

/**
 * `/como-jogar` — o único lugar público onde o Auê se explica por escrito.
 *
 * POR QUE ELA EXISTE, E POR QUE NÃO É UM ESTADO DA ARENA
 * -----------------------------------------------------
 * A Arena é uma superfície de estado
 * ([`docs/jogo/ARENA.md`](../../../docs/jogo/ARENA.md)): dez estados, nenhum
 * deles "manual". Explicar o jogo dentro do jogo é atrito no lugar errado —
 * quem abriu quer arrotar, não ler.
 *
 * Mas quem chega pelo buscador ainda não sabe o que vai encontrar, e a home,
 * sendo a Arena, não tem texto que responda isso. Esta página responde, fora do
 * caminho de quem só quer jogar.
 *
 * **Ela não cria estado, não muda o loop e não é alcançável de dentro da
 * Arena.** É uma URL pública, como as duas páginas legais — e reusa a mesma
 * moldura delas de propósito: mesma marca, mesmo desenho, zero componente novo.
 *
 * O QUE ESTÁ ESCRITO AQUI É SÓ O QUE O JOGO FAZ HOJE. Nada de "em breve", nada
 * de recurso desligado por flag. Prometer no buscador o que a tela não entrega
 * é a pior primeira impressão possível — e a mesma regra que a descrição da
 * home já segue.
 */
export const ComoJogar: React.FC = () => (
  <LayoutLegal rotulo="Como jogar">
    <h1
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 26,
        lineHeight: 1.15,
        margin: 0,
      }}
    >
      Como jogar o Auê
    </h1>

    <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--muted)', margin: 0 }}>
      O Auê é um jogo de arroto online. Você arrota no celular, ele ouve e
      devolve uma nota de 0 a 100 — analisando duração, potência, profundidade e
      textura do som. Não é sorteio: o que não for arroto não vira nota.
    </p>

    <Secao titulo="Arrotar e receber a nota">
      <p>
        Toque em ARROTAR e solte. O microfone só é pedido nessa hora, nunca
        antes. O Auê grava, julga e mostra a nota com as quatro medidas.
      </p>
      <p>Não gostou do número? Manda outro. Ninguém precisa saber que você tentou.</p>
    </Secao>

    <Secao titulo="Desafiar um amigo">
      <p>
        Depois da nota, chame alguém para o X1. O jogo gera um link privado:
        quem abrir ouve o seu arroto, arrota a resposta no próprio aparelho, e
        as duas notas se enfrentam.
      </p>
      <p>
        No fim tem placar e tem revanche. É a competição de arroto resolvida no
        grupo, com número em vez de discussão.
      </p>
    </Secao>

    <Secao titulo="Funciona direto no navegador">
      <p>
        Não precisa instalar nada. O Auê abre no navegador do celular, Android
        ou iPhone, e quem recebe o desafio joga pelo mesmo link — sem baixar app
        e sem criar conta.
      </p>
    </Secao>

    <Secao titulo="É de graça">
      <p>
        Jogar não custa nada: sem assinatura, sem moeda dentro do jogo, sem
        cadastro. Lá fora chamam esse tipo de jogo de <em>burp game</em>; aqui é
        só o Auê.
      </p>
    </Secao>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <Link to="/" className="btn btn-primary">
        Arrotar agora
      </Link>
      <Link to="/privacidade" style={{ color: 'var(--accent)', fontSize: 14 }}>
        O que o Auê faz com o seu áudio
      </Link>
    </div>
  </LayoutLegal>
);
