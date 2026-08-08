import React, { useCallback, useEffect, useState } from 'react';
import { analyzeAudio, type AudioMetrics } from './engine';
import { type Origin } from './rules';
import {
  criarBatalha,
  getProfile,
  apelidoEhPadrao,
  supabase,
  type ResultadoRow,
} from '../../db/supabase';
import { FLAGS } from '../../shared/flags';
import { useShareResult } from './useShareResult';
import { OriginSheet } from './OriginSheet';
import { ResultadoScreen } from './resultado/ResultadoScreen';
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
import { useGravacao } from './hooks/useGravacao';
import { mensagemDeFalhaNaAnalise } from './mensagemDeFalhaNaAnalise';

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
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  hideChallengeButton,
  exigeAudio,
}) => {
  /**
   * Só a ANÁLISE acústica, e não o envio.
   *
   * Era um `ocupado` com dois escritores (a análise e o envio). Com o envio no
   * hook, um `setOcupado` exportado devolveria estado compartilhado com dois
   * donos — e o `finally` de um caminho desligaria o indicador do outro. Cada
   * lado passa a ser dono do seu, e a tela lê o OR (ver `ocupado`, mais abaixo).
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
  const [mostrarOrigem, setMostrarOrigem] = useState(false);
  const [linkDesafio, setLinkDesafio] = useState<string | null>(null);

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
  /** `profiles.is_premium`. Assinante não vê anúncio na tela de resultado. */
  const [ehPremium, setEhPremium] = useState(false);

  const { shareResult } = useShareResult();

  /**
   * O que se faz com o áudio depois que o microfone já foi solto.
   *
   * A ANÁLISE FICOU AQUI, e não entrou no `useGravacao`, por três razões:
   * aquele hook existe por causa de RECURSO que vaza, e `analyzeAudio` não
   * segura recurso nenhum (é função pura sobre um Blob) — metê-la lá diluiria o
   * único invariante que justifica o arquivo; o sucesso dela abre a folha de
   * origem, que é UI, e de dentro do hook isso exigiria um callback de volta
   * assim mesmo ou um `useEffect` novo sobre `metricas`; e `metricas` já é
   * entrada do envio, como `analisando` já é metade do `ocupado`. A quarta razão
   * — por que o corte é no `onstop` — está escrita lá, no ponto do corte.
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
      setMetricas(await analyzeAudio(blob));
      setMostrarOrigem(true);
    } catch (err) {
      console.error('Falha ao analisar o áudio', err);
      setErro(mensagemDeFalhaNaAnalise(err));
    } finally {
      setAnalisando(false);
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
      // Para `is_premium` o lado seguro seria o oposto — na dúvida, não mostrar
      // anúncio a quem talvez tenha pago. Fica em `false` mesmo assim, e a
      // razão é que o outro lado é pior: um erro de rede transitório esconderia
      // o anúncio de TODO mundo, e a receita sumiria sem ninguém perceber.
      // Enquanto `FLAGS.assinatura` estiver desligada não existe assinante, e
      // esta escolha não machuca ninguém. Quando a assinatura entrar, isto vira
      // decisão de produto de verdade.
      getProfile(uid)
        .then((p) => {
          if (!ativo) return;
          setApelidoAtual(p.apelido ?? null);
          setEhPremium(Boolean(p.is_premium));
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
    setLinkDesafio(null);
    reiniciarEnvio();
    void iniciarGravacao();
  }, [iniciarGravacao, reiniciarEnvio]);

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
   * "Tentar de novo" — o terceiro botão do protótipo (`btn-tentar-de-novo`),
   * que no app não existia.
   *
   * No protótipo ele é um link para `gravacao.html`. Aqui gravação e resultado
   * são a MESMA tela, então voltar significa limpar o resultado e devolver a
   * Bolha — e é só isso que ele faz. NÃO começa a gravar sozinho: pedir o
   * microfone no toque de um botão escrito "tentar de novo" abriria o prompt do
   * navegador sem a pessoa ter pedido para gravar, e num aparelho onde ela
   * negou a permissão antes o toque simplesmente falharia.
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
    setLinkDesafio(null);
    setErroAoCompartilhar(null);
    setMostrarOrigem(false);
    descartarGravacao();
    reiniciarEnvio();
  }, [descartarGravacao, reiniciarEnvio]);

  const gerarDesafio = useCallback(async () => {
    // Só LÊ a linha do envio, nunca escreve nela: por isso continua aqui.
    if (!envio.linhaSalva) return;
    try {
      const codigo = await criarBatalha(envio.linhaSalva.id);
      setLinkDesafio(`${window.location.origin}/b/${codigo}`);
    } catch (err) {
      console.error('Falha ao criar a batalha', err);
      setErro('Não foi possível gerar o link da batalha.');
    }
  }, [envio.linhaSalva]);

  /**
   * Compartilha o cartão da nota pela folha nativa do sistema.
   *
   * O retorno passou a ser tratado: antes o hook engolia todo erro num
   * `console.error`, então tocar no botão num navegador sem Web Share API não
   * fazia nada e não dizia nada. Cancelar é silêncio (a pessoa mudou de
   * ideia); os outros casos falam.
   */
  const compartilharNota = useCallback(async () => {
    const resposta = await shareResult({
      elementId: 'score-card',
      url: linkDesafio,
      titulo: 'Meu Auê',
      texto: linkDesafio ? 'Te desafiei no Auê. Tenta bater essa.' : 'Olha a nota do meu Auê!',
    });

    if (resposta.ok || resposta.motivo === 'cancelado') {
      setErroAoCompartilhar(null);
      return;
    }

    setErroAoCompartilhar(
      resposta.motivo === 'indisponivel'
        ? 'Seu navegador não abre o compartilhamento do sistema. Use os botões abaixo.'
        : 'Não foi possível compartilhar agora. Use os botões abaixo.',
    );
  }, [linkDesafio, shareResult]);

  /* ---------------------------------------------------------------------- */
  /* Interface                                                               */
  /* ---------------------------------------------------------------------- */

  const aguardandoOrigem = Boolean(metricas) && !envio.resultado;

  /**
   * O "Julgando..." da tela, que é UM indicador com duas origens.
   *
   * Derivado, e não estado: análise e envio nunca são verdadeiros ao mesmo
   * tempo (o envio só começa depois da origem escolhida, que só é perguntada
   * depois da análise terminar), então o OR é fiel ao que existia antes.
   *
   * Não afrouxar o `disabled` que sai daqui: é ele que impede uma segunda
   * gravação zerar o `blobRef` debaixo de um envio em curso.
   */
  const ocupado = analisando || envio.enviando;

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
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/*
        A ação vem ANTES do campo de nome. O campo era o primeiro elemento da
        tela: quem tocava no convite da Home ("Gravar meu Auê") chegava aqui e
        a primeira coisa pedida era um apelido opcional, com o botão de gravar
        empurrado para baixo. O rótulo é o mesmo do convite da Home de
        propósito — antes eram dois nomes ("Gravar meu Auê" e "Gravar o Auê")
        para a mesma ação.
      */}
      {!gravacao.gravando ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={comecarGravacao}
          disabled={ocupado}
        >
          {ocupado ? 'Julgando...' : envio.resultado ? 'Gravar de novo' : 'Gravar meu Auê'}
        </button>
      ) : (
        <button type="button" className="btn btn-primary" onClick={pararGravacao}>
          Parar ({gravacao.segundosRestantes}s)
        </button>
      )}

      {precisaEscolherNome && !envio.resultado && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {/*
            A condição era `!temSessao`, e ela deixou de funcionar: com o login
            anônimo toda visita tem sessão, então o campo simplesmente sumia da
            tela e todo mundo aparecia na batalha como "Arrotador a1b2c3".

            A pergunta certa nunca foi sobre sessão — é se a pessoa já escolheu
            como quer aparecer. Quem já escolheu não é perguntado de novo; quem
            nunca escolheu é perguntado, com ou sem cadastro.

            O texto anterior falava do ranking ("o ranking só lista quem tem
            conta"). O ranking saiu do corte do MVP, e prometer ou negar coisas
            sobre uma tela que não existe é ruído. O que o nome faz hoje é
            aparecer na batalha.
          */}
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            Seu nome na batalha (opcional) — é assim que os amigos vão te ver
          </span>
          <input
            type="text"
            value={nomeExibicao}
            maxLength={40}
            onChange={(evento) => setNomeExibicao(evento.target.value)}
            placeholder="Como quer aparecer?"
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--fg)',
              font: 'inherit',
            }}
          />
        </label>
      )}

      {aguardandoOrigem && !mostrarOrigem && !ocupado && (
        <button type="button" className="btn btn-secondary" onClick={() => setMostrarOrigem(true)}>
          Escolher a origem
        </button>
      )}

      {/*
        O parágrafo fica AQUI, e não no hook: `permissaoNegada` é fato do
        microfone, mas o aviso é tela.
      */}
      {gravacao.permissaoNegada && (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          O navegador bloqueou o microfone. Libere a permissão e toque em gravar de novo.
        </p>
      )}

      {mensagemDeErro && (
        <p role="alert" style={{ fontSize: 13.5, color: 'var(--danger)' }}>
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
      {envio.resultado && (
        <ResultadoScreen
          resultado={envio.resultado}
          linhaSalva={envio.linhaSalva}
          estadoAudio={envio.estadoAudio}
          motivoFalhaAudio={envio.motivoFalhaAudio}
          postadoNoFeed={envio.postadoNoFeed}
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
          /*
            A flag é lida AQUI e desce como booleano. Um componente de
            apresentação que consulta configuração global deixa de ser função das
            próprias props e só dá para testar mockando módulo.
          */
          mostrarXp={FLAGS.xp && Boolean(envio.linhaSalva?.user_id)}
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
      */}
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

      <OriginSheet
        isOpen={mostrarOrigem}
        onClose={() => setMostrarOrigem(false)}
        /*
          Fechar a folha vem ANTES do envio, na mesma ordem de sempre — só
          mudou de lugar. Visibilidade de folha é UI: o hook não precisa saber
          que existe uma.
        */
        onSelectOrigin={(tipo, subtipo) => {
          setMostrarOrigem(false);
          void envio.enviar(tipo as Origin, subtipo);
        }}
      />
    </div>
  );
};
