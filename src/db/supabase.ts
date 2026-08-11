import { createClient } from '@supabase/supabase-js';
import type { Provider } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Qual credencial está faltando, ou `null` quando as duas existem.
 *
 * Isto existe por causa de um modo de falha específico e caro: `createClient`
 * LANÇA com URL vazia (`supabaseUrl is required.`), e isso acontece no import
 * deste módulo — que é importado em cadeia por quase toda tela. O resultado é
 * uma exceção antes do primeiro render: **página em branco, sem uma palavra**.
 *
 * As variáveis são lidas em tempo de BUILD. Um deploy na Vercel sem elas
 * configuradas (ou configuradas só em Production e não em Preview, ou
 * adicionadas sem rebuild) publica exatamente essa tela branca, e nada no app
 * diz o motivo — nem no console do usuário, nem no log do servidor.
 *
 * Então o módulo não pode mais lançar. Ele relata, e `main.tsx` mostra a
 * explicação em vez do app.
 */
export const configuracaoAusente: string | null = !supabaseUrl
  ? 'VITE_SUPABASE_URL'
  : !supabaseAnonKey
    ? 'VITE_SUPABASE_ANON_KEY'
    : null;

/*
  O endereço local padrão do Supabase entra só para o `createClient` ter uma
  URL válida e o import não explodir. Nenhuma requisição sai daqui nesse
  estado: `main.tsx` não monta o app quando `configuracaoAusente` não é nulo.
  Um placeholder inventado (`https://exemplo.invalid`) tornaria o erro de rede
  mais confuso do que já é, caso algum caminho futuro escape dessa barreira.
*/
export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'chave-ausente',
);

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
  });
}

export async function signInWithTikTok() {
  return supabase.auth.signInWithOAuth({
    provider: 'tiktok' as Provider,
  });
}

export async function signInWithTwitter() {
  return supabase.auth.signInWithOAuth({
    provider: 'twitter' as Provider,
  });
}

export async function signInWithEmail(email: string) {
  return supabase.auth.signInWithOtp({ email });
}

export async function signOut() {
  return supabase.auth.signOut();
}

/** Linha de `public.resultados` como devolvida pela RPC `enviar_resultado`. */
export interface ResultadoRow {
  id: string;
  criado_em: string;
  nota: number;
  classificacao: string;
  e_artificial: boolean;
  duracao: number;
  potencia: number;
  profundidade: number;
  textura: number;
  nota_da_origem: number;
  tipo_de_origem: string;
  subtipo_de_origem: string | null;
  nome_do_jogador: string | null;
  usuario_id: string | null;
  grupo_id: string | null;
  xp_ganho: number;
  e_elegivel_para_xp: boolean;
  esta_escondido: boolean;
  /** Um humano já decidiu sobre este resultado; o gatilho de denúncias não mexe. */
  esta_travado_por_moderacao: boolean;
  /**
   * Caminho do objeto no bucket `audio_records`, ou `null` quando não há áudio.
   *
   * `null` é o caso NORMAL, não excepcional: gravação anônima nunca tem áudio
   * (a policy de INSERT do bucket é `TO authenticated`), e todo resultado
   * gravado antes da 20260807000027 também não tem. Quem consome precisa tratar
   * a ausência — nunca renderizar um player sem isto.
   */
  caminho_do_audio: string | null;
}

export interface EnviarResultadoInput {
  /** Parciais normalizadas 0-100 produzidas pelo Judgement Engine local. */
  duracao: number;
  potencia: number;
  profundidade: number;
  textura: number;
  tipoDeOrigem: string;
  /** Só é gravado quando `tipoDeOrigem` é 'Comida' ou 'Bebida'. */
  subtipoDeOrigem?: string | null;
  /**
   * Ignorado pelo servidor quando há sessão: o ranking usa o apelido do perfil.
   * Só vale para gravação anônima.
   */
  nomeDoJogador?: string | null;
  /**
   * Exige que o usuário seja membro do grupo; o servidor recusa se não for.
   *
   * SEM PRODUTOR HOJE: nenhuma tela envia este campo, porque não existe
   * seleção de grupo no fluxo de gravação. O caminho no servidor está pronto e
   * validado — falta a interface.
   */
  grupoId?: string | null;
}

