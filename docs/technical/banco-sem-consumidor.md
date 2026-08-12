# O que ficou no banco sem ninguém chamar

A [#109](https://github.com/gmmattey/aue/issues/109) tirou do repositório feed,
ranking global, XP na tela, conquistas, perfil social, grupos, comunidades,
ligas, push e assinatura. **O banco não foi tocado.**

Este documento é a lista do que sobrou lá com zero consumidor no `src/`, e a
decisão sobre cada coisa. Ele existe para que "não tem nada usando isso" pare de
ser descoberta e vire registro.

## A decisão, e ela vale para a lista inteira

**Mantém. Não apaga.**

Três motivos, em ordem de peso:

1. **Tem dado de gente ali.** `posts_comunidade`, `comentarios`, `reacoes`,
   `conquistas_usuario`, `seguidores` e `favoritos` guardam coisa que alguém
   escreveu ou marcou. Apagar tabela é irreversível e ninguém decidiu que esse
   dado deixa de existir — decidiu-se que o jogo não mostra mais aquilo.
2. **Aqui não se roda `supabase db push`.** O histórico remoto está vazio e as
   migrações são aplicadas à mão, no SQL Editor. Um arquivo de `DROP` neste
   repositório não é código que o CI executa: é uma instrução para uma pessoa
   colar SQL destrutivo em produção, contra dado real, de madrugada. O risco de
   errar não paga o ganho de arrumar o banco.
3. **Não custa nada estar lá.** Tabela sem escrita não consome, view sem leitura
   não roda, função sem `EXECUTE` não executa. O incômodo é de leitura humana, e
   é isto aqui que resolve.

**Quem quiser apagar de verdade um dia**: é issue própria, com o dado exportado
antes, uma coisa de cada vez, e com a política de privacidade conferida — ela
diz o que o Auê guarda.

## Tabelas

| Tabela | Veio de | Guardava |
|---|---|---|
| `posts_comunidade` | 019 | os posts do feed |
| `comentarios` | 005 | comentário em post e em resultado |
| `reacoes` | 005 | curtida e descurtida |
| `conquistas` | 018 | o catálogo de conquistas |
| `conquistas_usuario` | 018 | quem desbloqueou o quê |
| `seguidores` | 017 | quem segue quem |
| `favoritos` | 020 | arroto marcado como favorito |
| `grupos` | 006 | os grupos |
| `membros_grupo` | 006 | quem está em qual grupo |
| `campeonatos` | 006 | as ligas |
| `participantes_campeonato` | 006 | quem joga qual liga |
| `push_subscriptions` | 008 | o endpoint de notificação de cada aparelho |

## Views

| View | Veio de | Fazia |
|---|---|---|
| `global_ranking` | 009, endurecida na 015 | o ranking global |

## Funções e RPCs

| Função | Veio de | Chamada por |
|---|---|---|
| `criar_post_social` | 019, renomeada na 036 | `createSocialPost` |
| `alternar_reacao` | 025, renomeada na 036 | `toggleReacaoPost` |
| `listar_comentarios` | 026, renomeada na 036 | `listarComentariosDoPost` |
| `criar_comentario` | 026, renomeada na 036 | `criarComentarioNoPost` |
| `alternar_seguir` | 017, renomeada na 036 | `toggleFollow` |
| `alternar_favorito` | 020, renomeada na 036 | `toggleFavorite` |
| `obter_catalogo_de_conquistas` | 018, renomeada na 036 | `getUserConquistasCatalog` |
| `obter_placar_do_campeonato` | 007, renomeada na 036 | `ChampionshipLeaderboard`, apagado aqui |
| `notificar_evento_push` | 012, renomeada na 036 | o webhook do push |

## O que NÃO está nesta lista, e por quê

**O XP.** `calcular_xp_do_resultado` (002, corrigida na 010 e na 023) e
`atualizar_xp_do_perfil` (mesma origem) disparam no `INSERT` de `resultados` —
que é o caminho vivo do jogo. A #109 tirou a pílula "+N XP" da
tela; o cálculo continua acontecendo a cada arroto. Mexer nesse SQL derruba o
envio do resultado, e já derrubou duas vezes por cópia de corpo de função. A
trava contra isso é `src/db/deriva-de-funcoes.migracoes.test.ts`.

**`conceder_conquistas_do_resultado`** (018, renomeada na 036). É gatilho no
`INSERT` de `resultados`, pelo mesmo motivo do XP: ele escreve em
`conquistas_usuario` sozinho, sem ninguém chamar. Continua rodando. Se um dia
for desligado, é junto com o resto das conquistas, na issue que apagar a tabela.

**`denuncias`** (014) e `ReportButton`. Estão no ar e são o caminho de
moderação. Nada a ver com esta faxina.
