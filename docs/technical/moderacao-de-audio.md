# Moderação de áudio — runbook

- **Status:** ativo
- **Para quem:** Luiz, sozinho, sem preparo prévio
- **Depende de:** migrações `20260807000027` e `20260807000028` aplicadas
- **Onde se executa:** painel do Supabase → SQL Editor, e painel → Storage

Este documento é operacional. Ele não explica o desenho — isso está no cabeçalho
de `supabase/migrations/20260807000028_moderacao_de_audio.sql`. Aqui só tem o que
fazer, na ordem, com o SQL pronto para copiar.

**Não existe tela de administração.** Foi decisão consciente: uma tela de admin
exige um papel de administrador, autenticação privilegiada no cliente e uma
superfície nova de ataque, tudo para um moderador só. O SQL Editor do painel já
roda como owner e já ignora RLS.

---

## 0. Os três fatos que mudam a urgência

1. **Esconder tem efeito quase imediato, mas não instantâneo.** O áudio é
   servido por URL assinada com validade de **5 minutos**
   (`SEGUNDOS_DE_ASSINATURA` em `src/db/supabase.ts`). Assinatura já emitida
   **não é revogável**: no pior caso o áudio continua tocando por até 5 minutos
   depois de você esconder, para quem já estava com a página aberta.

2. **Quem já baixou, tem.** Um arquivo baixado antes de você esconder está no
   computador da pessoa. Nada neste runbook alcança isso, e nenhuma tecnologia
   alcançaria.

3. **Esconder é reversível; apagar não é.** Prefira esconder. Só apague quando o
   conteúdo não puder existir nem sob revisão.

---

## 1. Achar o arroto

Você vai ter um destes pontos de partida: o id do post no feed, o código do
desafio, ou nada além de "o do apelido X".

```sql
-- Fila de revisão: o que foi denunciado, mais denunciado primeiro.
select r.id            as result_id,
       r.caminho_do_audio,
       r.esta_escondido,
       r.esta_travado_por_moderacao,
       p.apelido,
       count(distinct d.user_id) as denunciantes,
       min(d.criado_em)         as primeira_denuncia,
       array_agg(distinct d.reason) as motivos
  from public.denuncias d
  join public.resultados r on r.id = d.result_id
  left join public.perfis p on p.id = r.user_id
 group by r.id, r.caminho_do_audio, r.esta_escondido, r.esta_travado_por_moderacao, p.apelido
 order by denunciantes desc, primeira_denuncia asc;
```

```sql
-- A partir do código do desafio (o que vem no link /d/CODIGO).
select d.id as desafio,
       r.id as resultado_id, r.caminho_do_audio, r.esta_escondido, r.esta_travado_por_moderacao
  from public.desafios d
  join public.resultados r on r.id = d.resultado_desafiante_id
 where d.id = 'COLE_O_CODIGO';
```

```sql
-- A partir do id de um post do feed.
select pc.id as post_id,
       r.id as resultado_id, r.caminho_do_audio, r.esta_escondido, r.esta_travado_por_moderacao
  from public.posts_comunidade pc
  join public.resultados r on r.id = pc.result_id
 where pc.id = 'COLE_O_ID_DO_POST';
```

Guarde o `result_id`. É ele que todos os comandos abaixo usam.

---

## 2. Esconder

```sql
update public.resultados
   set esta_escondido = true,
       esta_travado_por_moderacao = true
 where id = 'COLE_O_RESULT_ID';
```

O que isso faz, na prática:

- O áudio **para de assinar**. Em até 5 minutos ninguém mais consegue tocá-lo,
  nem pelo feed, nem pelo desafio, nem pelo link direto, nem o próprio autor.
- O card **some do feed** e a linha **some do ranking**.
- `esta_travado_por_moderacao = true` diz "um humano decidiu": denúncias novas
  continuam sendo registradas, mas o gatilho automático não mexe mais nisto.

Confira:

```sql
select id, esta_escondido, esta_travado_por_moderacao from public.resultados where id = 'COLE_O_RESULT_ID';
```

---

## 3. Restaurar

Quando a denúncia foi injusta — três pessoas combinadas ainda escondem uma
gravação legítima, e o gatilho não sabe distinguir.

```sql
update public.resultados
   set esta_escondido = false,
       esta_travado_por_moderacao = true
 where id = 'COLE_O_RESULT_ID';
```

**Mantenha `esta_travado_por_moderacao = true`.** Sem isso, a próxima denúncia de uma
terceira pessoa distinta esconde tudo de novo e o seu trabalho é desfeito
silenciosamente — era exatamente esse o comportamento antes da
`20260807000028`.

O post no feed volta sozinho? **Não necessariamente.** Se o post ainda existir em
`posts_comunidade`, sim. Se o autor apagou o áudio pelo app, o post foi apagado
junto e não volta.

---

## 4. Apagar de verdade

Apagar significa remover o arquivo do Storage. **Isso não dá para fazer por SQL.**

