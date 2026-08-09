# Ambientes do Auê

Onde o Auê realmente roda, e como uma migração chega ao banco. Nada disto dá
para descobrir lendo o repositório, e foi por isso que este arquivo existe.

## Os dois bancos

Ambos ficam na mesma organização do Supabase, ambos em `sa-east-1`.

| Ambiente | Projeto | Ref | Para quê |
|---|---|---|---|
| Produção | `Auê` | `enjykrpprjfmeqxunzcs` | o app no ar em `aue.vercel.app` |
| Staging | `aue-staging` | `rrkkmzamjntplgxktkyc` | **provar migração antes de encostar na produção** |

O staging não aparecia em lugar nenhum do repositório até esta página. Ele foi o
que impediu que as migrações `000034` e `000035` estreassem na produção sem
nunca terem passado por um Postgres.

**O staging não é cópia da produção.** Ele tem esquema, não tem conteúdo — na
única vez em que foi usado tinha 1 resultado e nenhum áudio. Isso define o que
ele consegue e o que não consegue provar:

- **prova**: que o SQL aplica sem erro, e que policies, funções e constraints
  ficaram como o esperado;
- **não prova**: que gravar, assinar URL e **ouvir** continuam funcionando —
  não há áudio lá para tocar.

O segundo item é o que falha em silêncio. Toda migração que toca RLS de
`resultados` ou policy do bucket precisa, depois da produção, de um teste
manual: abrir uma batalha em `aue.vercel.app` e apertar o play.

## Como uma migração chega ao banco

**Colando o SQL no SQL Editor do painel.** Não é preferência, é o que sobrou:

- o **MCP do Supabase VOLTOU A FUNCIONAR** (2026-08-09). Ele estava falhando em
  toda chamada com `net::ERR_FAILED`, inclusive nas que não tocavam projeto
  nenhum, e por isso este arquivo dizia que só sobrava o painel. Hoje ele lista
  projeto, roda consulta e aplica migração — foi por ele que a
  `20260809000001_revanche_melhor_tentativa` subiu no staging. **Continue
  conferindo o estado real do banco depois de aplicar**: a lição de baixo, sobre
  o histórico de migrações não refletir a pasta, continua valendo;
- a **CLI** está autenticada e enxerga os projetos, mas `supabase link` pede a
  senha do banco, que ninguém tem guardada. O repositório também não tem
  `supabase/config.toml`, então a CLI nem reconhece o diretório como projeto;
- a **API de gerenciamento** exigiria um token pessoal.

### A consequência que mais engana

Como tudo é aplicado por fora da CLI, **`supabase_migrations.schema_migrations`
não reflete `supabase/migrations/`**. O banco não sabe quais migrações rodaram.

Ou seja: `supabase migration list` mente aqui. Para saber o que está aplicado,
pergunte ao banco o que existe — `pg_policies`, `pg_proc`, `pg_constraint` — e
não ao histórico.

Se um dia isso for consertado, o caminho é `supabase init`, resetar a senha do
banco em *Project Settings → Database*, `supabase link` e `supabase db push`.
Resetar a senha invalida a string de conexão direta; hoje nada do app depende
dela (o app fala por PostgREST com a chave anônima), mas confira antes.

## Escrevendo a validação de uma migração

Dois detalhes do SQL Editor que já custaram tempo:

1. **Ele mostra só o resultado da última instrução.** Um arquivo com dez
   `SELECT` de checagem roda os dez e exibe um. Faça **uma** consulta com
   `UNION ALL`, uma linha por checagem.
2. **Consulta muito longa chega truncada**, e o erro não diz isso — vem como
   `42601: syntax error at end of input`. Se aparecer, encurte antes de
   procurar erro de sintaxe que não existe.

Modelo do que uma validação precisa responder, no caso das migrações de RLS:

```sql
select 'vazamento' as checagem,
       case when count(*) = 0 then 'OK' else 'FALHOU: ' || string_agg(policyname, ',') end as r
from pg_policies
where schemaname='public' and tablename in ('resultados','desafios') and cmd='SELECT'
union all
select 'audio definer',
       case when count(*) filter (where prosecdef) = 2 then 'OK'
            else 'FALHOU: ' || count(*) filter (where prosecdef)::text || ' de 2' end
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('aue_audio_esta_visivel','aue_audio_esta_escondido');
```

## Ordem que não pode ser invertida

Migração e deploy não são independentes quando a migração muda um contrato que
o build no ar consome. A `000034` é o exemplo: ela passou `/d/CODIGO` para RPC,
e o build antigo lia `desafios` direto. Entre aplicar a migração e publicar o
build novo, **os links `/d/` legados ficaram quebrados**.

Antes de aplicar, pergunte: o app que está no ar agora continua funcionando com
este banco? Se a resposta for não, migração e deploy viram um passo só, e a
janela entre eles é tempo de produto quebrado.

## Variáveis da Vercel são lidas em tempo de build

Projeto `aue`, time `buildea-projects`, domínio `aue.vercel.app`.

Toda variável `VITE_*` entra no bundle **no build**. Configurar no painel depois
do deploy não muda nada até um rebuild. Já derrubou o app uma vez, em silêncio,
com `VITE_SUPABASE_URL` ausente: o bundle sai com a tela "o app não está
configurado" e nada no painel indica isso.

As do lançamento atual:

| Variável | Por que importa |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | sem elas o app nem monta |
| `VITE_CONTATO_PRIVACIDADE` | vazia, a política publica "canal de contato não configurado" |
| `VITE_FEATURE_DISPUTA_LOCAL` | sem `1`, a disputa presencial não existe no build |

O corte de flags está em [`src/shared/flags.ts`](../../src/shared/flags.ts), que
é a fonte única: o padrão é sempre desligado, e ligar é ato deliberado.

---

## Quem publica, e quem valida

São duas coisas separadas, e confundir as duas gera deploy duplicado.

| O quê | Quem faz | Quando |
|---|---|---|
| **Publicar** | a Vercel, pela integração com o GitHub | todo push vira prévia; todo merge na `main` vira produção |
| **Validar** | [`.github/workflows/validacao.yml`](../../.github/workflows/validacao.yml) | toda PR para a `main`, e todo push na `main` |

**A Vercel publica sozinha desde antes de existir workflow aqui.** Os deploys
aparecem no GitHub criados por `vercel[bot]`. Não existe, e não deve existir, um
workflow que também publique: seriam duas publicações por push, disputando qual
chega por último em produção.

### O workflow de validação não tem segredo nenhum

Nenhum token, chave ou variável precisa estar no *Settings → Secrets* do GitHub
para ele funcionar. `typecheck`, `lint`, `test` e `build` rodam sem
`.env.local` — nenhum depende de banco, rede ou chave. As chaves do app vivem na
Vercel e são injetadas por ela no build.

Se um dia a publicação migrar para o GitHub, aí sim seria preciso um
`VERCEL_TOKEN` — e a integração da Vercel teria que ser desligada no mesmo ato.

### O que ainda não está travado

O workflow **roda**, mas ainda não **impede** o merge. Tornar a validação
obrigatória é configuração de branch protection no GitHub, em *Settings →
Branches → main*, marcando `typecheck · lint · test · build` como check
obrigatório. Enquanto isso não for feito, o vermelho aparece na PR mas não
bloqueia o botão.
