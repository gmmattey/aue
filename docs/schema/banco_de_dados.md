# Banco de dados do Auê — mapa de domínio

**Status:** guia de leitura do banco versionado  
**Fonte de verdade do schema:** `supabase/migrations/`

> Este arquivo explica **para que servem os grupos de dados**. Ele não é um
> dump do banco e não substitui migração.
>
> Se uma coluna, policy, constraint ou função não estiver nas migrações
> aplicáveis, ela não existe só porque alguém escreveu bonito aqui.

---

## 1. Antes de mexer no banco

Leia também:

- [`nomenclatura.md`](./nomenclatura.md) — regra para nomes novos;
- [`../mvp1/CONTRATO_MVP1.md`](../mvp1/CONTRATO_MVP1.md) — para saber se a mudança
  pertence ao lançamento;
- [`../technical/arquitetura.md`](../technical/arquitetura.md) — contexto de
  sessão anônima, RLS, RPC e batalhas.

Regra simples:

> ideia de produto não vira tabela automaticamente.

Se a feature está fora do MVP1, o fato de o schema já ter alguma estrutura
antiga para ela não é convite para completar o sistema.

---

## 2. Núcleo atual do domínio

### `profiles`

Identidade persistida associada ao Supabase Auth.

É a exceção histórica ao padrão de tabela em português e permanece assim por
compatibilidade com código, FKs, policies e triggers já existentes.

No MVP1 a pessoa não vê tela obrigatória de perfil: a sessão pode ser anônima,
mas o backend ainda possui uma identidade técnica.

### `resultados`

Registro das avaliações persistidas pelo Auê.

É onde vivem as métricas usadas pelo score e os dados necessários para
rastreabilidade do resultado oficial.

Princípio de segurança:

> o cliente pode calcular para responder rápido; não pode escolher qualquer
> nota e gravá-la como verdade oficial.

A coerência é protegida por regra server-side versionada nas migrações.

---

## 3. Batalha do MVP1

### `batalhas`

Sessão competitiva compartilhada por link `/b/CODIGO`.

O código da batalha funciona como credencial de acesso à sessão enquanto ela
estiver válida.

### `rodadas_batalha`

Entradas sequenciais da batalha: cada participante responde com um resultado e
a disputa cresce em formato de revanche/placar.

### Regra de acesso

Essas tabelas não devem virar feed público nem ganhar listagem global por
conveniência.

O acesso do app passa pelas RPCs previstas para a batalha e pelo código
imprevisível da sessão.

A expiração pública é de até 7 dias. A retenção do **arquivo de áudio** depois
disso continua sendo decisão pendente de produto/privacidade.

---

## 4. Desafio antigo

### `desafios`

Pertence ao fluxo legado `/d/CODIGO` de duelo de turno único.

Estado: **LEGADO**.

Continua existindo para compatibilidade com links antigos e para não quebrar
dados já criados. Nova mecânica competitiva não deve ser desenhada em cima
dele sem decisão explícita.

---

## 5. Social e gamificação — implementado/parcial, fora do MVP1

O repositório possui estruturas criadas durante a fase em que o Auê estava
crescendo para virar uma rede social antes de validar o jogo.

Entre elas estão:

- `comentarios`;
- `reacoes`;
- `posts_comunidade`;
- `seguidores`;
- `favoritos`;
- `denuncias`;
- `grupos`;
- `membros_grupo`;
- `campeonatos`;
- `participantes_campeonato`;
- `conquistas`;
- `conquistas_usuario`;
- `push_subscriptions`;
- a view `global_ranking`.

Essas estruturas podem continuar no banco e no código, mas **não fazem parte do
corte atual só porque existem**.

Feature flag esconde superfície. O contrato decide produto.

---

## 6. XP

O desenho inicial previa uma tabela `eventos_xp`.

Ela **não é o modelo implementado**. O XP existente foi construído por regras e
triggers ligados a resultados/perfis.

Esse detalhe já causou regressão no passado. Portanto:

- não ressuscitar `eventos_xp` copiando especificação antiga;
- não redefinir função de XP em migração sem revisar as versões anteriores;
- XP está fora do MVP1 e não deve bloquear o lançamento.

---

## 7. Storage

O projeto usa Supabase Storage para mídia quando o fluxo exige persistência.

Buckets existentes/planejados devem ser confirmados nas migrações e no painel
antes de qualquer operação destrutiva.

Regras:

- não tornar áudio público por conveniência;
- não confundir URL difícil de adivinhar com autorização;
- não reter mídia indefinidamente sem regra de produto/privacidade;
- moderação/ocultação precisa continuar valendo no caminho de leitura do áudio.

---

## 8. RLS e autorização

Toda tabela exposta ao cliente precisa ter a combinação correta de:

- `ENABLE ROW LEVEL SECURITY`;
- policies;
- grants;
- RPCs quando acesso direto não é adequado.

RLS ligada sem policy pode bloquear tudo. RLS desligada porque "estava dando
erro" pode abrir tudo. Nenhum dos dois é correção.

### FK de usuário

Para objetos novos, a convenção é preferir `public.profiles(id)` quando isso
for compatível com o domínio e com a necessidade de joins no PostgREST.

As exceções antigas estão documentadas em [`nomenclatura.md`](./nomenclatura.md)
e não devem ser "arrumadas" no susto.

---

## 9. RPCs, triggers e constraints

No Auê, parte importante da regra competitiva vive no banco.

Isso é deliberado quando o navegador não pode ser a autoridade final.

Antes de alterar uma função:

1. procure todas as migrações que a criaram/redefiniram;
2. procure todos os consumidores no frontend;
3. valide grants e RLS relacionados;
4. escreva teste de regressão quando a regra puder ser representada fora do
   banco;
5. tenha rollback ou estratégia de restauração compatível.

Função SQL redefinida em várias migrações é terreno clássico para "consertei A
e ressuscitei B".

---

## 10. O que aconteceu com o modelo antigo

A primeira versão deste arquivo desenhava nove tabelas planejadas, com nomes
como `usuarios`, `arrotos`, `participacoes_desafio`, `competicoes` e
`eventos_xp`.

Esse desenho **não correspondeu ao banco que foi construído**.

Ele foi substituído por este mapa porque manter um schema fictício ao lado das
migrações reais estava ensinando agente novo a implementar em cima de coisa que
não existia.

O histórico continua no Git. Não precisamos manter uma mentira ativa para
lembrar do passado.

---

## 11. Fonte de verdade operacional

Para responder "isso existe no banco?":

1. `supabase/migrations/`;
2. estado do ambiente Supabase onde as migrações foram aplicadas;
3. só depois documentação explicativa.

E existe uma ressalva importante: neste ambiente de desenvolvimento, várias
migrações foram revisadas por leitura sem execução local contra Postgres.
Portanto **arquivo de migração versionado também não prova sozinho que o remoto
está sincronizado**.

Antes do lançamento público, a cadeia de migrações do MVP1 precisa ser aplicada
e validada em ambiente real/staging.
