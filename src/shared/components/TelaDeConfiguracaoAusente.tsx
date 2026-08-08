import React from 'react';

interface TelaDeConfiguracaoAusenteProps {
  /** Nome da variável que falta, vindo de `db/supabase.ts`. */
  variavel: string;
}

/**
 * O que aparece no lugar do app quando falta credencial do Supabase.
 *
 * Substitui uma página em branco. `createClient` lança com URL vazia, e o
 * módulo `db/supabase` é importado em cadeia por quase toda tela — a exceção
 * acontecia antes do primeiro render, então não havia nem app, nem mensagem,
 * nem pista. Só o fundo do navegador.
 *
 * O texto é dirigido a quem publica, não a quem usa: se esta tela aparecer em
 * produção, o problema é de deploy, e quem precisa da informação é o Luiz. O
 * usuário comum nunca deveria chegar aqui — mas se chegar, ao menos sabe que o
 * problema não é o telefone dele.
 *
 * Deliberadamente sem `import` de nada além do React: qualquer dependência
 * daqui corre o risco de arrastar `db/supabase` de volta para o grafo e
 * reintroduzir exatamente a falha que esta tela existe para explicar.
 */
export const TelaDeConfiguracaoAusente: React.FC<TelaDeConfiguracaoAusenteProps> = ({
  variavel,
}) => {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        textAlign: 'center',
        background: 'var(--bg, #0a0a08)',
        color: 'var(--fg, #f5f5f0)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>Auê!</span>

      <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
        O app não está configurado.
      </h1>

      <p style={{ margin: 0, maxWidth: 420, lineHeight: 1.5, color: 'var(--muted, #a1a196)' }}>
        Falta a variável de ambiente <code style={{ fontWeight: 700 }}>{variavel}</code> neste
        build. Sem ela o Auê não consegue falar com o banco, então não dá para gravar nem
        abrir uma batalha.
      </p>

      <p style={{ margin: 0, maxWidth: 420, lineHeight: 1.5, fontSize: 13, color: 'var(--muted, #a1a196)' }}>
        Se você publicou este site: as variáveis <code>VITE_*</code> são lidas em tempo de
        build. Configurá-las no painel da hospedagem não basta — é preciso um novo build e
        um novo deploy, e elas precisam existir tanto em Production quanto em Preview.
      </p>
    </div>
  );
};
