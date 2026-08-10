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
      Como funciona a competição de arroto do Auê
    </h1>

    <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--muted)', margin: 0 }}>
      O Auê é uma competição de arroto que roda direto no navegador. Você
      arrota, recebe uma nota de 0 a 100 e usa esse número como placar para
      desafiar outra pessoa. A maior nota leva o round.
    </p>

    <Secao titulo="1. Arrota">
      <p>
        Toque em ARROTAR e solte. O microfone só é pedido nessa hora, nunca
        antes. Se o jogo validar o som, ele segue para o julgamento.
      </p>
    </Secao>

    <Secao titulo="2. A nota vira placar">
      <p>
        O Auê usa as características do som para chegar numa nota de 0 a 100.
        Pra quem joga, a regra é mais simples: esse número vira o alvo que o
        próximo precisa bater.
      </p>
      <p>Fez 94? O outro precisa de 95. O resto é discussão.</p>
    </Secao>

    <Secao titulo="3. Chama alguém pro X1">
      <p>
        Depois da nota, mande o desafio. O Auê gera um link: quem abrir ouve o
        seu arroto, grava a resposta no próprio aparelho e coloca a nota dele
        contra a sua.
      </p>
      <p>
        Não precisa criar conta, procurar sala ou combinar horário. Um manda e
        o outro responde quando puder.
      </p>
    </Secao>

    <Secao titulo="4. Perdeu? Revanche.">
      <p>
        No fim tem placar. Quem fizer a maior nota leva o round. Se ficou feio,
        pede revanche e tenta de novo.
      </p>
    </Secao>

    <Secao titulo="Direto no navegador e de graça">
      <p>
        O Auê abre no navegador do celular, Android ou iPhone. Quem recebe o
        desafio joga pelo mesmo link — sem baixar app, sem assinatura, sem moeda
        dentro do jogo e sem cadastro na frente.
      </p>
    </Secao>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <Link to="/" className="btn btn-primary">
        Entrar na competição
      </Link>
      <Link to="/privacidade" style={{ color: 'var(--accent)', fontSize: 14 }}>
        O que o Auê faz com o seu áudio
      </Link>
    </div>
  </LayoutLegal>
);
