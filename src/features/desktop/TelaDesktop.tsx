import React from 'react';
import { Link } from 'react-router-dom';

import { ENDERECO_LEGIVEL } from '../../shared/enderecoPublico';
import { CodigoQrDoApp } from './CodigoQrDoApp';
import { EnderecoParaLevar } from './EnderecoParaLevar';
import './TelaDesktop.css';

const passos = [
  {
    numero: '01',
    titulo: 'Arrota',
    texto: 'Solta um de verdade. O microfone escuta e o jogo decide se aquilo merece julgamento.',
  },
  {
    numero: '02',
    titulo: 'Recebe a nota',
    texto: 'De “foi isso?” até “tá roubado”. Sem relatório de laboratório depois do arroto.',
  },
  {
    numero: '03',
    titulo: 'Chama no X1',
    texto: 'Manda o link curto. A outra pessoa abre no celular e tenta bater tua nota.',
  },
  {
    numero: '04',
    titulo: 'Revanche',
    texto: 'Perdeu, tenta de novo. Ganhou, também. Ninguém termina uma briga em paz.',
  },
];

const guias = [
  'Como arrotar alto',
  'Como arrotar de propósito',
  'Por que eu não consigo arrotar?',
];

const arrotosDaInternet = [
  { nota: '97', legenda: 'Isso saiu de uma pessoa?' },
  { nota: '91', legenda: 'Curto. Grosso. Desnecessário.' },
  { nota: '88', legenda: 'O clássico do churrasco.' },
  { nota: '95', legenda: 'Nem fudendo.' },
  { nota: '100', legenda: 'Tá roubado. Não é possível.' },
];

/**
 * A raiz em desktop não tenta ser o jogo.
 *
 * Desktop tem três trabalhos: explicar o Auê, gerar presença indexável e levar
 * a pessoa para o celular. A Arena continua sendo a experiência principal no
 * telefone. Links diretos de batalha seguem fora deste gate em App.tsx.
 *
 * O endereço público e o QR NÃO são hardcoded aqui. Ambos usam a fonte canônica
 * de `shared/enderecoPublico`, então a troca de hospedagem da #137 não cria uma
 * segunda verdade escondida nesta landing.
 */