Por quê, sem rodeio: `storage.objects` é uma tabela de metadados. Um
`DELETE FROM storage.objects` apaga a linha e **deixa o arquivo no bucket S3 por
trás**, sem nenhuma referência — pior que não apagar, porque some da sua vista e
continua ocupando espaço e sendo faturado. A remoção real passa pela API de
Storage, que exige a `service_role`.

Escolha registrada: **runbook manual, não uma segunda Edge Function.** O
repositório tem uma Edge Function (`og-preview`), publicada e no ar. Ela existe
porque roda sozinha a cada link compartilhado. Uma segunda função, para uma
operação que acontece raramente e sempre com um humano na frente, seria mais
código para manter e publicar sem ganhar nada.

### 4.1 Ordem obrigatória

**Esconda primeiro** (seção 2). Isso corta o acesso em 5 minutos enquanto você
faz o resto com calma. Nunca comece pelo Storage.

### 4.2 Pegue o caminho do arquivo

```sql
select caminho_do_audio from public.resultados where id = 'COLE_O_RESULT_ID';
```

Formato: `<user_id>/<result_id>.webm`.

### 4.3 Apague o objeto pelo painel

Painel do Supabase → **Storage** → bucket `audio_records` → entre na pasta com o
`user_id` → selecione o arquivo com o nome do `result_id` → **Delete**.

### 4.4 Limpe o ponteiro e o post

```sql
-- Nesta ordem: primeiro o post, depois o ponteiro.
delete from public.posts_comunidade
 where result_id = 'COLE_O_RESULT_ID'
   and post_type = 'audio_result';

update public.resultados
   set caminho_do_audio = null,
       esta_escondido = true,
       esta_travado_por_moderacao = true
 where id = 'COLE_O_RESULT_ID';
```

Deixar `caminho_do_audio` apontando para um arquivo que não existe mais faz o app
mostrar "Este áudio não está disponível" com um botão de tentar de novo que
nunca vai funcionar. Limpar o ponteiro faz o app dizer "sem áudio salvo", que é
a verdade.

**A nota continua existindo.** Score, XP e histórico de desafio permanecem. Se
precisar tirar a nota do ranking também, mantenha `esta_escondido = true` (o comando
acima já faz isso).

---

## 5. Pedido de exclusão do titular

**Na maioria dos casos você não precisa fazer nada.** O autor consegue apagar o
próprio áudio pelo app, no botão "Apagar meu áudio" da tela de resultado: isso
limpa o ponteiro, apaga o post de áudio dele e remove o arquivo do bucket.

Faça à mão só quando a pessoa não tem mais acesso à conta. Nesse caso siga a
seção 4 inteira, pulando o `esta_escondido = true` se ela não pediu para tirar a nota.

**O que este produto ainda NÃO tem:** exclusão de conta. Não existe caminho para
apagar o perfil, o histórico e o XP de alguém. Se esse pedido chegar, ele não
tem procedimento — é trabalho a fazer, não um passo esquecido deste documento.

---

## 6. Quando o gatilho automático agir sozinho

Ele esconde um resultado assim que **3 pessoas distintas com conta** o
denunciam. Você não é avisado — não há notificação, e-mail nem fila que apite.

Rode a consulta da seção 1 periodicamente. Se um resultado aparecer com
`esta_escondido = true` e `esta_travado_por_moderacao = false`, foi o gatilho, e ninguém
revisou ainda.

```sql
-- Escondido pelo automático e nunca revisado por um humano.
select r.id, r.caminho_do_audio, p.apelido, count(distinct d.user_id) as denunciantes
  from public.resultados r
  left join public.denuncias d on d.result_id = r.id
  left join public.perfis  p on p.id = r.user_id
 where r.esta_escondido = true
   and r.esta_travado_por_moderacao = false
 group by r.id, r.caminho_do_audio, p.apelido
 order by denunciantes desc;
```

Depois de olhar, sempre feche com `esta_travado_por_moderacao = true` — escondendo
(seção 2) ou restaurando (seção 3).

---

## 7. O que este runbook NÃO cobre

- **Cópia já baixada.** Fora de alcance, sempre.
- **URL assinada emitida antes de você esconder.** Continua válida por até 5
  minutos. Não há como revogar.
- **Áudio órfão no bucket.** Se a RPC `definir_audio_do_resultado` falhar depois
  do upload, o cliente tenta apagar o arquivo, mas essa limpeza pode falhar
  também. O resultado é um arquivo sem nenhuma linha apontando para ele.
  Ninguém consegue tocá-lo (a policy exige um `resultados` correspondente), mas
  ele ocupa espaço. Não existe hoje uma varredura que encontre esses arquivos.
- **Retenção.** Não há expiração automática, cota total nem limpeza periódica.
  O bucket cresce para sempre.
- **Denúncia de post que não é áudio.** `denuncias.result_id` aponta para
  `resultados`. Link social abusivo e comentário abusivo não têm caminho de
  denúncia nenhum.
- **Bloquear um usuário.** Não existe. Alguém que poste conteúdo abusivo
  repetidamente só pode ser contido arroto por arroto.
