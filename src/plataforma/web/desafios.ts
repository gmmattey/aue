import {
  configuracaoAusente,
  criarBatalha,
  enviarAudioDoResultado,
  enviarResultado,
  obterBatalha,
  updateProfile,
} from '../../db/supabase';
import { garantirSessao } from '../../shared/auth/sessaoAnonima';
import { ORIGEM_CANONICA } from '../../shared/enderecoPublico';
import type {
  Desafios,
  PedidoDeDesafio,
  ResultadoDoDesafio,
} from '../../portas/desafios';

/**
 * O desafio no servidor.
 *
 * Este arquivo é a ponte para o backend que **já existe e já roda em
 * produção**: as RPCs, as policies e o bucket privado são os mesmos do jogo de
 * hoje. Esta fatia não desenhou banco nenhum — ela liga a Arena no que estava
 * lá (ADR §7).
 *
 * A SEQUÊNCIA, E POR QUE ELA É TODA-OU-NADA:
 *
 * 1. **sessão anônima** — sem `auth.uid()` o áudio não sobe: a policy do
 *    bucket é `TO authenticated` e o caminho do arquivo é o id do usuário;
 * 2. **o nome vai para o PERFIL** — é de lá que o servidor lê o nome de quem
 *    arrotou. Mandar junto do resultado seria escrever num campo que a RPC
 *    ignora quando há sessão, e a batalha sairia entre dois "Arrotador a1b2c3";
 * 3. **o resultado** — o servidor recalcula a nota a partir das quatro
 *    parciais. O número que volta daqui é o oficial;
 * 4. **o áudio** — sem ele o desafio nasce mudo, e ouvir o arroto do outro é o
 *    jogo inteiro;
 * 5. **a batalha** — gera o código imprevisível;
 * 6. **o prazo** — lido do banco, nunca escrito à mão.
 *
 * Falhar em 3, 4 ou 5 devolve erro e **não existe desafio**. É melhor a pessoa
 * tentar de novo do que mandar para o grupo um link que abre em silêncio.
 */
export function criarDesafiosWeb(): Desafios {
  return {
    async criar(pedido: PedidoDeDesafio): Promise<ResultadoDoDesafio> {
      if (configuracaoAusente) {
        return { ok: false, motivo: 'semConfiguracao' };
      }

      try {
        const sessao = await garantirSessao();
        if (!sessao?.user?.id) {
          /*
            Sem sessão o áudio não sobe, e desafio sem áudio não existe. Falhar
            aqui, antes de gravar qualquer coisa, é melhor que falhar no meio.
          */
          return { ok: false, motivo: 'semRede' };
        }

        const nome = pedido.nome.trim();
        if (nome) {
          try {
            await updateProfile(sessao.user.id, { apelido: nome });
          } catch (erroDoNome) {
            /*
              Perder o nome não pode custar o desafio. A pessoa arrotou, a nota
              existe, e o jogo continua — ela aparece com o apelido padrão.
            */
            console.error('Falha ao salvar o apelido', erroDoNome);
          }
        }

        /*
          As quatro medidas da Arena SÃO as quatro parciais que a RPC espera —
          o que muda é o nome de rua. O servidor recalcula a nota a partir
          delas e da origem, e é o número dele que vale.
        */
        const salvo = await enviarResultado({
          duracao: pedido.nota.medidas.folego,
          potencia: pedido.nota.medidas.estouro,
          profundidade: pedido.nota.medidas.grave,
          textura: pedido.nota.medidas.sujeira,
          tipoDeOrigem: pedido.origem,
        });

        await enviarAudioDoResultado(salvo, pedido.audio.dados);

        const codigo = await criarBatalha(salvo.id);

        /*
          Uma ida a mais ao servidor só para ler o prazo. Vale a pena: a
          alternativa é a tela escrever "7 dias" por conta própria, que é
          exatamente a mentira que este produto já contou uma vez.
        */
        const batalha = await obterBatalha(codigo);

        return {
          ok: true,
          desafio: {
            codigo,
            link: `${ORIGEM_CANONICA}/b/${codigo}`,
            notaOficial: Number(salvo.nota),
            expiraEm: batalha?.expira_em ?? '',
          },
        };
      } catch (erro) {
        if (pareceFaltaDeRede(erro)) {
          return { ok: false, motivo: 'semRede' };
        }

        /*
          O código NÃO entra no log. Ele é a chave do desafio, e log é o lugar
          mais fácil de um segredo vazar sem ninguém perceber.
        */
        console.error('Falha ao criar o desafio', erro);
        return {
          ok: false,
          motivo: 'falhou',
          detalhe: erro instanceof Error ? erro.message : String(erro),
        };
      }
    },
  };
}

/**
 * Ficar sem sinal no meio do envio é o caso mais comum de todos, e o que a
 * pessoa entende na hora. Vale a pena separar dos outros.
 */
function pareceFaltaDeRede(erro: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const mensagem = erro instanceof Error ? erro.message.toLowerCase() : String(erro).toLowerCase();
  return (
    mensagem.includes('failed to fetch') ||
    mensagem.includes('networkerror') ||
    mensagem.includes('network request failed')
  );
}
