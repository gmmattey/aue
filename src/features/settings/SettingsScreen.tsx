import React, { useEffect, useState } from 'react';

import { updateProfile } from '../../db/supabase';
import type { PerfilRow } from '../../db/supabase';
import { FLAGS } from '../../shared/flags';

/**
 * E-mail para onde o usuário pede exclusão de conta enquanto não existe fluxo
 * automático. Sem esta variável, a tela não inventa um endereço — apenas
 * informa que a exclusão automática ainda não está disponível.
 */
const EMAIL_PRIVACIDADE = import.meta.env.VITE_CONTATO_PRIVACIDADE as string | undefined;

/** Colunas de `profiles` que guardam as preferências de notificação. */
type ChaveNotificacao = 'notificar_desafios' | 'notificar_ranking' | 'notificar_comunidade';

const NOTIFICACOES: { chave: ChaveNotificacao; titulo: string; descricao: string }[] = [
  { chave: 'notificar_desafios', titulo: 'Desafios e revanches', descricao: 'Quando alguém te desafia' },
  { chave: 'notificar_ranking', titulo: 'Ranking e campeonatos', descricao: 'Mudanças de posição' },
  { chave: 'notificar_comunidade', titulo: 'Comunidade', descricao: 'Comentários e atividade' },
];

type PrefsNotificacao = Record<ChaveNotificacao, boolean>;

/**
 * As colunas são `NOT NULL DEFAULT true` desde a migração
 * `20260807000017_profile_social_followers_settings.sql`. Sem perfil carregado
 * mostramos o padrão do banco, mas os controles ficam desabilitados — o valor
 * exibido é uma suposição até o perfil chegar, e não dá para gravar sem `id`.
 */
function lerPrefs(profile: PerfilRow | null | undefined): PrefsNotificacao {
  return {
    notificar_desafios: profile?.notificar_desafios ?? true,
    notificar_ranking: profile?.notificar_ranking ?? true,
    notificar_comunidade: profile?.notificar_comunidade ?? true,
  };
}

