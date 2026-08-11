import React from 'react';

import { LayoutLegal, Secao } from '../legal/LayoutLegal';

/**
 * `/en/how-to-play` — versão internacional da página pública de explicação.
 *
 * Não traduz a Arena nem cria uma segunda experiência de jogo. É conteúdo de
 * aquisição/SEO que explica o mesmo loop com a linguagem usada fora do Brasil:
 * burp competition, 1v1, score e rematch.
 */
export const HowToPlay: React.FC = () => (
  <LayoutLegal rotulo="How to play" homeTo="/en/">
    <h1
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 26,
        lineHeight: 1.15,
        margin: 0,
      }}
    >
      How to play Auê
    </h1>

    <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--muted)', margin: 0 }}>
      Auê is an online burp competition. You burp on your phone, the game gives it a score from
      0 to 100, and that number becomes the target your friend has to beat. The score is not a
      diagnosis. It is the scoreboard.
    </p>

    <Secao titulo="1. Burp">
      <p>
        Tap the burp button and let one out. The microphone is requested only when you start the
        round. If the game validates the sound as a burp, it goes to judging.
      </p>
    </Secao>

    <Secao titulo="2. Set the score">
      <p>
        Auê uses the sound to produce a score from 0 to 100. For the player, the rule is simple:
        that number is now the target. Scored 94? Your friend needs 95.
      </p>
    </Secao>

    <Secao titulo="3. Challenge a friend">
      <p>
        Send the 1v1 link. Your friend opens it on their own phone, hears your burp, records an
        answer and puts their score against yours. No room code, no account wall, no need to play
        at the same time.
      </p>
    </Secao>

    <Secao titulo="4. Scoreboard and rematch">
      <p>
        The higher score takes the round. If you lose, ask for a rematch. If you win, asking for
        another one is also perfectly reasonable.
      </p>
    </Secao>

    <Secao titulo="A burp game that runs in the browser">
      <p>
        Auê runs directly in a mobile browser on Android or iPhone. It is free to play and the
        person receiving a challenge can answer from the same link.
      </p>
      <p>
        If you were looking for a burp game, burp challenge or burping contest with friends,
        that is basically the whole idea — except Auê gives the argument a scoreboard.
      </p>
    </Secao>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <a href="/" className="btn btn-primary">
        Start a burp competition
      </a>
      <a href="/como-jogar" style={{ color: 'var(--accent)', fontSize: 14 }}>
        Ler em português
      </a>
    </div>
  </LayoutLegal>
);
