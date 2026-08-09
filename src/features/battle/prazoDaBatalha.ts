/**
 * Os 7 dias do §3.7, ditos com o número certo.
 *
 * O QUE ISTO CORRIGE. Duas telas afirmavam "ele para de funcionar em 7 dias"
 * em texto fixo — a caixa do link recém-criado e o rodapé da batalha. Na
 * batalha a frase era falsa a partir do primeiro dia: no sexto dia ela
 * continuava prometendo sete. O dado real sempre esteve na resposta da RPC
 * (`batalhas.expira_em`, ver 20260807000030) e nenhuma tela o lia.
 *
 * REGRA DE ARREDONDAMENTO: sempre para baixo. Faltando 6 dias e 20 horas, a
 * frase diz "6 dias". Prometer menos do que existe é chato; prometer mais é
 * mentir para quem está decidindo se manda o link agora ou amanhã.
 *
 * Funções puras com `agora` injetável porque a hora do relógio é justamente o
 * que precisa ser exercitado em teste.
 */

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/**
 * Quanto falta, em milissegundos, ou `null` quando a data não dá para ler.
 *
 * `null` não é o mesmo que zero: zero é "acabou agora", `null` é "não sei". As
 * duas funções abaixo tratam o desconhecido sem inventar prazo nenhum.
 */
function faltando(expiresAt: string | null | undefined, agora: number): number | null {
  if (!expiresAt) return null;
  const fim = Date.parse(expiresAt);
  return Number.isNaN(fim) ? null : fim - agora;
}

/**
 * A sessão já venceu?
 *
 * Data ilegível responde `false` DE PROPÓSITO. Esta resposta desliga a
 * atualização automática e troca a tela por um aviso de expirado; fazer isso
 * por causa de um formato de data que não soubemos ler tiraria do ar uma
 * batalha viva. Quem realmente aplica o prazo é o servidor — `obter_batalha`
 * devolve NULL depois dos 7 dias, e a tela reage a isso.
 */
export function batalhaExpirou(
  expiresAt: string | null | undefined,
  agora: number = Date.now(),
): boolean {
  const resta = faltando(expiresAt, agora);
  return resta !== null && resta <= 0;
}

/**
 * A frase do prazo, pronta para a tela.
 *
 * Devolve a sentença inteira (e não só "6 dias") porque os dois lugares que a
 * usam dizem a mesma coisa, e montar a frase em cada um deles é como as duas
 * cópias do "7 dias" nasceram.
 */
export function fraseDoPrazo(
  expiresAt: string | null | undefined,
  agora: number = Date.now(),
): string {
  const resta = faltando(expiresAt, agora);

  // Sem data legível não há número honesto para dizer — e "7 dias" seria
  // exatamente o chute que este arquivo existe para eliminar.
  if (resta === null) return 'Ele para de funcionar sozinho quando o prazo vencer.';

  if (resta <= 0) return 'Este link já parou de funcionar.';

  if (resta < MINUTO) return 'Ele para de funcionar em menos de um minuto.';

  if (resta < HORA) {
    const minutos = Math.floor(resta / MINUTO);
    return `Ele para de funcionar em ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`;
  }

  if (resta < DIA) {
    const horas = Math.floor(resta / HORA);
    return `Ele para de funcionar em ${horas} ${horas === 1 ? 'hora' : 'horas'}.`;
  }

  const dias = Math.floor(resta / DIA);
  return `Ele para de funcionar em ${dias} ${dias === 1 ? 'dia' : 'dias'}.`;
}
