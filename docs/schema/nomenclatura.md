# Nomenclatura do banco — Auê

- **Status:** ativo
- **Fonte de verdade da regra:** este arquivo
- **Fonte de verdade do que existe:** `supabase/migrations/` + ambiente aplicado
- **Escopo:** tabelas, colunas, FKs, funções, policies, índices e buckets

Existe porque o schema cresceu misturando português e inglês e isso já custou
bug real.

Mas uma regra vem antes da regra de nome:

> antes de criar objeto novo, confirme em
> [`../escopo/ESCOPO_ATUAL.md`](../escopo/ESCOPO_ATUAL.md) que a mudança pertence
> ao jogo.

Nomenclatura não é autorização de escopo.

---

## 1. Tabelas

Para tabela nova do domínio:

**Português do Brasil, plural, `snake_case`, no schema `public`.**

Exemplos já compatíveis com a direção:

```text
resultados
perfis
batalhas
rodadas_batalha
comentarios
reacoes
grupos
campeonatos
denuncias
seguidores
conquistas
favoritos
```

Tabela que qualifica outra leva o qualificador no fim:

```text
membros_grupo
participantes_campeonato
posts_comunidade
conquistas_usuario
rodadas_batalha
```

Evite misturar idioma dentro do mesmo identificador. `user_conquistas` já
existiu e foi corrigida; era o pior dos dois mundos porque ninguém adivinhava o
nome sem abrir migração.

Estrangeirismo consolidado pode existir quando faz sentido (`ranking`, `post`), mas isso não é convite para transformar o schema em metade inglês,
metade português por preguiça.

Sem prefixo de projeto (`aue_`) em tabela. O schema já é namespace.

---

## 2. Colunas

Regra prática para novas colunas:

**português do Brasil, `snake_case`.**

Isto MUDOU na 20260807000036. Até ela, a regra aqui era "inglês, salvo campos já
consolidados em português" — e o resultado era um schema onde `resultados`
tinha `nota` chamada `score` e `perfis` tinha `apelido` ao lado de
`avatar_url`. Metade em cada idioma não é convenção, é sorteio: ninguém
acertava o nome de uma coluna sem abrir migração.

Exemplos:

```text
id
criado_em
usuario_id
resultado_id
e_premium
tipo_de_batalha
expira_em
```

Convenções:

| Papel | Forma |
|---|---|
| Chave primária | `id` |
| Chave estrangeira | `<entidade_singular>_id` (`usuario_id`, `resultado_id`, `batalha_id`) |
| Criação | `criado_em timestamptz` em UTC |
| Momento de evento | `<particípio>_em` (`resolvido_em`, `entrou_em`, `expira_em`) |
| Booleano de essência | `e_*` (`e_artificial`, `e_fundador`, `e_premium`) |
| Booleano de estado | `esta_*` (`esta_escondido`, `esta_travado_por_moderacao`) |
| Tipo textual | `tipo_de_<conceito>` + constraint/check quando aplicável |

A distinção entre `e_*` e `esta_*` é ser vs. estar, e é deliberada: um arroto
**é** artificial para sempre; ele **está** escondido até alguém revisar. Quem
lê o schema aprende a diferença de graça.

Timestamp deve ser `timestamptz` e tratado em UTC.

Estrangeirismo consolidado continua valendo quando a tradução seria pior:
`nota`, `xp_total`, `bio`, `premium`, `ranking`, `post`. E não crie `name` ao
lado de `nome` significando a mesma coisa só para seguir uma regra no
automático.

### O que ainda está em inglês, e por quê

O rename cobriu **as seis tabelas do MVP1**: `resultados`, `desafios`,
`batalhas`, `rodadas_batalha`, `participantes_batalha` e `perfis`.

As 13 tabelas de features desligadas — `comentarios`, `reacoes`, `grupos`,
`membros_grupo`, `campeonatos`, `participantes_campeonato`, `posts_comunidade`,
`conquistas`, `conquistas_usuario`, `seguidores`, `favoritos`, `denuncias`,
`push_subscriptions` — **seguem em inglês**, de propósito. Elas estão fora do
[escopo atual](../escopo/ESCOPO_ATUAL.md) e traduzir o que ninguém executa é
risco sem retorno.

Quando uma delas voltar ao escopo, ela vira migração própria. Não traduza meia
tabela de passagem: o schema em três idiomas é pior do que em dois.

`src/db/nomenclatura-ptbr.migracoes.test.ts` reprova migração nova que
reintroduza um nome aposentado.

---

## 3. Chaves estrangeiras para identidade

Para tabela nova que pertença a uma pessoa autenticada/anônima pelo Supabase,
prefira `public.perfis(id)` quando o domínio permitir.

Motivo prático: FKs para `perfis` permitem relações PostgREST com dados de
perfil; FKs antigas apontando diretamente para `auth.users` já obrigaram RPC
extra só para fazer join.

`perfis` é criado a partir do fluxo de Auth e funciona como identidade pública
do domínio.

Ressalva: isso cria dependência do provisionamento de `perfis`. Se o trigger
que cria o perfil falhar, inserts dependentes falham também. É acoplamento
consciente, não mágica.

---

## 4. Funções e RPCs

Para função nova chamável pelo domínio:

**português, verbo no infinitivo + substantivo.**

Exemplos:

