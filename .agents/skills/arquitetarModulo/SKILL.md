---
name: arquitetarModulo
description: Guia de arquitetura modular, modelo de dados no Supabase, RPCs, RLS e divisao limpa de responsabilidades para o Giam.
---

# 🏗️ Skill: arquitetarModulo

Esta skill fornece o procedimento padronizado para o **Giam** desenhar e estruturar novos módulos e funcionalidades no Auê antes de qualquer implementação.

---

## 🎯 Objetivos da Skill
- Garantir que toda nova funcionalidade seja planejada de forma **modular e funcional**.
- Definir contratos de dados claros, migrações SQL no Supabase, funções RPC e políticas de segurança RLS.
- Evitar acoplamentos ou arquivos monolíticos desde a fase de desenho.

---

## 📋 Checklist de Planejamento de Módulo

### 1. Separação de Camadas
Ao criar uma funcionalidade `nomeFeature`:
- **Banco / Supabase (`supabase/migrations/`):** Tabela, índices, RLS e RPCs necessárias.
- **Camada de Dados Client (`src/db/` ou `src/features/nomeFeature/api/`):** Funções assíncronas dedicadas à consulta do Supabase.
- **Estado Local / Hooks (`src/features/nomeFeature/hooks/`):** Custom hooks para gerenciar o ciclo de vida e estado.
- **Componentes de UI (`src/features/nomeFeature/components/`):** Componentes visuais isolados sem lógica de banco embutida.

### 2. Segurança no Supabase (RLS & RPC)
- Toda tabela deve ter `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
- Submissão de dados sensíveis (scores, vencedores de desafios, moedas/XP) deve ocorrer via RPC com validação no servidor.
- Usuários anônimos têm permissões restritas e não devem poluir rankings oficiais.

### 3. Prevenção Anti-Monolítico
- Se a especificação exigir mais de 150 linhas em um único arquivo, divida o módulo em sub-componentes ou helpers utilitários puros.