/**
 * Grava um resultado através da RPC `enviar_resultado` — único caminho de
 * escrita em `resultados` (o INSERT direto foi revogado em 20260807000011).
 *
 * `nota`, `classificacao`, `nota_da_origem`, `e_artificial` e `usuario_id` são
 * derivados no servidor; nada disso trafega no payload.
 */
export async function enviarResultado(input: EnviarResultadoInput): Promise<ResultadoRow> {
  const { data, error } = await supabase.rpc('enviar_resultado', {
    p_duracao: input.duracao,
    p_potencia: input.potencia,
    p_profundidade: input.profundidade,
    p_textura: input.textura,
    p_tipo_de_origem: input.tipoDeOrigem,
    p_nome_do_jogador: input.nomeDoJogador ?? null,
    p_subtipo_de_origem: input.subtipoDeOrigem ?? null,
    p_grupo_id: input.grupoId ?? null,
  });

  if (error) throw error;
  return data as ResultadoRow;
}

/* =============================================================================
 * Áudio da gravação — Storage `audio_records`
 *
 * O BUCKET DEIXOU DE SER PÚBLICO na 20260807000028: hoje é privado e a leitura
 * passa por URL assinada. Isso é MODERAÇÃO, e não privacidade — a policy de
 * SELECT só pergunta `esta_escondido = false` (hoje via `aue_audio_esta_visivel`,
 * 20260807000034).
 *
 * Consequência, dita sem eufemismo e inalterada desde o começo: qualquer áudio
 * enviado daqui é audível por qualquer pessoa que saiba o caminho, apareça ele
 * no feed ou não. Não existe áudio privado neste desenho, e a interface avisa
 * isso ANTES do envio. O que a 20260807000028 acrescentou foi um botão de
 * desligar — esconder deixa de assinar —, não sigilo.
 *
 * O QUE A 20260807000034 MUDOU, E É MUITO: o caminho deixou de ser LISTÁVEL.
 * Até ela, `resultados` tinha SELECT `USING (true)` para `anon`, então um
 * `GET /rest/v1/resultados?select=id,caminho_do_audio` com a chave anônima — que é
 * pública e vai no bundle — devolvia o catálogo de áudios do sistema inteiro.
 * "Saber o caminho" era um GET. Hoje `resultados` não tem policy de SELECT, e o
 * `caminho_do_audio` só chega por `obter_batalha` (que aplica os 7 dias do §3.7) ou
 * `obter_desafio`.
 * ============================================================================= */

export const BUCKET_AUDIO = 'audio_records';

/**
 * Espelho do `allowed_mime_types` do bucket (20260807000032, que substituiu a
 * lista original da 20260807000013).
 *
 * Existe para falhar cedo e com mensagem legível. Sem isto, um navegador que
 * grave num formato fora da lista recebe um erro cru do Storage depois de já
 * ter subido os bytes.
 *
 * ESPELHO DE VERDADE, E NÃO APROXIMAÇÃO. Enquanto esta lista foi mais restrita
 * que a do bucket, ela foi a regra que valeu: o cliente recusa ANTES de falar
 * com o Storage, então formato ausente aqui nunca chega lá, por mais que o
 * banco o aceite. Foi assim que a 20260807000032 corrigiu o iPhone no bucket
 * sem corrigi-lo no produto — o Safari continuou recebendo "o Auê ainda não
 * aceita audio/mp4", que é mensagem DAQUI, e o arroto seguiu sem subir.
 * `mimes-do-bucket.test.ts` tranca as duas listas juntas.
 */
export const MIMES_ACEITOS_PELO_BUCKET = new Set([
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  // Contêiner MP4/AAC — o que o MediaRecorder do Safari (iOS e macOS) produz.
  'audio/mp4',
  'audio/aac',
  'audio/x-m4a',
  'video/mp4',
  'video/webm',
]);

export const EXTENSAO_POR_MIME: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
  // `.m4a` para os dois rótulos do mesmo contêiner. A extensão é cosmética — o
  // `contentType` vai explícito no upload e nada no servidor lê o sufixo
  // (20260807000027 valida pasta e tamanho do caminho, nunca a extensão).
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/x-m4a': 'm4a',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

/** Limite do bucket: 5 MB (20260807000013, linha 11). */
const LIMITE_BYTES_DO_BUCKET = 5 * 1024 * 1024;

/** Gravação sem sessão: a policy de INSERT do bucket é `TO authenticated`. */
export class AudioSemContaError extends Error {
  constructor() {
    super('Gravação anônima não sobe áudio — a política do bucket exige conta.');
    this.name = 'AudioSemContaError';
  }
}

