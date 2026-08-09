---
name: validarModularidade
description: Runbook do Marcelinho para detectar acoplamento, responsabilidades misturadas e duplicacao de regra no codigo do Aue.
---

# Skill: validarModularidade

Ferramenta de revisão do **Marcelinho (Qualidade)** para impedir que o Auê vire um
monobloco impossível de mexer.

## 1. O que é monólito aqui

Não é simplesmente "arquivo com mais de N linhas".

Problemas reais:

- componente React que também conhece SQL/RPC;
- regra de score duplicada em várias telas;
- cleanup de recurso sem um dono claro;
- função com responsabilidades independentes;
- hook que virou depósito de qualquer estado da feature;
- utilitário `shared` que depende de feature específica;
- módulo impossível de testar sem montar metade do aplicativo.

Tamanho de arquivo é **sinal para olhar**, não sentença automática.

## 2. Heurística de tamanho

Ao encontrar arquivo novo/modificado grande:

- acima de ~200 linhas: revisar coesão com atenção;
- acima de ~300 linhas: exigir justificativa explícita ou decomposição;
- exceção é aceitável quando manter o invariante no mesmo lugar deixa o código
  mais seguro e legível.

Exemplo válido: captura de microfone pode concentrar ciclo de vida e cleanup se
separar essas partes espalharia o invariante "todo caminho libera o stream".

A justificativa precisa falar de responsabilidade, não "não deu tempo".

## 3. Separação de preocupações

Preferir:

- UI renderiza/interage;
- hook cuida do ciclo de vida;
- domínio calcula regra pura;
- camada de dados conversa com Supabase;
- backend protege regra que não pode confiar no cliente.

Não criar camada vazia apenas para dizer que tem arquitetura limpa.

## 4. Dependências

Verifique direção de dependência.

`shared/` não deve importar uma feature específica para resolver formatação ou
utilitário genérico.

Se cinco features precisam da mesma regra, procure dono canônico antes de
copiar.

## 5. Duplicação

Duplicação perigosa não é só copiar 20 linhas.

É principalmente duplicar **regra de negócio**:

- fórmula do score;
- classificação;
- autorização;
- status de batalha;
- formatação que precisa ser idêntica em telas compartilhadas.

Quando houver duas implementações inevitáveis, como TypeScript + SQL, precisa
existir teste/contrato que trave a paridade.

## 6. Escopo também faz parte da modularidade

Leia [`docs/escopo/ESCOPO_ATUAL.md`](../../../docs/escopo/ESCOPO_ATUAL.md).

Não aprove uma refatoração que, para "organizar melhor", começa a construir
infraestrutura de feed, ranking ou monetização — que saíram da visão.

Refatoração boa reduz risco da fatia atual. Não usa limpeza como desculpa para
reabrir o que foi fechado.

**A remoção do código legado é o oposto disso, e é bem-vinda** — mas em fatias,
uma área por PR, pela issue própria, sem se misturar com a migração para a
Arena.

## 7. Checklist de QA

- cada módulo tem responsabilidade explicável em uma frase?
- regra canônica tem um dono?
- cleanup de recurso tem um dono?
- UI conhece detalhes de banco sem necessidade?
- `shared` está realmente compartilhado?
- houve abstração prematura para feature futura?
- teste consegue atingir a regra sem montar o mundo?
- arquivo grande tem justificativa de coesão?

Se a resposta ruim for "mas ficou em menos de 200 linhas", continua ruim.
