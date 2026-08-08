# Rollback manual de migrações — USO DE EMERGÊNCIA

Estes arquivos **não são migrações**. Eles ficam deliberadamente **fora** de
`supabase/migrations/` para que `supabase db push` / `supabase migration up`
**nunca** os apliquem sozinhos, e não têm carimbo de versão na sequência.

## Para que servem

As migrações `20260807000010` em diante são grandes e fazem várias coisas por
arquivo (constraints, funções, policies, triggers). O Postgres roda cada
arquivo de migração numa transação, então uma falha no meio faz rollback
automático **daquele arquivo**. O problema é outro: quando o arquivo aplica com
sucesso e o efeito em produção se mostra errado (uma constraint rejeitando
gravação legítima, um trigger derrubando um fluxo), não havia caminho de volta
escrito. É isso que estes scripts cobrem.

## Como usar

1. Rode **um arquivo por vez**, na **ordem inversa** da numeração:

   ```
   20260807000026  ->  20260807000025  ->  20260807000024
   ->  20260807000023  ->  20260807000016  ->  20260807000015
   ->  20260807000012  ->  20260807000011  ->  20260807000010
   ```

   **A cobertura tem buracos.** Não existe script para `000013`, `000014`,
   `000017`, `000018`, `000019`, `000020`, `000021` nem `000022`. Desfazer a
   `000023` sem desfazer as intermediárias funciona (elas não se sobrepõem),
   mas descer abaixo da `000016` deixa o banco com objetos criados pelas
   migrações sem rollback — `posts_comunidade`, `seguidores`, `favoritos`,
   `conquistas` — apontando para um estado anterior. Nessa faixa, restaure de
   `pg_dump` em vez de encadear rollbacks.

   Pular etapa deixa o banco num estado que nenhuma das duas versões prevê. Por
   exemplo, desfazer a `000011` sem antes desfazer a `000016` deixa a policy de
   INSERT de `desafios` apontando para uma função que ainda existe, mas com
   `resultados` de volta ao INSERT direto — combinação nunca testada.

2. Aplique com um role de owner (`postgres`), via SQL Editor do painel ou
   `psql`. Nenhum deles funciona pela anon key.

3. Rode dentro de uma transação explícita e confira antes de confirmar:

   ```sql
   BEGIN;
   \i 20260807000016_desafios_insert_ownership.down.sql
   -- confira o estado
   COMMIT;  -- ou ROLLBACK;
   ```

4. Depois de rodar, remova a linha correspondente de
   `supabase_migrations.schema_migrations` se quiser poder reaplicar a migração
   pela CLI:

   ```sql
   DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260807000016';
   ```

## O que estes scripts NÃO fazem

- **Não recuperam dados criados no intervalo.** Nada aqui é backup. Linhas
  gravadas entre a migração e o rollback continuam como estão — e algumas são
  perdidas de propósito: o rollback da `000011` remove as colunas
  `desafios.winner` e `desafios.resolved_at`, apagando os vereditos
  persistidos. Se isso importar, faça `pg_dump` antes.
- **Não revertem ação fora do Postgres.** Segredos do Vault, Edge Functions
  publicadas, buckets de Storage e configuração de Database Webhooks feitos no
  painel continuam onde estão.
- **Não restauram um estado mais seguro.** Rollback anda para trás: desfazer a
  `000023` traz de volta o bug de acúmulo de XP (C1) e a ocultação de gravação
  por 3 requisições anônimas (A2); desfazer a `000011` devolve o INSERT direto
  em `resultados` (score falsificável pelo cliente); desfazer a `000010` traz
  de volta o bug de XP na sua primeira encarnação (C4) e o role
  `authenticated` sem acesso (C5). Cada arquivo repete esse aviso no cabeçalho.

## Estado de validação — leia antes de confiar

**Nenhum destes scripts foi executado.** Não há Postgres, Docker, `psql` nem
Supabase CLI neste ambiente de desenvolvimento, e Luiz decidiu não subir um
banco local. Eles foram escritos por leitura das migrações correspondentes e
revisão manual — não passaram por parser de SQL. Trate-os como rascunho
revisado, não como procedimento testado: leia o arquivo inteiro antes de rodar
e use `BEGIN`/`ROLLBACK` para conferir.

O mesmo vale para as próprias migrações `000015` e `000016`.
