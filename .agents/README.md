# Agentes e skills do Auê

Tudo que a SQUAD usa mora aqui dentro. **Nada externo ao repositório é
necessário para trabalhar no Auê**, e nada externo tem autoridade sobre o que
está definido aqui e no [`AGENTS.md`](../AGENTS.md).

## Os três

Definidos em [`AGENTS.md`](../AGENTS.md) §3:

- **Giam** — Guardião da entrega: arquitetura, plano, prioridade e aceite
- **Guinho** — Implementação: branch, código, Arena, PR e merge
- **Marcelinho** — Qualidade do código e da interface alinhada ao produto

A ordem de atuação (Giam → Guinho → Marcelinho → aceite do Giam) está em
[`AGENTS.md`](../AGENTS.md) §3 e §5. Skill nenhuma dispensa essa ordem.

## Skills

```text
.agents/skills/
├── arquitetarModulo/        (Giam)        desenho modular e contratos de dados
├── criarComponenteUI/       (Guinho)      UI fiel ao protótipo da Arena
├── aplicarTomOgro/          (Guinho)      a voz do Auê aplicada à copy
├── validarModularidade/     (Marcelinho)  acoplamento e duplicação de regra
└── auditarSegurancaETestes/ (Marcelinho)  testes, build, RLS e celular real
```

O aceite da entrega, papel do Giam, não tem skill: o procedimento é
[`AGENTS.md`](../AGENTS.md) §5.5.

Cada skill é um `SKILL.md` com frontmatter (`name`, `description`) e um
procedimento. **Skill é procedimento, não fonte de verdade** — cada uma aponta
para a fonte canônica do assunto e não repete a regra.

`otimizarMonetizacao` foi removida no reposicionamento de 2026-08-09: monetização
saiu da visão do produto.
