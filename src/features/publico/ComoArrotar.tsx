import React from 'react';
import { Link } from 'react-router-dom';

import { LayoutPublico, SecaoPublica } from './LayoutPublico';

/**
 * `/como-arrotar` — a página que responde a busca que traz gente pro Auê.
 *
 * "como arrotar", "como arrotar de propósito", "como arrotar alto": é isso que
 * as pessoas digitam, e sem esta página o Auê não respondia nada disso.
 * `/como-jogar` explica o JOGO; esta explica o ARROTO, e termina empurrando pro
 * jogo.
 *
 * MESMA FAMÍLIA VISUAL DA LANDING, via `LayoutPublico` — igual `/como-jogar`.
 * Não é estado da Arena, não muda o loop e não é alcançável de dentro da Arena.
 * Também sem gate `ehDesktop`: é página de busca, lida do celular na maioria
 * das vezes.
 *
 * O QUE ELA NÃO FAZ: conselho médico. Dor, refluxo, azia e tratamento não são
 * território de um jogo de arroto. Em vez de fingir que o assunto não existe, a
 * página diz com todas as letras que ali o caminho é médico, não Auê.
 */
export const ComoArrotar: React.FC = () => (
  <LayoutPublico
    eyebrow="Antes de jogar"
    titulo="Como arrotar"
    resumo="Arroto é ar que entrou e resolveu voltar. A parte que dá pra treinar é a entrada. O resto o corpo resolve sozinho."
  >
    <SecaoPublica eyebrow="Técnica" titulo="Engole ar, devolve ar">
      <p>
        Puxa ar pela boca como se fosse beber, mas em vez de engolir líquido você
        engole o ar. Prende um instante e solta pela garganta relaxada.
      </p>
      <p>As primeiras tentativas saem meia-boca. É normal.</p>
    </SecaoPublica>

    <SecaoPublica eyebrow="Atalho" titulo="Com refrigerante é trapaça? É, e funciona">
      <p>
        Bebida com gás já entrega o ar pronto. Um gole, espera uns segundos,
        deixa subir.
      </p>
      <p>
        É o caminho mais fácil e ninguém vai te julgar por isso — o Auê julga o
        som, não o método.
      </p>
    </SecaoPublica>

    <SecaoPublica eyebrow="Volume" titulo="Arrotar alto">
      <p>
        Alto é garganta aberta e boca aberta na hora certa. Peito pra frente,
        queixo um pouco pra cima, e solta sem segurar no meio.
      </p>
      <p>Arroto abafado perde volume e perde nota.</p>
    </SecaoPublica>

    <SecaoPublica eyebrow="Se travar" titulo="E se não sai nada?">
      <p>
        Tem gente que simplesmente não arrota, e não tem técnica que resolva.
      </p>
      <p>
        Se forçar dói, incomoda ou vira azia, para — isso é assunto de médico,
        não de jogo. O Auê é brincadeira, não consultório.
      </p>
    </SecaoPublica>

    <div className="desktop-shell publico-extra">
      <p>Aprendeu? Agora vê quanto vale esse arroto.</p>
      <Link to="/como-jogar">Como jogar o Auê ↗</Link>
    </div>
  </LayoutPublico>
);
