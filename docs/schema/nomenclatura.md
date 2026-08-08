# Nomenclatura do banco — Auê

- **Status:** ativo
- **Verificado em:** 2026-08-07, contra as 27 migrações em `supabase/migrations/`
- **Fonte de verdade:** este arquivo para a regra; `supabase/migrations/` para o
  que o banco realmente tem
- **Escopo:** tabelas, colunas, chaves estrangeiras, funções, policies e buckets
  do projeto Supabase do Auê

Existe porque o schema cresceu em duas convenções ao mesmo tempo — o documento
de projeto (`banco_de_dados.md`) desenhou tudo em português, a implementação
escorregou para inglês em vários pontos, e ninguém tinha onde consultar qual das
duas valia. O resultado foi uma tabela híbrida (`user_conquistas`, renomeada em
2026-08-07) e um padrão de chave estrangeira que já custou um bug real.

Isto **não é um plano de migração**. Nada aqui pede para renomear o que existe.
A regra vale para o que vier, e as exceções herdadas estão listadas no fim,
declaradas como exceções em vez de corrigidas.

---

## 1. Tabelas

**Português do Brasil, plural, `snake_case`, no schema `public`.**

```
resultados      desafios        comentarios     reacoes
grupos          campeonatos     denuncias       seguidores
conquistas      favoritos
```

**Tabela que qualifica outra leva o qualificador no fim, no singular:**

```
membros_grupo              -- membros do grupo
participantes_campeonato   -- participantes do campeonato
posts_comunidade           -- posts da comunidade
conquistas_usuario         -- conquistas do usuário
```

Nunca o contrário. `user_conquistas` existiu e foi corrigida: além de inverter a
ordem, misturava os dois idiomas dentro do mesmo nome — o pior dos dois mundos,
porque nem quem pensa em português nem quem pensa em inglês adivinha o nome.

**Estrangeirismo consolidado é aceito quando não existe palavra em português em
uso real:** `post`, `ranking`, `score`, `feed`. Ninguém escreve "publicações da
comunidade" no dia a dia deste projeto. `arroto` → `resultado` foi decisão de
produto, não de idioma, e continua valendo.

Sem prefixo de projeto (`aue_`) em tabela. O schema já é o namespace.

---

## 2. Colunas

**Inglês, `snake_case`.** É a única regra que não briga com o ecossistema:
`id`, `created_at`, `user_id`, `group_id`, `result_id`, `is_premium`,
`post_type`. Qualquer exemplo de Postgres, de Supabase ou de PostgREST assume
isso, e RLS, triggers e políticas ficam legíveis para quem chega.

**Exceção única:** se a coluna repete um campo que já existe em português em
outra tabela, use o nome que já existe. `nome`, `descricao`, `apelido`, `icone`
e `categoria` já estão no schema — uma tabela nova com um campo desses usa a
forma em português. Ter `conquistas.nome` e `campeonatos.name` lado a lado,
significando a mesma coisa, é pior do que qualquer inconsistência de idioma.

Convenções fixas, sem discussão caso a caso:

| Papel | Forma |
|---|---|
| Chave primária | `id` |
| Chave estrangeira | `<entidade_singular>_id` (`user_id`, `result_id`, `group_id`) |
| Criação | `created_at timestamptz`, default `timezone('utc', now())` |
| Booleano | `is_*` (`is_premium`, `is_rare`, `is_hidden`) — nunca `flag_*` nem negativo (`is_not_*`) |
| Momento de um evento | `<verbo_no_particípio>_at` (`unlocked_at`, `resolved_at`, `joined_at`) |
| Enum em texto | `<conceito>_type` + `CHECK (... IN (...))` (`post_type`, `reaction_type`) |

Timestamp sempre `timestamptz`, sempre em UTC. Nunca `timestamp` sem fuso.

---

## 3. Chaves estrangeiras para usuário

**Tabela nova referencia `public.profiles(id)`, não `auth.users(id)`.**

Esta é a decisão com consequência prática maior do documento inteiro.
`auth.users` vive num schema protegido que o PostgREST não expõe, então uma FK
apontando para lá **torna impossível** embutir o autor numa consulta:

```ts
// só funciona se a FK apontar para public.profiles
.select('*, profiles(apelido, avatar_url)')
```

Já custou caro duas vezes. `comentarios.user_id` referencia `auth.users`, e por
isso `CommentsModal` tentava `select('*, profiles(apelido)')` contra uma relação
que não existe — a saída foi escrever a RPC `listar_comentarios` só para fazer o
join à mão (migração `20260807000026`, que documenta o episódio em detalhe).

`profiles` tem uma linha para todo usuário autenticado, criada pelo trigger
`handle_new_user`, e a cascata `auth.users` → `profiles` → dependentes continua
funcionando. Ou seja: apontar para `profiles` não perde integridade e ganha o
embed.

Ressalva honesta: se `handle_new_user` falhar para algum usuário, o INSERT em
qualquer tabela dependente falha junto. É um acoplamento real, e é o preço de
poder embutir o perfil.

---

## 4. Funções e RPCs

