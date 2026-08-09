# aa6ade4f-ee66-4e6e-8164-e0e10d2ce750 implementation handoff

This archive is the source of truth for turning the design into production code. Start from `_backup-antes-v2-tokens/index.html`, then preserve the visual system, responsive behavior, and interactions found in the exported files.

## Implementation target
- Build production UI from the exported design, not a loose reinterpretation.
- Preserve typography scale, spacing rhythm, color tokens, border radii, shadows, motion timing, and component states.
- Replace static placeholders only when the target app has real data or functional equivalents.
- Keep generated product UI free of Open Design chrome, preview labels, or design-process annotations.
- Treat this handoff as a visual contract: if implementation choices conflict, match the exported pixels and behavior first, then refactor internals.

## Source map
- Primary entry: `_backup-antes-v2-tokens/index.html`
- HTML screens detected: 101
- Stylesheets detected: 0
- Script/component files detected: 0
- Supporting assets detected: 2

## Responsive contract
Validate the implementation across this 2025–2026 viewport matrix:
- Mobile compact: 360×800
- Mobile standard: 390×844
- Mobile large: 430×932
- Foldable / small tablet: 600×960
- Tablet portrait: 820×1180
- Tablet landscape: 1024×768
- Laptop: 1366×768
- Desktop: 1440×900
- Wide desktop: 1920×1080

For responsive web exports, treat these as a modern breakpoint system for one adaptive web experience, not three fixed screenshots. Do not split responsive web into unrelated native app screens unless the project explicitly includes native targets. Use semantic layout thresholds, fluid `clamp()` type/spacing, and container queries where component width matters more than viewport width. Preserve any CSS media queries, container queries, fluid `clamp()` scales, and layout changes already present in the exported files.

## Design fidelity contract
- Extract reusable tokens before writing components: background, surface, foreground, muted text, border, accent, radius, shadow, spacing, type scale, and motion duration/easing.
- Map product screens, in-app modules/components, optional landing page, and optional OS widget surfaces before coding. Keep these surfaces separate in the target architecture.
- Match layout geometry: max-widths, gutters, grid columns, card proportions, sticky/fixed elements, and viewport-specific navigation.
- Preserve real copy, labels, and data shown in the export. Do not replace specific text with generic marketing filler.
- Preserve interactive affordances: hover, focus, pressed, disabled, loading, validation, copy/share, tab/accordion, modal/sheet, and keyboard states where present.
- Preserve accessibility semantics when converting: headings stay hierarchical, controls remain buttons/links/inputs, focus states stay visible.
- Do not keep prototype-only annotations, frame labels, or Open Design chrome in the production UI.

## CJX-ready UX contract
- Use `DESIGN-MANIFEST.json` as the machine-readable map for screens, app modules, OS widgets, landing pages, tokens, interactions, and viewport checks.
- Screen-file-first: when multiple user-facing surfaces exist, implement each HTML screen as its own route/file. Treat `index.html` as a launcher/overview when the manifest marks it that way, not as a combined final UI.
- If `landing.html`, app screens, platform screens, or OS widget files exist, preserve those boundaries in the target app instead of merging them into one page.
- A single self-contained `_backup-antes-v2-tokens/index.html` is acceptable only when the export truly contains one user-facing screen and its CSS/JS are structured enough to extract tokens, components, states, and behavior.
- If separate `css/` or `js/` files exist, treat them as source of truth for token/component/interactions before porting to React, Vue, SwiftUI, Compose, or another target stack.
- In-app modules/components are product UI blocks inside the app. OS widgets are home-screen/lock-screen/quick-access surfaces outside the app. Do not merge those concepts.

## Color and brand contract
- Use the exported design tokens and product/domain context as the color source of truth.
- Do not introduce warm beige / cream / peach / pink / orange-brown background washes unless they are already explicit brand/reference colors in the export.
- No obvious token stylesheet was detected; sample colors from the entry file and convert them into named tokens before coding.

## Implementation sequence for AI coding tools
1. Open `_backup-antes-v2-tokens/index.html` and `DESIGN-MANIFEST.json`; identify every screen file, launcher/overview file, app module, and interaction before coding.
2. If multiple HTML screens exist, map them to separate routes/surfaces first; do not merge `landing.html`, product app screens, platform screens, or OS widgets into one route.
3. Extract a token table from CSS/root styles and inline styles before building framework components.
4. Build product screens and domain-specific in-app modules from largest layout regions down to controls; avoid starting with isolated atoms that lose spatial intent.
5. Port responsive behavior across the modern viewport matrix and test each semantic breakpoint before cleanup.
6. Port interactions and states, then replace static placeholders only with real app data or functional equivalents.
7. Keep optional landing page and OS widget surfaces as separate surfaces if present.
8. Compare final screenshots against the export at 360×800, 390×844, 430×932, 820×1180, 1024×768, 1366×768, 1440×900, and 1920×1080 before declaring done.

