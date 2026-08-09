# Mapa da documentação do Auê

Se você chegou aqui por um agente, uma PR ou uma madrugada de ideia nova, use
este arquivo para não escolher a fonte errada.

O projeto tem documentação de **gate**, **lançamento**, **produto**, **UX**, **arquitetura**
e **operação**. Elas não têm a mesma autoridade.

## Ordem de leitura para começar trabalho

1. [`roadmap/GATE.md`](./roadmap/GATE.md) — **o que está liberado para começar agora**.
2. [`mvp1/CONTRATO_MVP1.md`](./mvp1/CONTRATO_MVP1.md) — **o que pertence ao lançamento atual**.
3. [`../AGENTS.md`](../AGENTS.md) — **quem faz o quê e como o trabalho acontece**.
4. [`produto/HISTORIA_DO_AUE.md`](./produto/HISTORIA_DO_AUE.md) — **por que esse negócio existe**.
5. [`produto/VOZ_E_PERSONALIDADE.md`](./produto/VOZ_E_PERSONALIDADE.md) — **como o Auê fala e se comporta**.
6. [`functional/especificacao_funcional.md`](./functional/especificacao_funcional.md) — **visão funcional ampla e roadmap**.
7. [`especificacao_ux_ui.md`](./especificacao_ux_ui.md) — **como a experiência deve se comportar e parecer**.
8. [`technical/arquitetura.md`](./technical/arquitetura.md) — **como o sistema está organizado tecnicamente**.
9. [`schema/nomenclatura.md`](./schema/nomenclatura.md) — **regra para nomes no banco**.
10. [`schema/banco_de_dados.md`](./schema/banco_de_dados.md) — **guia do domínio de dados; migrações continuam sendo a fonte do schema real**.
11. [`auditoria_de_mercado.md`](./auditoria_de_mercado.md) — **hipóteses e sinais de mercado; não é requisito de produto**.
12. [`technical/ambientes.md`](./technical/ambientes.md) — **onde o Auê roda, como uma migração chega ao banco e o que o staging não prova**.
13. [`../supabase/rollback/README.md`](../supabase/rollback/README.md) — **runbook de emergência; não presume cobertura completa**.

## Quem manda em quê

| Pergunta | Fonte |
|---|---|
| Posso começar esta Feature agora? | `roadmap/GATE.md` |
| Isso pertence ao lançamento? | `mvp1/CONTRATO_MVP1.md` |
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
| O mercado garante que isso vai viralizar? | Ninguém. `auditoria_de_mercado.md` registra hipótese, não milagre. |

## Regra de precedência

Quando documentos entrarem em conflito:

1. para **início de trabalho**, o `GATE.md` vence;
2. para **escopo do lançamento**, o contrato do MVP1 vence;
3. para **estado implementado**, código e migrações vencem documentação de intenção;
4. para **voz**, `VOZ_E_PERSONALIDADE.md` vence exemplos antigos espalhados;
5. para **história**, `HISTORIA_DO_AUE.md` é a única fonte;
6. protótipo completo e roadmap nunca ampliam o lançamento automaticamente.

## Estados que a documentação pode usar

Para não misturar sonho com software publicado:

- **LIBERADO** — pode começar agora porque o gate autorizou;
- **BLOQUEADO** — existe no roadmap, mas não pode começar ainda;
- **MVP1/Lançamento** — pertence ao primeiro lançamento, mesmo que ainda esteja bloqueado pela sequência;
- **Implementado** — existe em código, mas pode estar desligado;
- **Legado** — continua existindo por compatibilidade, sem receber expansão;
- **Roadmap** — visão futura, sem autorização automática para implementar;
- **Pendente** — decisão ou validação ainda não fechada.

## Uma última regra

A documentação pode falar palavrão, zoar e parecer escrita pelos três primos.

Ela não pode ser engraçada a ponto de esconder risco, erro, segurança,
privacidade ou comportamento real.

O produto é um jogo de arroto. A documentação não precisa parecer ata de banco.
Mas também não pode meter caô só porque a frase ficou boa.