export const TelaDesktop: React.FC = () => {
  return (
    <div className="desktop-site">
      <header className="desktop-topbar">
        <div className="desktop-shell desktop-topbar-inner">
          <a className="desktop-brand" href="#inicio" aria-label="Auê! início">
            AUÊ!
          </a>
          <nav className="desktop-nav" aria-label="Navegação da landing">
            <a href="#como-jogar">Como jogar</a>
            <a href="#como-arrotar">Como arrotar</a>
            <a href="#internet">Arrotos da internet</a>
            <a href="#comunidade">Comunidade</a>
          </nav>
          <a className="desktop-pill desktop-pill-primary" href="#celular">
            Jogar no celular
          </a>
        </div>
      </header>

      <main>
        <section className="desktop-shell desktop-hero" id="inicio">
          <div className="desktop-hero-copy">
            <span className="desktop-eyebrow">O jogo de arroto</span>
            <h1>
              Arrote.
              <br />
              Receba a nota.
              <br />
              <span>Humilhe</span>
              <br />
              seus amigos.
            </h1>
            <p>
              É exatamente o que parece. Você arrota, o Auê julga e a nota vira
              munição pra chamar alguém pro X1. Perdeu? Revanche. Ganhou? Revanche também.
            </p>
            <div className="desktop-hero-actions">
              <a className="desktop-pill desktop-pill-primary desktop-pill-large" href="#celular">
                Jogar no celular
              </a>
              <a className="desktop-pill desktop-pill-secondary desktop-pill-large" href="#como-jogar">
                Como essa porra funciona
              </a>
            </div>
            <div className="desktop-store-status" aria-label="Disponibilidade nas lojas">
              <span>App Store · em breve</span>
              <span>Google Play · em breve</span>
            </div>
          </div>

          <div className="desktop-stage" aria-label="Prévia do resultado no Auê">
            <span className="desktop-floating-tag desktop-floating-tag-valid">ARROTO VÁLIDO ✓</span>
            <span className="desktop-floating-tag desktop-floating-tag-score">
              <b>1 × 0</b> · REVANCHE?
            </span>
            <div className="desktop-phone" aria-hidden="true">
              <div className="desktop-phone-ui">
                <span className="desktop-phone-logo">AUÊ!</span>
                <div className="desktop-score-orbit">
                  <div className="desktop-blob" />
                  <strong>94</strong>
                  <small>nota do arroto</small>
                </div>
                <div className="desktop-reaction">Tá maluco.</div>
                <div className="desktop-challenge">Duvido bater.</div>
                <div className="desktop-fake-button">CHAMAR NO X1</div>
              </div>
            </div>
          </div>
        </section>

        <section className="desktop-handoff" id="celular">
          <div className="desktop-shell desktop-handoff-inner">
            <div>
              <span className="desktop-eyebrow">Você tá no computador</span>
              <h2>O arroto não.</h2>
              <p>
                O jogo acontece no celular. Aponte a câmera pro QR ou abra{' '}
                <strong>{ENDERECO_LEGIVEL}</strong> no telefone.
              </p>
            </div>
            <div className="desktop-qr-block">
              <CodigoQrDoApp lado={118} />
              <div className="desktop-qr-copy">
                <strong>Abrir no celular</strong>
                <EnderecoParaLevar />
              </div>
            </div>
          </div>
        </section>

        <section className="desktop-shell desktop-section" id="como-jogar">
          <div className="desktop-section-head">
            <div>
              <span className="desktop-eyebrow">Como jogar</span>
              <h2>
                Quatro passos.
                <br />
                Zero dignidade.
              </h2>
            </div>
            <p>
              Não precisa criar personagem, decorar combo ou assistir tutorial. O Auê começa onde
              qualquer discussão séria termina: alguém arrotando.
            </p>
          </div>

          <div className="desktop-steps">
            {passos.map((passo) => (
              <article className="desktop-step" key={passo.numero}>
                <span>{passo.numero}</span>
                <h3>{passo.titulo}</h3>
                <p>{passo.texto}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="desktop-shell desktop-section" id="como-arrotar">
          <div className="desktop-section-head">
            <div>
              <span className="desktop-eyebrow">Aprenda alguma coisa útil</span>
              <h2>Como arrotar.</h2>
            </div>
            <p>
              Sim, existe gente pesquisando isso. Se você chegou até aqui sem saber, tudo bem:
              tem prática, timing e um jogo inteiro esperando pra julgar o resultado.
            </p>
          </div>

          <div className="desktop-learn-grid">
            <article className="desktop-feature-panel">
              <span className="desktop-eyebrow">Guia principal</span>
              <h3>Como arrotar de propósito</h3>
              <p>
                Um guia simples, sem conselho médico inventado: postura, ar, timing e como não
                transformar a tentativa num episódio de emergência familiar.
              </p>
              <span className="desktop-text-link desktop-text-link-muted">Página completa · em breve</span>
            </article>

            <div className="desktop-guide-list" aria-label="Próximos guias sobre arroto">
              {guias.map((guia) => (
                <div className="desktop-guide-item" key={guia}>
                  <strong>{guia}</strong>
                  <span>EM BREVE</span>
                </div>
              ))}
              <a className="desktop-guide-item" href="#celular">
                <strong>Já sabe? Descobre quanto vale.</strong>
                <span>JOGAR ↗</span>
              </a>
            </div>
          </div>
        </section>

        <section className="desktop-internet" id="internet">
          <div className="desktop-shell desktop-section">
            <div className="desktop-section-head">
              <div>
                <span className="desktop-eyebrow">Hall dos arrotos</span>
                <h2>A internet não tava preparada.</h2>
              </div>
              <p>
                Uma futura curadoria de vídeos públicos que merecem estudo, julgamento ou só a
                pergunta: “que porra foi essa?”. Conteúdo de terceiros continua sendo de terceiros.
              </p>
            </div>

            <div className="desktop-video-grid" aria-label="Prévia visual da futura curadoria">
              {arrotosDaInternet.map((item, index) => (
                <div className={`desktop-video ${index === 0 ? 'desktop-video-featured' : ''}`} key={`${item.nota}-${item.legenda}`}>
                  <strong>{item.nota}</strong>
                  <span className="desktop-play" aria-hidden="true">▶</span>
                  <span className="desktop-video-label">{item.legenda}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="desktop-shell desktop-section" id="comunidade">
          <div className="desktop-section-head">
            <div>
              <span className="desktop-eyebrow">Comunidade</span>
              <h2>Onde a zoeira acontece.</h2>
            </div>
            <p>
              Nada de diretório aleatório com grupo suspeito. Quando existir grupo oficial ou
              comunidade que a gente realmente conheça, ela aparece aqui.
            </p>
          </div>
          <div className="desktop-community-line">
            <div>
              <h3>Grupo oficial do Auê</h3>
              <p>Melhor esperar um grupo real do que fingir comunidade só pra preencher menu.</p>
            </div>
            <span>em breve</span>
          </div>
        </section>

        <section className="desktop-shell desktop-final-cta">
          <span className="desktop-eyebrow">Chega de ler</span>
          <h2>
            Agora <span>arrote</span> essa porra.
          </h2>
          <p>
            O desktop já fez o trabalho dele: te trouxe até aqui. Agora pega o celular e vê se esse
            pulmão todo vale alguma coisa.
          </p>
          <div className="desktop-final-qr">
            <CodigoQrDoApp lado={142} />
          </div>
          <span className="desktop-final-address">{ENDERECO_LEGIVEL}</span>
        </section>
      </main>

      <footer className="desktop-footer">
        <div className="desktop-shell desktop-footer-inner">
          <span>© 2026 Auê! · Uma péssima ideia executada com seriedade.</span>
          <nav aria-label="Links institucionais">
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/termos">Termos</Link>
            <Link to="/como-jogar">Como jogar</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};
