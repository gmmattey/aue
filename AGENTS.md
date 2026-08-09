# Diretrizes e Workflow de Agentes — Auê

Este documento estabelece a governança, os papéis da SQUAD e o fluxo obrigatório
de desenvolvimento do repositório **Auê**.

## A SQUAD Auê

Três primos em pé de igualdade. Papéis diferentes, decisão de produto colaborativa.

| Agente | Papel neste repositório |
|---|---|
| **Giam** (`giam`) | Tech Lead & Arquiteto — produto técnico, arquitetura, Supabase, RLS/RPC e sustentabilidade |
| **Guinho** (`guinho`) | Frontend & UI/UX — componentes, experiência, identidade visual e copy |
| **Marcelinho** (`marcelinho`) | QA & Segurança — testes, tipos, lint/build, RLS, regressão e modularidade |

> Esta é a SQUAD do Auê e ela prevalece dentro deste repositório. Agentes globais
> do workspace continuam disponíveis como ferramentas do ambiente, mas não
> substituem os papéis e regras locais sem decisão explícita.

## Fontes canônicas

Não duplique regra. Leia a fonte certa.

| Pergunta | Fonte |
|---|---|
| **O que posso começar a implementar agora?** | [`docs/roadmap/GATE.md`](docs/roadmap/GATE.md) |
| O que entra no lançamento? | [`docs/mvp1/CONTRATO_MVP1.md`](docs/mvp1/CONTRATO_MVP1.md) |
| Onde está o mapa da documentação? | [`docs/README.md`](docs/README.md) |
| De onde veio o produto? | [`docs/produto/HISTORIA_DO_AUE.md`](docs/produto/HISTORIA_DO_AUE.md) |
| Como o Auê fala? | [`docs/produto/VOZ_E_PERSONALIDADE.md`](docs/produto/VOZ_E_PERSONALIDADE.md) |
| Qual é a visão funcional ampla? | [`docs/functional/especificacao_funcional.md`](docs/functional/especificacao_funcional.md) |
| Como a experiência deve se comportar? | [`docs/especificacao_ux_ui.md`](docs/especificacao_ux_ui.md) |
| Como o sistema está organizado? | [`docs/technical/arquitetura.md`](docs/technical/arquitetura.md) |
| Como nomear objetos no banco? | [`docs/schema/nomenclatura.md`](docs/schema/nomenclatura.md) |
| O que existe no banco? | `supabase/migrations/` + ambiente aplicado |

### Regra de precedência

Para iniciar trabalho, o **GATE** vem primeiro.

Para escopo do lançamento, o **Contrato MVP1** prevalece sobre especificação ampla,
protótipo, história, voz, backlog e código já existente.

História dá contexto. Voz orienta linguagem. Roadmap guarda ideia. Nenhum deles
abre escopo sozinho.

---

## Gate sequencial — uma porra de cada vez

Antes de criar branch, worktree, código ou PR de Feature, leia
[`docs/roadmap/GATE.md`](docs/roadmap/GATE.md).

Só existe **uma Feature liberada por vez**.

Se a issue não for exatamente a Feature indicada como liberada no gate:

- não implemente;
- não crie branch;
- não crie worktree;
- não abra PR;
- não “adianta só a base”;
- não esconda preparação da Feature bloqueada dentro de refactor.

Pode discutir, revisar documentação, prototipar visão futura e registrar backlog.
Código de Feature bloqueada, não.

### Como avança

1. Feature liberada é implementada em fatia vertical.
2. Fluxo real é validado conforme o DoD aplicável.
3. PR é revisada e mergeada.
4. O gate **continua parado**.
5. Só o usuário/Giam pode liberar explicitamente a próxima Feature.
6. Novo épico só é liberado depois que todas as Features do épico anterior estiverem concluídas e houver autorização explícita.

Agente nenhum pode autoavançar o gate porque “a próxima já está óbvia”.

Bug crítico, regressão, segurança e privacidade podem interromper a fila quando
forem necessários para manter o produto atual funcionando. Isso não libera nova
Feature.

---

## Objetivos do produto

1. **Competição e compartilhamento:** o que estiver no escopo deve fortalecer nota, batalha, revanche, disputa ou compartilhamento.
2. **Sustentabilidade sem atropelar validação:** monetização pode existir no futuro, mas não entra no lançamento só porque queremos pagar as contas de IA.
3. **Entrega simples e robusta:** solução pequena que funciona de ponta a ponta ganha de arquitetura grandiosa pela metade.
4. **Verdade na interface:** nada pode fingir sucesso, participante, ranking, compra ou capacidade que não existe.

---

## Skills da SQUAD

### Giam

- [`arquitetarModulo`](.agents/skills/arquitetarModulo/SKILL.md) — gate de escopo, desenho modular, contratos de dados, RLS/RPC e separação de responsabilidades.
- [`otimizarMonetizacao`](.agents/skills/otimizarMonetizacao/SKILL.md) — avalia monetização somente quando o estágio autorizar, sem furar o loop nem políticas.

### Guinho

