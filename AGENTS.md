# 🤖 Diretrizes e Workflow de Agentes — Project Auê

Este documento estabelece a governança, papéis da SQUAD, a visão de produto e o fluxo obrigatório de desenvolvimento para o repositório **Auê**.

---

## 🎙️ A SQUAD Auê

Três primos em pé de igualdade. Nenhum arbitra sobre o outro; decisões são colaborativas.

| | Papel neste repositório |
|---|---|
| 👑 **Giam** (`giam`) | Tech Lead & Arquiteto — arquitetura modular, Supabase (schema, RLS, RPC) e monetização |
| 🎨 **Guinho** (`guinho`) | Frontend & UI/UX — componentes, design system e o tom da copy |
| 🛡️ **Marcelinho** (`marcelinho`) | QA & Segurança — testes, tipos, lint, build, RLS e modularidade |

### 📖 Onde mora o contexto humano

Este documento é sobre **governança e fluxo de trabalho**. Quem são essas pessoas, de onde veio o produto e como ele fala vive fora daqui — e é para lá que se aponta, em vez de duplicar:

| Assunto | Fonte canônica |
|---|---|
| Contexto e origem do produto | [`docs/produto/HISTORIA_DO_AUE.md`](docs/produto/HISTORIA_DO_AUE.md) |
| Voz, personalidade, humor e copy | [`docs/produto/VOZ_E_PERSONALIDADE.md`](docs/produto/VOZ_E_PERSONALIDADE.md) |
| **Autoridade sobre escopo** | [`docs/functional/especificacao_funcional.md`](docs/functional/especificacao_funcional.md) |

A história é **contexto para decidir**, não licença para ampliar: não expande o MVP, não transforma ideia citada em requisito, não define autoridade técnica e não autoriza feature nova.

---

## 🎯 Objetivo Principal & Diretrizes do Produto (Sempre em Mente)

1. **Viralidade & Competitividade Ogra:** Cada funcionalidade (feeds, duelos, placar) deve incentivar a competição irreverente (estilo CoD/FIFA), com copy autêntica, engraçada e "ogra".
2. **Sustentabilidade Financeira (AdSense/Monetização):** O produto deve ser pensado desde a arquitetura e UI para suportar locais estratégicos de anúncios sem estragar a UX, garantindo que o app se pague.
3. **Engenharia de Entrega Rápida & Robusta:** Soluções inteligentes, simples de usar e altamente estáveis.

---

## 🛠️ Skills da SQUAD

Cada subagente possui **skills especializadas** (armazenadas em `.agents/skills/`) no padrão `nomeSkill`:

### 👑 Giam (`giam`)
- [`arquitetarModulo`](.agents/skills/arquitetarModulo/SKILL.md): Planejamento de arquitetura modular, schemas no Supabase, RLS, RPCs e divisão de camadas.
- [`otimizarMonetizacao`](.agents/skills/otimizarMonetizacao/SKILL.md): Inserção estratégica de anúncios (AdSense) no layout do app para rentabilização sem afetar a UX.

### 🎨 Guinho (`guinho`)
- [`criarComponenteUI`](.agents/skills/criarComponenteUI/SKILL.md): Construção de componentes React 19 no Auê Design System com Glassmorphism, responsividade e animações.
- [`aplicarTomOgro`](.agents/skills/aplicarTomOgro/SKILL.md): Criação de copys irreverentes, tom ogro, conquistas e gamificação de duelos/placares.

### 🛡️ Marcelinho (`marcelinho`)
- [`validarModularidade`](.agents/skills/validarModularidade/SKILL.md): Checklist de auditoria para barrar código monolítico, componentes inflados ou funções acopladas.
- [`auditarSegurancaETestes`](.agents/skills/auditarSegurancaETestes/SKILL.md): Execução automatizada da suíte de testes (`vitest`), linters, typecheck e auditoria RLS do Supabase.


---

## 🧱 Princípio Obrigatório: Arquitetura Modular & Funcional (Anti-Monolíticos)

- **Zero Monolíticos:** É estritamente proibido criar arquivos gigantes, funções com múltiplas responsabilidades ou componentes React acoplados.
- **Divisão de Responsabilidade:**
  - **Giam:** Desenha a arquitetura modular prévia, prevenindo monolíticos no planejamento.
  - **Guinho:** Questiona arquiteturas complexas, propõe alternativas limpas e mantém componentes de UI isolados e reutilizáveis.
  - **Marcelinho (QA):** Audita o código nos testes e **bloqueia qualquer PR/código com autosacrifício de modularidade**.

---

## 🔄 Fluxo Obrigatório de Desenvolvimento (Dev Lifecycle)

Qualquer nova funcionalidade, ajuste ou refatoração deve seguir rigorosamente as 5 etapas abaixo:

### 1. Sincronização Prévia do Ambiente
Antes de iniciar qualquer tarefa de desenvolvimento:
```bash
git checkout main
git fetch origin
git pull origin main
git status
```
> **Regra:** O ambiente base deve estar limpo e 100% atualizado com a `main` remota.

---

### 2. Criação de Worktree Isolada
Toda tarefa deve ser desenvolvida em uma **Git Worktree dedicada**, evitando alterar a árvore de trabalho principal durante o desenvolvimento.
```bash
git worktree add -b feat/nome-da-funcionalidade .worktrees/feat-nome-da-funcionalidade main
```
- Todo o desenvolvimento, commits e testes dos subagentes ocorrem dentro da worktree criada.

---

### 3. Implementação & Validação da SQUAD
1. **Planejamento Modular & Dev:** `giam` (arquitetura backend/módulos) e `guinho` (componentes frontend/UI) implementam de forma modular e colaborativa.
2. **Validação Automática e de Modularidade por Marcelinho (QA):**
   - Verificar modularidade e ausência de código monolítico.
   - Executar os testes automatizados (`npm run test`)
   - Validar checagem de tipos (`npm run typecheck`)
   - Executar linter (`npm run lint`)
   - Validar build final (`npm run build`)

---

### 4. Aprovação do Usuário & Merge com Descrição em PT-BR
Após a aprovação dos testes pelo QA (`marcelinho`):
1. **Apresentar o resultado e solicitar a aprovação do usuário.**
2. Após aprovação do usuário, realizar o merge/PR para a `main` com título e descrição em **Português (PT-BR)** condizente com a implementação:
   ```bash
   git checkout main
   git merge feat/nome-da-funcionalidade --no-ff -m "feat(modulo): Descrição Clara e Detalhada em PT-BR"
   git push origin main
   ```

---

### 5. Limpeza e Sanitização do Ambiente
Após a validação e merge:
1. Remover a worktree e excluir a branch da funcionalidade:
   ```bash
   git worktree remove .worktrees/feat-nome-da-funcionalidade --force
   git branch -d feat/nome-da-funcionalidade
   ```
2. Garantir que o repositório principal permaneça 100% sincronizado e limpo:
   ```bash
   git checkout main
   git pull origin main
   git status
   ```

---

## ⚠️ Regras Globais de Qualidade
- **Código Modular & Funcional:** Impedir a criação de arquivos monolíticos.
- **Zero tolerância a falhas:** Nenhuma alteração é mergeada sem passar em `typecheck`, `lint` e `test`.
- **Nenhum desenvolvimento direto na `main`:** Sempre utilize uma worktree isolada.
- **Commits e PRs em PT-BR:** Títulos de PR/Commits devem ser claros e em português.
