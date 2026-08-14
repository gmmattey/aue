import React from 'react';
import { Link } from 'react-router-dom';

import '../../shared/publico/publico.css';
import './LayoutPublico.css';

/**
 * A moldura das páginas públicas de conteúdo: `/como-jogar` e `/como-arrotar`.
 *
 * POR QUE ELA EXISTE, E POR QUE NÃO É `TelaDesktop`
 * --------------------------------------------------
 * A landing (`TelaDesktop`) só aparece pro gate `ehDesktop` — ela foi desenhada
 * pra tela larga, com hero de duas colunas e celular falso. `/como-jogar` e
 * `/como-arrotar` são páginas de SEO: quem chega por elas vem do buscador, do
 * celular ou do computador, e não têm gate nenhum. Por isso esta moldura é uma
 * versão da mesma família visual que também funciona empilhada numa tela de
 * 375px — mesma marca, mesma tipografia, mesmo rodapé, sem o hero de duas
 * colunas que só faz sentido em tela larga.
 *
 * A casca (fundo, shell, topbar, pílula, cabeçalho de seção, CTA final,
 * rodapé) é a mesma classe CSS da landing, vinda de
 * `src/shared/publico/publico.css` — não existe uma segunda cópia daquele
 * token em lugar nenhum.
 *
 * NENHUM ESTADO DA ARENA NASCE AQUI, igual à landing: esta moldura vive fora
 * da máquina de estados.
 */
export const LayoutPublico: React.FC<{
  /** Vai no eyebrow do hero, acima do H1. Curto, no tom do jogo. */
  eyebrow: string;
  /** O H1 da página. */
  titulo: string;
  /** O parágrafo de abertura, logo abaixo do H1. */
  resumo: string;
  children: React.ReactNode;
}> = ({ eyebrow, titulo, resumo, children }) => (
  <div className="desktop-site publico-site">
    <header className="desktop-topbar">
      <div className="desktop-shell desktop-topbar-inner">
        <Link className="desktop-brand" to="/" aria-label="Auê! início">
          AUÊ!
        </Link>
        <nav className="desktop-nav" aria-label="Navegação">
          <Link to="/">Início</Link>
          <Link to="/como-jogar">Como jogar</Link>
          <Link to="/como-arrotar">Como arrotar</Link>
        </nav>
        <Link className="desktop-pill desktop-pill-primary" to="/">
          Jogar no celular
        </Link>
      </div>
    </header>

    <main>
      <section className="desktop-shell publico-hero">
        <span className="desktop-eyebrow">{eyebrow}</span>
        <h1>{titulo}</h1>
        <p>{resumo}</p>
      </section>

      {children}

      <section className="desktop-shell desktop-final-cta">
        <span className="desktop-eyebrow">Chega de ler</span>
        <h2>
          Agora <span>entra</span> na competição.
        </h2>
        <p>Pega o celular, solta o primeiro arroto e arruma alguém pra tentar bater tua nota.</p>
        <Link className="desktop-pill desktop-pill-primary desktop-pill-large" to="/">
          Arrotar agora
        </Link>
      </section>
    </main>

    <footer className="desktop-footer">
      <div className="desktop-shell desktop-footer-inner">
        <span>© 2026 Auê! · Competição de arroto levada a sério demais.</span>
        <nav aria-label="Links institucionais">
          <Link to="/como-jogar">Como jogar</Link>
          <Link to="/como-arrotar">Como arrotar</Link>
          <Link to="/privacidade">Política de privacidade</Link>
          <Link to="/termos">Termos de uso</Link>
        </nav>
      </div>
    </footer>
  </div>
);

/**
 * Uma seção de conteúdo dentro de `LayoutPublico`: eyebrow curto + h2 + corpo.
 *
 * É o equivalente, nas páginas de conteúdo, ao `Secao` de `LayoutLegal` — só
 * que na tipografia da landing em vez da tipografia sóbria dos documentos
 * legais. O eyebrow é novo: o conteúdo das duas páginas já existia como título
 * de `Secao` (ex.: "Arrotar e receber a nota"), e virou o h2 daqui; o eyebrow
 * curto ("O loop", "Com gás") é a única coisa que cada seção ganhou pra caber
 * no padrão eyebrow + h2 da landing.
 */
export const SecaoPublica: React.FC<{
  eyebrow: string;
  titulo: string;
  children: React.ReactNode;
}> = ({ eyebrow, titulo, children }) => (
  <section className="desktop-shell desktop-section publico-section">
    <div className="publico-section-head">
      <span className="desktop-eyebrow">{eyebrow}</span>
      <h2>{titulo}</h2>
    </div>
    <div className="publico-section-body">{children}</div>
  </section>
);
