import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Trava do fechamento feito em 20260807000034.
 *
 * O DEFEITO QUE ESTE ARQUIVO EXISTE PARA IMPEDIR
 * ----------------------------------------------
 * `public.resultados` e `public.desafios` nasceram (20260807000000) com
 * `CREATE POLICY ... FOR SELECT USING (true)` — herança do MVP anônimo, quando
 * `resultados` guardava só nota e classificação. A 20260807000010 recriou as
 * duas policies, agora também para `authenticated`.
 *
 * Em 20260807000027 a tabela ganhou `audio_path`. A partir daí, aquela policy
 * deixou de ser "o feed é público" e virou outra coisa: com a chave anônima —
 * que é pública e vai no bundle — um único
 *
 *     GET /rest/v1/resultados?select=id,audio_path
 *
 * devolvia o catálogo de áudios do sistema inteiro, e `createSignedUrl` em cada
 * caminho entregava os arquivos. Sem código de batalha, sem link, sem prazo.
 * Isso atropela a regra de link privado (docs/jogo/REGRAS.md §5) e o princípio
 * "segurança e privacidade
 * vencem a piada".
 *
 * A 20260807000034 derrubou as duas policies. Este teste existe porque a
 * regressão é FÁCIL e SILENCIOSA: qualquer migração futura que precise "só
 * deixar o feed voltar a funcionar" reabre o catálogo inteiro sem que nada
 * falhe, e nenhum teste de unidade do app enxerga o banco.
 *
 * COMO A TRAVA FUNCIONA
 * ---------------------
 * Não há Postgres neste ambiente. Igual a
 * `deriva-de-funcoes.migracoes.test.ts`, este arquivo LÊ
 * os arquivos de migração e simula, na ordem de aplicação, quais policies de
 * SELECT ficam de pé nas duas tabelas ao fim da cadeia.
 *
 * LIMITE HONESTO
 * --------------
 * É análise de texto de arquivos versionados, não do banco. Uma policy criada à
 * mão pelo SQL Editor deixa este teste verde e o banco aberto. Ele impede a
 * regressão pelo caminho que já aconteceu — uma migração nova reabrindo a
 * leitura — e nada além disso.
 */

const DIR_MIGRACOES = fileURLToPath(new URL('../../supabase/migrations', import.meta.url));

/** Nomes de arquivo em ordem de aplicação (a versão é o prefixo numérico). */
function migracoes(): string[] {
  return readdirSync(DIR_MIGRACOES)
    .filter((nome) => nome.endsWith('.sql'))
    .sort();
}

/**
 * SQL com todo espaço em branco colapsado.
 *
 * As policies do repositório quebram linha entre `CREATE POLICY "..."` e
 * `ON public.tabela FOR SELECT`, então casar isso linha a linha não funciona.
 */
function normalizado(arquivo: string): string {
  return readFileSync(`${DIR_MIGRACOES}/${arquivo}`, 'utf8').replace(/\s+/g, ' ');
}

interface Evento {
  posicao: number;
  tipo: 'cria' | 'derruba';
  policy: string;
}

function eventosDePolicy(sql: string, tabela: string): Evento[] {
  const eventos: Evento[] = [];

  const criacao = new RegExp(
    `CREATE POLICY "([^"]+)" ON public\\.${tabela} FOR SELECT`,
    'gi',
  );
  // `DROP POLICY` não leva cláusula FOR: derruba a policy daquele nome, seja
  // ela de que comando for. Nomes que não estejam de pé simplesmente não casam
  // com nada no conjunto.
  const remocao = new RegExp(
    `DROP POLICY (?:IF EXISTS )?"([^"]+)" ON public\\.${tabela}`,
    'gi',
  );

  for (const m of sql.matchAll(criacao)) {
    eventos.push({ posicao: m.index ?? 0, tipo: 'cria', policy: m[1] });
  }
  for (const m of sql.matchAll(remocao)) {
    eventos.push({ posicao: m.index ?? 0, tipo: 'derruba', policy: m[1] });
  }

  // Ordem posicional, e não "todos os DROP e depois todos os CREATE": o padrão
  // do repositório é `DROP IF EXISTS` seguido de `CREATE` do MESMO nome, e
  // inverter isso apagaria a policy recém-criada.
  return eventos.sort((a, b) => a.posicao - b.posicao);
}