/** O navegador gravou num formato que o bucket recusa. */
export class AudioFormatoNaoAceitoError extends Error {
  // Campo declarado à parte, não como propriedade de parâmetro: o projeto roda
  // com `erasableSyntaxOnly`, que proíbe `constructor(readonly x)`.
  readonly mime: string;

  constructor(mime: string) {
    super(`O bucket não aceita "${mime}".`);
    this.name = 'AudioFormatoNaoAceitoError';
    this.mime = mime;
  }
}

export class AudioGrandeDemaisError extends Error {
  constructor() {
    super('O áudio passa do limite de 5 MB do bucket.');
    this.name = 'AudioGrandeDemaisError';
  }
}

/**
 * Tipo do Blob sem os parâmetros do media type.
 *
 * `MediaRecorder` costuma devolver `audio/webm;codecs=opus`, e o
 * `allowed_mime_types` do bucket lista `audio/webm` cru. Mandar a string com
 * parâmetro é pedir recusa por uma diferença que não é de formato.
 */
function tipoBaseDoBlob(blob: Blob): string {
  return (blob.type || '').split(';')[0].trim().toLowerCase();
}

/**
 * Validade da URL assinada, em segundos.
 *
 * TENSÃO REAL, resolvida em 5 minutos. Curto demais e o áudio expira entre
 * abrir o feed e apertar o play; longo demais e esconder um arroto deixa de ter
 * efeito prático, porque toda URL já emitida continua valendo até vencer —
 * assinatura não é revogável.
 *
 * Cinco minutos significa: a partir de "esconder", o pior caso é o áudio seguir
 * acessível por mais 5 minutos para quem já tinha a URL na mão. Está no runbook
 * (docs/technical/moderacao-de-audio.md) porque é exatamente o que Luiz precisa
 * saber ao esconder algo urgente.
 */
const SEGUNDOS_DE_ASSINATURA = 300;

/**
 * URL assinada do áudio, ou `null` quando não há áudio ou o acesso foi negado.
 *
 * O bucket é PRIVADO desde a 20260807000028. `getPublicUrl` continuaria
 * devolvendo uma string — e é justamente por isso que ele não pode ser usado:
 * a string existe, o arquivo não é servido, e o player renderiza sem tocar.
 *
 * `createSignedUrl` é autorizado contra a policy de SELECT de `storage.objects`,
 * que exige `resultados.esta_escondido = false`. Ou seja: áudio escondido não assina,
 * e devolvemos `null`. Isso vale para `anon` também — quem chega pelo link do
 * desafio está deslogado.
 *
 * Devolver `null` é parte do contrato: quem chama NÃO renderiza player nenhum
 * nesse caso.
 */
export async function assinarUrlDoAudio(audioPath?: string | null): Promise<string | null> {
  if (!audioPath) return null;

  const { data, error } = await supabase.storage
    .from(BUCKET_AUDIO)
    .createSignedUrl(audioPath, SEGUNDOS_DE_ASSINATURA);

  if (error) {
    // Não distinguimos "escondido" de "sumiu" de "rede caiu" para o usuário: em
    // todos os casos não há o que tocar, e chutar a causa seria inventar. O
    // console guarda o motivo real para quem for investigar.
    console.error('Não foi possível assinar a URL do áudio', audioPath, error);
    return null;
  }

  return data?.signedUrl ?? null;
}

/**
 * Tira o próprio áudio do ar: limpa o ponteiro e apaga o arquivo.
 *
 * ORDEM DELIBERADA. A RPC vem primeiro: com `caminho_do_audio` NULL nenhuma linha de
 * `resultados` referencia o objeto, e a policy de SELECT do Storage passa a
 * negar a assinatura para todo mundo IMEDIATAMENTE — mesmo que a remoção do
 * arquivo, logo abaixo, falhe.
 *
 * A remoção do arquivo é best-effort e NÃO derruba a operação: do ponto de
 * vista de quem pediu, o áudio já saiu do ar. Um arquivo remanescente é
 * problema de custo e de retenção, registrado no console e coberto pelo
 * runbook — não é motivo para dizer à pessoa que o pedido dela falhou.
 */
