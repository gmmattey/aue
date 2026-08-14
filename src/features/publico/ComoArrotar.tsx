import React from 'react';
import { Link } from 'react-router-dom';

import { LayoutPublico, SecaoPublica } from './LayoutPublico';
import { IconeGolinhos, IconeLata, IconePostura, IconeRepeticao, IconeVolume } from './IconesTecnica';

/**
 * As cinco técnicas, na ordem que aparecem na tela. `Icone` fica junto do
 * texto pra não existir uma segunda lista desalinhada da primeira.
 */
const tecnicas = [
  {
    numero: '01',
    eyebrow: 'Técnica',
    titulo: 'Engole ar, devolve ar',
    Icone: IconeGolinhos,
    texto: [
      'Puxa uma sequência de golinhos de ar pela boca, rápido, um atrás do outro — não é uma golada só, é várias pequenas.',
      'Deixa acumular um instante e solta pela garganta relaxada, sem forçar o peito. As primeiras tentativas saem meia-boca. É normal.',
    ],
  },
  {
    numero: '02',
    eyebrow: 'Atalho',
    titulo: 'Com refrigerante é trapaça? É, e funciona',
    Icone: IconeLata,
    texto: [
      'Bebida com gás já entrega o ar pronto, veio de fábrica. Dá um gole, espera a garganta perceber que tem bolha subindo, e relaxa.',
      'Empurrãozinho: aperta de leve a barriga enquanto solta a garganta. É o caminho mais fácil e ninguém vai te julgar por isso — o Auê julga o som, não o método.',
    ],
  },
  {
    numero: '03',
    eyebrow: 'Postura',
    titulo: 'O corpo ajuda, se você deixar',
    Icone: IconePostura,
    texto: [
      'Sentado ereto ou inclinado pra frente facilita o ar descer e voltar — deitado, o caminho emperra.',
      'Quanto mais você tenta "segurar" pra não sair estranho, mais trava — o pulo do gato é relaxar na hora que a vontade bate, não competir com ela. Uma pressão leve na boca do estômago também ajuda. Não é soco, é cutucão.',
    ],
  },
  {
    numero: '04',
    eyebrow: 'Sequência',
    titulo: 'Arroto renovado',
    Icone: IconeRepeticao,
    texto: [
      'Se o jogo mede duração, um arroto seco não separa ninguém do resto. Repete os golinhos em sequência, sem parar pra respirar fundo no meio — o efeito é uma cadeia, um arroto grudando no outro.',
      'Treino, não milagre: sai picotado nas primeiras vezes.',
    ],
  },
  {
    numero: '05',
    eyebrow: 'Volume',
    titulo: 'Arrotar alto',
    Icone: IconeVolume,
    texto: [
      'Alto é garganta aberta e boca aberta na hora certa. Peito pra frente, queixo um pouco pra cima, e solta sem segurar no meio.',
      'Arroto abafado perde volume e perde nota.',
    ],
  },
];

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
 *
 * As cinco técnicas viram cards com ícone (ver `IconesTecnica.tsx`), no
 * mesmo padrão visual do `desktop-step` da landing (`TelaDesktop.tsx`, seção
 * "Como funciona") — a variante com ícone mora em `LayoutPublico.css`, sem
 * mexer no CSS que a landing usa.
 */
export const ComoArrotar: React.FC = () => (
  <LayoutPublico
    eyebrow="Antes de jogar"
    titulo="Como arrotar"
    resumo="Arroto é ar que entrou e resolveu voltar. A parte que dá pra treinar é a entrada. O resto o corpo resolve sozinho."
  >
    <SecaoPublica eyebrow="Antes das técnicas" titulo="Tem arroto de ar e tem arroto de estômago">
      <p>Tem dois jeitos de um arroto nascer.</p>

      <div className="publico-dois-tipos">
        <div className="publico-tipo-card">
          <IconeGolinhos />
          <h3>Arroto de ar</h3>
          <p>
            É o ar que você engoliu on the way in — sobe rápido, sai fácil, e dá pra repetir moral.
          </p>
        </div>
        <div className="publico-tipo-card">
          <IconeLata />
          <h3>Arroto de estômago</h3>
          <p>
            Vem lá de baixo, do gás que já tava rolando no estômago — geralmente por causa de bebida
            com gás — demora mais pra formar mas costuma sair com mais força.
          </p>
        </div>
      </div>

      <p>Nenhum dos dois é melhor. O jogo não julga a origem, julga o resultado.</p>
    </SecaoPublica>

    <section className="desktop-shell desktop-section publico-section">
      <div className="publico-tecnicas">
        {tecnicas.map(({ numero, eyebrow, titulo, Icone, texto }) => (
          <article className="desktop-step desktop-step-icone" key={numero}>
            <Icone />
            <span>{numero}</span>
            <p className="publico-tecnica-eyebrow">{eyebrow}</p>
            <h3>{titulo}</h3>
            {texto.map((paragrafo) => (
              <p key={paragrafo}>{paragrafo}</p>
            ))}
          </article>
        ))}
      </div>
    </section>

    <SecaoPublica eyebrow="Se travar" titulo="E se não sai nada?">
      <p>Tem gente que simplesmente não arrota, e não tem técnica que resolva.</p>
      <p>
        Se forçar dói, incomoda ou vira azia, para — isso é assunto de médico, não de jogo. O Auê é
        brincadeira, não consultório.
      </p>
    </SecaoPublica>

    <div className="desktop-shell publico-extra">
      <p>Aprendeu? Agora vê quanto vale esse arroto.</p>
      <Link to="/como-jogar">Como jogar o Auê ↗</Link>
    </div>
  </LayoutPublico>
);
