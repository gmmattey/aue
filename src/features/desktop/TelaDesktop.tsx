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
    texto: 'Solta um de verdade. Se o jogo validar, esse arroto entra na competição.',
  },
  {
    numero: '02',
    titulo: 'Recebe o placar',
    texto: 'A nota vai de 0 a 100. Não é diagnóstico: é o número que o outro precisa bater.',
  },
  {
    numero: '03',
    titulo: 'Chama no X1',
    texto: 'Manda o link. A outra pessoa abre no celular, arrota e tenta passar tua nota.',
  },
  {
    numero: '04',
    titulo: 'Revanche',
    texto: 'Perdeu? Tenta de novo. Ganhou? Também. Ninguém termina essa discussão em paz.',
  },
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
            <a href="#competicao">Como funciona</a>
            <Link to="/como-jogar">Como jogar</Link>
          </nav>
          <a className="desktop-pill desktop-pill-primary" href="#celular">
            Jogar no celular
          </a>
        </div>
      </header>

      <main>
        <section className="desktop-shell desktop-hero" id="inicio">
          <div className="desktop-hero-copy">
            <span className="desktop-eyebrow">Competição de arroto online</span>
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
              Aqui a nota não é diagnóstico. <strong>É placar.</strong> Você arrota, recebe de 0 a
              100, chama alguém pro X1 e descobre quem leva o round. Perdeu? Revanche. Ganhou?
              Revanche também.
            </p>
            <div className="desktop-hero-actions">
              <a className="desktop-pill desktop-pill-primary desktop-pill-large" href="#celular">
                Jogar no celular
              </a>
              <a className="desktop-pill desktop-pill-secondary desktop-pill-large" href="#competicao">
                Como essa porra funciona
              </a>
            </div>
          </div>

          <div className="desktop-stage" aria-label="Prévia de um X1 no Auê">
            <span className="desktop-floating-tag desktop-floating-tag-valid">X1 VALENDO</span>
            <span className="desktop-floating-tag desktop-floating-tag-score">
              <b>1 × 0</b> · REVANCHE?
            </span>
            <div className="desktop-phone" aria-hidden="true">
              <div className="desktop-phone-ui">
                <span className="desktop-phone-logo">AUÊ!</span>
                <div className="desktop-score-orbit">
                  <div className="desktop-blob" />
                  <strong>94</strong>
                  <small>placar do round</small>
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
              <span className="desktop-eyebrow">A competição é no celular</span>
              <h2>Leva essa porra contigo.</h2>
              <p>
                Aponte a câmera pro QR ou abra <strong>{ENDERECO_LEGIVEL}</strong> no telefone.
                Sem cadastro na frente, sem tutorial de sete telas. Abriu, arrotou, começou.
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

        <section className="desktop-shell desktop-section" id="competicao">
          <div className="desktop-section-head">
            <div>
              <span className="desktop-eyebrow">Como funciona</span>
              <h2>
                Maior nota
                <br />
                leva o round.
              </h2>
            </div>
            <p>
              O Auê não quer explicar teu arroto. Quer encerrar uma discussão idiota com um número.
              Um arrota, o outro responde e o placar decide quem tem direito de falar merda até a
              revanche.
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

        <section className="desktop-shell desktop-section" aria-labelledby="placar-titulo">
          <div className="desktop-section-head">
            <div>
              <span className="desktop-eyebrow">A regra que importa</span>
              <h2 id="placar-titulo">A nota é placar.</h2>
            </div>
            <p>
              Duração, potência e outras medidas ajudam o jogo a julgar. Pra quem joga, o que importa
              é mais simples: saiu 94? Então alguém precisa fazer 95. É aí que a medição vira competição.
            </p>
          </div>

          <div className="desktop-learn-grid">
            <article className="desktop-feature-panel">
              <span className="desktop-eyebrow">Competição, não laboratório</span>
              <h3>Um número. Um alvo.</h3>
              <p>
                O resultado existe para ser provocado, compartilhado e superado. Se ninguém tentar
                bater tua nota, foi só um arroto bonito. Quando alguém responde, virou jogo.
              </p>
              <Link className="desktop-text-link" to="/como-jogar">
                Ver como jogar ↗
              </Link>
            </article>

            <div className="desktop-guide-list" aria-label="O que já existe no Auê">
              <div className="desktop-guide-item">
                <strong>Joga direto no navegador</strong>
                <span>SEM INSTALAR</span>
              </div>
              <div className="desktop-guide-item">
                <strong>Chama alguém pelo link</strong>
                <span>X1</span>
              </div>
              <div className="desktop-guide-item">
                <strong>As duas notas se enfrentam</strong>
                <span>PLACAR</span>
              </div>
              <div className="desktop-guide-item">
                <strong>Perdeu? Pede outra.</strong>
                <span>REVANCHE</span>
              </div>
            </div>
          </div>
        </section>

        <section className="desktop-shell desktop-final-cta">
          <span className="desktop-eyebrow">Chega de ler</span>
          <h2>
            Agora <span>entra</span> na competição.
          </h2>
          <p>
            O desktop já fez o trabalho dele. Agora pega o celular, solta o primeiro arroto e arruma
            alguém pra tentar bater tua nota.
          </p>
          <div className="desktop-final-qr">
            <CodigoQrDoApp lado={142} />
          </div>
          <span className="desktop-final-address">{ENDERECO_LEGIVEL}</span>
        </section>
      </main>

      <footer className="desktop-footer">
        <div className="desktop-shell desktop-footer-inner">
          <span>© 2026 Auê! · Competição de arroto levada a sério demais.</span>
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
