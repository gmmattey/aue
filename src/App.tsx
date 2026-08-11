import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
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
import { BattleView } from './features/battle/BattleView';
import { DisputaLocalScreen } from './features/battle/DisputaLocalScreen';
import { TelaDesktop } from './features/desktop/TelaDesktop';
import { TelaDesktopEn } from './features/desktop/TelaDesktopEn';
import { PoliticaDePrivacidade } from './features/legal/PoliticaDePrivacidade';
import { TermosDeUso } from './features/legal/TermosDeUso';
import { ComoJogar } from './features/publico/ComoJogar';
import { HowToPlay } from './features/publico/HowToPlay';
import { AvisoDeOffline } from './shared/components/AvisoDeOffline';
import { useDispositivo } from './shared/desktop/useDispositivo';
import { Arena } from './arena/Arena';

function MainAppShell() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PerfilRow | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('inicio');
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
        onDisputar={() => setActiveTab('disputa')}
        isPremium={profile?.e_premium}
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
    if (activeTab === 'campeonatos' && !FLAGS.ligas) return home;
    if (activeTab === 'ranking' && !FLAGS.ranking) return home;
    if (activeTab === 'disputa' && !FLAGS.disputaLocal) return home;
    if (activeTab === 'perfil' && (!FLAGS.perfil || !session)) return home;

    switch (activeTab) {
      case 'inicio':
        return home;
      case 'ranking':
        return <RankingScreen />;
      case 'arrotar':
        return (
          <div className="screen" style={{ paddingBottom: 80, alignItems: 'center', justifyContent: 'center' }}>
            <AudioRecorder autoIniciar />
          </div>
        );
      case 'disputa':
        return <DisputaLocalScreen onSair={() => setActiveTab('inicio')} />;
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
      <header className="appbar" data-od-id="appbar">
        <span className="appbar-title">Auê!</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {FLAGS.perfil && session && (
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
          )}
          {FLAGS.loginSocial && !session && (
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

      {renderActiveView()}

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

function EntradaPorLink() {
  const { code } = useParams<{ code: string }>();
  const { ehDesktop } = useDispositivo();

  if (!FLAGS.arena) return <BattleView />;
  void ehDesktop;
  return <Arena codigoDoDesafio={code} />;
}

function EntradaPrincipal() {
  const { ehDesktop } = useDispositivo();

  if (ehDesktop) return <TelaDesktop />;
  return FLAGS.arena ? <Arena /> : <MainAppShell />;
}

export function App() {
  return (
    <>
      <AvisoDeOffline />
      <Router>
        <Routes>
          <Route path="/b/:code" element={<EntradaPorLink />} />
          <Route path="/d/:id" element={<ChallengeView />} />
          <Route path="/privacidade" element={<PoliticaDePrivacidade />} />
          <Route path="/termos" element={<TermosDeUso />} />
          <Route path="/como-jogar" element={<ComoJogar />} />

          {/*
            Internacionalização de aquisição, não fork do jogo.
            `/en/` explica o produto em inglês; o CTA/QR continua levando para
            a mesma Arena canônica na raiz.
          */}
          <Route path="/en" element={<TelaDesktopEn />} />
          <Route path="/en/how-to-play" element={<HowToPlay />} />

          <Route path="*" element={<EntradaPrincipal />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