## Entry points
- `_backup-antes-v2-tokens/assinatura-cancelada.html`
- `_backup-antes-v2-tokens/assinatura-cancelar.html`
- `_backup-antes-v2-tokens/assinatura-confirmada.html`
- `_backup-antes-v2-tokens/assinatura.html`
- `_backup-antes-v2-tokens/calibracao.html`
- `_backup-antes-v2-tokens/campeonato-criar.html`
- `_backup-antes-v2-tokens/campeonato-lobby.html`
- `_backup-antes-v2-tokens/campeonato.html`
- `_backup-antes-v2-tokens/campeonatos-lista.html`
- `_backup-antes-v2-tokens/compartilhar.html`
- `_backup-antes-v2-tokens/comunidade-comentarios.html`
- `_backup-antes-v2-tokens/comunidade-criar.html`
- `_backup-antes-v2-tokens/comunidade-vazia.html`
- `_backup-antes-v2-tokens/comunidade.html`
- `_backup-antes-v2-tokens/comunidades.html`
- `_backup-antes-v2-tokens/configuracoes.html`
- `_backup-antes-v2-tokens/conquistas.html`
- `_backup-antes-v2-tokens/conta-apagar.html`
- `_backup-antes-v2-tokens/desafio.html`
- `_backup-antes-v2-tokens/duelo-resultado.html`
- `_backup-antes-v2-tokens/gravacao-sem-som.html`
- `_backup-antes-v2-tokens/gravacao.html`
- `_backup-antes-v2-tokens/historico-vazio.html`
- `_backup-antes-v2-tokens/historico.html`
- `_backup-antes-v2-tokens/home-novo.html`
- `_backup-antes-v2-tokens/home.html`
- `_backup-antes-v2-tokens/idade-bloqueado.html`
- `_backup-antes-v2-tokens/idade.html`
- `_backup-antes-v2-tokens/index.html`
- `_backup-antes-v2-tokens/julgando.html`
- `_backup-antes-v2-tokens/landing.html`
- `_backup-antes-v2-tokens/legal.html`
- `_backup-antes-v2-tokens/login.html`
- `_backup-antes-v2-tokens/offline.html`
- `_backup-antes-v2-tokens/origem-bebida.html`
- `_backup-antes-v2-tokens/origem-comida.html`
- `_backup-antes-v2-tokens/origem.html`
- `_backup-antes-v2-tokens/perfil-editar.html`
- `_backup-antes-v2-tokens/perfil.html`
- `_backup-antes-v2-tokens/permissao-negada.html`
- `_backup-antes-v2-tokens/permissao.html`
- `_backup-antes-v2-tokens/ranking-vazio.html`
- `_backup-antes-v2-tokens/ranking.html`
- `_backup-antes-v2-tokens/resultado.html`
- `_backup-antes-v2-tokens/tutorial.html`
- `arena.html`
- `assinatura-cancelada.html`
- `assinatura-cancelar.html`
- `assinatura-confirmada.html`
- `assinatura.html`
- `calibracao.html`
- `campeonato-criar.html`
- `campeonato-lobby.html`
- `campeonato.html`
- `campeonatos-lista.html`
- `compartilhar.html`
- `comunidade-comentarios.html`
- `comunidade-criar.html`
- `comunidade-vazia.html`
- `comunidade.html`
- `comunidades.html`
- `configuracoes.html`
- `conquistas.html`
- `conta-apagar.html`
- `convite.html`
- `desafio-criar.html`
- `desafio.html`
- `disputa-banner.html`
- `disputa-config.html`
- `disputa-round.html`
- `duelo-resultado.html`
- `duelo-timeline.html`
- `feed.html`
- `gravacao-sem-som.html`
- `gravacao.html`
- `historico-vazio.html`
- `historico.html`
- `home-novo.html`
- `home.html`
- `idade-bloqueado.html`
- `idade.html`
- `index-mvp1.html`
- `index.html`
- `julgando.html`
- `landing.html`
- `legal.html`
- `login.html`
- `offline.html`
- `origem-bebida.html`
- `origem-comida.html`
- `origem.html`
- `perfil-editar.html`
- `perfil.html`
- `permissao-negada.html`
- `permissao.html`
- `ranking-vazio.html`
- `ranking.html`
- `resultado.html`
- `seguidores.html`
- `sessao-expirada.html`
- `tutorial.html`

## Styles
- None detected

## Scripts/components
- None detected

## Assets and supporting files
- `_backup-antes-v2-tokens/manifest.json`
- `manifest.json`

## Coding checklist for AI tools
1. Inspect `_backup-antes-v2-tokens/index.html` and `DESIGN-MANIFEST.json` first and identify reusable components before coding.
2. Implement each user-facing screen file as its own route/surface; keep launcher, landing, app, platform, and OS widget files separate.
3. Extract design tokens into the target stack: colors, type scale, spacing, radius, shadows, and motion.
4. Implement layout with real 2025–2026 responsive breakpoints, fluid type/spacing, and container-query-aware component behavior; test with no horizontal overflow.
5. Preserve interactive controls, hover/focus/pressed states, form behavior, validation, and copy actions where present.
6. Implement domain-specific in-app modules with real states; do not flatten them into generic cards.
7. Keep landing page, product screens, and OS widget/quick-access surfaces separate when present.
8. Confirm the production result visually matches the exported design before refactoring internals.
9. Reject implementation shortcuts that flatten the design into generic cards, generic gradients, placeholder stats, or framework-default typography.
10. If a detail is ambiguous, keep the exported HTML/CSS/JS behavior rather than inventing a new pattern.
