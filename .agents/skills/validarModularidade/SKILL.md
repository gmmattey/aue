---
name: validarModularidade
description: Runbook de verificacao para o Marcelinho (QA) auditar se o codigo submetido e 100% modular, limpo e funcional.
---

# 🧩 Skill: validarModularidade

Esta skill é a ferramenta de auditoria de código do **Marcelinho (QA)** para garantir zero código monolítico no repositório Auê.

---

## 🎯 Objetivos da Skill
- Detectar e barrar arquivos gigantes, componentes React superlotados de lógicas heterogêneas ou funções com múltiplas responsabilidades.
- Exigir a separação de código em módulos coesos, hooks reutilizáveis e utilitários isolados.

---

## 🔍 Checklist de Auditoria Anti-Monolítico

1. **Tamanho dos Arquivos:**
   - Nenhum arquivo `.tsx` ou `.ts` novo/modificado deve passar de **200 linhas** sem uma forte justificativa. Se passar, deve ser decomposto.
2. **Separação de Preocupações (SoC):**
   - O componente de UI não deve conter chamadas diretas ao banco Supabase; deve consumir rotas/hooks dedicados.
   - Cálculos e formatações de dados devem estar em funções utilitárias puras e testáveis.
3. **Reutilização:**
   - Identificar se lógicas duplicadas em diferentes telas podem virar um custom hook em `src/shared/hooks/` ou um componente compartilhado em `src/shared/components/`.
