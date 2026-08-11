import { formatarNota } from '../../shared/formato/nota';
import { ENDERECO_LEGIVEL } from '../../shared/enderecoPublico';
import type { PodioDaRoda } from '../../nucleo/disputa/podio';

/**
 * O pódio da roda — e o bloco que vira a imagem que vai pro grupo.
 *
 * O `id` NÃO É ESCOLHA DAQUI: `portas/compartilhamento.ts` documenta
 * `podio-card` na cara, e o adaptador web já sabe fotografar esse nó. Mandar o
 * pódio é LIGAR, não construir.
 *
 * É O NÓ VISÍVEL que vira imagem, e não um cartão escondido: o que a mesa está
 * olhando é o que sai no zap. Cartão paralelo seria uma segunda versão do pódio
 * esperando divergir da primeira.
 *
 * AS MEDALHAS SAEM DA POSIÇÃO, nunca do índice do array. Com dois campeões
 * empatados, quem vem depois é o 3º e leva bronze — não prata. Numerar por
 * índice foi o defeito que mandava para o grupo um desempate que ninguém deu.
 */
export const ID_DO_PODIO = 'podio-card';

const MEDALHAS = ['var(--gold)', 'var(--silver)', 'var(--bronze)'];

export function PodioDaMesa({ podio }: { podio: PodioDaRoda }) {
  return (
    <div className="podio" id={ID_DO_PODIO}>
      {podio.legenda ? <p className="podio-legenda">{podio.legenda}</p> : null}

      <div className="placar">
        {podio.colocacoes.map((pessoa) => {
          const cor = MEDALHAS[pessoa.posicao - 1] ?? 'var(--muted)';
          return (
            <div className="placar-linha" key={`${pessoa.posicao}-${pessoa.nome}`}>
              <span className="podio-posicao" style={{ borderColor: cor, color: cor }}>
                {pessoa.posicao}
              </span>
              <span className="placar-nome">{pessoa.nome}</span>
              <b className="placar-nota" style={{ color: cor }}>
                {formatarNota(pessoa.nota)}
              </b>
            </div>
          );
        })}
      </div>

      {/*
        A marca entra porque este bloco vira PNG e viaja sozinho para fora do
        jogo. Sem ela, o pódio compartilhado é uma lista de nomes que não diz de
        onde veio.
      */}
      <p className="podio-marca">Auê! · {ENDERECO_LEGIVEL}</p>
    </div>
  );
}
