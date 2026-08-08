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
import { AudioPlayback } from './features/audio/AudioPlayback';
import { ReportButton } from './shared/components/ReportButton';
import { ConquistasScreen } from './features/gamification/ConquistasScreen';
import { RankingScreen } from './features/ranking/RankingScreen';
import { FeedScreen } from './features/community/FeedScreen';
import { AudioRecorder } from './features/audio/AudioRecorder';
import { FLAGS } from './shared/flags';

describe('corte de lançamento', () => {
  it('nenhuma feature de fachada liga sozinha', () => {
    // Sem variável de ambiente, tudo desligado. Um deploy "esquecido" já sai
    // com o corte correto.
    expect(FLAGS).toEqual({
      ligas: false,
      assinatura: false,
      push: false,
      gruposAvancados: false,
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

  it('AudioRecorder põe a ação antes do campo de nome', () => {
    // O primeiro elemento da tela era o campo de apelido opcional, com o botão
    // de gravar empurrado para baixo — para quem acabou de tocar em "Gravar
    // meu Auê" na Home.
    const html = renderToStaticMarkup(createElement(AudioRecorder, {}));
    const botao = html.indexOf('Gravar meu Auê');
    const campo = html.indexOf('Seu nome no desafio');
    expect(botao).toBeGreaterThan(-1);
    expect(campo).toBeGreaterThan(botao);
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
    // eufemismo. Sem sessão, o primeiro quadro é o ramo "sem conta".
    //
    // O bucket ficou privado na 20260807000028, mas a chave anônima do app é
    // pública: continua sendo verdade que qualquer pessoa ouve. Se alguém
    // trocar este texto por "seu áudio fica protegido", este teste cai.
    const html = renderToStaticMarkup(createElement(AudioRecorder, {}));
    expect(html).toContain('qualquer pessoa consegue ouvir pelo app');
    expect(html).toContain('mesmo sem conta');
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
