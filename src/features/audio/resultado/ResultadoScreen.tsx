import React from 'react';
import type { ScoreResult } from '../rules';
// TIPO, e nunca a função: esta tela não sabe que existe Supabase.
import type { ResultadoRow } from '../../../db/supabase';
import { CartaoDaNota } from './CartaoDaNota';
import { PainelDoAudio } from './PainelDoAudio';
import { AcoesDoResultado } from './AcoesDoResultado';
import { LinkDaBatalha } from './LinkDaBatalha';
import type { EstadoDoAudio } from './tipos';

export interface ResultadoScreenProps {
  /** A prévia local. É dela que saem nota, classificação e parciais na tela. */
  resultado: ScoreResult;
  /**
   * A linha JÁ persistida pelo servidor, ou null enquanto não houver. Só é lida
   * (`audio_path`, `xp_earned`, `is_xp_eligible`) — nunca buscada aqui.
   */
  linhaSalva: ResultadoRow | null;

  /* --- Áudio ------------------------------------------------------------- */
  estadoAudio: EstadoDoAudio;
  /** Motivo específico da falha. Nunca substitui `estadoAudio`. */
  motivoFalhaAudio: string | null;
  postadoNoFeed: boolean;
  apagandoAudio: boolean;
  erroAoApagar: string | null;
  onApagarAudio: () => void;

  /* --- Desafio ----------------------------------------------------------- */
  linkDesafio: string | null;
  /**
   * O `hideChallengeButton` do AudioRecorder, com nome interno em PT-BR. O nome
   * público da prop do AudioRecorder NÃO muda: BattleView, DisputaLocalScreen e
   * ChallengeView já passam `hideChallengeButton`.
   */
  escondeDesafio?: boolean;
  exigeAudio?: boolean;
  onDesafiar: () => void;

  /* --- Compartilhar / navegação ------------------------------------------ */
  onCompartilhar: () => void;
  onTentarDeNovo: () => void;
  erroAoCompartilhar: string | null;

  /**
   * `FLAGS.xp && Boolean(linhaSalva?.user_id)`, calculado no AudioRecorder. A
   * flag é lida LÁ e não aqui: componente de apresentação que consulta
   * configuração global deixa de ser uma função das suas props e vira algo que
   * só dá para testar mockando módulo.
   */
  mostrarXp: boolean;
}

/**
 * A tela de resultado inteira, e só ela: nota, veredito, parciais, som, ações e
 * link. Recebe tudo por prop — sem estado, sem efeito, sem rede. Quem grava,
 * envia, apaga e compartilha continua sendo o AudioRecorder.
 *
 * RETORNA FRAGMENT, NÃO `<div>` — e este é o jeito mais fácil de estragar a
 * extração sem quebrar teste nenhum. Os cinco blocos abaixo são hoje filhos
 * DIRETOS da coluna flex do AudioRecorder, que tem `gap: var(--space-4)`. Num
 * wrapper (ou num `<main>`, como fazia a versão antiga em
 * feat/mvp1-1to1-alignment) eles viram um filho só: os espaçamentos entre
 * cartão, som, ações e link somem e sobra um único gap.
 */
export const ResultadoScreen: React.FC<ResultadoScreenProps> = ({
  resultado,
  linhaSalva,
  estadoAudio,
  motivoFalhaAudio,
  postadoNoFeed,
  apagandoAudio,
  erroAoApagar,
  onApagarAudio,
  linkDesafio,
  escondeDesafio,
  exigeAudio,
  onDesafiar,
  onCompartilhar,
  onTentarDeNovo,
  erroAoCompartilhar,
  mostrarXp,
}) => (
  <>
    <CartaoDaNota resultado={resultado} linhaSalva={linhaSalva} mostrarXp={mostrarXp} />

    <PainelDoAudio
      estado={estadoAudio}
      audioPath={linhaSalva?.audio_path}
      motivoFalha={motivoFalhaAudio}
      postadoNoFeed={postadoNoFeed}
      apagando={apagandoAudio}
      erroAoApagar={erroAoApagar}
      onApagar={onApagarAudio}
    />

    <AcoesDoResultado
      estadoAudio={estadoAudio}
      linkDesafio={linkDesafio}
      escondeDesafio={escondeDesafio}
      exigeAudio={exigeAudio}
      onDesafiar={onDesafiar}
      onCompartilhar={onCompartilhar}
      onTentarDeNovo={onTentarDeNovo}
    />

    {erroAoCompartilhar && (
      <p role="alert" style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
        {erroAoCompartilhar}
      </p>
    )}

    {/*
      A guarda de null fica AQUI, e não dentro do LinkDaBatalha: assim o
      componente recebe uma string e não precisa ter um ramo "sem link" que
      renderiza nada.
    */}
    {linkDesafio && <LinkDaBatalha link={linkDesafio} />}
  </>
);