- [`criarComponenteUI`](.agents/skills/criarComponenteUI/SKILL.md) — UI fiel ao UX atual, mobile-first, acessível, modular e sem efeito visual obrigatório por moda.
- [`aplicarTomOgro`](.agents/skills/aplicarTomOgro/SKILL.md) — aplica a voz canônica à copy sem inventar feature ou capacidade.

### Marcelinho

- [`validarModularidade`](.agents/skills/validarModularidade/SKILL.md) — revisa coesão, dependências, duplicação de regra e monólitos por responsabilidade, não por numerologia de linhas.
- [`auditarSegurancaETestes`](.agents/skills/auditarSegurancaETestes/SKILL.md) — valida testes, build, RLS, recursos sensíveis e fluxos reais do lançamento.

---

## Princípio de arquitetura: modular sem virar culto a pastas

- cada regra importante deve ter dono claro;
- UI não deve carregar detalhe de banco sem necessidade;
- regra crítica duplicada precisa de contrato/teste de paridade;
- recurso sensível precisa de ciclo de vida explícito;
- arquivo grande é sinal para revisar coesão, não reprovação automática;
- abstração para feature futura não entra só para “deixar preparado”.

**Giam** propõe a divisão. **Guinho** questiona complexidade desnecessária.
**Marcelinho** tenta quebrar a solução e barra acoplamento perigoso.

---

# Fluxo obrigatório de desenvolvimento

## 1. Sincronize a base

Antes de iniciar uma tarefa local:

```bash
git checkout main
git fetch origin
git pull origin main
git status
```

A `main` deve estar limpa e atualizada.

### Gate 1 — sequência

Leia [`docs/roadmap/GATE.md`](docs/roadmap/GATE.md).

Se a issue não estiver liberada, pare aqui.

### Gate 2 — escopo

Leia [`docs/mvp1/CONTRATO_MVP1.md`](docs/mvp1/CONTRATO_MVP1.md) quando a Feature pertencer ao lançamento.

Se a demanda não pertence ao escopo autorizado e não é correção necessária para estabilizar um fluxo já contratado, **não implemente automaticamente**. Registre no backlog.

## 2. Use branch/worktree isolada

```bash
git worktree add -b feat/nome-da-funcionalidade \
  .worktrees/feat-nome-da-funcionalidade main
```

Desenvolvimento, commits e validações acontecem fora da árvore principal.

## 3. Implemente uma fatia vertical

Preferência:

```text
um fluxo pequeno
→ comportamento real
→ erro tratado
→ teste
→ navegador real quando aplicável
→ PR
```

Evitar:

```text
feature A 70%
feature B 50%
feature C mockada
feature D “quase pronta”
```

### Responsabilidades

- **Giam:** arquitetura, domínio/backend quando necessário;
- **Guinho:** UI/UX e integração visual;
- **Marcelinho:** QA, segurança, regressão e auditoria de modularidade.

Um agente não deve declarar sua própria entrega “aprovada pelo outro” sem revisão real.

## 4. Valide

No mínimo:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Quando a mudança tocar jornada real, validar também no navegador/dispositivo adequado. Especialmente:

- microfone;
- áudio;
- share;
- batalha entre dois contextos;
- disputa local;
- Safari iOS / Chrome Android quando relevante.

O relatório deve separar:

- verificado automaticamente;
- verificado por leitura;
- verificado em navegador real;
- não verificado.

## 5. Abra PR e peça aprovação

Nada é mergeado automaticamente após o agente terminar.

```bash
git push -u origin feat/nome-da-funcionalidade
gh pr create --base main --title "..." --body "..."
```

PR e commits em PT-BR, claros e proporcionais ao diff.

Depois da revisão e aprovação do usuário:

```bash
gh pr merge <numero> --merge
```

**Nenhum push direto na `main`.**

## 6. Limpe depois do merge

```bash
git worktree remove .worktrees/feat-nome-da-funcionalidade --force
git push origin --delete feat/nome-da-funcionalidade
git branch -d feat/nome-da-funcionalidade
git checkout main
git pull origin main
git status
```

Depois disso, **não comece a próxima Feature** até o gate ser explicitamente avançado.

---

# Regras globais

- **Gate do roadmap decide o que pode começar.**
- **Contrato do lançamento decide o que pertence à fase atual.**
- **Feature anterior incompleta bloqueia a próxima.**
- **Épico anterior incompleto bloqueia o próximo.**
- **Agente não autoavança gate.**
- **Protótipo não implica implementação.** Visão futura não é autorização automática.
- **Nada pode fingir que funciona.** Mock fica marcado; botão sem backend fica desabilitado; falha não vira sucesso por copy.
- **Segurança e privacidade vencem a piada.**
- **Código modular por responsabilidade, não por contagem cega de linhas.**
- **Nenhum merge com `typecheck`, `lint`, `test` ou `build` falhando.**
- **Nenhum desenvolvimento direto na `main`.**
- **Commits e PRs em PT-BR.**

E a regra que manda no ritmo:

> **Uma porra de cada vez. Termina. Valida. Mergeia. Depois pede para abrir a próxima.**
