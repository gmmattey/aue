---
name: arquitetarModulo
description: Guia do Giam para desenhar mudancas modulares no jogo Aue sem ampliar o escopo por acidente.
---

# Skill: arquitetarModulo

Procedimento do **Giam** para desenhar uma mudança antes de o Guinho implementar.

A saída desta skill é a **parte técnica** do plano exigido em
[`AGENTS.md`](../../../AGENTS.md) §5.0: arquitetura decidida, recorte da
implementação, prioridade e **requisitos de aceite**. Sem ele, nenhuma branch é
aberta.

O mesmo plano carrega a parte de produto e desenho, que sai de
[`desenharExperiencia`](../desenharExperiencia/SKILL.md),
[`desenharInterface`](../desenharInterface/SKILL.md),
[`pensarComoJogo`](../pensarComoJogo/SKILL.md) e
[`aplicarTomOgro`](../aplicarTomOgro/SKILL.md).

**A decisão técnica é do Giam e ele a toma sozinho, avaliando o produto.** O que
ele não decide sozinho é dúvida **de produto** — aí ele pergunta ao primo, do
jeito da [`conversarComOPrimo`](../conversarComOPrimo/SKILL.md), e espera a
resposta em vez de preencher.

## 0. Escopo — antes da arquitetura

Leia [`docs/escopo/ESCOPO_ATUAL.md`](../../../docs/escopo/ESCOPO_ATUAL.md).

Pergunte:

> Esta mudança é necessária para um comportamento do jogo, ou é uma ideia
> tentando entrar pela porta da arquitetura?

Se estiver fora do escopo, **não desenhe tabela, RPC, estado ou abstração para
ela nesta tarefa**. Abra uma issue.

Depois leia, conforme o caso:

- [`docs/jogo/ARENA.md`](../../../docs/jogo/ARENA.md) — a Arena é uma máquina de
  estados, e comportamento novo quase sempre é um estado ou uma transição, não
  uma rota;
- [`docs/jogo/REGRAS.md`](../../../docs/jogo/REGRAS.md);
- [`docs/technical/arquitetura.md`](../../../docs/technical/arquitetura.md);
- [`docs/schema/nomenclatura.md`](../../../docs/schema/nomenclatura.md).

**Duas regras que o jogo impõe à arquitetura:**

1. **Motor separado da tela.** Áudio e score são módulos, não código de
   componente. É o que mantém a porta aberta para Android/iOS depois.
2. **Recurso sensível tem dono.** Microfone, stream, timer e replay precisam de
   ciclo de vida explícito, e só um replay roda por vez.

## 1. Comece pelo comportamento

Antes de criar camada, escreva o fluxo em uma linha.

Exemplo:

```text
resultado → criar batalha → receber código → compartilhar → amigo responder
```

Liste:

- entrada;
- saída;
- estado persistido;
- falhas importantes;
- regra que precisa ser confiada ao servidor;
- recurso que precisa ser liberado (microfone, listener etc.).

## 2. Separe responsabilidades

Uma divisão típica pode ter:

- banco/migração: schema, constraints, RLS, RPC;
- acesso a dados: chamadas ao Supabase;
- domínio: regra pura/testável;
- hooks: ciclo de vida/estado;
- UI: apresentação e interação.

Isso é orientação, não obrigação de criar cinco pastas para uma função de dez
linhas.

**Modularidade não é quantidade de arquivo. É responsabilidade clara.**

## 3. Banco só quando o domínio exige

Antes de criar tabela/coluna:

1. confirme que persistência é necessária;
2. confirme que a feature pertence ao escopo;
3. procure objeto existente que já representa o conceito;
4. siga `docs/schema/nomenclatura.md`;
5. defina RLS/grants/policies junto da modelagem;
6. planeje rollback/restauração.

Não crie schema para roadmap "porque um dia vamos usar".

## 4. Server-side quando o cliente não pode ser autoridade

Leve para RPC/constraint/trigger quando envolver, por exemplo:

- score oficial;
- resultado competitivo;
- autorização;
- acesso a batalha por capability URL;
- regra que precisa impedir fraude óbvia do navegador.

Não mova cálculo para backend só para parecer arquitetura robusta se a regra
pode continuar local com validação simples.

## 5. Segurança

- RLS em tabela exposta ao cliente;
- policy e grant precisam concordar;
- sessão anônima continua sendo identidade autenticada do ponto de vista do Supabase;
- esconder rota/botão não substitui autorização;
- código de batalha é segredo compartilhado: imprevisível, não enumerável e com expiração validada no backend.

## 6. Anti-monolítico sem numerologia

Não existe um número mágico de linhas que transforme arquivo em monólito.

Sinais reais de problema:

- UI + SQL + regra de negócio no mesmo componente;
- cleanup de recurso espalhado em vários módulos sem dono;
- função com razões independentes para mudar;
- duplicação de regra oficial;
- componente impossível de testar sem montar o aplicativo inteiro.

Arquivo grande com uma responsabilidade coesa pode ser justificável. Arquivo de
80 linhas com quatro responsabilidades não é automaticamente bom.

## 7. Entrega do planejamento

Antes de implementar, deixe claro:

- arquivos/camadas afetados;
- contrato de dados;
- segurança;
- erros;
- testes;
- o que **não** será feito nesta fatia.

A última linha é obrigatória. É ela que impede uma batalha de arroto de virar
plataforma social no meio da PR.
