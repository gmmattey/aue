import {
  assinarUrlDoAudio,
  configuracaoAusente,
  criarBatalha,
  enviarAudioDoResultado,
  enviarResultado,
  obterBatalha,
  responderBatalha,
  updateProfile,
} from '../../db/supabase';
import type { Batalha } from '../../db/supabase';
import { garantirSessao } from '../../shared/auth/sessaoAnonima';
import { origemDoJogo } from './enderecoDoJogo';
import type {
  AberturaDoDesafio,
  Desafios,
  DesafioAberto,
  PedidoDeDesafio,
  PedidoDeResposta,
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
            link: `${origemDoJogo()}/b/${codigo}`,
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

    async abrir(codigo: string): Promise<AberturaDoDesafio> {
      if (configuracaoAusente) return { ok: false, motivo: 'semRede' };

      try {
        /*
          A sessão precisa existir antes: sem `auth.uid()` a RLS não deixa nem
          ler a batalha, e quem chegou pelo link não tem conta nenhuma. É a
          sessão anônima que dá identidade sem pedir cadastro — zero atrito é
          regra do `VERSUS`.
        */
        await garantirSessao();

        const batalha = await obterBatalha(codigo);
        if (!batalha) return { ok: false, motivo: 'naoExiste' };

        /*
          Segunda linha de defesa, não a primeira: quem recusa resposta depois
          do prazo é a RPC. Isto existe para a tela não convidar alguém a
          arrotar numa disputa que já morreu.
        */
        if (batalha.expira_em && new Date(batalha.expira_em).getTime() <= Date.now()) {
          return { ok: false, motivo: 'expirado' };
        }

        return { ok: true, desafio: traduzirBatalha(batalha) };
      } catch (erro) {
        return traduzirFalhaDeAbertura(erro);
      }
    },

    async enderecoDoAudio(audioId: string): Promise<string | null> {
      try {
        return await assinarUrlDoAudio(audioId);
      } catch (erro) {
        console.error('Não deu para assinar o áudio', erro);
        return null;
      }
    },

    async responder(pedido: PedidoDeResposta): Promise<AberturaDoDesafio> {
      if (configuracaoAusente) return { ok: false, motivo: 'semRede' };

      try {
        const sessao = await garantirSessao();
        if (!sessao?.user?.id) return { ok: false, motivo: 'semRede' };

        const nome = pedido.nome.trim();
        if (nome) {
          try {
            await updateProfile(sessao.user.id, { apelido: nome });
          } catch (erroDoNome) {
            console.error('Falha ao salvar o apelido', erroDoNome);
          }
        }

        const salvo = await enviarResultado({
          duracao: pedido.nota.medidas.folego,
          potencia: pedido.nota.medidas.estouro,
          profundidade: pedido.nota.medidas.grave,
          textura: pedido.nota.medidas.sujeira,
          tipoDeOrigem: pedido.origem,
        });

        /*
          O ÁUDIO ANTES DE ENTRAR NA BRIGA. Invertendo a ordem, uma falha no
          upload deixaria a resposta já dentro do placar e MUDA — e é a linha
          que serve de prova.
        */
        await enviarAudioDoResultado(salvo, pedido.audio.dados);

        const batalha = await responderBatalha(pedido.codigo, salvo.id);
        return { ok: true, desafio: traduzirBatalha(batalha) };
      } catch (erro) {
        return traduzirFalhaDeAbertura(erro);
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

/**
 * A batalha do servidor, traduzida para o que a Arena precisa.
 *
 * A Arena não vê `codigo_de_acesso`, `rodada_id` nem `caminho_do_audio` com
 * esses nomes, e não vê nada que ela não use: participantes de disputa
 * presencial, total de rodadas, tipo de local. Tela que recebe a linha inteira
 * do banco acaba dependendo de coluna que ninguém prometeu.
 */
function traduzirBatalha(batalha: Batalha): DesafioAberto {
  return {
    codigo: batalha.codigo_de_acesso,
    link: `${origemDoJogo()}/b/${batalha.codigo_de_acesso}`,
    expiraEm: batalha.expira_em,
    rodadas: batalha.rodadas.map((rodada) => ({
      id: rodada.rodada_id,
      nome: rodada.apelido,
      nota: Number(rodada.nota),
      /*
        Escondido pela moderação conta como "não há o que tocar". A tela não
        precisa saber a diferença — e dizer "este áudio foi escondido" seria
        contar da denúncia para quem não tem nada a ver com ela.
      */
      audioId: rodada.esta_escondido ? null : rodada.caminho_do_audio,
    })),
    lider: batalha.lider
      ? {
          nome: batalha.lider.apelido,
          nota: Number(batalha.lider.nota),
          rodadaId: batalha.lider.resultado_id,
        }
      : null,
  };
}

function traduzirFalhaDeAbertura(erro: unknown): AberturaDoDesafio {
  if (pareceFaltaDeRede(erro)) return { ok: false, motivo: 'semRede' };

  const mensagem = erro instanceof Error ? erro.message.toLowerCase() : String(erro).toLowerCase();
  /*
    O servidor é quem manda no prazo — a RPC recusa depois do vencimento. A
    tela só traduz a recusa; ela não decide sozinha que o link morreu.
  */
  if (mensagem.includes('expir') || mensagem.includes('vencid')) {
    return { ok: false, motivo: 'expirado' };
  }

  console.error('Falha ao abrir o desafio', erro);
  return {
    ok: false,
    motivo: 'falhou',
    detalhe: erro instanceof Error ? erro.message : String(erro),
  };
}
