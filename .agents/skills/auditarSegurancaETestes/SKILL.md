---
name: auditarSegurancaETestes
description: Procedimento do Marcelinho para validar testes, build, RLS, recursos sensiveis e fluxos reais do jogo em celular.
---

# Skill: auditarSegurancaETestes

Runbook do **Marcelinho (Qualidade)** antes de aprovar a qualidade de uma
entrega.

Marcelinho aprova qualidade. O **aceite** contra os requisitos é do Giam
([`AGENTS.md`](../../../AGENTS.md) §5.5). Este runbook produz a evidência que o
Giam usa para decidir.

Teste verde é necessário. Não é prova de que o produto funciona no celular.

## 0. Leia o escopo

Antes de validar, consulte
[`docs/escopo/ESCOPO_ATUAL.md`](../../../docs/escopo/ESCOPO_ATUAL.md).

QA também barra expansão de escopo. Feature fora do jogo não ganha passe livre
porque os testes dela passaram.

E QA barra mentira: nada pode fingir que funciona. Botão sem backend fica
desabilitado, mock fica marcado, falha não vira sucesso por copy, e nota não
aparece quando não houve nota.

## 1. Pipeline automático

Executar:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Qualquer comando com saída diferente de zero bloqueia entrega.

Mas quatro `exit 0` não encerram QA.

## 2. Teste do comportamento alterado

Para cada mudança, responder:

- qual comportamento poderia regredir?
- existe teste que falha se eu remover a correção?
- o teste está verificando comportamento ou só implementação/mock?
- existe caminho de erro equivalente ao happy path?

Quando possível, faça o teste provar que **pega** o defeito: injete a falha,
confirme que o teste quebra e restaure.

## 3. Microfone e recursos sensíveis

Em qualquer mudança de gravação:

- `MediaStreamTrack.stop()` precisa ocorrer em todos os caminhos de saída;
- negar permissão não pode deixar estado preso;
- erro ao criar/iniciar `MediaRecorder` libera stream;
- desmontagem da tela libera recurso;
- UI não pode afirmar gravação ativa depois do recurso morrer.

Luz do microfone acesa depois de sair da tela é bug crítico.

## 4. Supabase / RLS

Para migração/tabela/RPC nova ou alterada:

- RLS está habilitada quando necessário?
- grants e policies concordam?
- `anon` e `authenticated` têm apenas o necessário?
- regra competitiva confiou demais no payload do cliente?
- capability URL da batalha pode ser enumerada/listada?
- expiração é validada server-side?
- dado escondido/moderado continua inacessível pelo caminho de mídia?

Não usar "a rota não aparece na navegação" como controle de acesso.

### Ausência de erro NÃO é sucesso

A regra mais cara que este repositório aprendeu, e ela nasce do jeito que este
banco funciona:

- **consulta barrada por RLS não devolve erro — devolve vazio.** Sem policy de
  leitura, `select` responde "nenhuma linha", igualzinho a uma tabela que não
  tem o registro;
- **o Storage responde 200 sem remover nada** quando a policy de remoção
  recusa. Nenhum erro, uma lista vazia;
- **RPC que não encontrou o que fazer também volta calada.**

Onde isso já mordeu de verdade: o botão de apagar o próprio arroto dizia
"apagado" e não apagava. A função perguntava o caminho do arquivo para uma
tabela fechada, recebia vazio, concluía "não havia arquivo", pulava a remoção e
declarava sucesso. O ponteiro saía, o arquivo ficava. Ninguém viu porque nada
falhou.

O que cobrar em toda revisão que toca banco ou bucket:

- [ ] o código distingue **"não tem"** de **"não posso ver"**?
- [ ] resposta vazia de operação de escrita/remoção é tratada como **falha**?
- [ ] o sucesso é confirmado pelo **que o servidor devolveu**, não pela ausência
      de exceção?
- [ ] a ordem protege o usuário — o passo que não dá para desfazer acontece
      **depois** do que pode falhar?

## 5. Batalha `/b/`

Quando a mudança tocar batalha, validar ponta a ponta:

1. criar batalha;
2. receber código;
3. abrir em segundo contexto/aparelho;
4. carregar rodadas;
5. tocar áudio existente;
6. responder;
7. atualizar sequência/placar;
8. repetir revanche;
9. validar link inválido;
10. validar link expirado.

Nenhum dado de demo pode aparecer como se fosse participante real.

## 6. Disputa local

Quando habilitada/alterada:

- mínimo 2 e máximo 5 participantes;
- 1–3 rounds;
- ordem de turnos correta;
- não pular/duplicar participante;
- ranking/pódio coerente com regra definida;
- toque repetido não duplica rodada;
- fluxo completo em aparelho real.

## 7. Persistência e idempotência

Atenção especial para:

- XP/efeitos antigos disparando mesmo com UI desligada;
- submit duplicado;
- retry criando duas linhas;
- trigger aplicando efeito duas vezes;
- resultado usado numa batalha sendo persistido novamente sem necessidade.

Se repetir a mesma requisição puder duplicar prêmio, rodada ou resultado,
registre o risco e corrija no dono certo.

## 8. SQL e migrações

Neste ambiente, várias migrações foram historicamente revisadas por leitura sem
Postgres local.

Portanto:

- não alegar "migração validada" só porque o TypeScript passa;
- revisar SQL e dependências;
- quando houver ambiente real/staging, aplicar em transação e testar;
- revisar rollback/restauração;
- confirmar que o ambiente remoto está na versão esperada.

Arquivo de migração correto no Git não prova banco sincronizado.

## 9. Celular real

**Celular real é padrão, não exceção.** No desktop o inset é zero e a barra do
navegador não recolhe — vários defeitos do jogo só são observáveis no aparelho.

Alvos mínimos:

- Safari iOS;
- Chrome Android;
- comportamento desktop quando alterado.

Checar:

- permissão;
- áudio;
- share;
- navegação/reload;
- viewport;
- reduced motion quando UI mudar.

Mock de MediaRecorder testa nosso código, não testa o navegador.

## 10. Relatório de QA

Separar claramente:

- **verificado automaticamente**;
- **verificado por leitura**;
- **verificado em navegador real**;
- **não verificado**;
- **bloqueios**.

Nunca escrever "QA aprovado" se a parte crítica só foi inferida por leitura.

Marcelinho não precisa parecer confiante. Precisa ser preciso.
