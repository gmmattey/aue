# Rollback manual de migrações — uso de emergência

Estes arquivos **não são migrações**.

Eles ficam deliberadamente fora de `supabase/migrations/` para que
`supabase db push` / `supabase migration up` nunca os aplique sozinho.

Rollback aqui é ferramenta de emergência, não botão de desfazer.

## Antes de qualquer coisa

Compare os dois diretórios:

```text
supabase/migrations/
supabase/rollback/
```

**Não presuma cobertura completa.** O histórico de migrações cresce mais rápido
que o conjunto de scripts de rollback e existem versões sem `.down.sql`
correspondente.

Se a migração que você precisa desfazer não tiver rollback revisado, o caminho
seguro pode ser restauração de backup/`pg_dump`, não improvisar SQL em produção.

## O que um rollback resolve

Uma migração pode aplicar com sucesso e só depois revelar problema real:

- constraint rejeitando gravação legítima;
- trigger duplicando efeito;
- policy bloqueando o app;
- função quebrando um fluxo publicado.

O rollback tenta voltar a estrutura/regra para um estado anterior conhecido.

Ele **não** desfaz o tempo.

## Como usar

### 1. Identifique a cadeia afetada

Leia:

- a migração que entrou;
- migrações posteriores que dependem dela;
- o rollback correspondente, se existir.

Rollback precisa seguir **ordem inversa de dependência/versão**. Pular uma etapa
pode criar um estado que nunca existiu nem antes nem depois.

### 2. Faça backup quando houver risco de dado

Antes de remover coluna, tabela, constraint com transformação ou qualquer
estrutura que carregue informação relevante, tenha `pg_dump`/backup adequado.

Rollback não recupera linha apagada só porque o schema voltou.

### 3. Use role de owner

Execute via SQL Editor/`psql` com privilégio adequado.

Anon key não é ferramenta de rollback.

### 4. Teste em transação quando o comando permitir

Exemplo:

```sql
BEGIN;

-- execute o conteúdo do .down.sql
-- confira objetos, grants, policies e dados afetados

ROLLBACK; -- para ensaio
-- COMMIT; somente quando a decisão for confirmada
```

Não assuma que todo efeito externo ao Postgres participa da transação.

### 5. Confira o registro de migrações

Se for necessário reaplicar a versão pela CLI depois do rollback, revise o
estado de:

```text
supabase_migrations.schema_migrations
```

Remover manualmente uma versão desse controle sem entender o estado do banco
pode fazer a CLI reaplicar uma migração sobre objetos que continuam lá.

## O que estes scripts NÃO fazem

- não recuperam dados perdidos;
- não revertem segredo do Vault;
- não desfazem Edge Function publicada;
- não desfazem configuração manual no dashboard;
- não garantem que Storage/bucket voltou ao estado anterior;
- não garantem que um estado anterior era mais seguro;
- não substituem backup;
- não substituem validação da cadeia completa.

## Segurança pode piorar ao voltar

Migrações de segurança normalmente existem porque o estado anterior tinha um
problema.

Desfazer uma migração pode reabrir:

- escrita direta que permitia score forjado;
- policy permissiva;
- bucket público;
- trigger antigo com bug;
- comportamento de XP já corrigido.

Por isso, leia o cabeçalho de cada `.down.sql` antes de executar.

## Estado de validação

Historicamente, vários scripts desta pasta e várias migrações do projeto foram
**escritos/revisados por leitura sem execução local contra Postgres**, porque o
ambiente de desenvolvimento não tinha Postgres/Docker/`psql`/Supabase CLI
configurado para esse fim.

Isso significa:

> arquivo versionado e revisão manual não equivalem a rollback testado.

Antes de depender de um script em produção:

1. valide sintaxe/execução em ambiente seguro;
2. aplique a migração correspondente;
3. crie dado representativo;
4. execute o rollback;
5. confira schema, RLS, grants, funções, triggers e dados;
6. reaplique a migração se esse for o procedimento esperado.

## Migrações novas

Toda migração nova com risco relevante deve responder na própria PR:

- precisa de rollback manual?
- se não, qual é a estratégia de restauração?
- perde dados ao voltar?
- muda segurança ao voltar?
- depende de configuração fora do Postgres?

Não aumente silenciosamente a lista de migrações sem caminho de retorno.

## Regra final

Se você está lendo este arquivo no meio de um incidente, não transforme
"rollback disponível" em reflexo automático.

Primeiro descubra o que quebrou e qual estado você quer restaurar.

Voltar rápido para o bug anterior continua sendo voltar para um bug.
