import React from 'react';
import { Link } from 'react-router-dom';

/**
 * A moldura comum das páginas legais e públicas textuais.
 *
 * `homeTo` existe para a versão internacional de `/como-jogar`: a página em
 * inglês volta para `/en/`, sem alterar o comportamento das páginas legais em
 * português. O padrão continua sendo `/`.
 */
export const LayoutLegal: React.FC<{
  /** Aparece em versalete embaixo da marca. */
  rotulo: string;
  /** Home desta experiência. Padrão: raiz em português. */
  homeTo?: string;
  children: React.ReactNode;
}> = ({ rotulo, homeTo = '/', children }) => (
  <div className="app-shell">
    <header className="appbar">
      <Link to={homeTo} style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="appbar-title">Auê!</span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {rotulo}
        </span>
      </Link>
    </header>

    <main className="screen" style={{ gap: 'var(--space-5)', paddingBottom: 'var(--space-6)' }}>
      {children}
    </main>
  </div>
);

/** Um bloco com título. A única variação tipográfica destas páginas. */
export const Secao: React.FC<{ titulo: string; children: React.ReactNode }> = ({
  titulo,
  children,
}) => (
  <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
    <h2
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 17,
        textTransform: 'uppercase',
        margin: 0,
      }}
    >
      {titulo}
    </h2>
    <div
      style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--muted)', display: 'grid', gap: 10 }}
    >
      {children}
    </div>
  </section>
);

/**
 * O rodapé comum das páginas legais: caminho para o outro documento e volta.
 */
export const RodapeLegal: React.FC<{ paraOnde: '/privacidade' | '/termos'; rotulo: string }> = ({
  paraOnde,
  rotulo,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
    <Link to={paraOnde} style={{ color: 'var(--accent)', fontSize: 14 }}>
      {rotulo}
    </Link>
    <Link to="/" className="btn btn-secondary">
      Voltar ao Auê
    </Link>
  </div>
);

/**
 * Quem responde pelo Auê. Aparece nos DOIS documentos legais.
 *
 * O responsável publicado é a Buildea Labs e o contato vem da mesma variável
 * usada no restante da política. Nada de e-mail duplicado escrito na mão.
 */
export const QuemResponde: React.FC = () => {
  const contato = import.meta.env.VITE_CONTATO_PRIVACIDADE as string | undefined;

  return (
    <Secao titulo="Quem responde por isto">
      <p>
        O Auê é tocado pela <strong>Buildea Labs</strong>, e é ela quem responde
        pelo que está escrito aqui e pelo tratamento dos dados.
      </p>
      {contato ? (
        <p>
          Não tem central de atendimento nem formulário: é escrever para{' '}
          <a href={`mailto:${contato}`} style={{ color: 'var(--accent)' }}>
            {contato}
          </a>
          , e do outro lado tem gente.
        </p>
      ) : (
        <p style={{ color: 'var(--danger)' }}>
          O canal de contato ainda não foi configurado nesta publicação.
        </p>
      )}
    </Secao>
  );
};
