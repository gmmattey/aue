---
name: criarComponenteUI
description: Diretrizes para construcao de componentes visuais modernos no React 19 utilizando o Aue Design System.
---

# 🎨 Skill: criarComponenteUI

Esta skill define os padrões de construção de componentes frontend para o **Guinho**, garantindo alta qualidade visual, Glassmorphism, suporte a temas escuro/claro e componentes modulares no Auê.

---

## 🎯 Objetivos da Skill
- Garantir estéticas surpreendentes (Glassmorphism, gradientes HSL vibrantes, micro-animações).
- Manter o uso rigoroso das variáveis do **Auê Design System** (`docs/design_system/`).
- Construir componentes reutilizáveis, pequenos e tipados em TypeScript.

---

## 🎨 Checklist de Construção de Componente

### 1. Design System & Variáveis CSS
- Utilize sempre as variáveis de cor e espaçamento definidas em `variables.css` e `variables.dark.css`.
- Evite cores genéricas simples (ex: `background: #fff`). Prefira gradientes sutis e superfícies translúcidas.

### 2. Animações & Interatividade
- Adicione feedback de clique/hover (efeitos de escala `transform: scale(0.98)`).
- Utilize transições suaves (`transition: all 0.2s ease-in-out`).

### 3. Responsividade & PWA
- Certifique-se de que o componente funcione perfeitamente em telas de celular (tamanho mínimo de toque: 44px x 44px).
