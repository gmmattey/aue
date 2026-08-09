import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * A trava da nomenclatura em português nas tabelas do MVP1.
 *
 * O PROBLEMA QUE ESTE ARQUIVO EXISTE PARA IMPEDIR
 * ------------------------------------------------
 * A 20260807000036 traduziu colunas, constraints e funções de `resultados`,
 * `desafios`, `batalhas`, `rodadas_batalha`, `participantes_batalha` e
 * `profiles` → `perfis`, e reescreveu o §2 do `docs/schema/nomenclatura.md`
 * para valer "colunas em português".
 *
 * Regra de nomenclatura não se defende sozinha. A forma mais provável de ela
 * se perder não é alguém discordar dela — é alguém copiar um bloco de SQL de
 * uma migração antiga (que continua no repositório, e continua correta para o
 * seu tempo) e colar num arquivo novo. Foi assim que a válvula de XP morreu
 * duas vezes; ver `features/gamification/deriva-de-funcoes.migracoes.test.ts`.
 *
 * COMO A TRAVA FUNCIONA
 * ---------------------
 * Migrações ATÉ a 20260807000036 são registro histórico e não são conferidas:
 * elas descrevem um schema que de fato existiu. A partir da PRÓXIMA migração,
 * nenhum identificador aposentado pode reaparecer.
 *
 * O QUE ELA DELIBERADAMENTE NÃO CONFERE
 * -------------------------------------
 * Nomes ambíguos ficam de fora: `created_at`, `user_id`, `result_id`,
 * `group_id`, `post_id`, `turn_order`, `avatar_url`. Todos continuam LEGÍTIMOS
 * nas 13 tabelas de features desligadas (`comentarios`, `posts_comunidade`,
 * `denuncias`, `favoritos`, `participantes_campeonato`…), que não entraram no
 * rename. Barrá-los pelo texto reprovaria migração correta — e um guarda que
 * grita errado é desligado, e aí não guarda mais nada.
 *
 * LIMITE HONESTO DESTA TRAVA
 * --------------------------
 * É análise de texto dos ARQUIVOS versionados, não do BANCO. Alguém que
 * renomeie uma coluna direto pelo SQL Editor passa por aqui sem encostar.
 */

const DIR_MIGRACOES = fileURLToPath(new URL('../../supabase/migrations', import.meta.url));

/** A migração que fez a tradução. Ela e as anteriores são história. */
const MIGRACAO_DA_TRADUCAO = '20260807000036';

/**
 * Identificadores aposentados que NÃO existem em nenhuma tabela fora do MVP1.
 * Reaparecer num arquivo novo é regressão, não ambiguidade.
 */
const APOSENTADOS = [
  // public.resultados
  'score', 'classification', 'is_artificial', 'duration', 'power', 'depth', 'texture',
  'origin_score', 'origin_type', 'origin_subtype', 'player_name', 'xp_earned',
  'is_xp_eligible', 'audio_path', 'is_hidden', 'is_moderation_locked',
  // public.desafios
  'challenger_result_id', 'challenged_result_id', 'resolved_at', 'winner',
  // public.batalhas
  'access_code', 'battle_type', 'venue_type', 'rounds_total', 'expires_at', 'finished_at',
  // public.rodadas_batalha
  'battle_id', 'round_number', 'participant_id',
  // public.perfis (ex-profiles)
  'is_premium', 'is_founder', 'notify_challenges', 'notify_ranking', 'notify_community',
  'instagram_handle', 'tiktok_handle', 'youtube_handle', 'twitter_handle',
  // Funções e RPCs
  'submit_resultado', 'can_use_as_challenger', 'can_use_as_challenged',
  'handle_new_user', 'protect_profile_stats', 'process_result_xp', 'update_profile_xp',
  'check_result_achievements', 'check_reports_and_hide', 'set_desafio_winner',
  'protect_desafio_fields', 'notify_push_event', 'toggle_follow', 'toggle_favorite',
  'toggle_reacao', 'create_social_post', 'get_championship_leaderboard',
  'get_user_conquistas_catalog',
] as const;

/** Migrações posteriores à tradução, em ordem de aplicação. */
function migracoesPosteriores(): string[] {
  return readdirSync(DIR_MIGRACOES)
    .filter((nome) => nome.endsWith('.sql'))
    .filter((nome) => nome.slice(0, MIGRACAO_DA_TRADUCAO.length) > MIGRACAO_DA_TRADUCAO)
    .sort();
}

function arquivoDaTraducao(): string {
  const nome = readdirSync(DIR_MIGRACOES).find((n) => n.startsWith(MIGRACAO_DA_TRADUCAO));
  expect(
    nome,
    `A migração ${MIGRACAO_DA_TRADUCAO} sumiu do repositório. Ela é a origem da regra ` +
      'que este arquivo defende — se ela foi revertida de propósito, apague este teste junto.',
  ).toBeDefined();
  return readFileSync(`${DIR_MIGRACOES}/${nome}`, 'utf8');
}

describe('nomenclatura PT-BR — as tabelas do MVP1 não voltam para o inglês', () => {
  it('a migração da tradução continua no repositório e renomeia profiles', () => {
    expect(arquivoDaTraducao()).toContain('ALTER TABLE public.profiles RENAME TO perfis');
  });

  it.each(APOSENTADOS)('nenhuma migração posterior reintroduz "%s"', (identificador) => {
    const reincidentes = migracoesPosteriores().filter((nome) =>
      new RegExp(`\\b${identificador}\\b`).test(readFileSync(`${DIR_MIGRACOES}/${nome}`, 'utf8')),
    );

    expect(
      reincidentes,
      `"${identificador}" foi aposentado pela ${MIGRACAO_DA_TRADUCAO} e reapareceu em ` +
        `${reincidentes.join(', ')}. Quase sempre isso é um bloco de SQL copiado de uma ` +
        'migração antiga. O nome novo está em docs/schema/nomenclatura.md §2 — e se a ' +
        'intenção era mesmo desfazer a tradução, este teste é o lugar de registrar a decisão.',
    ).toEqual([]);
  });
});

describe('nomenclatura PT-BR — as tabelas fora do MVP1 seguem em inglês', () => {
  /*
    Isto NÃO é aspiração: é o contrato do escopo. As 13 tabelas de features
    desligadas não entraram no rename, e uma migração futura que traduzisse
    metade delas deixaria o schema em três idiomas em vez de dois.

    Quando essas features voltarem ao escopo, elas viram uma migração própria e
    esta lista encolhe — de propósito, com alguém decidindo.
  */
  const FORA_DO_ESCOPO = [
    'comentarios', 'reacoes', 'grupos', 'membros_grupo', 'campeonatos',
    'participantes_campeonato', 'posts_comunidade', 'conquistas', 'conquistas_usuario',
    'seguidores', 'favoritos', 'denuncias', 'push_subscriptions',
  ] as const;

  it.each(FORA_DO_ESCOPO)('a migração da tradução não renomeia a tabela %s', (tabela) => {
    expect(
      new RegExp(`ALTER TABLE public\\.${tabela}\\s+RENAME TO`).test(arquivoDaTraducao()),
      `A ${MIGRACAO_DA_TRADUCAO} renomeia "${tabela}", que está fora do MVP1. O escopo ` +
        'combinado eram seis tabelas; traduzir as outras é decisão de produto, não de estilo.',
    ).toBe(false);
  });
});
