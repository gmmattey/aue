import { readdirSync, readFileSync } from 'node:fs';
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
 * ainda não aceita audio/mp4", o áudio nunca subia, `resultados.caminho_do_audio`
 * ficava NULL, e quem abria o link do desafio via "esta rodada não tem áudio
 * salvo". Nenhum erro em lugar nenhum — só um arroto que não existe.
 *
 * A divergência é invisível em qualquer teste que não compare as duas fontes, e
 * invisível no navegador de quem desenvolve (Chrome grava `audio/webm`, que
 * sempre esteve nas duas listas). Só aparece num iPhone de verdade.
 *
 * VARRE TODAS AS MIGRAÇÕES em vez de ler a 000032 pelo nome. Fixar o arquivo
 * reproduziria o próprio defeito num degrau acima: uma migração futura mexeria
 * na lista do bucket, o teste continuaria lendo a 000032, passaria verde, e
 * cliente e banco divergiriam de novo em silêncio.
 */

const DIR_MIGRACOES = fileURLToPath(new URL('../../supabase/migrations', import.meta.url));

/**
 * A última declaração de `allowed_mime_types` do bucket `audio_records`.
 *
 * Trabalha por INSTRUÇÃO, e não por arquivo ou por linha, porque as duas formas
 * usadas até hoje são diferentes: a 000013 declara a lista dentro de um
 * `INSERT ... VALUES`, e a 000032 num `UPDATE ... SET`. Casar só o `= ARRAY[`
 * enxergaria a segunda e seria cega para um `INSERT` novo.
 *
 * Tira os comentários `--` antes de varrer: os cabeçalhos deste projeto citam
 * MIMEs em prosa, e a 000032 chega a mostrar um `select allowed_mime_types`
 * de exemplo. Comentário não é declaração.
 */
function mimesDeclaradosNoBanco(): { arquivo: string; mimes: string[] } {
  const arquivos = readdirSync(DIR_MIGRACOES)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let ultima: { arquivo: string; mimes: string[] } | null = null;

  for (const arquivo of arquivos) {
    const sql = readFileSync(`${DIR_MIGRACOES}/${arquivo}`, 'utf8').replace(/--[^\n]*/g, '');

    for (const instrucao of sql.split(';')) {
      if (!instrucao.includes('audio_records')) continue;
      if (!instrucao.includes('allowed_mime_types')) continue;

      const array = /ARRAY\s*\[([^\]]*)\]/i.exec(instrucao);
      if (!array) continue;

      const mimes = [...array[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
      if (mimes.length) ultima = { arquivo, mimes };
    }
  }

  if (!ultima) {
    throw new Error(
      'Nenhuma migração declara allowed_mime_types para o bucket audio_records. ' +
        'Se a forma da declaração mudou, este parser precisa mudar junto.',
    );
  }

  return ultima;
}

describe('allowed_mime_types — o cliente espelha a última migração do bucket', () => {
  it('a declaração vigente aceita os formatos do iPhone', () => {
    // Ancora o teste no motivo dele existir: uma reversão da 000032 falha aqui,
    // com o nome do formato, em vez de só num diff de conjuntos.
    const { mimes } = mimesDeclaradosNoBanco();
    expect(mimes).toEqual(expect.arrayContaining(['audio/mp4']));
  });

  it('as duas listas têm exatamente os mesmos formatos', () => {
    const { arquivo, mimes } = mimesDeclaradosNoBanco();
    const noBanco = [...mimes].sort();
    const noCliente = [...MIMES_ACEITOS_PELO_BUCKET].sort();

    // Igualdade, não `arrayContaining` nos dois sentidos: um formato a MAIS no
    // cliente é tão ruim quanto um a menos — sobe os bytes para o Storage
    // recusar depois, que é exatamente o que a lista existe para evitar.
    expect(noCliente, `divergiu de ${arquivo}`).toEqual(noBanco);
  });

  it('todo formato aceito sabe virar uma extensão de arquivo', () => {
    // `enviarAudioDoResultado` monta o caminho com `EXTENSAO_POR_MIME[mime]`.
    // Um formato aceito sem entrada aqui geraria `<uid>/<id>.undefined`.
    for (const mime of MIMES_ACEITOS_PELO_BUCKET) {
      expect(EXTENSAO_POR_MIME[mime], `sem extensão para ${mime}`).toBeTruthy();
    }
  });
});
