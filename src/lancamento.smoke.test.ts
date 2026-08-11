/**
 * Fumaça do corte de lançamento.
 *
 * Não testa lógica: testa que as telas MONTAM e que o que foi desligado
 * continua desligado. Cada asserção aqui corresponde a um problema real que já
 * esteve em produção-iminente e foi corrigido — a ideia é que voltar atrás
 * quebre o teste em vez de quebrar a confiança de quem usa.
 *
 * Renderização por `renderToStaticMarkup` em ambiente `node`: efeitos NÃO
 * rodam, então nada aqui toca rede ou banco. É exatamente o primeiro quadro
 * que o usuário vê.
 *
 * As chaves do Supabase vêm de `vitest.config.ts` (`test.env`) com valores
 * fictícios: `createClient` lança com URL vazia, e o módulo `db/supabase` é
 * importado em cadeia por quase toda tela.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ChallengeView } from './features/audio/ChallengeView';
import { BattleView } from './features/battle/BattleView';
import { TelaDesktop } from './features/desktop/TelaDesktop';
import { PoliticaDePrivacidade } from './features/legal/PoliticaDePrivacidade';
import { AudioPlayback } from './features/audio/AudioPlayback';
import { ReportButton } from './shared/components/ReportButton';
import { ConquistasScreen } from './features/gamification/ConquistasScreen';
import { RankingScreen } from './features/ranking/RankingScreen';
import { FeedScreen } from './features/community/FeedScreen';
import { AudioRecorder } from './features/audio/AudioRecorder';
import { HomeScreen } from './features/home/HomeScreen';
import { BottomNav } from './shared/components/BottomNav';
import { TelaDeConfiguracaoAusente } from './shared/components/TelaDeConfiguracaoAusente';
import { FLAGS } from './shared/flags';

describe('corte de lançamento', () => {
  it('nenhuma feature de fachada liga sozinha', () => {
    // Sem variável de ambiente, tudo desligado. Qual corte a produção publica é
    // outro assunto, e mora em `corte-de-producao.paridade.test.ts`.
    expect(FLAGS).toEqual({
      ligas: false,
      assinatura: false,
      push: false,
      gruposAvancados: false,
      feed: false,
      ranking: false,
      perfil: false,
      xp: false,
      loginSocial: false,
      disputaLocal: false,
      /*
        A roda dentro da Arena. Outra variável, de propósito: a de cima está
        ligada em produção governando a tela do fluxo velho, e reusar o nome
        ligaria a roda no ar sem ninguém ter rodado 5 pessoas × 3 rounds num
        telefone de verdade.
      */
      disputaNaArena: false,
      /*
        A Arena não é feature de fachada como as de cima — ela escolhe qual jogo
        a raiz serve, e a produção roda com ela LIGADA. Mas o padrão é o mesmo e
        por isso entra na mesma conta: sem variável, a raiz serve o fluxo velho.
        Ver `src/arena/aFlagSegura.test.ts`.
      */
      arena: false,
    });
  });

  it('ChallengeView monta dentro do app-shell, com marca e saída', () => {
    // O estado de carregamento e o de "não encontrado" já retornaram um `div`
    // solto, fora do `.app-shell`: sem cabeçalho, sem fundo escuro e sem
    // nenhum caminho de volta. É a porta de entrada do produto.
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/d/ABC123'] },
        createElement(
          Routes,
          null,
          createElement(Route, { path: '/d/:id', element: createElement(ChallengeView) }),
        ),
      ),
    );
    expect(html).toContain('app-shell');
    expect(html).toContain('Auê!');
  });

  it('BattleView monta dentro do app-shell, com marca e saída', () => {
    // Mesma exigência do ChallengeView, e pelo mesmo motivo: é porta de
    // entrada do produto. O link /b/CODIGO cai no WhatsApp de gente que nunca
    // abriu o app, e link errado ou batalha vencida caem no primeiro quadro.
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/b/K7M3PQ9XTR'] },
        createElement(
          Routes,
          null,
          createElement(Route, { path: '/b/:code', element: createElement(BattleView) }),
        ),
      ),
    );
    expect(html).toContain('app-shell');
    expect(html).toContain('Auê!');
  });

  it('a tela de desktop é conteúdo indexável, não um muro', () => {
    /*
      O Googlebot renderiza como desktop. Como o app é uma SPA sem HTML
      estático, ESTA tela é o único conteúdo que o buscador tem para indexar —
      se ela fosse só "abra no celular", seria isso que o Google mostraria a
      quem procura por arroto.

      Trava o mínimo: um h1 que descreve o produto, explicação de verdade, e a
      nota sobre celular como coadjuvante.
    */
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(TelaDesktop)),
    );
    expect(html).toContain('<h1');
    expect(html).toContain('arroto');
    expect(html).toContain('nota');
    expect(html).toContain('/privacidade');
  });

  it('a tela de desktop não deixa botão de instalar morto', () => {
    // Sem `beforeinstallprompt` capturado (o caso em teste, e o caso do
    // Firefox e do Safari), não pode haver botão que não faz nada: a pessoa
    // toca, nada acontece, e conclui que o site quebrou.
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(TelaDesktop)),
    );
    expect(html).not.toContain('Instalar o Auê');
  });

  it('a política não promete sigilo que o app não entrega', () => {
    // A chave anônima do app é pública: qualquer pessoa consegue ouvir
    // qualquer áudio não escondido. Se este texto virar "seu áudio é privado",
    // o app passa a mentir num documento legal.
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(PoliticaDePrivacidade)),
    );
    expect(html).toContain('não é um segredo');
    expect(html).toContain('O <strong>link</strong> de uma batalha');
  });

  it('ConquistasScreen sem sessão não inventa progresso', () => {
    // Havia uma lista fixa com 9 de 12 conquistas "desbloqueadas" servindo de
    // fallback para falha de rede E para ausência de sessão.
    const html = renderToStaticMarkup(createElement(ConquistasScreen, {}));
    expect(html).not.toContain('desbloqueadas');
    expect(html).not.toContain('Top 20');
    expect(html).not.toContain('Primeira vitória');
  });

  it('RankingScreen não tem filtro que não filtra', () => {
    // "Semana | Natural | Vitórias" trocavam de cor e nada mais: a consulta é
    // sempre a mesma view.
    const html = renderToStaticMarkup(createElement(RankingScreen));
    expect(html).not.toContain('Semana');
    expect(html).not.toContain('Vitórias');
  });

  it('FeedScreen anuncia que ali começa o feed', () => {
    const html = renderToStaticMarkup(createElement(FeedScreen, {}));
    expect(html).toContain('No feed agora');
  });

  it('falta de credencial vira tela explicada, não página em branco', () => {
    // `createClient` lança com URL vazia, e `db/supabase` é importado em
    // cadeia por quase toda tela: a exceção acontecia ANTES do primeiro
    // render. Um deploy sem as variáveis publicava um fundo branco mudo.
    const html = renderToStaticMarkup(
      createElement(TelaDeConfiguracaoAusente, { variavel: 'VITE_SUPABASE_URL' }),
    );
    expect(html).toContain('VITE_SUPABASE_URL');
    expect(html).toContain('não está configurado');
  });

  it('Home no corte é só o convite para gravar, sem feed', () => {
    // Com o login anônimo, TODA gravação passaria a virar post público no
    // feed automaticamente (`criarPostDeAudio`), sem ninguém escolher isso.
    // O feed sai do corte por decisão, e esta é a barreira visível dela.
    const html = renderToStaticMarkup(
      createElement(HomeScreen, { onGravar: () => {} }),
    );
    expect(html).toContain('ARROTAR');
    expect(html).not.toContain('No feed agora');
  });

  it('a barra de navegação do corte tem só Início e Arrotar', () => {
    // Ranking e Ligas não podem ser `display:none`: o botão não é renderizado.
    const html = renderToStaticMarkup(
      createElement(BottomNav, { activeTab: 'inicio', onTabChange: () => {} }),
    );
    expect(html).toContain('Início');
    expect(html).toContain('Arrotar');
    expect(html).not.toContain('Ranking');
    expect(html).not.toContain('Ligas');
  });

  it('a tela inicial do gravador é SÓ a ação — nenhum formulário antes do arroto', () => {
    /*
      HISTÓRIA DESTES DOIS TESTES, porque eles trocaram de lado.
      Antes exigiam que o campo de nome ESTIVESSE nesta tela (primeiro acima do
      botão, depois abaixo dele). O campo saiu daqui: quem toca na bolha da Home
      quer arrotar, e docs/jogo/REGRAS.md §1 pede nada de formulário antes da
      primeira nota. Agora o campo mora na tela de julgamento (`CampoDeNome`),
      que é depois do arroto e ainda antes do envio — o último instante em que a
      resposta chega a tempo de o servidor lê-la.

      Continua sendo o mesmo teste de sempre: a porta de entrada não pede nada.
    */
    const html = renderToStaticMarkup(createElement(AudioRecorder, {}));
    expect(html).toContain('ARROTAR');
    expect(html).not.toContain('Seu nome na batalha');
    expect(html).not.toContain('Como quer aparecer?');
    // Nenhum campo de texto, ponto — pega qualquer formulário novo que tente
    // voltar para cá, não só o do nome.
    expect(html).not.toContain('<input');
  });

  it('sem autoIniciar o gravador não abre o microfone sozinho', () => {
    /*
      Os três consumidores que embutem o gravador num cartão (batalha, desafio,
      disputa presencial) não passam `autoIniciar`, e nenhum deles pode ter o
      microfone abrindo por conta própria: na batalha e no desafio a pessoa
      chegou para OUVIR, e na disputa ela está esperando a vez de outro.

      A prova possível num render estático é que a etapa inicial continua sendo
      a do botão — a captura de fato depende de `getUserMedia`, que não existe
      aqui. O caminho com `autoIniciar` é coberto pelo teste do próprio
      `microfoneJaLiberado`, que é quem decide.
    */
    const html = renderToStaticMarkup(createElement(AudioRecorder, {}));
    expect(html).toContain('ARROTAR');
  });

  it('AudioPlayback sem áudio não desenha player nenhum', () => {
    // Um <audio controls> sem fonte válida desenha play, barra e tempo, e não
    // toca nada — o usuário conclui que o produto quebrou ou que a gravação
    // dele sumiu. Ausência de áudio é dita ou não é mostrada, nunca fingida.
    for (const audioPath of [null, undefined, '']) {
      const html = renderToStaticMarkup(
        createElement(AudioPlayback, { audioPath, rotulo: 'Arroto' }),
      );
      expect(html).not.toContain('<audio');
    }
  });

  it('AudioPlayback sem áudio explica quando a tela pede explicação', () => {
    const html = renderToStaticMarkup(
      createElement(AudioPlayback, {
        audioPath: null,
        rotulo: 'Arroto',
        textoQuandoNaoHa: 'Este desafio não tem áudio salvo — só a nota.',
      }),
    );
    expect(html).not.toContain('<audio');
    expect(html).toContain('só a nota');
  });

  it('AudioRecorder avisa, antes de gravar, que qualquer um consegue ouvir', () => {
    // Decisão de produto: não há caixa de consentimento. Esta nota é o único
    // aviso que o usuário recebe, então ela não pode sumir da tela nem virar
    // eufemismo.
    //
    // O bucket ficou privado na 20260807000028, mas a chave anônima do app é
    // pública: continua sendo verdade que qualquer pessoa ouve. Se alguém
    // trocar este texto por "seu áudio fica protegido", este teste cai.
    //
    // A nota encolheu no corte do MVP (os dois ramos com/sem conta deixaram de
    // fazer sentido com o login anônimo, e o parágrafo longo foi para
    // /privacidade). O que está travado aqui é o conteúdo mínimo, não a
    // redação: quem ouve, se precisa de conta, e que dá para apagar.
    const html = renderToStaticMarkup(createElement(AudioRecorder, {}));
    expect(html).toContain('qualquer pessoa consegue ouvir pelo app');
    expect(html).toContain('mesmo sem conta');
    expect(html).toContain('apagar');
    // E o aviso tem para onde levar quem quiser o detalhe.
    expect(html).toContain('/privacidade');
  });

  it('ReportButton sem sessão não finge que dá para denunciar', () => {
    // A policy de `denuncias` é TO authenticated desde a 20260807000023.
    // Oferecer o botão a quem está deslogado produziria um erro no clique.
    const html = renderToStaticMarkup(
      createElement(ReportButton, { resultId: 'res-1' }),
    );
    expect(html).toContain('Entre para denunciar');
    expect(html).toContain('disabled');
  });

  it('ReportButton com sessão oferece a denúncia', () => {
    // O caminho existia inteiro no banco desde a 20260807000014 e NUNCA teve
    // produtor em src/. Se este botão sumir, a moderação volta a ser teórica.
    const html = renderToStaticMarkup(
      createElement(ReportButton, { resultId: 'res-1', userId: 'user-1' }),
    );
    expect(html).toContain('Denunciar');
    expect(html).not.toContain('Entre para denunciar');
  });
});
