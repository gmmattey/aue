import { ENDERECO_LEGIVEL } from '../shared/enderecoPublico';
import { caminhoDaBolha } from './bolha/caminhoDaBolha';
import { bolhaDoCartao } from './bolha/formaDoCartao';
import { tamanhoDaProvocacao } from './tamanhoDaProvocacao';
import './cartao.css';

/**
 * O cartão que vira a imagem do compartilhamento.
 *
 * ELE NÃO É UMA TELA. É um nó de DOM real, fora da vista, montado no `RESULT`
 * só quando o aparelho sabe mandar arquivo, para o adaptador web fotografar
 * com o html2canvas. Quem tira a foto é `plataforma/web/compartilhamento.ts`;
 * daqui não sai nem um `document`.
 *
 * O QUE ENTRA: a nota, a Bolha e a provocação escolhida. Mais o endereço do
 * jogo no rodapé, que é como quem recebeu a imagem descobre onde jogar.
 *
 * O QUE NÃO ENTRA, e não é esquecimento: placar, nome de gente, áudio,
 * métricas, XP e barra. Nada disso se lê em miniatura, e nome de jogador numa
 * imagem que viaja é dado de pessoa saindo do aparelho sem ninguém pedir.
 *
 * As armadilhas do html2canvas estão no `cartao.css`. A terceira, esperar a
 * fonte carregar, é do adaptador — `document.fonts` é API de navegador.
 */

/** O id que o adaptador fotografa. Travado por teste. */
export const ID_DO_CARTAO = 'cartao-do-aue';

interface Props {
  /** A nota **já escrita**, com vírgula. A mesma string que está na tela. */
  notaEscrita: string;
  /** O número cru — só para a Bolha saber que cara fazer. */
  nota: number;
  /** A provocação escolhida na faixa de reação. */
  provocacao: string;
}

export function CartaoDaImagem({ notaEscrita, nota, provocacao }: Props) {
  const { forma, escala } = bolhaDoCartao(nota);
  /*
    Tempo zero: a Bolha impressa é parada por natureza, e congelar o tempo é a
    mesma coisa que o `prefers-reduced-motion` já faz na Arena.
  */
  const d = caminhoDaBolha(forma, 0);

  /*
    A ESCALA MORA NO viewBox, não no caminho.

    Janela apertada faz a Bolha parecer maior; janela larga, menor. O `+ 14` é
    folga para a ondulação não encostar na borda do `<svg>` — sem ela, a nota
    alta (amplitude 30) sairia com o bico cortado.
  */
  const meio = (forma.raio + forma.amplitude + 14) / escala;

  return (
    <div
      id={ID_DO_CARTAO}
      className="cartao-da-imagem"
      /*
        Fora da vista E fora do alcance: `aria-hidden` tira do leitor de tela
        (a nota já está anunciada na Arena, ler duas vezes é ruído) e `inert`
        tira da ordem de tabulação.
      */
      aria-hidden="true"
      inert
    >
      <div className="cartao-topo">
        <svg
          className="cartao-bolha"
          viewBox={`${-meio} ${-meio} ${meio * 2} ${meio * 2}`}
          aria-hidden="true"
        >
          {/*
            Sem `<title>` aqui de propósito: o `BolhaAue` tem um com `id` fixo,
            e montar os dois na mesma página duplicaria o id.
          */}
          <path d={d} />
        </svg>
      </div>

      <div className="cartao-meio">
        <p className="cartao-nota" data-longa={notaEscrita.length > 4 ? 'sim' : 'nao'}>
          {notaEscrita}
        </p>
        <p className="cartao-provocacao" data-tamanho={tamanhoDaProvocacao(provocacao)}>
          {provocacao}
        </p>
      </div>

      <div className="cartao-rodape">
        <span className="cartao-marca">Auê</span>
        <span className="cartao-endereco">{ENDERECO_LEGIVEL}</span>
      </div>
    </div>
  );
}
