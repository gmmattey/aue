import React from 'react';

import { ENDERECO_LEGIVEL } from '../../shared/enderecoPublico';
import { CodigoQrDoApp } from './CodigoQrDoApp';
import { EnderecoParaLevar } from './EnderecoParaLevar';
import './TelaDesktop.css';

const steps = [
  {
    number: '01',
    title: 'Burp',
    text: 'Let a real one out. If the game validates it, that burp enters the competition.',
  },
  {
    number: '02',
    title: 'Get the score',
    text: "The score goes from 0 to 100. It's not a diagnosis: it's the number your friend has to beat.",
  },
  {
    number: '03',
    title: 'Send the 1v1',
    text: 'Send the link. Your friend opens it on their phone, burps back and tries to beat your score.',
  },
  {
    number: '04',
    title: 'Rematch',
    text: 'Lost? Go again. Won? Go again anyway. Nobody ends this argument peacefully.',
  },
];

/**
 * English acquisition page.
 *
 * This is intentionally NOT a translated Arena. The game still has one codebase
 * and one root experience. `/en/` exists for discovery, international search and
 * people who receive an Auê link before they know what the hell it is.
 *
 * The CTA and QR point to the canonical game home. The page explains the game;
 * it does not fork it.
 */
export const TelaDesktopEn: React.FC = () => {
  return (
    <div className="desktop-site" lang="en">
      <header className="desktop-topbar">
        <div className="desktop-shell desktop-topbar-inner">
          <a className="desktop-brand" href="#start" aria-label="Auê! home">
            AUÊ!
          </a>
          <nav className="desktop-nav" aria-label="Landing navigation">
            <a href="#competition">How it works</a>
            <a href="/en/how-to-play">How to play</a>
            <a href="/">Português</a>
          </nav>
          <a className="desktop-pill desktop-pill-primary" href="#phone">
            Play on your phone
          </a>
        </div>
      </header>

      <main>
        <section className="desktop-shell desktop-hero" id="start">
          <div className="desktop-hero-copy">
            <span className="desktop-eyebrow">Online burp competition</span>
            <h1>
              Burp.
              <br />
              Get your score.
              <br />
              <span>Humiliate</span>
              <br />
              your friends.
            </h1>
            <p>
              This is not a diagnosis. <strong>It&apos;s a scoreboard.</strong> Burp, get a score from
              0 to 100, challenge a friend to a 1v1 and see who takes the round. Lost? Rematch.
              Won? Rematch anyway.
            </p>
            <div className="desktop-hero-actions">
              <a className="desktop-pill desktop-pill-primary desktop-pill-large" href="#phone">
                Play on your phone
              </a>
              <a className="desktop-pill desktop-pill-secondary desktop-pill-large" href="#competition">
                How it works
              </a>
            </div>
          </div>

          <div className="desktop-stage" aria-label="Auê 1v1 preview">
            <span className="desktop-floating-tag desktop-floating-tag-valid">1V1 IS ON</span>
            <span className="desktop-floating-tag desktop-floating-tag-score">
              <b>1 × 0</b> · REMATCH?
            </span>
            <div className="desktop-phone" aria-hidden="true">
              <div className="desktop-phone-ui">
                <span className="desktop-phone-logo">AUÊ!</span>
                <div className="desktop-score-orbit">
                  <div className="desktop-blob" />
                  <strong>94</strong>
                  <small>round score</small>
                </div>
                <div className="desktop-reaction">That was nasty.</div>
                <div className="desktop-challenge">Bet you can&apos;t beat it.</div>
                <div className="desktop-fake-button">CHALLENGE 1V1</div>
              </div>
            </div>
          </div>
        </section>

        <section className="desktop-handoff" id="phone">
          <div className="desktop-shell desktop-handoff-inner">
            <div>
              <span className="desktop-eyebrow">The competition lives on your phone</span>
              <h2>Take this nonsense with you.</h2>
              <p>
                Scan the QR code or open <strong>{ENDERECO_LEGIVEL}</strong> on your phone. No account
                wall, no seven-screen tutorial. Open it, burp, and you&apos;re in.
              </p>
            </div>
            <div className="desktop-qr-block">
              <CodigoQrDoApp lado={118} />
              <div className="desktop-qr-copy">
                <strong>Open on your phone</strong>
                <EnderecoParaLevar idioma="en" />
              </div>
            </div>
          </div>
        </section>

        <section className="desktop-shell desktop-section" id="competition">
          <div className="desktop-section-head">
            <div>
              <span className="desktop-eyebrow">How it works</span>
              <h2>
                Highest score
                <br />
                takes the round.
              </h2>
            </div>
            <p>
              Auê is an online burp competition built for one stupid argument: who can score higher?
              One person burps, the other answers, and the scoreboard decides who gets bragging rights
              until the rematch.
            </p>
          </div>

          <div className="desktop-steps">
            {steps.map((step) => (
              <article className="desktop-step" key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="desktop-shell desktop-section" aria-labelledby="score-title">
          <div className="desktop-section-head">
            <div>
              <span className="desktop-eyebrow">The only rule that matters</span>
              <h2 id="score-title">The score is the target.</h2>
            </div>
            <p>
              Duration, power and other sound traits help the game judge the burp. For the player,
              it&apos;s simpler: scored 94? Your friend needs 95. That&apos;s when measurement turns into a game.
            </p>
          </div>

          <div className="desktop-learn-grid">
            <article className="desktop-feature-panel">
              <span className="desktop-eyebrow">Competition, not a lab report</span>
              <h3>One number. One target.</h3>
              <p>
                The result exists to be challenged, shared and beaten. If nobody tries to top your
                score, it was just a beautiful burp. When someone answers, it becomes a game.
              </p>
              <a className="desktop-text-link" href="/en/how-to-play">
                See how to play ↗
              </a>
            </article>

            <div className="desktop-guide-list" aria-label="What Auê already does">
              <div className="desktop-guide-item">
                <strong>Runs in your browser</strong>
                <span>NO INSTALL</span>
              </div>
              <div className="desktop-guide-item">
                <strong>Challenge someone with a link</strong>
                <span>1V1</span>
              </div>
              <div className="desktop-guide-item">
                <strong>The two scores face off</strong>
                <span>SCOREBOARD</span>
              </div>
              <div className="desktop-guide-item">
                <strong>Lost? Ask for another one.</strong>
                <span>REMATCH</span>
              </div>
            </div>
          </div>
        </section>

        <section className="desktop-shell desktop-final-cta">
          <span className="desktop-eyebrow">Enough reading</span>
          <h2>
            Now <span>enter</span> the competition.
          </h2>
          <p>
            The desktop page did its job. Grab your phone, drop the first burp and find somebody
            willing to try to beat your score.
          </p>
          <div className="desktop-final-qr">
            <CodigoQrDoApp lado={142} />
          </div>
          <span className="desktop-final-address">{ENDERECO_LEGIVEL}</span>
        </section>
      </main>

      <footer className="desktop-footer">
        <div className="desktop-shell desktop-footer-inner">
          <span>© 2026 Auê! · Burp competition taken way too seriously.</span>
          <nav aria-label="Institutional links">
            <a href="/privacidade">Privacy</a>
            <a href="/termos">Terms</a>
            <a href="/en/how-to-play">How to play</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};
