import React from 'react';

import { FeedScreen } from '../community/FeedScreen';
import { FLAGS } from '../../shared/flags';
import './HomeScreen.css';

interface HomeScreenProps {
  /** Leva ao fluxo de gravação que já existe (aba "arrotar"). */
  onGravar: () => void;
  /**
   * Leva à disputa presencial (aba "disputa").
   *
   * OPCIONAL, e a ausência esconde o convite — não desenha um botão morto.
   * Quem monta a Home é o `App`, e é lá que a troca de aba existe; sem o
   * handler não há para onde ir, e um CTA que não navega é exatamente o tipo
   * de "finge que funciona" que o contrato barra.
   */
  onDisputar?: () => void;
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
 *    protótipo `home-novo.html` (bolha como elemento dominante). É a única
 *    parte que existe no corte do MVP.
 * 2. O feed que já existe, reaproveitado como conteúdo da Home — decisão de
 *    "Início/Feed" como um item só de navegação. Atrás de `FLAGS.feed`,
 *    desligado no lançamento.
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
export const HomeScreen: React.FC<HomeScreenProps> = ({
  onGravar,
  onDisputar,
  isPremium,
  userId,
}) => {
  return (
    <>
      <section className="home-hero">
        {/*
          "Manda." — o texto da #54, e ele é curto de propósito.

          Era "Solta o seu Auê.", que é bom mas explica. A issue pede marca
          pequena e Bolha mandando na tela: qualquer frase maior aqui rouba
          altura da Bolha, que é o elemento que tem que dominar. Uma palavra
          basta porque a Bolha já diz o resto.
        */}
        <h1 className="home-hero-title">Manda.</h1>

        <button
          type="button"
          className="home-bolha-btn"
          onClick={onGravar}
          aria-label="Arrotar"
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
          <span className="home-bolha-label">ARROTAR</span>
        </button>

        {/*
          A LINHA DE DICA SAIU. Era "Toca na bolha. É rápido, é bobo, é o jogo
          todo." — tem graça, e é exatamente o tipo de coisa que a #54 chama de
          historinha: "o cara abriu porque quer fazer barulho, não ler manual".

          "Resto quieto" é requisito, não preferência: cada elemento a mais
          nesta tela divide a atenção com a única coisa que precisa ser óbvia.
          Uma bolha gigante verde-limão com ARROTAR embaixo não precisa de
          legenda explicando que dá para tocar nela.
        */}

        {/*
          O SEGUNDO MODO DO PRODUTO, dito na Home.

          Sem isto, a disputa presencial existe só como o quarto ícone da barra
          de baixo — um desenho de duas pessoas, sem contexto, ao lado de
          "Arrotar". Ninguém que abre o app num churrasco descobre por ali que
          dá para jogar com todo mundo no mesmo aparelho.

          Secundário de propósito: gravar continua sendo A ação, e a bolha
          continua dominando a tela. Isto é o convite para o outro caminho, não
          um concorrente dele.

          Atrás da MESMA flag da tela e da aba. Enquanto a disputa não tiver
          rodado num telefone real, o convite não aparece.
        */}
        {FLAGS.disputaLocal && onDisputar && (
          <button type="button" className="home-disputa-cta" onClick={onDisputar}>
            <span className="home-disputa-cta-titulo">Tem gente do lado?</span>
            <span className="home-disputa-cta-sub">
              Disputa aqui: um aparelho, todo mundo em volta, pódio no fim.
            </span>
          </button>
        )}
      </section>

      {/*
        Feed fora do corte do MVP. Sem ele a Home é só o convite para gravar —
        que é exatamente o produto desta fatia: abrir, tocar na bolha, receber
        a nota, mandar para um amigo.

        O feed volta quando houver o que mostrar nele. Hoje ele mostraria os
        arrotos de visitantes anônimos publicados sem escolha, que é o motivo
        de `criarPostDeAudio` também estar atrás desta mesma flag.
      */}
      {FLAGS.feed && <FeedScreen isPremium={isPremium} userId={userId} />}
    </>
  );
};
