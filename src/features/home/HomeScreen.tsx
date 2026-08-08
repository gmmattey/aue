import React from 'react';

import { FeedScreen } from '../community/FeedScreen';
import './HomeScreen.css';

interface HomeScreenProps {
  /** Leva ao fluxo de gravação que já existe (aba "arrotar"). */
  onGravar: () => void;
  /** Repassado ao feed: assinante não vê anúncio. */
  isPremium?: boolean;
  /** Repassado ao feed: sem sessão não há como curtir, comentar ou postar. */
  userId?: string;
}

/**
 * Tela inicial do lançamento.
 *
 * Duas partes e nada além disso:
 *
 * 1. O convite para gravar, que é a ação principal do produto. Segue o
 *    protótipo `home-novo.html` (bolha como elemento dominante).
 * 2. O feed que já existe, reaproveitado como conteúdo da Home — decisão de
 *    "Início/Feed" como um item só de navegação.
 *
 * O que este arquivo DELIBERADAMENTE não tem, e por quê:
 *
 * - A barra de estatísticas do protótipo `home.html` ("87,4 / #12 / 23").
 *   Aqueles números são literais do protótipo; não existe nenhuma consulta que
 *   os produza. Exibi-los seria inventar dado.
 * - Os atalhos "Campeonato" e "Comunidade" do protótipo `home.html`: apontam
 *   para features desligadas no corte de lançamento.
 * - A nota "seu score, ranking e conquistas aparecem aqui depois do primeiro
 *   arroto" do `home-novo.html`: seria uma promessa sobre esta tela que esta
 *   tela não cumpre.
 *
 * O estado vazio do feed é o do próprio `FeedScreen` — o convite a gravar fica
 * permanentemente acima dele, então feed vazio não deixa a tela sem saída.
 */
export const HomeScreen: React.FC<HomeScreenProps> = ({ onGravar, isPremium, userId }) => {
  return (
    <>
      <section className="home-hero">
        <h1 className="home-hero-title">Solta o seu Auê.</h1>

        <button
          type="button"
          className="home-bolha-btn"
          onClick={onGravar}
          aria-label="Gravar meu Auê"
        >
          <span className="home-bolha" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <path d="M12 18v4M9 22h6" />
            </svg>
          </span>
          <span className="home-bolha-label">Gravar meu Auê</span>
        </button>

        <p className="home-bolha-hint">Toca na bolha. É rápido, é bobo, é o jogo todo.</p>
      </section>

      <FeedScreen isPremium={isPremium} userId={userId} />
    </>
  );
};
