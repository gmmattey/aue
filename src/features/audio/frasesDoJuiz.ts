/**
 * A frase do juiz — o `judge-quote` do protótipo (`resultado.html`).
 *
 * O protótipo mostra UMA frase, fixa, para o exemplo "Monstro do Esgoto":
 * "Tecnicamente excelente. Socialmente indefensável." Ela está aqui palavra por
 * palavra; as outras sete seguem a mesma forma, que é o que dá liga ao tom:
 * duas orações curtas, a segunda desmentindo ou piorando a primeira. Elogio e
 * constrangimento na mesma respiração.
 *
 * MÓDULO SEPARADO de propósito. `AudioRecorder.tsx` já é grande, e copy não é
 * lógica de gravação — misturar as duas é exatamente o monolito que o
 * `AGENTS.md` proíbe. Aqui a copy é revisável sem abrir o componente, e
 * `frasesDoJuiz.test.ts` trava a cobertura das classificações.
 *
 * As chaves são as classificações de `rules.ts`, que por sua vez espelham
 * `aue_classification_v1` (20260807000011). Se uma faixa nova entrar lá, o
 * teste quebra aqui — a frase faltando viraria uma tela sem veredito, e o
 * silêncio pareceria bug.
 */
export const FRASES_DO_JUIZ: Record<string, string> = {
  'Arroto de Hamster': 'Ouvimos alguma coisa. Tecnicamente, foi um suspiro.',
  'Tentativa Honesta': 'A intenção estava lá. O conteúdo, não.',
  'Arroto Respeitável': 'Cumpre o combinado. Não assusta ninguém.',
  'Pedreiro Certificado': 'Isso ecoou na obra. E na casa do vizinho.',
  'Trovão Gastrointestinal': 'O céu não trovejou. Foi você.',
  // A do protótipo, intacta.
  'Monstro do Esgoto': 'Tecnicamente excelente. Socialmente indefensável.',
  'Arma Biológica': 'Isso deixou de ser talento. Virou ocorrência.',
  'O ARROTO': 'Não há mais o que julgar. Só reverência.',
};

/**
 * A frase de uma classificação, ou `null` quando não há uma.
 *
 * Devolver `null` em vez de um texto genérico é deliberado: a seção inteira
 * some da tela. Uma frase de reserva ("Resultado registrado.") ocuparia o lugar
 * do veredito sem julgar nada — pior que a ausência, porque parece conteúdo.
 *
 * O caso real é `'Desconhecido'`, o valor inicial de `rules.ts`: ele só
 * sobrevive se nenhuma faixa casar, o que hoje é impossível. Fica coberto
 * porque "impossível hoje" não é o mesmo que "impossível".
 */
export function fraseDoJuiz(classificacao: string): string | null {
  return FRASES_DO_JUIZ[classificacao] ?? null;
}