**Português, verbo no infinitivo + substantivo:** `listar_comentarios`,
`criar_comentario`, `alternar_reacao`.

Esta é a área mais bagunçada do schema e a regra aqui é a mais recente — a
maioria das funções existentes não a cumpre (`submit_resultado`, `toggle_reacao`
e `toggle_favorite` são híbridas ou inglesas). Não renomeie as antigas: elas são
chamadas por `supabase.rpc('<nome>')` no cliente publicado, e trocar o nome
quebra qualquer build antigo em cache até o usuário recarregar.

Duas exceções deliberadas ao "sem prefixo":

- `aue_*` marca função de **regra de negócio** que outras migrações consultam em
  vez de recopiar: `aue_score_v1`, `aue_vaga_de_fundador_disponivel`. O prefixo
  sinaliza "não duplique este corpo".
- `handle_*`, `check_*`, `protect_*` marcam funções de **trigger**, não
  chamáveis pelo cliente.

A lição da regressão de XP se aplica aqui e vale mais que qualquer regra de
nome: **função redefinida por várias migrações é onde o comportamento se perde.**
Se uma regra vai ser consultada de mais de um lugar, ela merece função própria,
com nome próprio — foi assim que o corte de fundador virou
`aue_vaga_de_fundador_disponivel()` em vez de mais um `IF` dentro de
`handle_new_user`.

---

## 5. Policies, índices e buckets

**Policies:** frase em inglês, descrevendo quem pode o quê —
`"Users can delete their own comments"`, `"Unlocked conquistas viewable by
everyone"`. Não embuta o nome da tabela na frase: quando a tabela é renomeada, o
rótulo mente. (Aconteceu: `"System can insert user conquistas"` sobreviveu ao
rename e virou uma linha de compatibilidade na `20260807000021`.)

**Índices:** `<tabela>_<o que o índice serve>`, em português, sem prefixo
`idx_`. É o padrão já em uso e ele se lê como frase:

```
comentarios_por_post                     -- busca
reacoes_por_post                         -- busca
profiles_fundadores                      -- parcial, WHERE is_founder
reacoes_uma_por_pessoa_por_post          -- único parcial: diz a REGRA que impõe
denuncias_uma_por_pessoa_por_resultado   -- idem
```

Índice único que existe para impor uma regra de negócio nomeia a regra, não as
colunas. `reacoes_uma_por_pessoa_por_post` explica sozinho por que existe; um
`idx_reacoes_post_id_user_id` obrigaria a abrir a migração para descobrir.

**Buckets de Storage:** minúsculas, hífen. Os dois existentes (`avatars`,
`audio_records`) usam inglês e underscore e ficam como estão — `audio_records`
ainda não foi aplicado, então é o único renomeável de graça se alguém quiser.

---

## 6. Exceções vigentes — declaradas, não corrigidas

Estas violam a regra acima e **devem continuar violando**. O custo de renomear é
alto e o ganho é estético. Estão aqui para que ninguém precise perguntar "por
que essa está em inglês?" nem tente consertar por conta própria.

| Objeto | Regra que quebra | Por que fica |
|---|---|---|
| `profiles` | tabela em inglês | Convenção da própria documentação do Supabase; referenciada por policies, triggers, `handle_new_user`, FKs e pelo cliente publicado |
| `push_subscriptions` | tabela em inglês | Consumida pela Edge Function `send-push`, fora do repositório principal |
| `global_ranking` (view) | inglês | Consumida em dois pontos do cliente; "ranking" é estrangeirismo aceito de qualquer forma |
| `xp_total`, `nivel` (em `profiles`) | idioma misto na mesma tabela | Protegidas por trigger e citadas em cinco migrações; renomear é convite à regressão de XP acontecer uma terceira vez |
| `submit_resultado`, `toggle_reacao`, `toggle_favorite`, `toggle_follow`, `create_social_post`, `get_championship_leaderboard`, `get_user_conquistas_catalog` | função híbrida ou em inglês | Chamadas por nome pelo cliente publicado |
| `comentarios.user_id`, `favoritos.user_id`, `posts_comunidade.user_id`, `reacoes.user_id`, `denuncias` | FK para `auth.users` | Já aplicadas; migrar exige recriar a FK e revisar toda a RLS dependente. É a dívida mais cara desta lista e a única que talvez valha a pena pagar um dia |

---

## 7. Antes de criar tabela nova

1. O nome está em português, no plural, e o qualificador está no fim?
2. As colunas estão em inglês — salvo `nome`/`descricao`/`apelido`/`icone`/`categoria`, que já existem em português?
3. A FK de usuário aponta para `public.profiles(id)`?
4. Tem `created_at timestamptz` com default em UTC?
5. Tem `ENABLE ROW LEVEL SECURITY` **e** as policies correspondentes? RLS ligada sem policy nenhuma bloqueia tudo em silêncio.
6. Os `GRANT` para `anon` e `authenticated` refletem quem deve mesmo escrever?
7. Existe script em `supabase/rollback/`? Oito migrações não têm, e é dívida conhecida — não aumente a lista.
