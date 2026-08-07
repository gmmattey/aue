import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { supabase, signInWithGoogle, signInWithTikTok, signInWithTwitter, signOut, getProfile } from './db/supabase';
import { BottomNav } from './shared/components/BottomNav';
import type { NavTab } from './shared/components/BottomNav';
import { RankingScreen } from './features/ranking/RankingScreen';
import { FeedScreen } from './features/community/FeedScreen';
import { ConquistasScreen } from './features/gamification/ConquistasScreen';
import { ProfileScreen } from './features/profile/ProfileScreen';
import { ChampionshipLobbyScreen } from './features/championship/ChampionshipLobbyScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { AudioRecorder } from './features/audio/AudioRecorder';
import { OriginSheet } from './features/audio/OriginSheet';
import { ChallengeView } from './features/audio/ChallengeView';

function MainAppShell() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('ranking');
  const [subView, setSubView] = useState<'none' | 'conquistas' | 'settings' | 'lobby'>('none');
  const [showOriginSheet, setShowOriginSheet] = useState(false);

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

  const handleLogin = async (provider: 'google' | 'tiktok' | 'twitter') => {
    try {
      if (provider === 'google') await signInWithGoogle();
      else if (provider === 'tiktok') await signInWithTikTok();
      else if (provider === 'twitter') await signInWithTwitter();
    } catch (err: any) {
      alert(`Erro no login: ${err.message || 'Falha na autenticação.'}`);
    }
  };

  const renderActiveView = () => {
    if (subView === 'conquistas') {
      return <ConquistasScreen userId={session?.user?.id} onBack={() => setSubView('none')} />;
    }
    if (subView === 'settings') {
      return <SettingsScreen onBack={() => setSubView('none')} onSignOut={signOut} />;
    }
    if (subView === 'lobby') {
      return (
        <ChampionshipLobbyScreen
          onBack={() => setSubView('none')}
          onStartRecordingForTurn={() => {
            setSubView('none');
            setActiveTab('arrotar');
          }}
        />
      );
    }

    switch (activeTab) {
      case 'ranking':
        return <RankingScreen />;
      case 'feed':
        return <FeedScreen />;
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
        return <RankingScreen />;
    }
  };

  return (
    <div className="app-shell">
      {/* App Header */}
      <header className="appbar">
        <span className="appbar-title">Auê!</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {session ? (
            <button
              type="button"
              className="icon-btn"
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
                  borderRadius: 999,
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

      {/* Main Content View */}
      {renderActiveView()}

      {/* Origin Selection Sheet */}
      <OriginSheet
        isOpen={showOriginSheet}
        onClose={() => setShowOriginSheet(false)}
        onSelectOrigin={(originType, originSubtype) => {
          setShowOriginSheet(false);
          alert(`Origem selecionada: ${originType} ${originSubtype ? `(${originSubtype})` : ''}`);
        }}
      />

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