/** Policies de SELECT que sobram na tabela depois de aplicar a cadeia toda. */
function policiesDeLeituraVivas(tabela: string): { policy: string; migracao: string }[] {
  const vivas = new Map<string, string>();

  for (const arquivo of migracoes()) {
    for (const evento of eventosDePolicy(normalizado(arquivo), tabela)) {
      if (evento.tipo === 'cria') vivas.set(evento.policy, arquivo);
      else vivas.delete(evento.policy);
    }
  }

  return [...vivas].map(([policy, migracao]) => ({ policy, migracao }));
}

describe.each(['resultados', 'desafios'])(
  'public.%s não pode voltar a ser legível pelo cliente',
  (tabela) => {
    it('a cadeia de migrações realmente cria e derruba policies nesta tabela', () => {
      // Guarda contra o pior modo de falha de um teste de texto: os regexes
      // pararem de casar (tabela renomeada, estilo mudado) e o teste passar
      // por não encontrar nada.
      const houveEvento = migracoes().some(
        (arquivo) => eventosDePolicy(normalizado(arquivo), tabela).length > 0,
      );

      expect(
        houveEvento,
        `Nenhum CREATE/DROP POLICY para public.${tabela} foi encontrado nas migrações. ` +
          'Ou a tabela mudou de nome, ou o estilo das policies mudou e este teste virou ' +
          'decoração. Conserte os regexes antes de confiar no verde.',
      ).toBe(true);
    });

    it('nenhuma policy de SELECT sobrevive ao fim da cadeia', () => {
      const vivas = policiesDeLeituraVivas(tabela);

      expect(
        vivas,
        `public.${tabela} terminou a cadeia de migrações com policy de SELECT de pé: ` +
          `${vivas.map((v) => `"${v.policy}" (criada em ${v.migracao})`).join(', ')}. ` +
          'Isso reabre a leitura direta por PostgREST com a chave anônima — que é pública. ' +
          'Em `resultados` isso devolve o `audio_path` de TODO MUNDO, e o áudio sai atrás. ' +
          'Se alguma tela precisa desses dados, o caminho é uma RPC SECURITY DEFINER que ' +
          'receba a credencial do link (ver obter_batalha / obter_desafio), não uma policy nova.',
      ).toEqual([]);
    });
  },
);

/**
 * A armadilha silenciosa da 20260807000034.
 *
 * As policies de SELECT do bucket `audio_records` (20260807000028) perguntavam
 * `EXISTS (SELECT 1 FROM public.resultados ...)` DENTRO da própria expressão.
 * Expressão de policy é avaliada com o role de quem pede, então a RLS de
 * `resultados` também vale ali dentro — e, sem policy de SELECT, aquele EXISTS
 * não acha linha nenhuma.
 *
 * Efeito de deixar a forma antiga no ar: NINGUÉM consegue assinar áudio. O
 * fluxo principal do MVP1 (abrir o link da batalha e OUVIR) morre em silêncio,
 * com a tela dizendo educadamente que não há áudio.
 *
 * Por isso a policy precisa perguntar por função SECURITY DEFINER, que devolve
 * boolean e não depende de RLS.
 */
const POLICY_DO_AUDIO = 'CREATE POLICY "Audio is readable while not hidden" ON storage.objects';

function ultimaDefinicaoDaPolicyDoAudio(): { migracao: string; corpo: string } {
  const arquivos = migracoes().filter((arquivo) => normalizado(arquivo).includes(POLICY_DO_AUDIO));
  const ultima = arquivos[arquivos.length - 1];

  expect(ultima, `Nenhuma migração define ${POLICY_DO_AUDIO}.`).toBeDefined();

  const sql = normalizado(ultima);
  const inicio = sql.lastIndexOf(POLICY_DO_AUDIO);
  const fim = sql.indexOf(';', inicio);

  return { migracao: ultima, corpo: sql.slice(inicio, fim === -1 ? undefined : fim) };
}

