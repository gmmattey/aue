# Agentes e skills do Auê

Tudo que a SQUAD usa mora aqui dentro. **Nada externo ao repositório é
necessário para trabalhar no Auê**, e nada externo tem autoridade sobre o que
está definido aqui e no [`AGENTS.md`](../AGENTS.md).

## Quem é quem

Definidos em [`AGENTS.md`](../AGENTS.md) §3:

- **Giam** — Diretor de produto e game design: visão, UX, UI, copy, plano,
  prioridade e aceite. É ele quem fala com o primo
- **Guinho** — Lead de engenharia web/gameplay: branch, código, Arena, PR e merge
- **Marcelo** — QA e confiabilidade: testes, segurança, privacidade e celular real
- **Camillo** — Plataforma Android/iOS e conselho de arquitetura
- **Bruno** — Direção de arte e motion: Art Bible, Bolha, assets e animação
- **Lucas** — Áudio e ML: microfone, YAMNet, feedback e régua de áudio
- **Marcos** — Produção e release: cadência, backlog, CI e evidência de entrega

A ordem de atuação está em [`AGENTS.md`](../AGENTS.md) §3 e §5. Giam planeja;
Bruno e Lucas entram quando a entrega toca visual, motion ou áudio; Marcos
organiza dependências e evidências; Guinho ou Camillo implementa; Marcelo cuida
da qualidade; Giam aceita; o primo aprova o merge. Skill nenhuma dispensa essa
ordem.

## Onde os sete estão definidos

O papel de cada um é decidido no [`AGENTS.md`](../AGENTS.md) §3 — lá é a fonte.
As definições de runner repetem essa fonte: Claude Code carrega
[`.claude/agents/`](../.claude/agents/) e Codex carrega
[`.codex/agents/`](../.codex/agents/), um arquivo por agente em cada pasta.

```text
.claude/agents/
├── giam.md
├── guinho.md
├── marcelo.md
├── camillo.md
├── bruno.md
├── lucas.md
└── marcos.md
```

**Esses arquivos não criam papel nem regra.** Eles repetem o que o `AGENTS.md`
já diz e apontam as skills de cada um. Mudou o §3, muda o arquivo junto.

**Nenhum deles tem modelo fixo.** Os sete rodam do mais barato ao mais caro,
escolhido pela dificuldade da tarefa, com o esforço acompanhando a incerteza —
[`AGENTS.md`](../AGENTS.md) §3, "Qual modelo e quanto esforço".

### A `description` vai entre aspas. Sempre.

O cabeçalho desses sete arquivos é YAML, e em YAML **um valor sem aspas não
pode ter dois-pontos seguido de espaço no meio**. Se tiver, o arquivo não é
lido — e o agente simplesmente **não existe**, sem erro em lugar nenhum. Você só
descobre quando chama e ouvem "esse agente não existe".

Foi o que aconteceu em 13/08: as descrições do Giam, do Marcelo e do Camillo
tinham `dono do produto: ...`, `alinhada ao produto: ...` e `é dele: ...`. **Os
três estavam mortos e ninguém sabia.** O Guinho era o único vivo, porque a
descrição dele não tinha dois-pontos.

Por isso as sete descrições estão entre aspas duplas, inclusive as que hoje
não precisariam. Mexeu numa, mantém as aspas.

## Skills

```text
.agents/skills/
│
│   GIAM — produto, desenho e entrega
├── conversarComOPrimo/       falar com o dono do produto sem tecnês e sem assumir
├── pensarComoJogo/           critérios de jogo mobile casual
├── desenharExperiencia/      UX: fluxo, estado da Arena, sensação e erro
├── desenharInterface/        UI: spec visual a partir do protótipo e dos tokens
├── aplicarTomOgro/           a voz do Auê aplicada à copy
├── matarCheiroDeIA/          filtro anti-linguagem e anti-formato de IA
├── arquitetarModulo/         desenho modular e contratos de dados
├── registrarIssue/           issue, PR e commit em linguagem de primo
│
│   GUINHO — implementação
├── criarComponenteUI/        constrói a UI desenhada pelo Giam
├── garantirMobileReal/       Safari iOS, Chrome Android e PWA de verdade
├── rodarNoIphone/            construir, assinar e instalar a casca num iPhone
├── escreverAdaptadorNativo/  código nativo atrás de porta que já existe
├── escreverTestes/           teste junto com a implementação
│
│   MARCELO — qualidade
├── validarModularidade/      acoplamento e duplicação de regra
├── auditarSegurancaETestes/  testes, build, RLS e celular real
│
│   CAMILLO — plataforma e conselho
├── regrasDoAndroid/          permissão, fabricante, aparelho velho e a Play
└── aconselharArquitetura/    aconselhar sem virar dono da decisão

│   BRUNO — direção de arte e motion
├── criarComponenteUI/        Bolha, assets, tipografia e animação jogável
│
│   LUCAS — áudio e ML
├── escreverTestes/           captura, YAMNet, régua e falhas honestas
│
│   MARCOS — produção e release
└── registrarIssue/            backlog, dependências, CI e evidência
```

## O dom comum

Os sete agentes entendem o mesmo jogo antes de aplicar sua especialidade:

`ARROTAR → NOTA → DESAFIAR → RESPONDER → REVANCHE`.

Todos protegem a Bolha, a tensão, o impacto e a vontade de tentar de novo. A
brincadeira pode ser solta e dinâmica; erro, privacidade, segurança e escopo
continuam sendo tratados com precisão.

Skill não é propriedade privada: o Guinho usa `registrarIssue` no PR dele, o
Marcelo usa `aplicarTomOgro` e `matarCheiroDeIA` para checar o texto
entregue, e o Camillo usa `escreverAdaptadorNativo`, `escreverTestes` e
`registrarIssue` iguais às do Guinho — a fronteira e a voz não mudam de dono por
causa da plataforma. O que a coluna diz é **quem responde por aquilo**.

O aceite da entrega, papel do Giam, não tem skill: o procedimento é
[`AGENTS.md`](../AGENTS.md) §5.5.

Cada skill é um `SKILL.md` com frontmatter (`name`, `description`) e um
procedimento. **Skill é procedimento, não fonte de verdade** — cada uma aponta
para a fonte canônica do assunto e não repete a regra.

`otimizarMonetizacao` foi removida no reposicionamento de 2026-08-09: monetização
saiu da visão do produto.
