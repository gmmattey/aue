import React, { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeAudio, AudioMudoError, AudioVazioError, type AudioMetrics } from './engine';
import { julgarSeEhArroto, pontuacaoLiberada } from './juiz/julgarSeEhArroto';
import { microfoneJaLiberado } from './microfoneJaLiberado';
import { parciaisAcusticas } from './rules';
import {
  criarBatalha,
  getProfile,
  apelidoEhPadrao,
  supabase,
  type ResultadoRow,
} from '../../db/supabase';
import { useShareResult } from './useShareResult';
import { CampoDeNome } from './fluxo/CampoDeNome';
import { MS_DA_SAIDA } from './fluxo/bolhaQueOuve';
import { TelaDeConvite } from './fluxo/TelaDeConvite';
import { EstilosDoFluxo } from './fluxo/EstilosDoFluxo';
import { TelaDeGravacao } from './fluxo/TelaDeGravacao';
import { TelaDeJulgamento } from './fluxo/TelaDeJulgamento';
import { TelaDeMicrofoneBloqueado } from './fluxo/TelaDeMicrofoneBloqueado';
import { TelaNaoEhArroto } from './fluxo/TelaNaoEhArroto';
import { TelaSemSom } from './fluxo/TelaSemSom';
import { ResultadoScreen } from './resultado/ResultadoScreen';
import { mensagemDeFalhaAoCompartilhar } from './resultado/mensagemDeFalhaAoCompartilhar';
/*
  CAPTURA, ENVIO E PERSISTÊNCIA moram em `hooks/`, e não mais aqui.

  Este arquivo era dono do microfone, do banco, do Storage e do feed ao mesmo
  tempo, e os dois bugs que chegaram em produção nasceram nesse bolo.

  Quem envia, apaga e decide o que entregar ao consumidor é o
  `useEnvioDoResultado`, único dono daqueles nove estados. Quem abre o
  microfone, cronometra e — principalmente — SOLTA o stream em todo caminho de
  saída é o `useGravacao`. O que sobra aqui é a orquestração dos dois, a análise
  acústica e a tela.
*/
import { useEnvioDoResultado } from './hooks/useEnvioDoResultado';
import { SEGUNDOS_DE_GRAVACAO, useGravacao } from './hooks/useGravacao';
import { mensagemDeFalhaNaAnalise } from './mensagemDeFalhaNaAnalise';
import { guardarUltimaBatalha, lerUltimaBatalha } from '../battle/ultimaBatalha';

