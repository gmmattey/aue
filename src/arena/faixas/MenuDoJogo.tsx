import {
  COMO_FUNCIONA,
  COMO_FUNCIONA_TITULO,
  FECHAR,
  PRIVACIDADE,
  TERMOS,
} from '../../nucleo/fala/privacidade';

/**
 * O menu — sobreposição, como manda o `ARENA.md` §1.
 *
 * POR QUE ELE EXISTE AGORA: até hoje não havia, de dentro do jogo, nenhum
 * caminho para a política de privacidade e para os termos. Sem isso a Arena
 * não pode ir para o ar — e "está no rodapé de outra página" não conta quando
 * a Arena é a única tela que a pessoa vê.
 *
 * Pinta por cima e volta. Não é estado, não tira a pessoa da partida, e fechar
 * devolve exatamente onde ela estava.
 */
interface Props {
  onFechar: () => void;
}

export function MenuDoJogo({ onFechar }: Props) {
  return (
    <div className="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="tituloDoMenu">
      <div className="sobreposicao-caixa sobreposicao-menu">
        <h2 id="tituloDoMenu" className="grito">
          {COMO_FUNCIONA_TITULO}
        </h2>

        <ul className="menu-explicacao">
          {COMO_FUNCIONA.map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
        </ul>

        {/*
          Links de verdade, e não botões que abrem modal: são páginas públicas,
          indexáveis, com endereço próprio. Alguém precisa conseguir mandar o
          link da política para outra pessoa.
        */}
        <nav className="menu-links">
          <a href="/privacidade">{PRIVACIDADE}</a>
          <a href="/termos">{TERMOS}</a>
        </nav>

        <button type="button" className="botao botao-principal" onClick={onFechar}>
          {FECHAR}
        </button>
      </div>
    </div>
  );
}
