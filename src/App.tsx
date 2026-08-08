import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';

import { supabase, signInWithGoogle, signInWithTikTok, signInWithTwitter, signOut, getProfile } from './db/supabase';
import type { PerfilRow } from './db/supabase';
import { BottomNav } from './shared/components/BottomNav';
import type { NavTab } from './shared/components/BottomNav';
import { FLAGS } from './shared/flags';
import { RankingScreen } from './features/ranking/RankingScreen';
import { HomeScreen } from './features/home/HomeScreen';
import { ConquistasScreen } from './features/gamification/ConquistasScreen';
import { ProfileScreen } from './features/profile/ProfileScreen';
import { ChampionshipLobbyScreen } from './features/championship/ChampionshipLobbyScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { AudioRecorder } from './features/audio/AudioRecorder';
import { ChallengeView } from './features/audio/ChallengeView';

function MainAppShell() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PerfilRow | null>(null);
  // O app abre na Home. Antes abria em 'ranking', o que fazia a primeira tela
  // do produto ser "RANKING VAZIO" enquanto ninguém tivesse gravado.
  const [activeTab, setActiveTab] = useState<NavTab>('inicio');
  // 'lobby' saiu do union: era um segundo caminho até a tela de campeonato e
  // nenhum controle da interface o acionava. Fechado junto com a aba "Ligas"
  // para que a feature desligada não tenha rota alternativa.
  const [subView, setSubView] = useState<'none' | 'conquistas' | 'settings'>('none');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        getProfile(session.user.id).then((p) => setProfile(p)).catch(() => {});
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        getProfile(session.user.id).then((p) => setProfile(p)).catch(() => {});
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const [loginErro, setLoginErro] = useState<string | null>(null);

  const handleLogin = async (provider: 'google' | 'tiktok' | 'twitter') => {
    setLoginErro(null);
    try {
      if (provider === 'google') await signInWithGoogle();
      else if (provider === 'tiktok') await signInWithTikTok();
      else if (provider === 'twitter') await signInWithTwitter();
    } catch (err) {
      console.error('Falha na autenticação', err);
      setLoginErro('Não foi possível entrar. Tenta de novo.');
    }
  };

  const renderActiveView = () => {
    const home = (
      <HomeScreen
        onGravar={() => setActiveTab('arrotar')}
        isPremium={profile?.is_premium}
        userId={session?.user?.id}
      />
    );

    if (subView === 'conquistas') {
      return <ConquistasScreen userId={session?.user?.id} onBack={() => setSubView('none')} />;
    }
    if (subView === 'settings') {
      return (
        <SettingsScreen
          onBack={() => setSubView('none')}
          onSignOut={signOut}
          profile={profile}
          isSignedIn={Boolean(session)}
          onProfileChange={setProfile}
        />
      );
    }
    // Segunda barreira das features desligadas: mesmo que alguma aba escape
    // (estado antigo, mudança futura na navegação), a view não é montada.
    // Esconder o botão sem fechar a view não vale como desligar.
    if (activeTab === 'campeonatos' && !FLAGS.ligas) return home;
    // Perfil só faz sentido com sessão: sem ela a tela não teria dado nenhum
    // para mostrar. Ela também não tem mais entrada na barra — o caminho é o
    // avatar do cabeçalho, que só existe logado.
    if (activeTab === 'perfil' && !session) return home;

    switch (activeTab) {
      case 'inicio':
        return home;
      case 'ranking':
        return <RankingScreen />;
      case 'arrotar':
        return (
          <div className="screen" style={{ paddingBottom: 80, alignItems: 'center', justifyContent: 'center' }}>
            <AudioRecorder />
          </div>
        );
      case 'campeonatos':
        return (
          <ChampionshipLobbyScreen
            onStartRecordingForTurn={() => setActiveTab('arrotar')}
          />
        );
      case 'perfil':
        return (
          <ProfileScreen
            userProfile={profile}
            onOpenConquistas={() => setSubView('conquistas')}
            onOpenSettings={() => setSubView('settings')}
          />
        );
      default:
        return home;
    }
  };

  return (
    <div className="app-shell">
      {/* App Header */}
      <header className="appbar">
        <span className="appbar-title">Auê!</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {session ? (
            /*
              Único caminho até o perfil desde que ele saiu da barra de
              navegação. Precisa de rótulo: a inicial do apelido sozinha não
              diz para onde leva.
            */
            <button
              type="button"
              className="icon-btn"
              aria-label="Abrir meu perfil"
              aria-current={activeTab === 'perfil' ? 'page' : undefined}
              onClick={() => {
                setActiveTab('perfil');
                setSubView('none');
              }}
            >
              {(profile?.apelido || 'A').charAt(0).toUpperCase()}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => handleLogin('google')}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                }}
              >
                Entrar
              </button>
            </div>
          )}
        </div>
      </header>

      {loginErro && (
        <p
          role="alert"
          style={{ padding: '8px 20px', margin: 0, fontSize: 13, color: 'var(--danger)' }}
        >
          {loginErro}
        </p>
      )}

      {/* Main Content View */}
      {renderActiveView()}

      {/*
        A folha de origem NÃO é montada aqui. Ela pertence ao fluxo de
        gravação e é aberta pelo `AudioRecorder` logo após a análise do áudio.
        Nesta posição ela era inalcançável: `showOriginSheet` nunca virava
        `true` e o callback só disparava um `alert()`.
      */}

      {/* Bottom Floating Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setSubView('none');
          setActiveTab(tab);
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/d/:id" element={<ChallengeView />} />
        <Route path="*" element={<MainAppShell />} />
      </Routes>
    </Router>
  );
}

export default App;
