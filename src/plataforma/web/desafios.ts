import {
  BUCKET_AUDIO,
  assinarUrlDoAudio,
  configuracaoAusente,
  criarBatalha,
  enviarAudioDoResultado,
  enviarResultado,
  obterBatalha,
  responderBatalha,
  supabase,
  updateProfile,
} from '../../db/supabase';
import type { Batalha } from '../../db/supabase';
import { garantirSessao } from '../../shared/auth/sessaoAnonima';
import { origemDoJogo } from './enderecoDoJogo';
import type {
  AberturaDoDesafio,
  ResultadoDaRevanche,
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
            resultadoId: salvo.id,
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
        const meuId = (await garantirSessao())?.user?.id ?? null;

        /*
          Segunda linha de defesa, não a primeira: quem recusa resposta depois
          do prazo é a RPC. Isto existe para a tela não convidar alguém a
          arrotar numa disputa que já morreu.
        */
        if (batalha.expira_em && new Date(batalha.expira_em).getTime() <= Date.now()) {
          return { ok: false, motivo: 'expirado' };
        }

        return { ok: true, desafio: traduzirBatalha(batalha, meuId) };
      } catch (erro) {
        return traduzirFalhaDeAbertura(erro);
      }
    },

    /**
     * Apagar o próprio arroto — o ARQUIVO primeiro, o ponteiro depois.
     *
     * O QUE ESTAVA ERRADO, E POR QUE NINGUÉM VIU
     * ------------------------------------------
     * A versão anterior lia `caminho_do_audio` direto da tabela `resultados`
     * para saber qual arquivo remover. Só que a leitura de `resultados` foi
     * FECHADA (20260807000034): a tabela não tem nenhuma policy de SELECT, e
     * consulta bloqueada por RLS **não devolve erro** — devolve vazio.
     *
     * Então o caminho vinha `undefined`, o código concluía "não havia arquivo",
     * pulava o bucket e devolvia `apagado`. A RPC, essa rodava e limpava o
     * ponteiro. Resultado no mundo real: a pessoa apertava apagar, a tela dizia
     * que apagou, o áudio continuava no servidor e ninguém mais conseguia nem
     * achá-lo — órfão, sem dono, sem tela que o mostre.
     *
     * O caso é de PRIVACIDADE, não de interface. Um botão que promete apagar e
     * não apaga é pior que não ter botão.
     *
     * COMO PASSA A FUNCIONAR
     * ----------------------
     * 1. acha o arquivo LISTANDO a própria pasta — o dono enxerga a pasta dele
     *    pela policy de leitura do bucket, e o caminho é `<meuId>/<resultado>`,
     *    a mesma convenção que o upload monta;
     * 2. remove, e CONFERE que o servidor devolveu o que foi removido — pedir
     *    para remover o que a policy não deixa não é erro, é uma lista vazia;
     * 3. só então limpa o ponteiro.
     *
     * A ORDEM É A PARTE IMPORTANTE. Falhou no arquivo? O ponteiro fica de pé, a
     * tela diz que não deu, e tentar de novo funciona. Na ordem antiga, uma
     * falha no meio deixava o ponteiro limpo e o arquivo perdido para sempre —
     * que é exatamente o estado em que o arroto do dono do produto ficou.
     *
     * De quebra, isto CONSERTA os órfãos que a versão antiga deixou: o arquivo
     * continua na pasta, então uma nova tentativa encontra e remove.
     */
    async apagarMeuArroto(resultadoId: string): Promise<'apagado' | 'naoDeu'> {
      try {
        const meuId = (await garantirSessao())?.user?.id;
        if (!meuId) return 'naoDeu';

        const { data: naPasta, error: erroDaBusca } = await supabase.storage
          .from(BUCKET_AUDIO)
          .list(meuId, { search: resultadoId });

        if (erroDaBusca) throw erroDaBusca;

        const alvos = (naPasta ?? [])
          .filter((arquivo) => arquivo.name.startsWith(resultadoId))
          .map((arquivo) => `${meuId}/${arquivo.name}`);

        if (alvos.length > 0) {
          const { data: removidos, error: erroDoBucket } = await supabase.storage
            .from(BUCKET_AUDIO)
            .remove(alvos);

          if (erroDoBucket) throw erroDoBucket;

          /*
            LISTA VAZIA TAMBÉM É FALHA. O Storage não reclama quando a policy
            de DELETE recusa: ele responde 200 com nada removido. Tratar isso
            como sucesso é como o defeito de origem voltaria pela janela.
          */
          if (!removidos || removidos.length < alvos.length) {
            console.error('O servidor não removeu o áudio', { alvos, removidos });
            return 'naoDeu';
          }
        }

        const { error: erroDaRpc } = await supabase.rpc('remover_audio_do_resultado', {
          p_resultado_id: resultadoId,
        });
        if (erroDaRpc) throw erroDaRpc;

        return 'apagado';
      } catch (erro) {
        console.error('Falha ao apagar o arroto', erro);
        return 'naoDeu';
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
        return { ok: true, desafio: traduzirBatalha(batalha, sessao.user.id) };
      } catch (erro) {
        return traduzirFalhaDeAbertura(erro);
      }
    },

    async revanchar(pedido: PedidoDeResposta): Promise<ResultadoDaRevanche> {
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
          O ÁUDIO SOBE ANTES DE ENTRAR NA DISPUTA, igual à primeira resposta.
          Invertendo, uma tentativa que SUPERASSE trocaria a linha do placar
          para um resultado sem áudio — e o placar passaria a tocar silêncio no
          lugar do arroto que está valendo.
        */
        await enviarAudioDoResultado(salvo, pedido.audio.dados);

        const { data, error } = await supabase.rpc('revanchar_batalha', {
          p_codigo_de_acesso: pedido.codigo,
          p_resultado_id: salvo.id,
        });
        if (error) throw error;

        const desafio = traduzirBatalha(data as Batalha, sessao.user.id);

        /*
          SUPEROU? A Arena não compara notas: aqui se pergunta ao PLACAR se a
          minha linha passou a apontar para o arroto que acabou de subir. Quem
          decidiu foi a regra no banco; isto é só leitura do que ela fez.
        */
        const minhaLinha = desafio.rodadas.find((rodada) => rodada.ehMeu);
        const superou = minhaLinha?.resultadoId === salvo.id;

        return { ok: true, desafio, superou };
      } catch (erro) {
        const falha = traduzirFalhaDeAbertura(erro);
        return falha as ResultadoDaRevanche;
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
function traduzirBatalha(batalha: Batalha, meuUsuarioId: string | null): DesafioAberto {
  return {
    codigo: batalha.codigo_de_acesso,
    link: `${origemDoJogo()}/b/${batalha.codigo_de_acesso}`,
    expiraEm: batalha.expira_em,
    rodadas: batalha.rodadas.map((rodada) => {
      const escondido = rodada.esta_escondido;
      const audioId = escondido ? null : rodada.caminho_do_audio;

      return {
        id: rodada.rodada_id,
        nome: rodada.apelido,
        nota: Number(rodada.nota),
        audioId,
        /*
          A ORDEM DA CHECAGEM É A REGRA: escondido primeiro. Uma rodada
          escondida pela moderação também está sem caminho para a tela, e
          chamar isso de "apagado" contaria uma história errada sobre quem
          gravou.
        */
        motivoSemAudio: escondido ? 'escondido' : audioId ? null : 'apagado',
        /*
          Dono é comparação de servidor: o `usuario_id` vem da rodada, e a
          sessão de quem está olhando vem do Auth. A tela nunca decide isso.
        */
        ehMeu: !!meuUsuarioId && rodada.usuario_id === meuUsuarioId,
        resultadoId: rodada.resultado_id,
      };
    }),
    lider: batalha.lider
      ? {
          nome: batalha.lider.apelido,
          nota: Number(batalha.lider.nota),
          resultadoId: batalha.lider.resultado_id,
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