interface SettingsScreenProps {
  onBack?: () => void;
  onSignOut?: () => void;
  /** Perfil do usuário logado; `null` enquanto carrega ou deslogado. */
  profile?: PerfilRow | null;
  /** Se há sessão — distingue "carregando o perfil" de "não entrou". */
  isSignedIn?: boolean;
  /** Devolve ao App o perfil já gravado, para o estado não divergir. */
  onProfileChange?: (profile: PerfilRow) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onSignOut,
  profile,
  isSignedIn,
  onProfileChange,
}) => {
  const [showAssinatura, setShowAssinatura] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /*
    Os três interruptores eram `useState` puro: a escolha nunca saía da
    memória da aba e sumia no recarregamento, embora as colunas existissem em
    `profiles` e `updateProfile` já as aceitasse. Agora o estado local só
    espelha o perfil para dar resposta imediata ao toque; a fonte de verdade é
    o banco, e uma gravação que falha volta atrás em vez de mentir.
  */
  const [prefs, setPrefs] = useState<PrefsNotificacao>(() => lerPrefs(profile));
  const [salvando, setSalvando] = useState<ChaveNotificacao | null>(null);
  const [erroPrefs, setErroPrefs] = useState<string | null>(null);

  useEffect(() => {
    setPrefs(lerPrefs(profile));
  }, [profile]);

  const prefsEditaveis = Boolean(profile);

  const alternarPref = async (chave: ChaveNotificacao, valor: boolean) => {
    if (!profile) return;

    const anterior = prefs[chave];
    setPrefs((atual) => ({ ...atual, [chave]: valor }));
    setErroPrefs(null);
    setSalvando(chave);

    try {
      const atualizado = (await updateProfile(profile.id, { [chave]: valor })) as PerfilRow;
      onProfileChange?.(atualizado);
    } catch (err) {
      console.error('Falha ao salvar preferência de notificação', err);
      setPrefs((atual) => ({ ...atual, [chave]: anterior }));
      setErroPrefs('Não foi possível salvar. Tenta de novo.');
    } finally {
      setSalvando(null);
    }
  };

  /*
    Auê+ está OFF no corte de lançamento (`FLAGS.assinatura`). Fechar os dois
    caminhos, não só um: o item de menu abaixo não é renderizado E esta tela
    não é montada. Esconder a entrada sem fechar a tela deixaria a venda
    alcançável por qualquer estado herdado, e o corte diz que nada desligado
    continua alcançável.
  */
  if (FLAGS.assinatura && showAssinatura) {
    return (
      <div className="screen" style={{ paddingBottom: 80, gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="icon-btn" onClick={() => setShowAssinatura(false)} aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
          <div style={{ width: 72, height: 72, borderRadius: 999, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: 30, height: 30, color: 'var(--accent)' }}>
              <path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3l-6.1 3.3 1.4-6.8L2.2 9l6.9-.8L12 2Z" />
            </svg>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, textTransform: 'uppercase', lineHeight: 1.1 }}>
            Auê! sem limite.
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: '32ch' }}>
            Assine e jogue sem interrupção — sem anúncio, sem trava, sem esquecer o melhor arroto.
          </p>
        </div>

        {/* Benefits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              🚫
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>Remove anúncios</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Ranking, campeonatos e comunidades sem anúncio.</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              🎙️
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>Arrotos ilimitados</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Grave e envie quantos quiser, sem limite diário.</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              ⭐
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>Favoritos salvos</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Guarde seus melhores arrotos e reveja quando quiser.</div>
            </div>
          </div>
        </div>

        {/* Price Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Plano mensal · em breve
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>R$</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 48 }}>4,99</span>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>/mês</span>
          </div>
        </div>

        {/*
          CORREÇÃO INTERINA: este botão chamava `alert('Integração de pagamento
          pronta!')` — anunciava sucesso de uma integração que não existe, com
          preço visível ao lado. Enquanto não houver provedor de pagamento
          (decisão de Luiz: envolve custo e contrato), ele fica desabilitado e
          diz a verdade. Ao ligar o pagamento, trocar por handler real.
        */}
        <button type="button" className="btn btn-primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
          Assinatura em breve
        </button>
        <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)', marginTop: -12 }}>
          O pagamento ainda não está disponível. Nada será cobrado.
        </p>
      </div>
    );
  }

  if (showDeleteConfirm) {
    return (
      <div className="screen" style={{ paddingBottom: 80, gap: 24, textAlign: 'center', justifyContent: 'center' }}>
        {/*
          CORREÇÃO INTERINA: esta tela dizia "Essa ação apaga seu perfil,
          histórico de arrotos, conquistas... para sempre" e o botão de
          confirmar executava apenas `alert('Solicitação de exclusão
          processada.')`. Nada era apagado, e o usuário era informado de que
          tinha sido.

          A exclusão de verdade exige apagar `auth.users` — o cliente não tem
          esse poder, precisa de Edge Function com service role — e decidir a
          semântica de cascata (resultados anônimos permanecem? o ranking
          muda?). É trabalho com decisão de produto dentro, então aqui ficou
          apenas a verdade e um caminho manual, que preserva o direito de
          eliminação em vez de fingir que ele foi exercido.
        */}
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, textTransform: 'uppercase' }}>
          Apagar minha conta
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: '34ch', margin: '0 auto' }}>
          A exclusão automática ainda não está disponível — este botão não apagaria nada, então ele
          não existe aqui.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: '34ch', margin: '0 auto' }}>
          {EMAIL_PRIVACIDADE ? (
            <>
              Escreva para{' '}
              <a href={`mailto:${EMAIL_PRIVACIDADE}?subject=Apagar%20minha%20conta%20do%20Au%C3%AA`} style={{ color: 'var(--accent)' }}>
                {EMAIL_PRIVACIDADE}
              </a>{' '}
              e sua conta, seus arrotos e suas conquistas serão apagados.
            </>
          ) : (
            'Assim que o fluxo estiver pronto, ele aparece aqui.'
          )}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
          <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" style={{ paddingBottom: 80, gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onBack && (
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
        )}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'uppercase' }}>Configurações</h1>
      </div>

      {/* Conta — hoje só contém a assinatura, então a seção inteira depende da flag */}
      {FLAGS.assinatura && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', paddingLeft: 4 }}>
            Conta
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setShowAssinatura(true)}
              style={settingRowStyle}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: 19, height: 19, color: 'var(--accent)' }}>
                  <path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3l-6.1 3.3 1.4-6.8L2.2 9l6.9-.8L12 2Z" />
                </svg>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Assinatura</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Auê! sem limite · em breve</div>
                </div>
              </div>
              <ChevronRight />
            </button>
          </div>
        </div>
      )}

      {/*
        Notificações — OFF no corte (`FLAGS.push`). Os três interruptores
        gravam de verdade em `profiles`, mas prometem entrega que nenhum canal
        cumpre: sem VAPID configurada, o usuário liga e nada chega nunca.
        Preferência gravada continua no banco; só o controle sai da tela.
      */}
      {FLAGS.push && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', paddingLeft: 4 }}>
          Notificações
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {NOTIFICACOES.map(({ chave, titulo, descricao }, indice) => (
            <label
              key={chave}
              style={{
                ...settingRowStyle,
                ...(indice > 0 ? { borderTop: '1px solid var(--border)' } : null),
                cursor: prefsEditaveis ? 'pointer' : 'default',
                opacity: prefsEditaveis ? 1 : 0.55,
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{titulo}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{descricao}</div>
              </div>
              <input
                type="checkbox"
                checked={prefs[chave]}
                disabled={!prefsEditaveis || salvando !== null}
                onChange={(e) => void alternarPref(chave, e.target.checked)}
              />
            </label>
          ))}
        </div>

        {/*
          Sem perfil não há onde gravar. Em vez de deixar o interruptor
          responder e perder a escolha, a tela diz por que ele está travado.
        */}
        {!prefsEditaveis && (
          <p style={{ fontSize: 12.5, color: 'var(--muted)', paddingLeft: 4, margin: 0 }}>
            {isSignedIn
              ? 'Carregando suas preferências…'
              : 'Entre na sua conta para escolher o que te notifica.'}
          </p>
        )}

        {erroPrefs && (
          <p role="alert" style={{ fontSize: 12.5, color: 'var(--danger)', paddingLeft: 4, margin: 0 }}>
            {erroPrefs}
          </p>
        )}
      </div>
      )}

      {/* Sair / Apagar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {onSignOut && (
            <button type="button" onClick={onSignOut} style={settingRowStyle}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Sair da conta</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{ ...settingRowStyle, borderTop: '1px solid var(--border)', color: 'var(--danger)' }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>Apagar conta</span>
          </button>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--muted)', marginTop: 'auto' }}>
        Auê! · versão 1.0.0
      </p>
    </div>
  );
};

const settingRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '15px 16px',
  width: '100%',
  color: 'var(--fg)',
};

const ChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16, color: 'var(--muted)' }}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
