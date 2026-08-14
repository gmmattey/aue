/**
 * O que a roda aceita antes de o servidor ser incomodado.
 *
 * OS NÚMEROS SÃO DO SERVIDOR, não da tela: `criar_batalha_presencial` recusa
 * mais de 5 nomes, recusa nome repetido e recusa round fora de 1..3
 * (20260807000031). O que existe aqui é a mesma régua aplicada ANTES do toque,
 * para o botão nascer desabilitado em vez de a pessoa apertar e levar erro.
 *
 * Isso não é validação duplicada por acaso: quem manda continua sendo o banco.
 * A tela só evita o pedido que já se sabe que vai falhar.
 */

export const MINIMO_NA_RODA = 2;
export const MAXIMO_NA_RODA = 5;

/** De 1 a 3, como o servidor recusa. */
export const ROUNDS_POSSIVEIS: readonly number[] = [1, 2, 3];

/**
 * O nome de quem não quis escrever o próprio.
 *
 * `N` é a posição do campo ENTRE OS QUE FICARAM EM BRANCO, não o índice do
 * campo — o primeiro campo vazio é "Arrotador 1", o segundo é "Arrotador 2",
 * mesmo que o segundo campo da tela seja o terceiro em branco.
 */
export function nomeDoArrotador(n: number): string {
  return `Arrotador ${n}`;
}

/**
 * Os nomes que de fato entram na roda: sem espaço sobrando e sem repetido.
 *
 * CAMPO EM BRANCO NÃO SOME. Ele vira participante mesmo assim, batizado por
 * `nomeDoArrotador` — deixar de escrever o próprio nome não é o mesmo que
 * desistir da roda.
 *
 * O repetido sai aqui pelo mesmo motivo que sai no banco: dois "Carlos" tornam
 * o pódio indecifrável — duas linhas iguais com notas diferentes, e ninguém
 * sabe qual é quem. "carlos" e "Carlos " são a mesma pessoa na mesa. A mesma
 * régua vale para o nome gerado: colisão é rara, mas não se pula a checagem
 * por isso.
 */
export function nomesDaRoda(escritos: readonly string[]): string[] {
  const vistos = new Set<string>();
  const limpos: string[] = [];
  let vaziosVistos = 0;

  for (const escrito of escritos) {
    const digitado = escrito.trim();
    let nome: string;
    if (digitado) {
      nome = digitado;
    } else {
      vaziosVistos += 1;
      nome = nomeDoArrotador(vaziosVistos);
    }

    const chave = nome.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    limpos.push(nome);
  }

  return limpos;
}

/**
 * Dá para abrir a roda com o que está escrito?
 *
 * A régua é o número de CAMPOS (2 a 5), não o de campos preenchidos — campo em
 * branco agora vira participante, então as duas contas coincidem, exceto
 * quando um nome (digitado ou gerado) colide com outro já visto.
 */
export function daParaAbrirARoda(escritos: readonly string[]): boolean {
  const nomes = nomesDaRoda(escritos);
  return nomes.length >= MINIMO_NA_RODA && nomes.length <= MAXIMO_NA_RODA;
}