interface AudioRecorderProps {
  /**
   * Recebe a linha JÁ PERSISTIDA pelo servidor (com score e classificação
   * oficiais). Antes recebia apenas o `ScoreResult` local, e o consumidor
   * gravava um SEGUNDO resultado — duplicando linha e XP.
   */
  onRecordingComplete?: (dbResult: ResultadoRow) => void;
  hideChallengeButton?: boolean;
  /**
   * O consumidor só aceita resultado COM áudio.
   *
   * Existe porque `onRecordingComplete` disparava mesmo com o upload falhado, e
   * os três consumidores publicam o resultado onde OUTRA pessoa vai ouvir. O
   * gate do botão de desafiar fechava só o lado de quem cria a batalha; quem
   * respondia continuava entrando mudo, que é o mesmo defeito do outro lado.
   *
   * NÃO é `true` por padrão, e a exceção é a disputa presencial: ali as cinco
   * pessoas estão na mesma sala e já OUVIRAM o arroto ao vivo — o áudio é
   * registro, não o produto. Travar o turno até o upload dar certo pararia a
   * mesa num churrasco com sinal ruim. Nos dois fluxos remotos (`/b/` e `/d/`)
   * o amigo abriu o link exatamente para ouvir, então lá o áudio é obrigatório.
   */
  exigeAudio?: boolean;
  /**
   * "Quem chegou aqui já pediu para gravar — não peça de novo."
   *
   * Ligado pela Home e pelo microfone do rodapé, que SÃO o convite para gravar.
   * Sem isto, tocar na bolha levava a uma tela cujo único conteúdo útil era
   * outro botão com o mesmo rótulo: dois toques, mesma intenção.
   *
   * NÃO é "grave sempre que montar". A abertura automática só acontece quando
   * `microfoneJaLiberado()` responde que sim — ver o efeito lá embaixo e o
   * arquivo `microfoneJaLiberado.ts` para o motivo de a resposta ser
   * conservadora. Quem nunca liberou o microfone continua vendo o botão, e é o
   * toque dessa pessoa que abre o pedido de permissão.
   *
   * Os três consumidores que embutem o gravador dentro de um cartão (batalha,
   * desafio e disputa presencial) NÃO passam esta prop: lá a pessoa chegou para
   * ouvir ou para esperar a vez, e um microfone abrindo sozinho seria captura
   * que ninguém pediu.
   */
  autoIniciar?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  hideChallengeButton,
  exigeAudio,
  autoIniciar,
}) => {
  /**
   * Só a ANÁLISE acústica, e não o envio.
   *
   * Era um `ocupado` com dois escritores (a análise e o envio). Com o envio no
   * hook, um `setOcupado` exportado devolveria estado compartilhado com dois
   * donos — e o `finally` de um caminho desligaria o indicador do outro. Cada
   * lado passa a ser dono do seu, e quem junta os pedaços é `etapa`, mais
   * abaixo — leitura derivada, sem terceiro dono.
   */
  const [analisando, setAnalisando] = useState(false);
  /**
   * O erro DESTE componente: análise acústica e link da batalha.
   *
   * A permissão de microfone saiu daqui junto com a captura — hoje ela é o
   * `gravacao.erro`. Os erros do envio e da gravação também são dos seus hooks,
   * e a tela mostra os três no mesmo `<p role="alert">` sem que nenhum se perca
   * (ver `mensagemDeErro`, mais abaixo).
   */
  const [erro, setErro] = useState<string | null>(null);

  const [metricas, setMetricas] = useState<AudioMetrics | null>(null);
  /**
   * A gravação não tinha som para julgar (`AudioMudoError`/`AudioVazioError`).
   *
   * É um estado à parte, e não uma inspeção da string de `erro`, porque só ele
   * troca a TELA: silêncio ganha `TelaSemSom` (a onda achatada, "Coé, não
   * peguei nada aí." e o botão de gravar de novo), enquanto uma falha
   * inesperada de análise continua sendo uma linha de alerta na tela inicial.
   * Ler a mensagem para decidir isso amarraria o roteamento de tela à redação
   * da copy — e a #57 acabou de reescrever as duas.
   */
  const [gravacaoSemSom, setGravacaoSemSom] = useState(false);
  /**
   * Teve som, o juiz ouviu, e não era arroto (#19).
   *
   * Estado próprio, e não um reaproveitamento de `gravacaoSemSom`, pela mesma
   * razão que aquele não é uma inspeção da string de `erro`: ele troca a TELA,
   * e a tela que ele abre diz uma coisa DIFERENTE. Ver `TelaNaoEhArroto` para
   * por que "não peguei nada aí" seria mentira neste caso.
   *
   * Só o veredito NEGATIVO chega aqui. Modelo que não carregou, WebGL que caiu
   * ou navegador sem Web Audio devolvem `indisponivel`, que `pontuacaoLiberada`
   * deixa passar — o fluxo segue exatamente como era antes de o juiz existir.
   */
  const [naoEhArroto, setNaoEhArroto] = useState(false);
  /**
   * A pessoa tocou em "PARAR" e o `onstop` do MediaRecorder ainda não chegou.
   *
   * A JANELA É CURTA E ERA REAL: `parar()` marca `gravando` como falso na hora,
   * mas o evento `stop` é assíncrono no navegador de verdade. Sem este estado,
   * naquele intervalo não havia gravação, não havia métricas e não havia
   * análise — a tela caía na etapa inicial e piscava o botão "Gravar meu Auê"
   * entre o toque em PARAR e o julgamento.
   *
   * No teste isso não aparece: o `MediaRecorder` dublado dispara `onstop`
   * sincronamente. É exatamente o tipo de defeito que só existe no aparelho.
   */
  const [finalizando, setFinalizando] = useState(false);
  const [linkDesafio, setLinkDesafio] = useState<string | null>(null);
  /*
    Lido uma vez, na montagem: é `localStorage`, não muda sozinho, e ler a cada
    render faria acesso síncrono a disco em toda troca de etapa da gravação.
  */
  const [batalhaGuardada] = useState(() => lerUltimaBatalha());

  /** Por que o compartilhamento do sistema não rolou. Ver `compartilharNota`. */
  const [erroAoCompartilhar, setErroAoCompartilhar] = useState<string | null>(null);

  const [temSessao, setTemSessao] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [nomeExibicao, setNomeExibicao] = useState('');
  /**
   * Apelido que o perfil tem hoje, ou `null` enquanto não se sabe.
   *
   * Existe para responder "esta pessoa já escolheu como quer aparecer?" — que
   * é a pergunta que decide se o campo de nome aparece. Ver
   * `apelidoEhPadrao` em `db/supabase.ts`.
   */
  const [apelidoAtual, setApelidoAtual] = useState<string | null>(null);
  /** `profiles.e_premium`. Assinante não vê anúncio na tela de resultado. */
  const [ehPremium, setEhPremium] = useState(false);

  const { shareResult } = useShareResult();

  /**
   * O que se faz com o áudio depois que o microfone já foi solto.
   *
   * A ANÁLISE FICOU AQUI, e não entrou no `useGravacao`, por três razões:
   * aquele hook existe por causa de RECURSO que vaza, e `analyzeAudio` não
   * segura recurso nenhum (é função pura sobre um Blob) — metê-la lá diluiria o
   * único invariante que justifica o arquivo; o sucesso dela leva à tela de
   * julgamento, que é UI, e de dentro do hook isso exigiria um callback de volta
   * assim mesmo ou um `useEffect` novo sobre `metricas`; e `metricas` já é
   * entrada do envio, como `analisando` já é um dos ramos de `etapa`. A quarta
   * razão — por que o corte é no `onstop` — está escrita lá, no ponto do corte.
   *
   * Deps vazias: só chama setter, então é estável — que é o que
   * `ParametrosDaGravacao.aoTerminar` pede.
   */
  const aoTerminarGravacao = useCallback(async (blob: Blob) => {
    setAnalisando(true);
    try {
      // Só a análise acústica acontece aqui. O envio espera a origem, que é
      // perguntada logo em seguida — ela pesa 10% do score e define
      // `is_artificial`, então não dá para enviar antes de saber.
      const medidas = await analyzeAudio(blob);

      /*
        O JUIZ DA #19, e ele roda DEPOIS da análise acústica de propósito.

        `analyzeAudio` é o caminho barato e derruba silêncio em milissegundos
        (`AudioMudoError`). Rodar o YAMNet antes gastaria uma inferência inteira
        — o item mais caro do fluxo — para julgar sala vazia.

        A ORDEM TAMBÉM É A DA MENSAGEM CERTA: quem gravou silêncio precisa ouvir
        "não peguei nada", não "isso não foi arroto". O detector só opina sobre
        gravação que TEM som.

        Ele não decide nota nenhuma e não toca na fórmula: `medidas` chega
        intacto do outro lado. O que ele decide é se essas medidas chegam a
        virar nota.
      */
      const veredito = await julgarSeEhArroto(blob);
      if (!pontuacaoLiberada(veredito)) {
        setNaoEhArroto(true);
        return;
      }

      // Guardar as métricas é o que leva à tela de julgamento: lá elas viram as
      // quatro barras REAIS e a pergunta da origem. Não existe mais uma folha
      // para abrir (`setMostrarOrigem`) — a pergunta é a própria tela.
      setMetricas(medidas);
    } catch (err) {
      console.error('Falha ao analisar o áudio', err);
      setErro(mensagemDeFalhaNaAnalise(err));
      /*
        Os dois erros de `engine.ts` significam a mesma coisa para quem gravou:
        não havia arroto ali. Só eles ganham tela própria; qualquer outra falha
        (decodificação, Web Audio indisponível) continua sendo alerta na tela
        inicial, porque a pessoa não tem o que corrigir chegando mais perto do
        microfone.
      */
      setGravacaoSemSom(err instanceof AudioMudoError || err instanceof AudioVazioError);
    } finally {
      setAnalisando(false);
      // A espera pelo `onstop` acabou — ele é justamente quem chamou isto aqui.
      setFinalizando(false);
    }
  }, []);

  /*
    A captura inteira: MediaRecorder, stream, pedaços, cronômetro e o blob. Os
    cinco refs e as quatro funções de liberação vivem lá dentro, num arquivo só,
    porque o invariante é "todo caminho de saída solta o stream" e ele precisa
    ser LEGÍVEL de uma vez.

    As três ações são desestruturadas pelo mesmo motivo documentado para
    `reiniciar`, logo abaixo: o objeto é um literal novo a cada render, os campos
    não — e são eles que entram nos arrays de deps.
  */
  const gravacao = useGravacao({ aoTerminar: aoTerminarGravacao });
  const {
    iniciar: iniciarGravacao,
    parar: pararGravacao,
    descartar: descartarGravacao,
  } = gravacao;

  /*
    O envio inteiro, com os nove estados que só ele usa. `blobRef` desce COMO
    REF, e não como valor — o porquê está em `ParametrosDoEnvio`. A única coisa
    que mudou é a PROCEDÊNCIA do ref: ele nasce dentro do `useGravacao` e sai de
    lá como o mesmo objeto render após render, então nada em `tiposDoEnvio.ts`
    nem em `executarEnvio.ts` precisou ser tocado.
  */
  const envio = useEnvioDoResultado({
    metricas,
    userId,
    temSessao,
    nomeExibicao,
    blobRef: gravacao.blobRef,
    exigeAudio,
    onRecordingComplete,
    aoGravarApelido: setApelidoAtual,
  });

  /*
    `reiniciar` é desestruturado, e os outros campos não, por um motivo de
    identidade: ele é a única coisa do hook que entra em array de deps.

    Ele é estável (useCallback com deps vazias); o objeto `envio` é um literal
    novo a cada render. Depender do OBJETO — que é o que o lint pede quando se
    escreve `envio.reiniciar()` — faria `comecarGravacao` e `tentarDeNovo`
    trocarem de identidade todo render, e o aviso viraria ruído que alguém
    silencia com um disable.
  */
  const { reiniciar: reiniciarEnvio } = envio;

  /* ---------------------------------------------------------------------- */
  /* Sessão                                                                  */
  /*                                                                         */
  /* Desde o login anônimo (`shared/auth/sessaoAnonima.ts`), `temSessao` é    */
  /* praticamente sempre verdadeiro — a sessão é criada no boot, sem tela.    */
  /* Ele deixou de significar "a pessoa se cadastrou" e passou a significar   */
  /* "dá para gravar áudio no Storage", que é o que o resto do arquivo usa.   */
  /*                                                                         */
  /* Falso continua sendo possível e continua sendo tratado: é o modo         */
  /* degradado de quando o provedor anônimo está desligado no painel do       */
  /* Supabase. Nenhum ramo `!temSessao` foi apagado por isso.                 */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    let ativo = true;

    const aplicar = (uid: string | null) => {
      if (!ativo) return;
      setTemSessao(Boolean(uid));
      setUserId(uid);
      if (!uid) {
        setApelidoAtual(null);
        setEhPremium(false);
        return;
      }
      // Falhar aqui é inofensivo PARA O APELIDO: sem apelido conhecido o campo
      // de nome aparece, que é o lado seguro do erro (pedir de novo, não sumir).
      //
      // Para `e_premium` o lado seguro seria o oposto — na dúvida, não mostrar
      // anúncio a quem talvez tenha pago. Fica em `false` mesmo assim, e a
      // razão é que o outro lado é pior: um erro de rede transitório esconderia
      // o anúncio de TODO mundo, e a receita sumiria sem ninguém perceber.
      // Enquanto não existir assinatura não existe assinante, e esta escolha
      // não machuca ninguém. Se a assinatura entrar um dia, isto vira decisão
      // de produto de verdade.
      getProfile(uid)
        .then((p) => {
          if (!ativo) return;
          setApelidoAtual(p.apelido ?? null);
          setEhPremium(Boolean(p.e_premium));
        })
        .catch(() => {
          if (!ativo) return;
          setApelidoAtual(null);
          setEhPremium(false);
        });
    };

    supabase.auth.getSession().then(({ data }) => aplicar(data.session?.user?.id ?? null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      aplicar(sessao?.user?.id ?? null);
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Gravação                                                                */
  /* ---------------------------------------------------------------------- */

  /**
   * O que o botão de gravar chama.
   *
   * Atravessa os dois domínios, igual a `tentarDeNovo`: aqui limpa o que é da
   * tela, e `iniciar` limpa a fatia do microfone. Os quatro setters ficam FORA
   * do hook de propósito — um `aoIniciar` no parâmetro só serviria para o hook
   * mandar de volta uma limpeza que ele não entende, e dobraria a superfície do
   * contrato para nada.
   *
   * Síncrono e ANTES do `getUserMedia`, exatamente na ordem que
   * `iniciarGravacao` já tinha.
   */
  const comecarGravacao = useCallback(() => {
    setErro(null);
    setMetricas(null);
    setGravacaoSemSom(false);
    setNaoEhArroto(false);
    setFinalizando(false);
    setLinkDesafio(null);
    /*
      O aviso de compartilhamento também morre aqui, e faltava. `tentarDeNovo`
      já o limpava; este caminho não, então um "seu navegador não abre o
      compartilhamento do sistema" da gravação anterior reaparecia colado na
      nota NOVA, falando de um toque que ninguém deu nesta tela.
    */
    setErroAoCompartilhar(null);
    reiniciarEnvio();
    void iniciarGravacao();
  }, [iniciarGravacao, reiniciarEnvio]);

  /**
   * ABERTURA AUTOMÁTICA — o toque que sobrava.
   *
   * Roda UMA VEZ por montagem, e é isso que o `jaTentouAbrirSozinho` garante.
   * Sem ele, terminar uma gravação devolveria a etapa 'inicio' e o efeito
   * abriria o microfone de novo sozinho, prendendo a pessoa num laço de
   * gravação que ela não pediu. Depois da primeira, quem manda é o botão.
   *
   * `ativo` cobre a desmontagem no meio da consulta de permissão: sair da aba
   * antes de a promessa voltar não pode abrir microfone num componente que já
   * saiu da tela.
   *
   * Não entra em `etapa` nem em nenhum estado derivado: a decisão é "esta tela
   * acabou de ser aberta a pedido de alguém?", e isso é conhecido na montagem.
   */
  const jaTentouAbrirSozinho = useRef(false);
  useEffect(() => {
    if (!autoIniciar || jaTentouAbrirSozinho.current) return;
    jaTentouAbrirSozinho.current = true;

    let ativo = true;
    void microfoneJaLiberado().then((liberado) => {
      if (ativo && liberado) comecarGravacao();
    });

    return () => {
      ativo = false;
    };
  }, [autoIniciar, comecarGravacao]);

  /**
   * Abre a batalha e devolve o link para mandar ao amigo.
   *
   * Passou a criar uma BATALHA (`/b/CODIGO`, 20260807000030) em vez de um
   * desafio (`/d/CODIGO`). A diferença para quem usa: o desafio aceitava UMA
   * resposta e travava para sempre; a batalha fica em loop — o amigo responde,
   * você responde de volta, e mais gente pode entrar pelo mesmo link.
   *
   * `createChallenge` continua existindo em `db/supabase.ts` e continua
   * servindo os links `/d/` que já circularam. Ele só não é mais chamado aqui.
   */
  /**
   * VOLTAR PARA A BOLHA sem gravar nada: limpa a tela, solta o microfone e
   * esquece o blob.
   *
   * É o "Tentar de novo" da tela de resultado (`btn-tentar-de-novo` do
   * protótipo) e também o "Cancelar" das telas de gravação, julgamento e sem
   * som. Um verbo só para "descartar o que está em curso e voltar ao começo".
   *
   * NÃO começa a gravar sozinho: pedir o microfone no toque de um botão escrito
   * "tentar de novo" abriria o prompt do navegador sem a pessoa ter pedido para
   * gravar, e num aparelho onde ela negou a permissão antes o toque
   * simplesmente falharia. Quem grava de novo é `comecarGravacao`, e ele tem
   * botão próprio em cada tela onde faz sentido.
   *
   * O resultado anterior CONTINUA no banco, com nota, XP e áudio. Isto é
   * navegação, não desfazer — o que já subiu se apaga no botão de apagar áudio,
   * que diz o que faz.
   */
  const tentarDeNovo = useCallback(() => {
    // Atravessa os TRÊS domínios: aqui limpa o que é da tela, `descartar` solta
    // o microfone e esquece o blob, e `reiniciar` limpa a fatia do envio — sem
    // que nenhum dos três precise enxergar o estado do outro.
    //
    // Era `blobRef.current = null` escrito daqui. Escrever no ref alheio é a
    // mesma família do "estadoAudio escrivível de qualquer lugar" que o passo
    // anterior fechou com tipo; agora a escrita mora com o dono.
    setErro(null);
    setMetricas(null);
    setGravacaoSemSom(false);
    setNaoEhArroto(false);
    setFinalizando(false);
    setLinkDesafio(null);
    setErroAoCompartilhar(null);
    descartarGravacao();
    reiniciarEnvio();
  }, [descartarGravacao, reiniciarEnvio]);

  /**
   * "PARAR": para o gravador e ASSUME a espera pelo `onstop`.
   *
   * Os dois passos moram juntos porque são o mesmo gesto — quem toca em PARAR
   * não volta para a etapa inicial nem por um quadro.
   */
  /**
   * A SAIDA DA GRAVACAO — os 150 ms em que a bolha comprime e segura (#56).
   *
   * A issue exige que "PARAR, timeout e fim automatico usem o MESMO caminho.
   * Nada de cada saida inventar uma vida diferente". Por isso o gatilho nao
   * esta em `finalizarGravacao`: aquilo cobre so o botao. O ponto por onde as
   * tres saidas passam obrigatoriamente e `gravacao.gravando` indo de true
   * para false — e e nele que este efeito escuta.
   *
   * Sem esta pausa a tela de gravacao desmonta no mesmo quadro em que o
   * microfone fecha, e a bolha que estava reagindo ao arroto some no ar. A
   * pausa e o que fecha o gesto: ela comprime, segura, e so entao a proxima
   * tela entra.
   */
  const [saindoDaGravacao, setSaindoDaGravacao] = useState(false);
  const gravavaAntes = useRef(false);

  useEffect(() => {
    const parouAgora = gravavaAntes.current && !gravacao.gravando;
    gravavaAntes.current = gravacao.gravando;
    if (!parouAgora) return;

    setSaindoDaGravacao(true);
    const timer = window.setTimeout(() => setSaindoDaGravacao(false), MS_DA_SAIDA);
    /*
      O clearTimeout NAO e formalidade: `tentarDeNovo` e `descartar` podem
      desmontar esta arvore dentro da janela de 150 ms, e um setState depois
      disso vaza. Tambem cobre o caso de a pessoa gravar de novo antes de a
      saida terminar — o timer velho morre com o efeito.
    */
    return () => window.clearTimeout(timer);
  }, [gravacao.gravando]);

  const finalizarGravacao = useCallback(() => {
    setFinalizando(true);
    pararGravacao();
  }, [pararGravacao]);

  const gerarDesafio = useCallback(async () => {
    // Só LÊ a linha do envio, nunca escreve nela: por isso continua aqui.
    if (!envio.linhaSalva) return;
    try {
      const codigo = await criarBatalha(envio.linhaSalva.id);
      setLinkDesafio(`${window.location.origin}/b/${codigo}`);
      /*
        Guardado ANTES de qualquer coisa poder dar errado na tela: a batalha já
        existe no banco neste ponto, e como não há — nem pode haver — lista de
        batalhas, este bilhete é a única forma de o criador reencontrar o
        endereço depois de fechar a aba.
      */
      guardarUltimaBatalha(codigo);
    } catch (err) {
      console.error('Falha ao criar a batalha', err);
      setErro('Não foi possível gerar o link da batalha.');
    }
  }, [envio.linhaSalva]);

  /**
   * Compartilha o cartão da nota pela folha nativa do sistema.
   *
   * O RETORNO É SEMPRE TRATADO, e agora por uma função só. Antes o hook engolia
   * todo erro num `console.error`, e tocar no botão num navegador sem Web Share
   * API não fazia nada e não dizia nada. Depois passou a ter um `if` aqui, que
   * cobria os cinco casos da união por acidente de escrita — o quinto caso novo
   * cairia no `else` errado sem ninguém notar. Quem decide o texto de cada caso
   * é `mensagemDeFalhaAoCompartilhar`, que percorre a união inteira e tem teste.
   *
   * `null` apaga o aviso: é o caso de sucesso e o de a pessoa fechar a folha.
   */
  const compartilharNota = useCallback(async () => {
    const resposta = await shareResult({
      elementId: 'score-card',
      url: linkDesafio,
      titulo: 'Meu Auê',
      texto: linkDesafio ? 'Te desafiei no Auê. Tenta bater essa.' : 'Olha a nota do meu Auê!',
    });

    setErroAoCompartilhar(mensagemDeFalhaAoCompartilhar(resposta));
  }, [linkDesafio, shareResult]);

  /* ---------------------------------------------------------------------- */
  /* Interface                                                               */
  /* ---------------------------------------------------------------------- */

  /**
   * A ETAPA DO FLUXO, derivada — nunca um estado à parte.
   *
   * O componente desenhava tudo de uma vez: botão, campo de nome, aviso de
   * permissão, erro e resultado empilhados na mesma coluna, e o "julgamento"
   * era o rótulo do botão virando "Julgando...". O recorte MVP1 do protótipo
   * (`index-mvp1.html`) descreve uma jornada de telas, e é ela que está aqui.
   *
   * Estado derivado, e não um `useState('etapa')`, pelo motivo de sempre: dois
   * donos para a mesma verdade sempre dessincronizam. A etapa é uma LEITURA do
   * que os dois hooks e a análise já dizem.
   *
   * A ORDEM DOS RAMOS É A REGRA. Resultado ganha de tudo (a nota já existe);
   * gravar ganha do resto (o microfone está aberto); silêncio vem antes do
   * julgamento porque não há o que julgar; e a permissão negada só aparece
   * quando não há nada em curso — negada a permissão, não existem métricas nem
   * blob para disputar a tela.
   *
   * ESTA DERIVAÇÃO É O QUE PROTEGE O `blobRef`. Antes, o botão de gravar ficava
   * sempre na tela e um `disabled` impedia que uma segunda gravação zerasse o
   * blob debaixo de um envio em curso. Agora o botão nem existe fora da etapa
   * inicial, e a etapa inicial exclui, por construção, os quatro estados em que
   * há algo em curso — inclusive `finalizando`, que cobre a espera pelo
   * `onstop`. Não afrouxar nenhum dos ramos por isso.
   */
  const etapa:
    | 'inicio'
    | 'gravando'
    | 'julgando'
    | 'sem-som'
    | 'nao-e-arroto'
    | 'microfone-bloqueado'
    | 'resultado' = envio.resultado
    ? 'resultado'
    : gravacao.gravando || saindoDaGravacao
      ? 'gravando'
      : gravacaoSemSom
        ? 'sem-som'
        : /*
            O VEREDITO VEM ANTES DE 'julgando' pelo mesmo motivo que 'sem-som'
            vem: não há o que julgar. As duas recusas ficam vizinhas na ordem, e
            'sem-som' fica na frente porque é a mais específica — silêncio nunca
            chega a ser ouvido pelo juiz (ver `aoTerminarGravacao`), então as
            duas nunca são verdadeiras ao mesmo tempo e a ordem entre elas é
            documentação, não desempate.
          */
          naoEhArroto
          ? 'nao-e-arroto'
          : finalizando || analisando || metricas
            ? 'julgando'
            : gravacao.permissaoNegada
              ? 'microfone-bloqueado'
              : 'inicio';

  /**
   * As quatro parciais medidas, ou `null` enquanto a análise corre.
   *
   * É o que a tela de julgamento desenha nas barras. Vem de
   * `parciaisAcusticas`, e não de `calculateScore`, porque a nota ainda NÃO
   * existe neste ponto: ela depende da origem, que é justamente o que estamos
   * perguntando. Chamar `calculateScore` com uma origem qualquer só para
   * aproveitar as parciais faria a tela escolher origem por conta própria.
   */
  const parciais = metricas ? parciaisAcusticas(metricas) : null;

  /**
   * Erro do envio, do microfone OU da tela, no mesmo lugar de sempre.
   *
   * A cadeia de três é fiel porque no máximo UM dos locais é não-nulo em
   * qualquer instante, e a ordem do `??` não chega a ser observável:
   * `comecarGravacao` zera o daqui e `iniciar` zera o do hook no mesmo clique;
   * negada a permissão, só o do hook fala; concedida, o do hook zera e só a
   * análise pode falar; o erro do link só existe depois de um resultado, que
   * exige gravação bem-sucedida.
   *
   * A precedência continua sendo do envio pelo motivo de sempre: ele é o mais
   * recente, e quando fala os outros dois já são provadamente nulos.
   */
  const mensagemDeErro = envio.erro ?? gravacao.erro ?? erro;

  /**
   * Pedimos o nome enquanto ele ainda for o que o banco inventou.
   *
   * Vale também quando `apelidoAtual` é `null` — sem sessão, ou quando o perfil
   * não pôde ser lido. É o lado seguro do erro: perguntar de novo é chato,
   * sumir com o campo faz a pessoa entrar na batalha sem nome nenhum.
   */
  const precisaEscolherNome = apelidoEhPadrao(apelidoAtual);

  return (
    /*
      A caixa externa NÃO ganhou `flex: 1`, e isso é decisão de vizinhança: o
      AudioRecorder é usado dentro de um cartão na batalha (`BattleView`), no
      desafio (`ChallengeView`) e na disputa presencial. Esticá-lo mudaria o
      layout daquelas três telas, que são território de outra gente. As telas do
      fluxo se dimensionam pelo conteúdo — dentro do cartão elas ocupam o que
      precisam, e na tela solta o `.screen` do app já centraliza.
    */
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <EstilosDoFluxo />

      {etapa === 'gravando' && (
        <TelaDeGravacao
          msRestantes={gravacao.msRestantes}
          segundosTotais={SEGUNDOS_DE_GRAVACAO}
          frequencias={gravacao.frequencias}
          saindo={saindoDaGravacao}
          onFinalizar={finalizarGravacao}
          onCancelar={tentarDeNovo}
        />
      )}

      {etapa === 'julgando' && (
        <TelaDeJulgamento
          parciais={parciais}
          enviando={envio.enviando}
          /*
            A ORIGEM VAI DIRETO PARA O ENVIO, sem passar por estado de tela.
            Antes havia uma folha para fechar antes de enviar; hoje a tela de
            julgamento É a pergunta, então não há visibilidade para administrar
            — e some junto o caminho em que fechar a folha pelo scrim deixava o
            fluxo pendurado esperando uma origem que ninguém ia escolher.
          */
          onEscolherOrigem={(tipo, subtipo) => void envio.enviar(tipo, subtipo)}
          onDescartar={tentarDeNovo}
          campoDeNome={
            precisaEscolherNome ? (
              <CampoDeNome
                valor={nomeExibicao}
                onMudar={setNomeExibicao}
                desabilitado={envio.enviando}
              />
            ) : undefined
          }
        />
      )}

      {etapa === 'microfone-bloqueado' && (
        <TelaDeMicrofoneBloqueado onTentarNovamente={comecarGravacao} />
      )}

      {etapa === 'sem-som' && (
        <TelaSemSom
          /*
            `erro` é sempre não-nulo aqui: `gravacaoSemSom` só vira verdadeiro no
            mesmo `catch` que escreve a mensagem. A alternativa cobre o caso
            impossível sem inventar diagnóstico.
          */
          mensagem={erro ?? 'Não saiu som nenhum nessa gravação.'}
          onTentarDeNovo={comecarGravacao}
          onCancelar={tentarDeNovo}
        />
      )}

      {/*
        O juiz ouviu e recusou. Os dois botões são os mesmos da `TelaSemSom` e
        vão para os mesmos lugares — o desfecho é o mesmo ("isso não vira
        nota"), só o motivo é outro.
      */}
      {etapa === 'nao-e-arroto' && (
        <TelaNaoEhArroto onTentarDeNovo={comecarGravacao} onCancelar={tentarDeNovo} />
      )}

      {/*
        A ação vem ANTES do campo de nome. O campo era o primeiro elemento da
        tela: quem tocava no convite da Home ("Gravar meu Auê") chegava aqui e
        a primeira coisa pedida era um apelido opcional, com o botão de gravar
        empurrado para baixo. O rótulo é o mesmo do convite da Home de
        propósito — antes eram dois nomes ("Gravar meu Auê" e "Gravar o Auê")
        para a mesma ação.

        O BOTÃO SÓ EXISTE NA ETAPA INICIAL. Ele acumulava três rótulos
        ("Gravar meu Auê", "Julgando...", "Gravar de novo") e convivia, na tela
        de resultado, com o "Tentar de novo" das ações — dois botões de nomes
        quase iguais e efeitos diferentes, um começando a gravar na hora e o
        outro só voltando para a bolha. O protótipo tem um. Ficou o "Tentar de
        novo" da tela de resultado, que é onde a pessoa está olhando.
      */}
      {etapa === 'inicio' && (
        <TelaDeConvite
          onArrotar={comecarGravacao}
          /*
            A tela NAO troca enquanto o navegador pergunta — o prompt nativo
            aparece por cima e a #72/#69 exigem que o que esta atras nao pule.
            Por isso o estado desce por prop em vez de virar uma etapa nova.
          */
          pedindoPermissao={gravacao.pedindoPermissao}
        />
      )}

      {/*
        O caminho de volta para a batalha que este aparelho criou. Não afirma
        que ela está viva — o prazo real mora no servidor e quem diz a verdade é
        a própria página `/b/`, inclusive quando ela venceu. Aqui é só o
        endereço que a pessoa perderia ao fechar a aba.
      */}
      {etapa === 'inicio' && batalhaGuardada && (
        <a
          href={`/b/${batalhaGuardada.codigo}`}
          style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}
        >
          Você criou uma batalha. Abrir de novo →
        </a>
      )}

      {/*
        O CAMPO DE NOME NÃO MORA MAIS AQUI. Ele era o segundo elemento da tela
        inicial — quem tocava na bolha da Home caía num botão mais um
        formulário, antes de ter arrotado uma vez.

        Mudou de lugar, não de existência: hoje é `CampoDeNome`, dentro da tela
        de julgamento, onde a pessoa já está parada esperando o veredito. A
        condição continua a mesma (`precisaEscolherNome`), e o motivo de ele não
        poder ir para ainda mais tarde — a tela de resultado — está escrito lá.
      */}

      {/*
        O BOTÃO DE RESGATE ("Escolher a origem") FOI EMBORA, e o que ele
        resgatava também.

        Ele existia porque a folha de origem podia ser fechada pelo scrim, e
        fechá-la deixava o fluxo parado com métricas na mão e nenhuma pergunta
        na tela. O botão devolvia a folha — mas só aparecia com
        `aguardandoOrigem && !mostrarOrigem && !ocupado`, ou seja, era um
        segundo caminho que dependia de acertar três condições.

        Hoje a pergunta é a TELA de julgamento, e ela não fecha: enquanto
        houver métricas sem resultado, `etapa` é 'julgando' e as opções estão
        ali. Não há estado em que a origem seja necessária e invisível, que é o
        que o resgate cobria. A saída deliberada (`Descartar essa`) continua
        existindo dentro daquela tela.
      */}

      {/*
        O AVISO DE PERMISSÃO NEGADA virou tela (`TelaDeMicrofoneBloqueado`), com
        os três passos do protótipo. Era uma linha de 13px em cinza que dizia a
        verdade e não ajudava ninguém a sair de lá.

        O alerta abaixo é suprimido nas duas etapas que já mostram a mesma
        informação em tela cheia — sem isso, a mensagem apareceria duas vezes, e
        o leitor de tela a anunciaria duas vezes.
      */}
      {mensagemDeErro && etapa !== 'sem-som' && etapa !== 'nao-e-arroto' && etapa !== 'microfone-bloqueado' && (
        <p
          role="alert"
          /*
            `fx-erro-tecnico`: pulso de opacidade, SEM deslocamento. A #72 pede
            que a reação do erro técnico seja MENOR que a do áudio vazio, e o
            motivo está escrito lá — "o produto que falhou, não o usuário".
            Sacudir a tela quando o microfone foi tomado por outro app culparia
            quem não errou.

            `minHeight` de duas linhas: é o anti-dominó da #69. "Fiquei sem o
            microfone." cabe numa linha e a mensagem de permissão não — sem a
            reserva, a segunda linha empurraria o que está acima no instante em
            que a pessoa está lendo.
          */
          className="fx-erro-tecnico"
          style={{ fontSize: 13.5, color: 'var(--danger)', minHeight: '2.8em', margin: 0 }}
        >
          {mensagemDeErro}
        </p>
      )}

      {/*
        A TELA DE RESULTADO inteira, em `resultado/`. Ela era ~390 linhas de JSX
        aqui dentro e empurrava este arquivo para 1102 linhas — o AudioRecorder
        desenhava a tela E era dono do microfone, do upload e do banco.

        Tudo desce por prop: o ResultadoScreen não importa `db/supabase` a não
        ser pelo TIPO da linha, não lê `FLAGS` e não tem efeito nenhum. Quem
        grava, envia, apaga, cria a batalha e compartilha continua sendo este
        arquivo.

        `compartilharNota` fica aqui por um motivo específico, e não por
        simetria: ele chama `shareResult({ elementId: 'score-card' })`, que
        resolve o nó por `document.getElementById`. Quem compartilha e quem
        desenha o cartão não precisam se conhecer — e empurrar o `useShareResult`
        para dentro do ResultadoScreen colocaria import dinâmico de html2canvas
        dentro de um componente puro.
      */}
      {etapa === 'resultado' && envio.resultado && (
        <ResultadoScreen
          resultado={envio.resultado}
          linhaSalva={envio.linhaSalva}
          estadoAudio={envio.estadoAudio}
          motivoFalhaAudio={envio.motivoFalhaAudio}
          apagandoAudio={envio.apagandoAudio}
          erroAoApagar={envio.erroAoApagar}
          onApagarAudio={envio.apagarAudio}
          linkDesafio={linkDesafio}
          escondeDesafio={hideChallengeButton}
          exigeAudio={exigeAudio}
          onDesafiar={gerarDesafio}
          onCompartilhar={compartilharNota}
          onTentarDeNovo={tentarDeNovo}
          erroAoCompartilhar={erroAoCompartilhar}
          isPremium={ehPremium}
        />
      )}

      {/*
        NOTA DE ENVIO — decisão de produto do Luiz: não há caixa de consentimento
        nem opt-in. O áudio sobe e fica público, e o aviso é esta nota, exibida
        ANTES de qualquer gravação, sempre visível.

        Por isso o texto é literal e não usa eufemismo. "Compartilhar com a
        comunidade" descreveria a mesma coisa e esconderia o que importa.

        REESCRITO NA 20260807000028. O texto anterior dizia "fica em um endereço
        público" — verdade enquanto o bucket era público, e MENTIRA depois que
        ele passou a ser privado com URL assinada de 5 minutos. Mas trocar por
        "seu áudio fica protegido" seria a mentira oposta e pior: a chave
        anônima do app é pública, então qualquer pessoa continua conseguindo
        ouvir qualquer arroto não escondido, com ou sem conta. O que mudou é que
        o áudio passou a ser REVOGÁVEL, não secreto.

        ENCURTADO NO CORTE DO MVP, por duas razões:

        1. Os dois ramos ("com conta" / "sem conta") deixaram de fazer sentido.
           Com o login anônimo todo mundo cai no primeiro, e o segundo passou a
           descrever uma falha de configuração, não uma escolha do usuário.
        2. Quatro linhas de texto acima do botão de gravar, num produto cuja
           promessa é "toca na bolha e arrota", é onde a pessoa desiste. O
           parágrafo inteiro migrou para /privacidade — não foi apagado, mudou
           de lugar. O que fica aqui é o que precisa ser lido ANTES de gravar.

        O que NÃO pode sumir daqui, e por isso está travado no smoke test:
        "qualquer pessoa consegue ouvir", "mesmo sem conta" e a possibilidade de
        apagar. Sem esses três, isto vira eufemismo.

        SOME EM DUAS ETAPAS, e só nelas: gravando e julgando. Nas duas o
        microfone já foi aberto, então o aviso não informa mais decisão nenhuma
        — e, no meio de uma tela cheia, um rodapé com borda sobre privacidade
        vira ruído em cima de quem está contando dez segundos. Ele continua
        aparecendo em TODA etapa onde ainda existe um botão de gravar: início,
        microfone bloqueado e sem som. "Antes de qualquer gravação" segue
        valendo palavra por palavra.
      */}
      {etapa !== 'gravando' && etapa !== 'julgando' && (
      <p
        style={{
          fontSize: 12,
          lineHeight: 1.5,
          color: 'var(--muted)',
          marginTop: 'var(--space-2)',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--border)',
        }}
      >
        Ao gravar, seu áudio fica guardado no Auê e qualquer pessoa consegue
        ouvir pelo app, mesmo sem conta. Você pode apagar depois.{' '}
        {/*
          Link comum, não `<Link>` do react-router, por dois motivos: a página
          de privacidade é uma leitura isolada (recarregar não custa nada), e
          este componente é renderizado em teste FORA de qualquer Router — um
          `<Link>` ali lançaria.
        */}
        <a href="/privacidade" style={{ color: 'var(--muted)', textDecoration: 'underline' }}>
          Como isso funciona
        </a>
      </p>
      )}
    </div>
  );
};
