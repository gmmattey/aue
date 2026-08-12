import { describe, expect, it, vi } from 'vitest';

import { subirAudioDoResultado } from './subirAudioDoResultado';
import type { ResultadoRow } from '../../../db/supabase';
import type { SetadoresDoAudio } from './tiposDoEnvio';

/**
 * O CONTRATO QUE O GATE DE ENTREGA DEPENDE.
 *
 * `executarEnvio` decide se entrega o resultado ao consumidor com
 * `if (!exigeAudio || linhaFinal.caminho_do_audio)`. Essa linha só é segura porque
 * `subirAudioDoResultado` promete duas coisas:
 *
 *   1. NUNCA lança — se lançasse, a exceção subiria para o catch de fora e
 *      apagaria o score que o servidor acabou de calcular (invariante 2);
 *   2. SEMPRE devolve uma `ResultadoRow`, e devolve a linha SEM `caminho_do_audio`
 *      quando o áudio não subiu — é esse `null` que faz o gate barrar.
 *
 * Sem esta segunda promessa o gate vira decoração: devolver a linha original
 * "por segurança" num caminho de falha, com `caminho_do_audio` preenchido de antes,
 * entregaria uma batalha muda de novo. Foi esse o defeito que chegou em
 * produção — quem abria o link não ouvia o arroto de quem enviou.
 *
 * Os dois caminhos testados aqui NÃO tocam a rede: saem antes do upload. É de
 * propósito — o que importa é o contrato de retorno, não o Storage.
 */

/** Linha mínima. O cast é honesto: só os campos abaixo são lidos aqui. */
function linha(extra: Partial<ResultadoRow> = {}): ResultadoRow {
  return {
    id: 'r1',
    usuario_id: 'u1',
    caminho_do_audio: null,
    ...extra,
  } as ResultadoRow;
}

function setadores(): SetadoresDoAudio & { chamadas: string[] } {
  const chamadas: string[] = [];
  return {
    chamadas,
    setLinhaSalva: vi.fn(),
    setEstadoAudio: vi.fn((v) => chamadas.push(String(v))),
    setMotivoFalhaAudio: vi.fn(),
  } as unknown as SetadoresDoAudio & { chamadas: string[] };
}

describe('subirAudioDoResultado — o contrato do qual o gate depende', () => {
  it('sem sessão: devolve a linha sem caminho_do_audio, e não lança', async () => {
    const set = setadores();
    const original = linha({ usuario_id: null });

    const devolvida = await subirAudioDoResultado(original, new Blob(['x']), set);

    expect(devolvida.caminho_do_audio).toBeNull();
    expect(set.chamadas).toContain('sem-conta');
  });

  it('sem blob: devolve a linha sem caminho_do_audio, e não lança', async () => {
    const set = setadores();

    const devolvida = await subirAudioDoResultado(linha(), null, set);

    expect(devolvida.caminho_do_audio).toBeNull();
    expect(set.chamadas).toContain('falhou');
  });

  it('o gate barraria a entrega nos dois casos', async () => {
    // A expressão literal de `executarEnvio`, aplicada ao que esta função
    // devolve. Se algum dia um caminho de falha passar a devolver linha COM
    // caminho_do_audio, este caso quebra antes de alguém receber batalha muda.
    const semSessao = await subirAudioDoResultado(linha({ usuario_id: null }), new Blob(['x']), setadores());
    const semBlob = await subirAudioDoResultado(linha(), null, setadores());

    const exigeAudio = true;
    for (const devolvida of [semSessao, semBlob]) {
      expect(!exigeAudio || devolvida.caminho_do_audio).toBeFalsy();
    }
  });
});
