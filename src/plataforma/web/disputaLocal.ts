import {
  configuracaoAusente,
  criarBatalhaPresencial,
  enviarAudioDoResultado,
  enviarResultado,
  obterBatalha,
  responderBatalha,
} from '../../db/supabase';
import type { Batalha, LocalDaDisputa } from '../../db/supabase';
import { garantirSessao } from '../../shared/auth/sessaoAnonima';
import type {
  DisputaLocal,
  PedidoDeRoda,
  PedidoDeTurno,
  RespostaDaRoda,
  Roda,
} from '../../portas/disputaLocal';

/**
 * A roda no servidor.
 *
 * **NÃO EXISTE BACKEND NOVO AQUI.** `criar_batalha_presencial`,
 * `responder_batalha` (com participante) e `obter_batalha` estão aplicados
 * desde a 20260807000031, com os nomes de hoje na 20260807000036. Esta fatia
 * ligou a Arena no que já estava lá — zero migração, zero RPC, zero policy.
 *
 * O REGIME DE ACESSO CONTINUA O MESMO, e é ele que segura a roda de pé: as
 * tabelas têm RLS ligada e NENHUMA policy, e todo acesso passa por RPC
 * `SECURITY DEFINER` que recebe o código do link. Quem separa as cinco pessoas
 * que dividem o mesmo `auth.uid()` é `participantes_batalha`. Criar uma policy
 * "pra facilitar a leitura" abriria a roda inteira por id.
 */
export function criarDisputaLocalWeb(): DisputaLocal {
  return {
    async abrir(pedido: PedidoDeRoda): Promise<RespostaDaRoda> {
      if (configuracaoAusente) return { ok: false, motivo: 'semConfiguracao' };

      try {
        /*
          Sem sessão anônima o áudio dos turnos não sobe depois — a policy do
          bucket é `TO authenticated`. Falhar aqui, antes de a mesa existir, é
          melhor que falhar no terceiro arroto do churrasco.
        */
        const sessao = await garantirSessao();
        if (!sessao?.user?.id) return { ok: false, motivo: 'semRede' };

        const batalha = await criarBatalhaPresencial(
          [...pedido.nomes],
          pedido.rounds,
          pedido.local as LocalDaDisputa | null,
        );

        return { ok: true, roda: traduzirRoda(batalha) };
      } catch (erro) {
        return traduzirFalha(erro);
      }
    },

    async ler(codigo: string): Promise<RespostaDaRoda> {
      if (configuracaoAusente) return { ok: false, motivo: 'semConfiguracao' };

      try {
        await garantirSessao();

        const batalha = await obterBatalha(codigo);
        /*
          `null` cobre os dois casos de propósito: código que não existe e roda
          vencida. O banco não os distingue — dizer "expirou" confirmaria a um
          curioso que ele acertou um código real.
        */
        if (!batalha) return { ok: false, motivo: 'naoExiste' };

        return { ok: true, roda: traduzirRoda(batalha) };
      } catch (erro) {
        return traduzirFalha(erro);
      }
    },

    /**
     * O turno de uma pessoa: resultado, **áudio**, e só então a rodada.
     *
     * A ORDEM É A PARTE IMPORTANTE. Invertendo, uma falha de upload deixaria a
     * linha do pódio muda — e é a linha que serve de prova de que aquele arroto
     * existiu. É a mesma sequência que `desafios.responder` usa, e pelo mesmo
     * motivo.
     *
     * O nome NÃO vai para o perfil aqui, e isso é decisão: o perfil é do dono
     * do aparelho, e cinco pessoas passando o celular sobrescreveriam o apelido
     * dele cinco vezes. Quem dá nome à linha do pódio é
     * `participantes_batalha`, que o servidor já lê em `obter_batalha`.
     */
    async gravarTurno(pedido: PedidoDeTurno): Promise<RespostaDaRoda> {
      if (configuracaoAusente) return { ok: false, motivo: 'semConfiguracao' };

      try {
        const sessao = await garantirSessao();
        if (!sessao?.user?.id) return { ok: false, motivo: 'semRede' };

        const salvo = await enviarResultado({
          duracao: pedido.nota.medidas.folego,
          potencia: pedido.nota.medidas.estouro,
          profundidade: pedido.nota.medidas.grave,
          textura: pedido.nota.medidas.sujeira,
          tipoDeOrigem: pedido.origem,
        });

        await enviarAudioDoResultado(salvo, pedido.audio.dados);

        const batalha = await responderBatalha(
          pedido.codigo,
          salvo.id,
          pedido.participanteId,
        );

        return { ok: true, roda: traduzirRoda(batalha) };
      } catch (erro) {
        return traduzirFalha(erro);
      }
    },
  };
}

/**
 * A batalha do servidor, traduzida para o que a Arena precisa.
 *
 * A Arena não vê `codigo_de_acesso`, `numero_da_rodada` nem `caminho_do_audio`
 * com esses nomes, e não vê nada que ela não use. O `participante_id` viaja até
 * aqui e para aqui — a UI conhece nome, nota, posição, round e de quem é a vez.
 */
function traduzirRoda(batalha: Batalha): Roda {
  return {
    codigo: batalha.codigo_de_acesso,
    participantes: batalha.participantes.map((p) => ({ id: p.id, nome: p.apelido })),
    arrotos: batalha.rodadas.map((rodada) => ({
      participanteId: rodada.participante_id,
      nota: Number(rodada.nota),
    })),
    /*
      `total_de_rodadas` é nulo na disputa remota. Numa roda ele sempre existe,
      mas cair para 1 é melhor que cair para `NaN` e o round virar "Round NaN de
      NaN" na cara da mesa.
    */
    rounds: batalha.total_de_rodadas ?? 1,
    local: batalha.tipo_de_local,
  };
}

/**
 * Ficar sem sinal no meio é o caso mais comum de todos num churrasco, e o que a
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

/** O pedaço de `PostgrestError` que interessa. */
function codigoDoErro(erro: unknown): string | null {
  if (typeof erro !== 'object' || erro === null) return null;
  const codigo = (erro as { code?: unknown }).code;
  return typeof codigo === 'string' ? codigo : null;
}

/**
 * A recusa do banco, traduzida.
 *
 * OS CÓDIGOS SÃO SQLSTATE, levantados explicitamente pelas migrações 30, 31 e
 * 36. Não dependemos do TEXTO da exceção do Postgres: ele é do banco, está em
 * português por acidente e muda sem aviso.
 *
 * - `P0002` — a roda não existe mais, ou os 7 dias venceram;
 * - `42501` — o resultado não é desta sessão, ou o participante não é desta
 *   roda. Gravar de novo não resolve: é identidade, não rede;
 * - `23505` e `54000` — a nota JÁ ENTROU, ou o round já fechou. A tela é que
 *   está atrasada em relação ao banco.
 */
function traduzirFalha(erro: unknown): RespostaDaRoda {
  if (pareceFaltaDeRede(erro)) return { ok: false, motivo: 'semRede' };

  if (codigoDoErro(erro) === 'P0002') return { ok: false, motivo: 'naoExiste' };

  /*
    O CÓDIGO DA RODA NÃO ENTRA NO LOG. Ele é a chave da mesa, e log é o lugar
    mais fácil de um segredo vazar sem ninguém perceber.
  */
  console.error('Falha na roda', erro);
  return {
    ok: false,
    motivo: 'falhou',
    detalhe: erro instanceof Error ? erro.message : String(erro),
  };
}