export async function removerAudioDoResultado(resultado: ResultadoRow): Promise<ResultadoRow> {
  const caminho = resultado.caminho_do_audio;

  const { data, error } = await supabase.rpc('remover_audio_do_resultado', {
    p_resultado_id: resultado.id,
  });

  if (error) throw error;

  if (caminho) {
    const { error: erroRemocao } = await supabase.storage.from(BUCKET_AUDIO).remove([caminho]);
    if (erroRemocao) {
      console.error('Ponteiro limpo, mas o arquivo continua no bucket:', caminho, erroRemocao);
    }
  }

  return data as ResultadoRow;
}

/**
 * Sobe o Blob e grava o ponteiro no resultado.
 *
 * Ordem obrigatória: upload primeiro, RPC depois. O caminho é derivado do
 * `resultado.id`, que só existe depois de `enviar_resultado`, e a policy do
 * Storage exige que a primeira pasta seja o `auth.uid()`.
 *
 * SEM `upsert`. O bucket não tem policy de UPDATE (20260807000013 só criou
 * SELECT, INSERT e DELETE), então `upsert: true` falharia na segunda tentativa
 * em vez de sobrescrever — e a RPC recusa trocar o ponteiro de qualquer forma.
 *
 * Quem chama PRECISA tratar a exceção sem derrubar o resultado: o score já foi
 * persistido pelo servidor antes desta função existir no fluxo, e o áudio é
 * enriquecimento.
 */
