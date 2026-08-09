import React from 'react';
import type { ScoreResult } from '../rules';
// TIPO, e nunca a função: esta tela não sabe que existe Supabase.
import type { ResultadoRow } from '../../../db/supabase';
import { CartaoDaNota } from './CartaoDaNota';
import { PainelDoAudio } from './PainelDoAudio';
import { AcoesDoResultado } from './AcoesDoResultado';
import { LinkDaBatalha } from './LinkDaBatalha';
import { CompartilharOResultado } from './CompartilharOResultado';
import { AdBanner } from '../../../shared/components/AdBanner';
import type { EstadoDoAudio } from './tipos';

/**
 * Bloco in-article criado no painel do AdSense para esta tela.
 *
 * Vazio (o padrão) mantém o `AdBanner` inerte: sem slot ele não renderiza nada
 * em produção e não carrega script nenhum do Google. Ligar é preencher a
 * variável e publicar — não há mudança de código pendente.
 */
const SLOT_ANUNCIO_RESULTADO = import.meta.env.VITE_ADSENSE_SLOT_RESULT as string | undefined;

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

  /**
   * `profiles.is_premium`. Assinante não vê anúncio — é o que a tela de perfil
   * promete ("Sem anúncios, arrotos ilimitados e favoritos").
   *
   * Vem por prop e sem default aqui de propósito: o default do `AdBanner` é
   * `false`, que é o caso COMUM e não o SEGURO. Errar para `false` mostra
   * anúncio a quem pagou para não ver.
   */
  isPremium?: boolean;
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
  isPremium,
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

    {/*
      OS ALVOS DO §3.5, SEM CONDIÇÃO — e a ausência de guarda é a mudança.

      WhatsApp, Telegram, X e "Copiar link" só existiam dentro do
      `LinkDaBatalha`, ou seja, atrás de um `linkDesafio &&`. Quem gravava e
      queria só mandar a nota tinha a folha nativa do sistema e mais nada — e
      nada no desktop, onde `navigator.share` não existe. O contrato pede os
      quatro no resultado individual, não no resultado com batalha.

      DEPOIS do link e ANTES do anúncio, nesta ordem: a caixa tracejada explica o
      que é o link, os botões o mandam. E o anúncio continua sendo o último
      elemento da tela — `anuncio.test.tsx` trava isso.
    */}
    <CompartilharOResultado
      nota={resultado.score}
      classificacao={resultado.classification}
      linkDesafio={linkDesafio}
    />

    {/*
      ANÚNCIO — POR ÚLTIMO, e a posição é a decisão inteira.

      É a colocação de maior tráfego do corte de lançamento: TODA gravação passa
      por esta tela. A outra colocação que existe está no feed, e o feed NÃO
      deve ser ligado por causa de anúncio — ligá-lo publica o arroto de todo
      visitante sem que ele tenha escolhido (ver `FLAGS.feed` no .env.example).

      POR QUE NO FIM, e não logo abaixo da nota, que renderia mais. Acima daqui
      estão "Desafiar um amigo", "Compartilhar" e "Tentar de novo" — os três
      botões em que a pessoa VAI tocar. Anúncio encostado em botão de ação gera
      clique acidental, e clique acidental é violação de política do AdSense que
      derruba a conta. Conta derrubada não rende menos: rende zero, e não volta
      fácil. A viewability perdida aqui é o preço de continuar existindo como
      publisher. Está escrito em docs/produto/VOZ_E_PERSONALIDADE.md §8.

      INERTE até `VITE_ADSENSE_CLIENT` e `VITE_ADSENSE_SLOT_RESULT` existirem:
      sem as duas o AdBanner não renderiza nada em produção nem carrega script do
      Google. Nenhuma mudança de código é necessária para ligar.
    */}
    <AdBanner isPremium={isPremium} adSlot={SLOT_ANUNCIO_RESULTADO} />
  </>
);
