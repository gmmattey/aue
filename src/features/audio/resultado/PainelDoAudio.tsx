import React from 'react';
import { AudioPlayback } from '../AudioPlayback';
import type { EstadoDoAudio } from './tipos';

export interface PainelDoAudioProps {
  estado: EstadoDoAudio;
  /**
   * `linhaSalva?.caminho_do_audio`. Undefined e null são a mesma coisa aqui: não há
   * som para tocar.
   */
  audioPath?: string | null;
  motivoFalha: string | null;
  apagando: boolean;
  erroAoApagar: string | null;
  /** Quem apaga é o AudioRecorder. Este painel só pede. */
  onApagar: () => void;
}

/**
 * ESTADO DO ÁUDIO — a nota já está registrada; isto fala só do som.
 *
 * Cada ramo diz exatamente uma verdade. Nenhum deles renderiza player sem
 * áudio, e nenhum deles chama de sucesso o que não subiu.
 *
 * RETORNA FRAGMENT, não `<div>`: no ramo 'enviado' os quatro nós são irmãos
 * diretos da coluna flex do AudioRecorder e dependem do `gap: var(--space-4)`
 * dela. Embrulhar tudo num elemento colaria player, status, botão e erro.
 */
export const PainelDoAudio: React.FC<PainelDoAudioProps> = ({
  estado,
  audioPath,
  motivoFalha,
  apagando,
  erroAoApagar,
  onApagar,
}) => (
  <>
    {estado === 'enviando' && (
      <p role="status" style={{ fontSize: 13, color: 'var(--muted)' }}>
        Enviando o áudio...
      </p>
    )}

    {estado === 'sem-conta' && (
      /*
        Este ramo mudou de significado com o login anônimo, e o texto precisou
        mudar junto.

        Antes ele era o caso NORMAL: ninguém fazia login, então nenhum áudio
        subia. Hoje ele é o caso EXCEPCIONAL — a sessão anônima deveria ter sido
        criada no boot e não foi. A causa quase certa é de configuração
        (Anonymous sign-ins desligado no painel do Supabase), e falar de "conta
        conectada" mandaria a pessoa procurar um botão de login que não existe
        mais na tela.
      */
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>
        Sua nota foi registrada, mas o áudio não subiu — o app não conseguiu se
        conectar ao Auê. A nota vale; o som não vai poder ser ouvido por
        ninguém. Recarregar a página costuma resolver.
      </p>
    )}

    {estado === 'falhou' && (
      <p role="alert" style={{ fontSize: 13, color: 'var(--danger)' }}>
        Sua nota foi registrada, mas o áudio não subiu — ninguém vai conseguir
        ouvir esta gravação.
        {motivoFalha ? ` ${motivoFalha}` : ''}
      </p>
    )}

    {estado === 'enviado' && (
      <>
        <AudioPlayback audioPath={audioPath} rotulo="Seu Auê" />
        <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          {motivoFalha ?? 'Áudio enviado. Qualquer pessoa com o link consegue ouvir.'}
        </p>

        {/*
          Arrependimento tem caminho, e ele fica ao lado do que a pessoa acabou
          de publicar — não escondido em configurações.
        */}
        <button
          type="button"
          onClick={onApagar}
          disabled={apagando}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 999,
            padding: '8px 14px',
            color: 'var(--muted)',
            fontSize: 12.5,
            fontWeight: 600,
            alignSelf: 'flex-start',
            opacity: apagando ? 0.6 : 1,
          }}
        >
          {apagando ? 'Apagando...' : 'Apagar meu áudio'}
        </button>

        {erroAoApagar && (
          <p role="alert" style={{ fontSize: 13, color: 'var(--danger)' }}>
            {erroAoApagar}
          </p>
        )}
      </>
    )}

    {estado === 'apagado' && (
      <p role="status" style={{ fontSize: 13, color: 'var(--muted)' }}>
        Áudio apagado. Ele saiu do feed e ninguém mais consegue ouvir. Sua nota
        continua valendo.
      </p>
    )}
  </>
);
