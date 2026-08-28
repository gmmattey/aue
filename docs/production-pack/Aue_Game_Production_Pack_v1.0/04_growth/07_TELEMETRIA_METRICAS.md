# Auê! — Telemetria & Product Metrics Spec

## 1. Objetivo

Responder com pouco dado:

> **onde o Auê perde jogadores e um arroto trouxe o próximo?**

Não construir infraestrutura de vigilância.

## 2. North Star

**Arrotos que geram outro arroto.**

A aproximação operacional é acompanhar propagação por X1/compartilhamento e resposta.

## 3. Funil principal

```text
abriu_arena
→ iniciou_arroto
→ recebeu_nota
→ compartilhou / criou_x1
→ abriu_x1
→ respondeu_x1
→ pediu_revanche
```

## 4. Eventos v1

| Evento | Disparo |
|---|---|
| `abriu_arena` | entrada relevante na Arena |
| `iniciou_arroto` | captura realmente começou |
| `recebeu_nota` | resultado válido existe |
| `tentou_novamente` | nova tentativa iniciada a partir de resultado/erro |
| `compartilhou` | ação de share/cópia foi efetivamente acionada conforme definição |
| `criou_x1` | backend confirmou batalha |
| `abriu_x1` | link/batalha recebida abriu contexto válido |
| `respondeu_x1` | resposta do guest foi concluída/confirmada |
| `pediu_revanche` | novo round iniciou |
| `concluiu_roda` | Roda encerrou com placar |

## 5. Propriedades mínimas

- `id`;
- `evento`;
- `criado_em`;
- `sessao_id` aleatório;
- `origem`;
- `campanha` opcional;
- `conteudo` opcional;
- `plataforma`;
- `versao_app`;
- referência de batalha somente se necessária e de modo que não exponha capability URL.

## 6. Não coletar

- nome;
- email;
- IP manualmente;
- localização precisa;
- áudio;
- transcrição;
- user-agent completo desnecessário;
- conteúdo digitado;
- fingerprint;
- código privado completo do X1.

## 7. Sessão

Criar UUID/ID aleatório local e reaproveitar no período definido da sessão.

Não fingerprintar hardware/navegador.

## 8. Aquisição

Parâmetros aceitos:

```text
?src=tiktok
?src=instagram
?src=youtube
?src=whatsapp
?src=google
?src=qr
?src=x1
?campaign=duvido_bater_01
?content=video_03
```

Sem origem: `direct`.

Origem inicial não deve ser sobrescrita durante navegação interna.

## 9. Armazenamento

Supabase é suficiente na fase atual.

Tabela de eventos deve ser **write-only para cliente público**:

- INSERT válido permitido;
- SELECT negado;
- UPDATE negado;
- DELETE negado;
- RLS;
- allowlist/check de eventos.

Não criar `SECURITY DEFINER` apenas para contornar RLS.

## 10. API de cliente

Conceito:

```ts
registrarEvento('recebeu_nota', props)
```

Requisitos:

- best-effort;
- não bloquear UI;
- não lançar erro para gameplay;
- dedupe de eventos óbvios;
- não disparar só porque componente renderizou.

## 11. Métricas

### Ativação

`recebeu_nota / abriu_arena`

### Conversão de gravação

`iniciou_arroto / abriu_arena`

### Sucesso de tentativa

`recebeu_nota / iniciou_arroto`

### Propagação

`criou_x1 / recebeu_nota` e `compartilhou / recebeu_nota`

### Aceite do desafio

`abriu_x1 / criou_x1` quando correlacionável sem comprometer privacidade.

### Resposta do X1

`respondeu_x1 / abriu_x1`

### Revanche

`pediu_revanche / confrontos_concluidos`

### Retorno

Sessões que reaparecem dentro de janela definida, sem transformar ID em perfil permanente.

## 12. Diagnóstico

### Muitas views, poucos acessos

Problema de conteúdo/CTA/distribuição.

### Muitos acessos, poucos `iniciou_arroto`

Problema de proposta/entrada/confiança/permissão.

### Iniciou, pouca nota

Problema de detector, áudio, UX ou falha técnica.

### Nota, pouco X1/share

Problema do loop social/result screen.

### X1 aberto, pouca resposta

Problema de VERSUS, alvo, confiança ou fricção.

### Resposta, pouca revanche

Placar não provoca o suficiente ou partida já satisfez a curiosidade.

## 13. Dashboard

Fora do v1. Queries SQL simples bastam até existir volume que justifique painel.

## 14. Query conceitual de funil

```sql
select evento, count(*)
from eventos_telemetria
where criado_em >= now() - interval '7 days'
group by evento;
```

Depois segmentar por origem/campanha.

## 15. Privacidade

Política deve explicar em linguagem humana que eventos anônimos de uso podem ser coletados para entender e melhorar o jogo.

Não chamar de publicidade personalizada quando não for.

## 16. Critério de sucesso

A telemetria é boa quando muda uma decisão de produto. Se só produz gráfico bonito, falhou.
