# Mapa da documentação do Auê

Se você chegou aqui por um agente, uma PR ou uma madrugada de ideia nova, use
este arquivo para não escolher a fonte errada.

O projeto tem documentação de **lançamento**, **produto**, **UX**, **arquitetura**
e **operação**. Elas não têm a mesma autoridade.

## Ordem de leitura para trabalhar no MVP1

1. [`mvp1/CONTRATO_MVP1.md`](./mvp1/CONTRATO_MVP1.md) — **o que pode entrar agora**.
2. [`../AGENTS.md`](../AGENTS.md) — **quem faz o quê e como o trabalho acontece**.
3. [`produto/HISTORIA_DO_AUE.md`](./produto/HISTORIA_DO_AUE.md) — **por que esse negócio existe**.
4. [`produto/VOZ_E_PERSONALIDADE.md`](./produto/VOZ_E_PERSONALIDADE.md) — **como o Auê fala e se comporta**.
5. [`functional/especificacao_funcional.md`](./functional/especificacao_funcional.md) — **visão funcional ampla e roadmap**.
6. [`especificacao_ux_ui.md`](./especificacao_ux_ui.md) — **como a experiência deve se comportar e parecer**.
7. [`technical/arquitetura.md`](./technical/arquitetura.md) — **como o sistema está organizado tecnicamente**.
8. [`schema/nomenclatura.md`](./schema/nomenclatura.md) — **regra para nomes no banco**.
9. [`schema/banco_de_dados.md`](./schema/banco_de_dados.md) — **guia do domínio de dados; migrações continuam sendo a fonte do schema real**.
10. [`auditoria_de_mercado.md`](./auditoria_de_mercado.md) — **hipóteses e sinais de mercado; não é requisito de produto**.
11. [`technical/ambientes.md`](./technical/ambientes.md) — **onde o Auê roda, como uma migração chega ao banco e o que o staging não prova**.
12. [`../supabase/rollback/README.md`](../supabase/rollback/README.md) — **runbook de emergência; não presume cobertura completa**.

## Quem manda em quê

| Pergunta | Fonte |
|---|---|
| Isso entra no lançamento? | `mvp1/CONTRATO_MVP1.md` |
| Quem pode implementar/revisar? | `AGENTS.md` |
| Qual é a origem do produto? | `produto/HISTORIA_DO_AUE.md` |
| Como a copy deve soar? | `produto/VOZ_E_PERSONALIDADE.md` |
| Como a feature deve funcionar no produto completo? | `functional/especificacao_funcional.md` |
| Como a tela/fluxo deve se comportar? | `especificacao_ux_ui.md` |
| Como o código/sistema se organiza? | `technical/arquitetura.md` + código |
| Qual é o schema realmente aplicado? | `supabase/migrations/` + ambiente aplicado |
| Onde o app roda e como uma migração sobe? | `technical/ambientes.md` |
| Como nomear um objeto novo do banco? | `schema/nomenclatura.md` |
| Como desfazer uma migração? | `supabase/rollback/README.md` + backup + estado real |
| O mercado garante que isso vai viralizar? | Ninguém. `auditoria_de_mercado.md` registra hipóteses, não promessa. |

## Regra de precedência

Quando documentos entrarem em conflito:

1. para **escopo do MVP1**, o contrato do MVP1 vence;
2. para **estado implementado**, código e migrações vencem documentação de intenção;
3. para **voz**, `VOZ_E_PERSONALIDADE.md` vence exemplos antigos espalhados;
4. para **história**, `HISTORIA_DO_AUE.md` é a única fonte;
5. protótipo completo e roadmap nunca ampliam o lançamento automaticamente.

## Estados que a documentação pode usar

Para não misturar sonho com software publicado, qualquer documento que fale de
funcionalidade deve deixar claro quando algo está em um destes estados:

- **MVP1** — contratado para o lançamento atual;
- **Implementado** — existe em código, mas pode estar desligado;
- **Legado** — continua existindo por compatibilidade, sem receber expansão;
- **Roadmap** — ideia/visão futura, sem autorização automática para implementar;
- **Pendente** — decisão ou validação ainda não fechada.

## Uma última regra

A documentação pode ser engraçada onde isso ajuda a explicar o produto.

Ela não pode ser engraçada a ponto de esconder risco, erro, segurança,
privacidade ou comportamento real.

O produto é um campeonato de arroto. A documentação não precisa parecer ata de
banco. Mas também não pode mentir só porque a piada ficou boa.