```text
listar_comentarios
criar_comentario
alternar_reacao
criar_batalha
enviar_resultado
```

Gatilho leva o nome do evento: `ao_<verbo>_<substantivo>`
(`ao_criar_usuario`, `ao_definir_vencedor_do_desafio`), e a função que ele
executa leva o nome da ação (`criar_perfil_do_novo_usuario`,
`definir_vencedor_do_desafio`).

**Não renomeie RPC publicada de graça.** Build antigo continua chamando o nome
anterior, e a chamada morre com "função não existe" na cara de quem está com o
celular na mão.

A 20260807000036 renomeou um bloco inteiro delas mesmo assim
(`submit_resultado` → `enviar_resultado`, `toggle_*` → `alternar_*`,
`get_*` → `obter_*`, `can_use_as_*` → `pode_usar_como_*`). Isso foi **corte
seco autorizado**, não exceção à regra: a migração subiu junto com o deploy do
frontend, e a janela de incompatibilidade é a do próprio deploy. Repetir isso
exige a mesma coordenação, não só a mesma vontade.

Exceções deliberadas:

- `aue_*` marca regra de negócio compartilhada e canônica, como fórmula
  versionada. `aue_score_v1`, `aue_classification_v1` e `aue_origin_score_v1`
  mantêm até os **parâmetros em inglês** (`p_duration`, `p_score`): elas estão
  presas pelos CHECKs de coerência de `resultados` e espelhadas em
  `src/features/audio/rules.ts`. São congeladas, não esquecidas.
- funções de features desligadas foram renomeadas para PT, mas seus
  **parâmetros e colunas de saída seguem os nomes das tabelas que leem** — que
  continuam em inglês. Inventar contrato em português sobre tabela inglesa
  criaria uma terceira convenção.

Regra mais importante que o idioma:

> uma regra de negócio que aparece em vários lugares merece uma função canônica,
> não três `IF`s copiados em migrações diferentes.

---

## 5. Policies

Nomeie policy pelo comportamento, não pelo nome da tabela.

Pode permanecer em inglês quando a base já usa esse padrão:

```text
Users can delete their own comments
Unlocked conquistas viewable by everyone
```

O nome precisa continuar verdadeiro se a tabela for renomeada.

Mais importante que o rótulo:

- RLS precisa estar ligada quando o cliente acessa a tabela;
- policy precisa refletir a ação real;
- grant e policy precisam concordar;
- esconder botão não é autorização.

---

## 6. Índices

Formato preferido:

```text
<tabela>_<o_que_o_indice_serve>
```

Exemplos:

```text
comentarios_por_post
reacoes_por_post
perfis_fundadores
reacoes_uma_por_pessoa_por_post
denuncias_uma_por_pessoa_por_resultado
```

Índice único que impõe regra de negócio deve nomear a regra. É melhor entender
`reacoes_uma_por_pessoa_por_post` olhando o schema do que precisar abrir o SQL
para descobrir por que existe.

---

## 7. Buckets

Para bucket novo, prefira:

**minúsculas + hífen**.

Buckets herdados podem quebrar a regra por compatibilidade. Não renomeie mídia
publicada sem plano de migração de objetos, policies e URLs.

E uma regra mais importante: bucket privado não vira público só porque isso
resolveu o CORS em cinco minutos.

---

## 8. Exceções herdadas

Estas exceções existem e não devem ser "corrigidas" em uma PR sem relação com
elas:

| Objeto | Exceção | Motivo |
|---|---|---|
| as 13 tabelas fora do MVP1 | tabela e colunas em inglês | features desligadas; ver §2. Traduzir o que ninguém executa é risco sem retorno |
| `push_subscriptions` | tabela em inglês | idem — fluxo de push está fora do escopo atual |
| `global_ranking` | view em inglês, inclusive as colunas de saída (`player_name`, `score`) | `GRANT SELECT` revogado na 20260807000034: a view está desativada. Renomear saída de view morta é churn |
| `xp_total`, `nivel` | idioma misto em `perfis` | `xp_total` é estrangeirismo consolidado; `nivel` já era PT |
| `aue_score_v1` e irmãs | parâmetros em inglês | fórmula versionada e congelada; ver §4 |
| FKs `user_id` → `auth.users` nas tabelas fora do MVP1 | alvo diferente do padrão novo | migrar exige revisar FK, RLS e consumidores |

Compatibilidade ganha de estética — mas "compatibilidade" precisa nomear um
consumidor real. `profiles`, `submit_resultado` e os `toggle_*` estavam nesta
tabela e saíram: o consumidor era o próprio app, e ele mudou junto.

---

## 9. Checklist antes de criar objeto novo

1. A mudança pertence ao escopo atual ou está sendo implementada porque a ideia
   pareceu legal?
2. O nome da tabela segue o padrão de domínio?
3. A coluna segue a convenção sem duplicar conceito já existente?
4. FK de pessoa aponta para o alvo correto?
5. Timestamps usam `timestamptz`/UTC?
6. RLS, policies e grants estão coerentes?
7. Índices expressam consulta/regra real?
8. A RPC nova tem nome estável e contrato claro?
9. Existe teste/validação da regra crítica?
10. Existe rollback ou plano de restauração?

Se a resposta do item 1 for "não sei", pare antes do SQL e leia o contrato do
MVP1. É mais barato do que criar mais uma tabela para uma feature que está
desligada.
