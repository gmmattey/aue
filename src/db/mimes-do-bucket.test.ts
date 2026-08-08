import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { EXTENSAO_POR_MIME, MIMES_ACEITOS_PELO_BUCKET } from './supabase';

/**
 * O cliente tem uma cópia do `allowed_mime_types` do bucket, e as duas listas
 * precisam ser a MESMA lista.
 *
 * POR QUE ISTO EXISTE. A 20260807000032 acrescentou `audio/mp4` ao bucket para
 * consertar o iPhone, e o iPhone continuou quebrado — porque a lista do cliente
 * não foi junto. O cliente recusa ANTES de falar com o Storage, então enquanto
 * as duas divergissem quem valia era a mais restrita: o Safari recebia "o Auê
 * ainda não aceita audio/mp4", o áudio nunca subia, `resultados.audio_path`
 * ficava NULL, e quem abria o link do desafio via "esta rodada não tem áudio
 * salvo". Nenhum erro em lugar nenhum — só um arroto que não existe.
 *
 * A divergência é invisível em qualquer teste que não compare as duas fontes,
 * e invisível no navegador de quem desenvolve (Chrome grava `audio/webm`, que
 * sempre esteve nas duas listas). Só aparece num iPhone de verdade.
 *
 * Segue o método de `rules.formula.test.ts`: lê o SQL da migração como texto,
 * em vez de confiar que alguém lembrou de atualizar os dois lados.
 */

const CAMINHO_DA_MIGRACAO = fileURLToPath(
  new URL('../../supabase/migrations/20260807000032_audio_do_iphone.sql', import.meta.url),
);

const SQL = readFileSync(CAMINHO_DA_MIGRACAO, 'utf8');

/**
 * Extrai os literais de dentro do `SET allowed_mime_types = ARRAY[...]`.
 *
 * Recorta o bloco do ARRAY antes de varrer, e não o arquivo inteiro: o
 * cabeçalho da migração cita `audio/mp4` e `audio/webm` em prosa, e varrer tudo
 * faria o teste passar com a lista comentada e o `UPDATE` errado.
 */
function mimesDeclaradosNaMigracao(): string[] {
  const bloco = /allowed_mime_types\s*=\s*ARRAY\s*\[([^\]]*)\]/i.exec(SQL);
  if (!bloco) throw new Error('Não achei o ARRAY de allowed_mime_types na 20260807000032.');

  return [...bloco[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe('allowed_mime_types — o cliente espelha o bucket da migração 000032', () => {
  it('a migração declara os formatos do iPhone', () => {
    // Ancora o teste no motivo dele existir: se alguém reverter a migração,
    // este caso falha com o nome do formato, não com um diff de conjuntos.
    expect(mimesDeclaradosNaMigracao()).toEqual(expect.arrayContaining(['audio/mp4']));
  });

  it('as duas listas têm exatamente os mesmos formatos', () => {
    const noBanco = [...mimesDeclaradosNaMigracao()].sort();
    const noCliente = [...MIMES_ACEITOS_PELO_BUCKET].sort();

    // Igualdade, não `arrayContaining` nos dois sentidos: um formato a MAIS no
    // cliente é tão ruim quanto um a menos — sobe os bytes para o Storage
    // recusar depois, que é exatamente o que a lista existe para evitar.
    expect(noCliente).toEqual(noBanco);
  });

  it('todo formato aceito sabe virar uma extensão de arquivo', () => {
    // `enviarAudioDoResultado` monta o caminho com `EXTENSAO_POR_MIME[mime]`.
    // Um formato aceito sem entrada aqui geraria `<uid>/<id>.undefined`.
    for (const mime of MIMES_ACEITOS_PELO_BUCKET) {
      expect(EXTENSAO_POR_MIME[mime], `sem extensão para ${mime}`).toBeTruthy();
    }
  });
});
