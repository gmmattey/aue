---
name: auditarSegurancaETestes
description: Procedimentos de validacao automatizada de testes (Vitest), linters, tipagem e seguranca RLS no Supabase.
---

# 🛡️ Skill: auditarSegurancaETestes

Esta skill orienta o **Marcelinho (QA)** a executar a validação técnica automatizada e auditoria de segurança antes de autorizar qualquer merge na `main`.

---

## 🎯 Objetivos da Skill
- Executar os comandos de checagem estática, linter, cobertura de testes e build de produção.
- Garantir a integridade das políticas de segurança RLS e validações de backend.

---

## 🧪 Pipeline de Testes Automáticos

Executar sequencialmente no terminal:

```bash
npm run typecheck   # Validação estática de tipos TypeScript
npm run lint        # Verificação do oxlint
npm run test        # Execução dos testes automatizados com Vitest
npm run build       # Build de produção Vite + TypeScript
```

> 🛑 **Regra de Ouro:** Se qualquer um dos comandos acima retornar código de erro diferente de 0, a entrega é **rejeitada** e enviada de volta para refatoração.

---

## 🔒 Auditoria de Segurança RLS
- Verificar se novas tabelas ou migrações do Supabase possuem RLS ativado.
- Garantir que submissões anônimas não consigam forjar pontuações ou invadir o ranking autenticado global.
