/**
 * Um endereço local para tocar o áudio que está na memória.
 *
 * Mora deste lado da fronteira porque `URL.createObjectURL` é API de navegador
 * (ADR §2). Não virou porta porque não há o que dublar nem ciclo de permissão:
 * é um endereço temporário que a própria página cria e a própria página joga
 * fora.
 *
 * QUEM CRIA, SOLTA. Cada endereço segura o blob na memória até alguém liberar
 * — e um arroto de dez segundos esquecido a cada partida vira memória perdida
 * num celular que já é apertado.
 */
export function criarEnderecoLocal(dados: Blob): string {
  return URL.createObjectURL(dados);
}

export function soltarEnderecoLocal(endereco: string): void {
  URL.revokeObjectURL(endereco);
}
