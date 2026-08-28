# Inventário do reposicionamento — Auê vira jogo

Levantamento feito **antes** de mexer em qualquer coisa, para o reposicionamento
do Auê de "webapp/app social" para **jogo mobile casual, web-first**.

Cada item aqui está classificado como **manter**, **reescrever**, **arquivar** ou
**remover**. Este arquivo é registro histórico da decisão: ele não é fonte de
regra e não precisa ser lido para trabalhar. Para trabalhar, leia
[`../AGENTS.md`](../AGENTS.md).

Data do inventário: 2026-08-09.

---

## 1. Critério usado

| Classificação | Significa |
|---|---|
| **manter** | continua verdadeiro na visão de jogo, sem edição de conteúdo |
| **reescrever** | o assunto continua necessário, mas o texto descreve o produto errado |
| **arquivar** | não vale mais como regra, mas guarda decisão ou contexto que não pode sumir |
| **remover** | descreve produto ou processo que deixou de existir, e não guarda nada insubstituível |

Arquivado vai para [`_arquivo/`](_arquivo/) com carimbo no topo. Removido sai do
repositório — o histórico do git continua sendo o backup.

---

## 2. Documentos

| Documento | Classificação | Motivo | Destino |
|---|---|---|---|
| `AGENTS.md` | **reescrever** | era gate sequencial + precedência de contrato; vira autoridade única e autossuficiente | `AGENTS.md` |
| `CLAUDE.md` | **manter** | já contém apenas `@AGENTS.md` | — |
| `README.md` | **reescrever** | descreve "webapp/PWA", MVP1, feed desligado por flag | `README.md` |
| `docs/README.md` | **reescrever** | mapa apontava para gate, contrato e spec ampla | `docs/README.md` |
| `docs/roadmap/GATE.md` | **remover** | o gate sequencial deixou de existir por decisão de produto | — |
| `docs/mvp1/CONTRATO_MVP1.md` | **arquivar** | substituído por `escopo/ESCOPO_ATUAL.md`; guarda a decisão de retenção de áudio dos 7 dias, que foi migrada para o novo escopo | `_arquivo/` |
| `docs/functional/especificacao_funcional.md` | **arquivar** | 1166 linhas de visão social ampla: feed, seguidores, XP, ligas, temporadas | `_arquivo/` |
| `docs/especificacao_ux_ui.md` | **arquivar** | UX de sequência de páginas; a Arena de estado único a substitui | `_arquivo/` |
| `docs/lancamento.md` | **arquivar** | checklist de execução do MVP1; o próprio texto já se declara parcialmente falso | `_arquivo/` |
| `docs/auditoria_de_mercado.md` | **arquivar** | hipóteses de mercado da fase social; não é requisito | `_arquivo/` |
| `docs/squad.md` | **remover** | só restava "objetivos de entrega", e o item 1 era monetização por anúncio — fora da visão. O resto vive no `AGENTS.md` | — |
| `docs/produto/HISTORIA_DO_AUE.md` | **manter** | por que o produto existe; não conflita com jogo | `docs/jogo/HISTORIA.md` |
| `docs/produto/VOZ_E_PERSONALIDADE.md` | **manter** | a voz é a mesma; o protótipo da Arena a confirma | `docs/jogo/VOZ.md` |
| `docs/technical/arquitetura.md` | **reescrever** | descrevia rotas por tela e superfície social por flag | `docs/technical/arquitetura.md` |
| `docs/technical/ambientes.md` | **manter** | onde roda e como migração sobe; independe da visão | — |
| `docs/technical/deploy-vercel-e-og-dinamico.md` | **manter** | deploy e OG continuam válidos | — |
| `docs/technical/deteccao-de-arroto-yamnet.md` | **manter** | detecção real de arroto é peça central do jogo | — |
| `docs/technical/moderacao-de-audio.md` | **manter** | privacidade mínima continua no escopo | — |
| `docs/schema/nomenclatura.md` | **manter** | regra de nome de banco | — |
| `docs/schema/banco_de_dados.md` | **manter** | guia de domínio; migrações continuam sendo a fonte | — |
| `docs/design_system/Auê Design System/` | **manter** | tokens de marca continuam válidos; passa a ser subordinado ao protótipo da Arena e ganha caminho sem acento | `docs/design/design-system/` |
| `supabase/rollback/README.md` | **manter** | runbook de emergência | — |

### Documentos criados

| Documento | Cobre |
|---|---|
| `docs/jogo/VISAO.md` | visão do jogo |
| `docs/jogo/LOOP.md` | loop principal |
| `docs/jogo/ARENA.md` | estados da Arena |
| `docs/jogo/REGRAS.md` | regras de gameplay |
| `docs/design/README.md` | protótipo oficial da Arena e como usá-lo |
| `docs/design/DESIGN_SYSTEM.md` | design system, derivado de `arena.html` |
| `docs/escopo/ESCOPO_ATUAL.md` | escopo atual |
| `docs/escopo/BACKLOG.md` | backlog imediato |
| `docs/_arquivo/README.md` | o que foi arquivado e por quê |

---

## 3. Protótipo

