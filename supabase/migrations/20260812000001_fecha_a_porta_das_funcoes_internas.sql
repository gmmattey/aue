/*
  20260812000001 — as funções internas param de atender pela porta da frente

  A 20260811000003 quis fechar `donos_da_briga` e `round_para_entrar` para o
  mundo, e escreveu isso em comentário:

      "Ninguém chama isto de fora."

  O `REVOKE ALL ... FROM PUBLIC` que ela usou **não faz isso**. `PUBLIC` é o
  pseudo-papel; ele não alcança grant nominal, e o Supabase concede EXECUTE para
  `anon` e `authenticated` por privilégio padrão no schema `public`. Conferido
  depois de aplicar: `has_function_privilege('anon', ...)` devolvia `true` nas
  duas, e `/rest/v1/rpc/round_para_entrar` respondia de fora.

  O estrago era limitado — `round_para_entrar` é `STABLE` e não grava nada, e
  `donos_da_briga` devolve o `usuario_id` de quem já está numa briga cujo id
  quem chama teria que conhecer. Mas **comentário que promete uma coisa e banco
  que faz outra é pior que os dois**: a próxima pessoa lê o comentário e assume
  que a porta está fechada.

  `vencedor_do_round` entra junto pelo mesmo motivo: é peça de dentro.

  NADA DISSO QUEBRA O JOGO. As três só são chamadas de dentro de outras funções
  `SECURITY DEFINER` (`obter_batalha`, `responder_batalha`, `revanchar_batalha`),
  e ali quem executa é o dono da função, não quem pediu. O cliente não chama
  nenhuma das três: em `src/` elas só aparecem em comentário.
*/

REVOKE EXECUTE ON FUNCTION public.donos_da_briga(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.round_para_entrar(uuid, uuid) FROM anon, authenticated;

/*
  A `vencedor_do_round` precisa das DUAS revogações, e é por isso que ela tem
  uma linha a mais: nela o `PUBLIC` nunca tinha sido revogado.

  Postgres concede EXECUTE a `PUBLIC` em toda função nova por padrão. Tirar de
  `anon` e `authenticated` não adianta enquanto o `PUBLIC` continuar lá — os
  dois papéis herdam por ele. Conferido depois de aplicar: com só o revoke
  nominal, `has_function_privilege('anon', ...)` continuava `true`.

  Quem esquecer disso numa função nova reabre a porta sem perceber.
*/
REVOKE EXECUTE ON FUNCTION public.vencedor_do_round(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.vencedor_do_round(uuid, uuid) FROM PUBLIC;
