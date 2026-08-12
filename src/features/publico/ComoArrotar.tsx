import React from 'react';
import { Link } from 'react-router-dom';

import { LayoutLegal, Secao } from '../legal/LayoutLegal';

/**
 * `/como-arrotar` — a página que responde a busca que traz gente pro Auê.
 *
 * "como arrotar", "como arrotar de propósito", "como arrotar alto": é isso que
 * as pessoas digitam, e hoje o Auê não responde nada disso. `/como-jogar`
 * explica o JOGO; esta explica o ARROTO, e termina empurrando pro jogo.
 *
 * MESMA MOLDURA DAS OUTRAS PÚBLICAS, zero componente novo: `LayoutLegal` +
 * `Secao`, igual `/como-jogar`, `/privacidade` e `/termos`. Não é estado da
 * Arena, não muda o loop e não é alcançável de dentro da Arena.
 *
 * O QUE ELA NÃO FAZ: conselho médico. Dor, refluxo, azia e tratamento não são
 * território de um jogo de arroto. Em vez de fingir que o assunto não existe, a
 * página diz com todas as letras que ali o caminho é médico, não Auê.
 */
export const ComoArrotar: React.FC = () => (
  <LayoutLegal rotulo="Como arrotar">
    <h1
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 26,
        lineHeight: 1.15,
        margin: 0,
      }}
    >
      Como arrotar
    </h1>

    <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--muted)', margin: 0 }}>
      Arroto é ar que entrou e resolveu voltar. A parte que dá pra treinar é a
      entrada. O resto o corpo resolve sozinho.
    </p>

    <Secao titulo="Engole ar, devolve ar">
      <p>
        Puxa ar pela boca como se fosse beber, mas em vez de engolir líquido você
        engole o ar. Prende um instante e solta pela garganta relaxada.
      </p>
      <p>As primeiras tentativas saem meia-boca. É normal.</p>
    </Secao>

    <Secao titulo="Com refrigerante é trapaça? É, e funciona">
      <p>
        Bebida com gás já entrega o ar pronto. Um gole, espera uns segundos,
        deixa subir.
      </p>
      <p>
        É o caminho mais fácil e ninguém vai te julgar por isso — o Auê julga o
        som, não o método.
      </p>
    </Secao>

    <Secao titulo="Arrotar alto">
      <p>
        Alto é garganta aberta e boca aberta na hora certa. Peito pra frente,
        queixo um pouco pra cima, e solta sem segurar no meio.
      </p>
      <p>Arroto abafado perde volume e perde nota.</p>
    </Secao>

    <Secao titulo="E se não sai nada?">
      <p>
        Tem gente que simplesmente não arrota, e não tem técnica que resolva.
      </p>
      <p>
        Se forçar dói, incomoda ou vira azia, para — isso é assunto de médico,
        não de jogo. O Auê é brincadeira, não consultório.
      </p>
    </Secao>

    <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--fg)', margin: 0 }}>
      Aprendeu? Agora vê quanto vale esse arroto.
    </p>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <Link to="/" className="btn btn-primary">
        Arrotar agora
      </Link>
      <Link to="/como-jogar" style={{ color: 'var(--accent)', fontSize: 14 }}>
        Como jogar o Auê
      </Link>
    </div>
  </LayoutLegal>
);
