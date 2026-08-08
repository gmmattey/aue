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
import { BattleView } from './features/battle/BattleView';
import { DisputaLocalScreen } from './features/battle/DisputaLocalScreen';
import { TelaDesktop } from './features/desktop/TelaDesktop';
import { PoliticaDePrivacidade } from './features/legal/PoliticaDePrivacidade';
import { useDispositivo } from './shared/desktop/useDispositivo';

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
    if (activeTab === 'ranking' && !FLAGS.ranking) return home;
    if (activeTab === 'disputa' && !FLAGS.disputaLocal) return home;
    // Perfil precisa das DUAS condições. A flag é o corte de lançamento; a
    // sessão é o que a tela consome. Desde o login anônimo `session` é sempre
    // verdadeira, então sozinha ela deixou de barrar qualquer coisa — é a flag
    // que faz o trabalho agora, e a checagem de sessão fica como o que sempre
    // foi: a garantia de que a tela não monta sem dado.
    if (activeTab === 'perfil' && (!FLAGS.perfil || !session)) return home;

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
      {/* App Header */}
      <header className="appbar">
        <span className="appbar-title">Auê!</span>
        {/*
          No corte do MVP este canto fica VAZIO, e isso é a decisão, não uma
          sobra: não há login para oferecer (a sessão é anônima e invisível) e
          não há perfil para abrir. O cabeçalho é só a marca.

          Os dois controles continuam aqui, cada um atrás da sua flag, porque
          voltam juntos no MVP 2 — quando entrar vira promover a conta anônima
          em vez de criar outra.
        */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {FLAGS.perfil && session && (
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

/**
 * Quem entra pela raiz: a landing no desktop, o app no celular.
 *
 * O gate embrulha SÓ esta rota. `/b/:code`, `/d/:id` e `/privacidade` abrem
 * igual em qualquer aparelho — o link de uma batalha cai no notebook do
 * trabalho o tempo todo, e gravar funciona no desktop. Bloquear ali seria
 * impedir alguém de participar de uma disputa para a qual foi convidado.
 */
function EntradaPrincipal() {
  const { ehDesktop } = useDispositivo();
  return ehDesktop ? <TelaDesktop /> : <MainAppShell />;
}

export function App() {
  return (
    <Router>
      <Routes>
        {/*
          Batalha em sessão — o duelo do MVP. Todo link novo aponta para cá.
        */}
        <Route path="/b/:code" element={<BattleView />} />
        {/*
          Desafio de turno único — LEGADO. Fica no ar indefinidamente porque
          links /d/CODIGO já podem ter sido compartilhados, e um link que
          alguém mandou no WhatsApp não deixa de existir porque o produto
          mudou de ideia.
        */}
        <Route path="/d/:id" element={<ChallengeView />} />
        {/*
          Privacidade fica FORA do gate de desktop de propósito: o aviso de uma
          linha do AudioRecorder aponta para cá, e ele é lido no celular.
        */}
        <Route path="/privacidade" element={<PoliticaDePrivacidade />} />
        <Route path="*" element={<EntradaPrincipal />} />
      </Routes>
    </Router>
  );
}

export default App;
