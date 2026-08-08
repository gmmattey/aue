# Nomenclatura do banco — Auê

- **Status:** ativo
- **Fonte de verdade da regra:** este arquivo
- **Fonte de verdade do que existe:** `supabase/migrations/` + ambiente aplicado
- **Escopo:** tabelas, colunas, FKs, funções, policies, índices e buckets

Existe porque o schema cresceu misturando português e inglês e isso já custou
bug real.

Mas uma regra vem antes da regra de nome:

> antes de criar objeto novo, confirme em
> [`../mvp1/CONTRATO_MVP1.md`](../mvp1/CONTRATO_MVP1.md) que a mudança pertence
> ao estágio atual.

Nomenclatura não é autorização de escopo.

---

## 1. Tabelas

Para tabela nova do domínio:

**Português do Brasil, plural, `snake_case`, no schema `public`.**

Exemplos já compatíveis com a direção:

```text
resultados
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

Estrangeirismo consolidado pode existir quando faz sentido (`score`, `ranking`,
`post`), mas isso não é convite para transformar o schema em metade inglês,
metade português por preguiça.

Sem prefixo de projeto (`aue_`) em tabela. O schema já é namespace.

---

## 2. Colunas

Regra prática para novas colunas:

**inglês, `snake_case`**, salvo campos de domínio já consolidados em português.

Exemplos técnicos:

```text
id
created_at
user_id
result_id
is_premium
post_type
expires_at
```

Campos já consolidados no domínio podem manter português:

```text
nome
descricao
apelido
icone
categoria
```

Não crie `name` ao lado de `nome` significando a mesma coisa só para seguir uma
regra no automático.

Convenções:

| Papel | Forma |
|---|---|
| Chave primária | `id` |
| Chave estrangeira | `<entidade_singular>_id` |
| Criação | `created_at timestamptz` em UTC |
| Booleano | `is_*` |
| Momento de evento | `<verbo>_at` (`resolved_at`, `joined_at`) |
| Tipo textual | `<conceito>_type` + constraint/check quando aplicável |

Timestamp deve ser `timestamptz` e tratado em UTC.

---

## 3. Chaves estrangeiras para identidade

Para tabela nova que pertença a uma pessoa autenticada/anônima pelo Supabase,
prefira `public.profiles(id)` quando o domínio permitir.

Motivo prático: FKs para `profiles` permitem relações PostgREST com dados de
perfil; FKs antigas apontando diretamente para `auth.users` já obrigaram RPC
extra só para fazer join.

`profiles` é criado a partir do fluxo de Auth e funciona como identidade pública
do domínio.

Ressalva: isso cria dependência do provisionamento de `profiles`. Se o trigger
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
entrar_batalha
```

Não renomeie RPC antiga publicada só para ficar bonita. Builds antigos podem
continuar chamando o nome anterior.

Exceções deliberadas:

- `aue_*` pode marcar regra de negócio compartilhada e canônica, como fórmula
  versionada;
- `handle_*`, `check_*`, `protect_*` podem marcar funções internas de trigger;
- funções antigas híbridas/inglesas permanecem por compatibilidade até existir
  migração segura.

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
profiles_fundadores
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
| `profiles` | tabela em inglês | amplamente referenciada por Auth, policies, triggers, FKs e cliente |
| `push_subscriptions` | tabela em inglês | usada pelo fluxo de push/Edge Function |
| `global_ranking` | view em inglês | consumidores existentes e termo consolidado |
| `xp_total`, `nivel` | idioma misto em `profiles` | dívida antiga ligada a regras de XP |
| RPCs como `submit_resultado`, `toggle_reacao`, `toggle_favorite`, `toggle_follow` | nomes híbridos/ingleses | chamadas por nome pelo cliente publicado |
| algumas FKs `user_id` → `auth.users` | alvo diferente do padrão novo | migrar exige revisar FK, RLS e consumidores |

Compatibilidade ganha de estética.

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