export async function enviarAudioDoResultado(
  resultado: ResultadoRow,
  blob: Blob,
): Promise<ResultadoRow> {
  if (!resultado.usuario_id) throw new AudioSemContaError();
  if (blob.size > LIMITE_BYTES_DO_BUCKET) throw new AudioGrandeDemaisError();

  const mime = tipoBaseDoBlob(blob);
  if (!MIMES_ACEITOS_PELO_BUCKET.has(mime)) {
    // Safari grava em `audio/mp4`, que NÃO está no allowed_mime_types do
    // bucket. Falhamos aqui, com o formato nomeado, em vez de declarar
    // `video/mp4` para passar pela validação — isso seria mentir sobre o
    // conteúdo para contornar uma regra do banco.
    throw new AudioFormatoNaoAceitoError(mime || 'formato desconhecido');
  }

  const caminho = `${resultado.usuario_id}/${resultado.id}.${EXTENSAO_POR_MIME[mime]}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET_AUDIO)
    .upload(caminho, blob, { contentType: mime, upsert: false });

  if (erroUpload) throw erroUpload;

  const { data, error } = await supabase.rpc('definir_audio_do_resultado', {
    p_resultado_id: resultado.id,
    p_caminho_do_audio: caminho,
  });

  if (error) {
    // O objeto subiu e o ponteiro não foi gravado: ninguém mais saberia este
    // caminho, e o arquivo ficaria ocupando o bucket para sempre. A policy de
    // DELETE do Storage permite ao dono apagar a própria pasta, então tentamos.
    // Se a limpeza também falhar, seguimos com o erro original — que é o que
    // interessa para quem está na tela.
    try {
      await supabase.storage.from(BUCKET_AUDIO).remove([caminho]);
    } catch (erroLimpeza) {
      console.error('Áudio órfão no bucket:', caminho, erroLimpeza);
    }
    throw error;
  }

  return data as ResultadoRow;
}

const ALFABETO_DESAFIO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I/O/0/1
const TENTATIVAS_DESAFIO = 5;

/**
 * Gera o id de 6 caracteres do desafio.
 *
 * Usa `crypto.getRandomValues` em vez de `Math.random()`: o id é a chave
 * primária e vira a URL pública do duelo, então precisa ser imprevisível, não
 * apenas variado. O alfabeto omite I, O, 0 e 1 porque o link é lido e digitado
 * por pessoas.
 */
function gerarIdDesafio(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let id = '';
  for (const b of bytes) id += ALFABETO_DESAFIO[b % ALFABETO_DESAFIO.length];
  return id;
}

/**
 * Um lado do duelo legado, como `obter_desafio` o devolve.
 *
 * NÃO é a linha de `resultados`. A RPC monta só o que a tela renderiza — antes
 * daqui vinha `resultados(*)` embutido pelo PostgREST, e isso entregava
 * parciais, `user_id`, `group_id`, XP e flags de moderação a qualquer pessoa
 * que abrisse um link do WhatsApp.
 */
export interface ResultadoDoDesafio {
  id: string;
  nota: number;
  classificacao: string;
  esta_escondido: boolean;
  /** Já vem `null` quando o resultado está escondido — a RPC apaga o ponteiro. */
  caminho_do_audio: string | null;
}

export interface DesafioComResultados {
  id: string;
  criado_em: string;
  /**
   * Os valores também viraram PT na 20260807000036. Era
   * `'challenger' | 'challenged' | 'tie'`.
   */
  vencedor: 'desafiante' | 'desafiado' | 'empate' | null;
  resolvido_em: string | null;
  resultado_desafiante: ResultadoDoDesafio;
  resultado_desafiado: ResultadoDoDesafio | null;
}

/**
 * Cria o duelo legado `/d/CODIGO`.
 *
 * SEM PRODUTOR HOJE: `AudioRecorder` passou a gerar `/b/CODIGO` (batalha em
 * sessão, 20260807000030). A função continua aqui porque o INSERT continua
 * autorizado no banco — a policy de INSERT e o gate `pode_usar_como_desafiante`
 * (20260807000016) não foram tocados.
 *
 * DEIXOU DE USAR `.select()` na 20260807000034: `desafios` não tem mais policy
 * de SELECT, então pedir a linha de volta falharia. O id não vem do servidor de
 * qualquer forma — ele é sorteado aqui embaixo, e é ele que vira a URL.
 */
export async function createChallenge(challengerResultId: string): Promise<string> {
  // O id é escolhido no cliente, então a colisão é possível e chega como
  // violação de chave primária (23505). Antes, o erro cru subia para a
  // interface como "Erro ao criar desafio"; agora tenta outro id.
  let ultimoErro: unknown = null;

  for (let tentativa = 0; tentativa < TENTATIVAS_DESAFIO; tentativa++) {
    const id = gerarIdDesafio();

    const { error } = await supabase
      .from('desafios')
      .insert([{ id, resultado_desafiante_id: challengerResultId }]);

    if (!error) return id;

    ultimoErro = error;
    if ((error as { code?: string }).code !== '23505') break; // não é colisão
  }

  throw ultimoErro;
}

/**
 * Busca o duelo legado pelo código do link.
 *
 * FOI DE `.from('desafios')` PARA RPC na 20260807000034. A leitura direta
 * existia porque `desafios` e `resultados` tinham SELECT `USING (true)` para
 * `anon` — o mesmo buraco que devolvia o catálogo de áudios do sistema inteiro
 * num GET. As duas policies caíram; esta RPC é `SECURITY DEFINER` e recebe o
 * código do link como argumento, no mesmo desenho de `obter_batalha`.
 *
 * Devolve `null` para código inexistente, em vez de lançar. A tela já trata
 * esse caso ("Desafio não encontrado") — antes ele chegava como exceção do
 * `.single()` e virava a mensagem genérica de falha.
 */
export async function getChallenge(challengeId: string): Promise<DesafioComResultados | null> {
  const { data, error } = await supabase.rpc('obter_desafio', {
    p_id: challengeId,
  });

  if (error) throw error;
  return (data as DesafioComResultados | null) ?? null;
}

/**
 * Responde o duelo legado e devolve o estado atualizado.
 *
 * A posse do resultado continua sendo checada por `pode_usar_como_desafiado`
 * (20260807000023) — a RPC a chama explicitamente, porque `SECURITY DEFINER`
 * não passa pela policy de UPDATE que a aplicava antes.
 */
export async function completeChallenge(
  challengeId: string,
  challengedResultId: string,
): Promise<DesafioComResultados> {
  const { data, error } = await supabase.rpc('responder_desafio', {
    p_id: challengeId,
    p_resultado_id: challengedResultId,
  });

  if (error) throw error;
  return data as DesafioComResultados;
}

/* =============================================================================
 * Batalhas — o duelo em sessão (20260807000030)
 *
 * O `desafios` acima continua existindo e NÃO foi tocado: ele atende os links
 * `/d/CODIGO` que já circularam. Toda batalha nova nasce aqui.
 *
 * A diferença que importava não era de schema, era de acesso: `desafios` tinha
 * SELECT aberto para `anon`, e qualquer pessoa listava todos os duelos com um
 * GET. `batalhas` e `rodadas_batalha` nasceram com RLS ligada e NENHUMA policy
 * — não há requisição que as leia. Tudo passa pelas três RPCs abaixo, que
 * recebem o código do link como argumento. É por isso que este bloco não tem um
 * único `.from('batalhas')`: não é estilo, é a barreira.
 *
 * A 20260807000034 estendeu essa mesma barreira a `desafios` e `resultados`.
 * O bloco legado acima já não tem `.from('desafios')` para ler: sobrou só o
 * INSERT, e ele é gateado por `pode_usar_como_desafiante`.
 * ============================================================================= */

/** Uma gravação dentro de uma batalha, na ordem em que entrou. */
export interface RodadaDaBatalha {
  rodada_id: string;
  posicao: number;
  numero_da_rodada: number;
  /** Quem gravou, na disputa presencial. `null` na remota. */
  participante_id: string | null;
  resultado_id: string;
  nota: number;
  classificacao: string;
  tipo_de_origem: string;
  subtipo_de_origem: string | null;
  e_artificial: boolean;
  esta_escondido: boolean;
  /** `null` quando não subiu ou quando a moderação escondeu. */
  caminho_do_audio: string | null;
  apelido: string;
  usuario_id: string | null;
  criado_em: string;
}

/** Alguém disputando presencialmente. A ordem da lista é a ordem dos turnos. */
export interface ParticipanteDaBatalha {
  id: string;
  apelido: string;
}

/** Onde a disputa presencial aconteceu. Espelha o CHECK de `batalhas`. */
export type LocalDaDisputa = 'casa' | 'publico' | 'escritorio' | 'churrasco' | 'outro';

export interface Batalha {
  codigo_de_acesso: string;
  tipo_de_batalha: 'remota' | 'presencial';
  tipo_de_local: LocalDaDisputa | null;
  total_de_rodadas: number | null;
  criado_em: string;
  /**
   * Quando o link para de funcionar — os 7 dias do §3.7.
   *
   * É O ÚNICO PRAZO VERDADEIRO do produto, e por muito tempo nenhuma tela o
   * leu: duas delas escreviam "7 dias" em texto fixo, e no sexto dia
   * continuavam prometendo sete. Quem transforma esta data em frase é
   * `features/battle/prazoDaBatalha.ts`; quem para a atualização automática
   * quando ela vence é `useBatalhaAoVivo`.
   */
  expira_em: string;
  /**
   * PROMESSA MORTA, e fica documentada como tal em vez de sumir.
   *
   * A coluna existe desde a 20260807000030 e é devolvida por `obter_batalha`.
   * NADA NO SISTEMA A ESCREVE: nenhuma RPC faz UPDATE nela, nenhuma tela a lê,
   * e portanto ela é `null` em toda batalha que existe hoje. O estado
   * "encerrada" que o nome sugere não existe — a batalha remota vive em loop
   * até o prazo vencer, e o fim da disputa presencial é DERIVADO das rodadas
   * gravadas (`features/battle/turnos.ts`, mesma regra que o servidor aplica em
   * `responder_batalha` para recusar round além do total).
   *
   * Encerrar uma batalha à mão é feature de produto — precisaria de RPC, de
   * dono autorizado e de decisão sobre o que acontece com quem já tem o link.
   * Não está no MVP1 e não entra por acidente. O campo continua tipado porque a
   * RPC continua devolvendo; quem for consumi-lo um dia precisa saber que hoje
   * ele não significa nada.
   */
  finalizada_em: string | null;
  rodadas: RodadaDaBatalha[];
  /** Vazio na disputa remota, onde cada pessoa tem o próprio aparelho. */
  participantes: ParticipanteDaBatalha[];
  /** `null` enquanto nenhuma rodada audível existir. */
  lider: { apelido: string; nota: number; resultado_id: string } | null;
}

/**
 * Cria a batalha e devolve o código do link.
 *
 * O código é sorteado NO SERVIDOR (10 caracteres, ~50 bits) — diferente de
 * `createChallenge`, onde o cliente sorteia 6 caracteres e tenta de novo em
 * caso de colisão. Aqui não há laço de retry no cliente porque não há como o
 * cliente escolher o próprio código.
 */
export async function criarBatalha(resultId: string): Promise<string> {
  const { data, error } = await supabase.rpc('criar_batalha', {
    p_resultado_id: resultId,
  });

  if (error) throw error;
  return data as string;
}

/**
 * Busca a batalha pelo código do link.
 *
 * Devolve `null` para código inexistente E para batalha expirada — o banco não
 * distingue os dois de propósito (dizer "expirou" confirmaria a um curioso que
 * ele acertou um código real). A tela precisa tratar os dois com a mesma
 * mensagem.
 */
export async function obterBatalha(accessCode: string): Promise<Batalha | null> {
  const { data, error } = await supabase.rpc('obter_batalha', {
    p_codigo_de_acesso: accessCode,
  });

  if (error) throw error;
  return (data as Batalha | null) ?? null;
}

/**
 * Acrescenta uma gravação ao fim da batalha e devolve o estado atualizado.
 *
 * Devolver a batalha inteira, em vez de só a rodada criada, é deliberado: entre
 * abrir o link e mandar de volta pode ter entrado gente. Recarregar aqui é o
 * que mantém o feed honesto sem uma segunda ida ao servidor.
 */
export async function responderBatalha(
  accessCode: string,
  resultId: string,
  /**
   * Só na disputa presencial. Identifica QUEM das cinco pessoas gravou — no
   * presencial todas compartilham o mesmo `auth.uid()`, o do aparelho que está
   * passando de mão em mão.
   *
   * O número do round NÃO viaja daqui: o servidor o deriva de quantas vezes
   * este participante já gravou. Deixar o cliente escolher permitiria refazer
   * um round já fechado, e o ranking do round 1 mudaria depois de anunciado.
   */
  participantId?: string | null,
): Promise<Batalha> {
  const { data, error } = await supabase.rpc('responder_batalha', {
    p_codigo_de_acesso: accessCode,
    p_resultado_id: resultId,
    p_participante_id: participantId ?? null,
  });

  if (error) throw error;
  return data as Batalha;
}

/**
 * Abre uma disputa presencial: até 5 participantes, de 1 a 3 rounds.
 *
 * A ORDEM DO ARRAY É A ORDEM DOS TURNOS — a mesa combinou quem começa, e o
 * servidor preserva isso.
 */
export async function criarBatalhaPresencial(
  apelidos: string[],
  roundsTotal: number,
  local: LocalDaDisputa | null,
): Promise<Batalha> {
  const { data, error } = await supabase.rpc('criar_batalha_presencial', {
    p_apelidos: apelidos,
    p_total_de_rodadas: roundsTotal,
    p_tipo_de_local: local,
  });

  if (error) throw error;
  return data as Batalha;
}

/* =============================================================================
 * Denúncias
 *
 * A tabela existe desde a 20260807000014 e NUNCA teve produtor: não havia um
 * único ponto em `src/` que inserisse uma denúncia. O mecanismo inteiro —
 * incluindo o gatilho que esconde com 3 denunciantes distintos — era código
 * inalcançável.
 *
 * A 20260807000023 já endureceu a tabela (dono por linha, uma por pessoa por
 * resultado, `REVOKE INSERT` de `anon`). Nada disso precisou mudar; faltava a
 * interface.
 * ============================================================================= */

/** Já denunciou este resultado. Não é falha — é o mesmo pedido de novo. */
export class DenunciaDuplicadaError extends Error {
  constructor() {
    super('Você já denunciou este arroto.');
    this.name = 'DenunciaDuplicadaError';
  }
}

/**
 * Registra uma denúncia do usuário logado.
 *
 * VAI DIRETO NA TABELA: a policy "Authenticated users can report once per
 * result" (`auth.uid() = user_id`) já expressa a regra, e o índice único
 * `denuncias_uma_por_pessoa_por_resultado` faz a deduplicação no banco. Uma RPC
 * aqui só acrescentaria indireção — mesmo critério de `apagarComentario`.
 *
 * A violação de unicidade (23505) vira `DenunciaDuplicadaError` em vez de erro
 * cru: denunciar duas vezes não é um defeito, e a tela precisa poder dizer
 * "você já denunciou" sem chamar isso de falha.
 */
export async function criarDenuncia(resultId: string, motivo: string) {
  const { data: sessao } = await supabase.auth.getSession();
  const userId = sessao.session?.user.id;

  if (!userId) {
    // A policy é `TO authenticated` desde a 20260807000023, de propósito:
    // denúncia anônima era um botão de sabotagem (três POSTs derrubavam
    // qualquer gravação). Falhamos aqui, com mensagem própria.
    throw new Error('Entre para denunciar.');
  }

  const { data, error } = await supabase
    .from('denuncias')
    .insert([{ result_id: resultId, user_id: userId, reason: motivo }])
    .select()
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') throw new DenunciaDuplicadaError();
    throw error;
  }

  return data;
}

/* =============================================================================
 * Social Links, Profiles & Followers
 * ============================================================================= */

/** Linha de `public.perfis` (era `public.profiles` até a 20260807000036). */
export interface PerfilRow {
  id: string;
  apelido: string | null;
  url_do_avatar: string | null;
  bio: string | null;
  titulo: string | null;
  xp_total: number;
  nivel: number;
  e_fundador: boolean;
  e_premium: boolean;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  twitter: string | null;
  notificar_desafios: boolean;
  notificar_ranking: boolean;
  notificar_comunidade: boolean;
  criado_em: string;
}

export interface AtualizarPerfilInput {
  apelido?: string;
  url_do_avatar?: string;
  bio?: string;
  titulo?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  twitter?: string;
  notificar_desafios?: boolean;
  notificar_ranking?: boolean;
  notificar_comunidade?: boolean;
}

/**
 * Prefixo do apelido que o banco atribui sozinho a quem acabou de nascer.
 *
 * `criar_perfil_do_novo_usuario()` (antes `criar_perfil_do_novo_usuario()`) monta
 * `'Arrotador ' || substr(NEW.id::text, 1, 6)` quando não há nome nos metadados
 * do provedor — que é SEMPRE o caso do login anônimo.
 *
 * Está aqui, e não escrito à mão em cada tela, porque é uma cópia de uma regra
 * que vive no SQL. Se o formato mudar lá, muda aqui, num lugar só.
 */
export const PREFIXO_DE_APELIDO_PADRAO = 'Arrotador ';

/**
 * O usuário ainda não escolheu como quer aparecer?
 *
 * Serve para decidir se a tela pede um nome. Antes do login anônimo essa
 * decisão era "não tem sessão?" — o que deixou de funcionar quando toda visita
 * passou a ter sessão. A pergunta certa nunca foi sobre sessão: é se o nome
 * exibido ainda é o que o banco inventou.
 */
export function apelidoEhPadrao(apelido: string | null | undefined): boolean {
  return !apelido?.trim() || apelido.startsWith(PREFIXO_DE_APELIDO_PADRAO);
}

export async function getProfile(userId: string): Promise<PerfilRow> {
  const { data, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as PerfilRow;
}

export async function updateProfile(userId: string, input: AtualizarPerfilInput) {
  const { data, error } = await supabase
    .from('perfis')
    .update(input)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleFollow(targetUserId: string) {
  const { data, error } = await supabase.rpc('alternar_seguir', {
    p_usuario_alvo_id: targetUserId,
  });

  if (error) throw error;
  return data as boolean;
}

/*
  O nome da constraint continua `seguidores_follower_id_fkey`: `seguidores` é
  tabela de feature desligada e não entrou no rename. O que mudou foi o ALVO do
  embed — `profiles` virou `perfis`.
*/
export async function getFollowers(userId: string) {
  const { data, error } = await supabase
    .from('seguidores')
    .select('*, follower:perfis!seguidores_follower_id_fkey(*)')
    .eq('following_id', userId);

  if (error) throw error;
  return data;
}

export async function getFollowing(userId: string) {
  const { data, error } = await supabase
    .from('seguidores')
    .select('*, following:perfis!seguidores_following_id_fkey(*)')
    .eq('follower_id', userId);

  if (error) throw error;
  return data;
}

export function formatSocialUrl(network: 'Instagram' | 'TikTok' | 'YouTube' | 'X', handle: string): string {
  const cleanHandle = handle.replace(/^@/, '').trim();
  switch (network) {
    case 'Instagram':
      return `https://instagram.com/${cleanHandle}`;
    case 'TikTok':
      return `https://tiktok.com/@${cleanHandle}`;
    case 'YouTube':
      return `https://youtube.com/@${cleanHandle}`;
    case 'X':
      return `https://x.com/${cleanHandle}`;
    default:
      return cleanHandle;
  }
}

/* =============================================================================
 * Favoritos
 * ============================================================================= */

export async function toggleFavorite(resultId: string) {
  const { data, error } = await supabase.rpc('alternar_favorito', {
    p_result_id: resultId,
  });

  if (error) throw error;
  return data as boolean;
}

export async function getUserFavorites(userId: string) {
  const { data, error } = await supabase
    .from('favoritos')
    .select('*, result:resultados(*)')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}
