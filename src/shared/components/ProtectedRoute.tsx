import React from 'react';

interface ProtectedRouteProps {
  session: any;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ session, children }) => {
  if (!session) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        <h2>Acesso Restrito 🛑</h2>
        <p style={{ fontSize: '1.1em', color: '#555', marginBottom: '20px' }}>
          Você precisa estar logado para acessar esta área do Auê. 
          Use os botões no topo da tela para entrar com sua conta Google, TikTok ou X.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