describe('a policy de leitura do áudio não pode consultar public.resultados', () => {
  it('a ÚLTIMA definição pergunta por função, e não por SELECT na tabela', () => {
    const { migracao, corpo } = ultimaDefinicaoDaPolicyDoAudio();

    expect(
      corpo.includes('public.resultados'),
      `A última definição de "Audio is readable while not hidden" está em "${migracao}" e ainda ` +
        'consulta public.resultados dentro da expressão da policy. Como resultados não tem mais ' +
        'policy de SELECT, esse EXISTS não acha linha para anon e o áudio para de assinar para ' +
        'todo mundo — em silêncio. Use aue_audio_esta_visivel(), que é SECURITY DEFINER.',
    ).toBe(false);

    expect(
      corpo.includes('aue_audio_esta_visivel'),
      `A última definição de "Audio is readable while not hidden" ("${migracao}") não chama ` +
        'aue_audio_esta_visivel(). Sem esse predicado a policy deixa de gatear por is_hidden, e ' +
        'esconder um arroto por moderação para de ter efeito no caminho de leitura do arquivo.',
    ).toBe(true);
  });
});

/**
 * `responder_desafio` roda como dono da tabela, então NÃO passa pela policy de
 * UPDATE que checava a posse do resultado. A regra precisa ser reafirmada
 * dentro da função — e delegando a `pode_usar_como_desafiado`, não recopiando
 * o predicado.
 *
 * Recopiar corpo de função é o padrão que já custou duas regressões silenciosas
 * a este projeto; ver `deriva-de-funcoes.migracoes.test.ts`.
 */
const ASSINATURA_RESPONDER = /CREATE\s+(?:OR REPLACE\s+)?FUNCTION public\.responder_desafio\(/g;

/**
 * Onde começa a ÚLTIMA definição da função no arquivo, ou -1.
 *
 * Aceita `CREATE FUNCTION` e `CREATE OR REPLACE FUNCTION`. A trava anterior
 * exigia `OR REPLACE` e por isso PAROU DE ENXERGAR a 20260807000036, que
 * precisou derrubar a função para renomear os parâmetros: o teste continuou
 * verde conferindo a definição de 20260807000034, que já não era a que valia.
 * Guarda que não acompanha o schema é pior do que guarda nenhum, porque ele
 * também compra o silêncio de quem confiaria nele.
 */
function inicioDaUltimaDefinicao(sql: string): number {
  const ocorrencias = [...sql.matchAll(ASSINATURA_RESPONDER)];
  return ocorrencias.length === 0 ? -1 : (ocorrencias[ocorrencias.length - 1].index ?? -1);
}

describe('responder_desafio reafirma a posse que a policy fazia', () => {
  it('a ÚLTIMA definição é SECURITY DEFINER e delega a pode_usar_como_desafiado', () => {
    const arquivos = migracoes().filter(
      (arquivo) => inicioDaUltimaDefinicao(normalizado(arquivo)) >= 0,
    );
    const ultima = arquivos[arquivos.length - 1];

    expect(ultima, 'Nenhuma migração define public.responder_desafio.').toBeDefined();

    const sql = normalizado(ultima);
    const corpo = sql.slice(inicioDaUltimaDefinicao(sql));

    expect(
      /SECURITY DEFINER/i.test(corpo),
      `A definição de responder_desafio em "${ultima}" não é SECURITY DEFINER. Sem isso ela cai ` +
        'na RLS de desafios, que não tem mais policy de SELECT, e o duelo /d/CODIGO para de responder.',
    ).toBe(true);

    expect(
      corpo.includes('pode_usar_como_desafiado'),
      `A definição de responder_desafio em "${ultima}" não chama pode_usar_como_desafiado(). ` +
        'SECURITY DEFINER não passa por policy: sem essa chamada, qualquer pessoa responde um ' +
        'desafio com o resultado de outra.',
    ).toBe(true);
  });
});
