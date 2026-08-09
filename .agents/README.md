# Agentes e skills do Auê

Tudo que a SQUAD usa mora aqui dentro. **Nada externo ao repositório é
necessário para trabalhar no Auê**, e nada externo tem autoridade sobre o que
está definido aqui e no [`AGENTS.md`](../AGENTS.md).

## Os três

Definidos em [`AGENTS.md`](../AGENTS.md) §3:

- **Giam** — Guardião da entrega e dono do produto: design, UX, UI, copy,
  arquitetura, plano, prioridade e aceite. É ele quem fala com o primo
- **Guinho** — Implementação: branch, código, Arena, PR e merge
- **Marcelinho** — Qualidade do código e da interface alinhada ao produto

A ordem de atuação (Giam → Guinho → Marcelinho → aceite do Giam) está em
[`AGENTS.md`](../AGENTS.md) §3 e §5. Skill nenhuma dispensa essa ordem.

## Skills

```text
.agents/skills/
│
│   GIAM — produto, desenho e entrega
├── conversarComOPrimo/      falar com o dono do produto sem tecnês e sem assumir
├── pensarComoJogo/          critérios de jogo mobile casual
├── desenharExperiencia/     UX: fluxo, estado da Arena, sensação e erro
├── desenharInterface/       UI: spec visual a partir do protótipo e dos tokens
├── aplicarTomOgro/          a voz do Auê aplicada à copy
├── matarCheiroDeIA/         filtro anti-linguagem e anti-formato de IA
├── arquitetarModulo/        desenho modular e contratos de dados
├── registrarIssue/          issue, PR e commit em linguagem de primo
│
│   GUINHO — implementação
├── criarComponenteUI/       constrói a UI desenhada pelo Giam
├── garantirMobileReal/      Safari iOS, Chrome Android e PWA de verdade
├── escreverTestes/          teste junto com a implementação
│
│   MARCELINHO — qualidade
├── validarModularidade/     acoplamento e duplicação de regra
└── auditarSegurancaETestes/ testes, build, RLS e celular real
```

Skill não é propriedade privada: o Guinho usa `registrarIssue` no PR dele, e o
Marcelinho usa `aplicarTomOgro` e `matarCheiroDeIA` para checar o texto
entregue. O que a coluna diz é **quem responde por aquilo**.

O aceite da entrega, papel do Giam, não tem skill: o procedimento é
[`AGENTS.md`](../AGENTS.md) §5.5.

Cada skill é um `SKILL.md` com frontmatter (`name`, `description`) e um
procedimento. **Skill é procedimento, não fonte de verdade** — cada uma aponta
para a fonte canônica do assunto e não repete a regra.

`otimizarMonetizacao` foi removida no reposicionamento de 2026-08-09: monetização
saiu da visão do produto.
