# Auê! — Brand Guide

**Arrote. Seja julgado.**

Design System de produto — v2 (rodada corretiva). A fonte canônica completa é `DESIGN.md`. Este guia é um resumo rápido.

## Tema

Escuro é o tema canônico, não uma variante.

## Paleta de tokens

- `--bg` Preto Carvão `#0a0a08` — fundo de tela
- `--surface` Superfície Elevada `#171712`
- `--surface-2` Superfície Elevada 2 `#1f1f18`
- `--fg` Texto Claro `#f5f3ea`
- `--muted` Texto Secundário `#93917f`
- `--border` Borda `#2b2a22`
- `--accent` Verde Ácido Elétrico `#c6ff00` — CTA principal, Auê Score, elementos vivos
- `--gold` Dourado `#f4c430` — vitória, lendário, 1º lugar
- `--danger` Vermelho Vivo `#ff3d3f` — erro técnico real (nunca derrota de jogo)
- `--silver` `#c7cad1` — 2º lugar do pódio
- `--bronze` `#c98a4b` — 3º lugar do pódio

## Tipografia

- Display: **Anton** (títulos, Auê Score, vencedores, ranking)
- Interface: **Inter** (labels, métricas, navegação, corpo)

## Componente proprietário: Bolha Auê

Blob orgânico dirigido por potência/profundidade/duração/textura, com 7 estados (`idle`, `calibrating`, `recording`, `processing`, `reveal`, `victory`, `error`). Especificação completa e fórmulas em `DESIGN.md §6`. Demonstração viva em `aue-design-system-showcase.html`.

## Identidade

Rota **Bolha Viva** evoluída: blob sob pressão + `!` pesado integrado, flat, vetorial, sem gradiente/glow/sombra. Arquivos: `assets/aue-bolha-mark.svg` e `assets/aue-bolha-mark-inverted.svg`.

## Escopo desta rodada

Cobre fundação + componentes de produto (Score, XP, níveis, conquistas, ranking, duelo, pódio, card compartilhável) e estados de sistema (permissão, offline, erro, loading). Não inclui telas finais de produto nem artefatos de marketing (landing/deck/poster/email/newsletter/form) — fora de escopo por decisão explícita desta rodada.
