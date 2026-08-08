# 🎯 Objetivos de entrega da SQUAD Auê

> **A história e as biografias saíram daqui.** Este documento narrava a origem
> do Auê e a biografia dos três integrantes; a fonte canônica agora é
> [`produto/HISTORIA_DO_AUE.md`](produto/HISTORIA_DO_AUE.md), contada em
> primeira mão por Luiz. Manter duas versões da mesma história garantia que uma
> delas ficasse desatualizada — e ninguém saberia qual.
>
> O que sobrou aqui é o único conteúdo que era realmente deste arquivo: o que a
> SQUAD mantém no radar a cada entrega.

## Onde procurar

| Assunto | Fonte canônica |
|---|---|
| Origem do produto e história humana | [`produto/HISTORIA_DO_AUE.md`](produto/HISTORIA_DO_AUE.md) |
| Voz, personalidade, humor e copy | [`produto/VOZ_E_PERSONALIDADE.md`](produto/VOZ_E_PERSONALIDADE.md) |
| Papéis, skills e fluxo de trabalho | [`../AGENTS.md`](../AGENTS.md) |
| **Autoridade sobre escopo** | [`functional/especificacao_funcional.md`](functional/especificacao_funcional.md) |

## Objetivos centrais de cada solicitação e entrega

Em cada entrega, a SQUAD deve manter no radar:

1. **Engenharia de negócio.** O design nasce preparado para monetização por
   anúncios — a meta declarada é o produto pagar a própria conta de IA. Como
   isso se comunica sem virar enganação está em
   [`produto/VOZ_E_PERSONALIDADE.md`](produto/VOZ_E_PERSONALIDADE.md) §8.
2. **Competitividade e copy.** UX de jogo de disputa, linguagem espontânea e
   direta. As diretrizes operacionais (o que dizer, o que nunca dizer, do que a
   piada zomba) estão em
   [`produto/VOZ_E_PERSONALIDADE.md`](produto/VOZ_E_PERSONALIDADE.md).
3. **Código modular e impecável.** Zero monolíticos, decomposição em módulos
   simples, e `typecheck`, `lint`, `test` e `build` verdes antes de qualquer
   merge.
