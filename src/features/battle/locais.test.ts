/**
 * O LOCAL DA DISPUTA SE CHAMA A MESMA COISA NAS DUAS PONTAS.
 *
 * O contexto é escolhido numa tela (`DisputaLocalScreen`, no aparelho do
 * churrasco) e exibido em outra (`/b/CODIGO`, no telefone de quem recebeu o
 * link do pódio). São arquivos diferentes, escritos por gente diferente em
 * momentos diferentes, contando a mesma disputa.
 *
 * Sem esta trava, "Churrasco" virar "No churrasco" num dos lados passa
 * despercebido: as duas telas continuam funcionando, e só quem vir as duas lado
 * a lado percebe que o app diz duas coisas sobre a mesma noite.
 *
 * A leitura do arquivo-fonte segue o mesmo padrão do `mimes-do-bucket.test.ts`
 * e do `ads-txt.test.ts`: é a forma barata de amarrar duas cópias que precisam
 * existir por motivos legítimos — lá o seletor precisa da ORDEM dos botões,
 * aqui só o texto importa.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ROTULO_DO_LOCAL, rotuloDoLocal } from './locais';

const FONTE_DO_SELETOR = new URL('./DisputaLocalScreen.tsx', import.meta.url);

describe('rótulo do local', () => {
  it('cobre os cinco contextos do §3.8 do contrato', () => {
    // casa, público, escritório, churrasco, outro — os mesmos do CHECK de
    // `batalhas.tipo_de_local` (20260807000030).
    expect(Object.keys(ROTULO_DO_LOCAL).sort()).toEqual([
      'casa',
      'churrasco',
      'escritorio',
      'outro',
      'publico',
    ]);
  });

  it('disputa sem local informado não inventa um', () => {
    // `tipo_de_local` é opcional. Devolver "Outro lugar" aqui poria no pódio
    // compartilhado um contexto que ninguém escolheu.
    expect(rotuloDoLocal(null)).toBeNull();
    expect(rotuloDoLocal(undefined)).toBeNull();
  });

  it('a tela que ESCOLHE o local usa exatamente os mesmos textos', () => {
    const seletor = readFileSync(FONTE_DO_SELETOR, 'utf8');

    for (const [valor, rotulo] of Object.entries(ROTULO_DO_LOCAL)) {
      // O par completo, como o seletor o escreve: `{ valor: 'casa', rotulo: 'Em casa' }`.
      expect(
        seletor.includes(`valor: '${valor}', rotulo: '${rotulo}'`),
        `O seletor de local não oferece "${rotulo}" para \`${valor}\` — as duas telas passariam a chamar a mesma disputa de nomes diferentes.`,
      ).toBe(true);
    }
  });
});