| Item | Classificação | Destino |
|---|---|---|
| `Web-Prototype-Arena Aue.zip` (estava em `Downloads/`) | **manter** | `docs/design/fontes/Web-Prototype-Arena-Aue.zip` |
| Conteúdo extraído | **manter** | `docs/design/prototipo-arena/` |
| `prototipo-arena/arena.html` | **manter** | **referência visual principal** |
| Demais HTMLs do protótipo | **manter** | referência auxiliar de estado e componente |
| `prototipo-arena/_backup-antes-v2-tokens/` | **manter** | histórico do próprio protótipo, sem autoridade |
| `prototipo-arena/DESIGN-HANDOFF.md` | **manter como anexo, sem autoridade** | ver aviso em `docs/design/README.md` |

> **Aviso sobre o `DESIGN-HANDOFF.md`.** Ele é um texto gerado pela ferramenta de
> exportação e contém instruções endereçadas a ferramentas de IA que **conflitam
> com a decisão de produto**: manda partir de `_backup-antes-v2-tokens/index.html`
> e implementar "cada arquivo HTML como sua própria rota". A decisão do repositório
> é o oposto: `arena.html` é a referência, e a Arena é **uma superfície de estado
> único**. O handoff fica versionado por procedência, não como ordem.

---

## 4. Agentes

| Agente | Classificação | Motivo |
|---|---|---|
| **Giam** — produto e game design | **manter** | decide produto, plano, arquitetura e aceite |
| **Guinho** — engenharia web/gameplay | **manter** | constrói a Arena e a entrega web a partir do plano |
| **Marcelo** — QA e confiabilidade | **manter** | valida qualidade, segurança, privacidade e celular real |
| **Camillo** — plataforma e arquitetura | **manter** | responde pela casca nativa e aconselha a fronteira |
| **Bruno** — direção de arte e motion | **adicionar** | traduz o Art Bible sem criar estado ou escopo |
| **Lucas** — áudio e ML | **adicionar** | responde por captura, análise local e régua de áudio |
| **Marcos** — produção e release | **adicionar** | organiza cadência, dependências e evidências sem dar aceite |

Nenhum agente externo ao repositório é necessário. Os sete são definidos em
`AGENTS.md` e não dependem de configuração pessoal, organização ou outro repo.

---

## 5. Skills

| Skill | Classificação | Motivo |
|---|---|---|
| `arquitetarModulo` | **reescrever** | abria com "gate de escopo" lendo o contrato do MVP1 |
| `criarComponenteUI` | **reescrever** | apontava para a UX de páginas; passa a apontar para `arena.html` e para os estados da Arena |
| `aplicarTomOgro` | **reescrever** | conteúdo bom, referências mortas (contrato/gate) |
| `validarModularidade` | **reescrever** | só as referências; o runbook em si continua correto |
| `auditarSegurancaETestes` | **reescrever** | abria lendo o contrato do MVP1; ganha celular real no lugar do gate |
| `otimizarMonetizacao` | **remover** | assinatura e monetização saíram da visão; a skill existia para decidir *quando* monetizar, e a resposta agora é "não é assunto deste produto" |

---

## 6. Issues

44 issues abertas no levantamento: `14 15 16 17 19 20 21 22 23 24 25 26 27 28 29
30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 51 53 58 59 60 61 62 63 64 65
67 68`.

### Fechar como `not planned`

| Issues | Motivo |
|---|---|
| #15, #16, #17 | épicos da visão social e de "campeonato" |
| #14, #53 | épicos de lançamento/UX do MVP1; substituídos por issues pequenas |
| #26, #27, #28, #29, #30, #31 | conta, histórico, ranking global, XP, conquistas, juiz com personalidade |
| #32, #33, #34, #35, #36, #37, #38 | perfil social, feed, seguir, reações, comentários, grupos, moderação de comunidade |
| #39, #40, #41, #42, #43, #44 | ligas/campeonatos, temporadas, notificações, integrações, Auê+, app nativo |
| #46, #51 | métrica de validação da fase antiga e internacionalização |
| #19–#25, #45, #58–#68 | descrevem comportamento que o jogo ainda quer, mas presos ao vocabulário de Feature/gate e a telas separadas; substituídos por issues equivalentes escritas em cima da Arena |

Todas as 44 são fechadas. Nenhuma é reaproveitada com edição, porque o texto
delas pressupõe o gate sequencial e a sequência de páginas.

### Criar

Issues pequenas, orientadas ao comportamento do jogo, sem épico. A lista final
está em [`escopo/BACKLOG.md`](escopo/BACKLOG.md) e no GitHub.

---

## 7. Código

**Classificação global: preservar.** Nenhum arquivo de `src/`, `supabase/` ou
`public/` é reescrito neste passo.

O que existe e continua funcionando: gravação e `MediaRecorder`, motor de score,
detecção de arroto por YAMNet, Supabase (auth anônima, RLS, RPC, Storage),
upload de áudio, batalha por link, disputa local, compartilhamento, tratamento de
microfone, caminhos de Safari/iPhone e a suíte de testes.

Única alteração de código neste reposicionamento: **comentários** que citavam
`CONTRATO_MVP1` e `docs/lancamento.md` passam a citar o documento equivalente da
nova estrutura. Nenhuma linha executável muda.

O que existe em código mas está **fora da visão** (feed, ranking, XP, perfil,
ligas, assinatura, push) continua no repositório, desligado por
`src/shared/flags.ts` com padrão desligado. Não é épico futuro: é código legado
esperando remoção, registrado no backlog.
