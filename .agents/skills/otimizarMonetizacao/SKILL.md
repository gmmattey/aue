---
name: otimizarMonetizacao
description: Estrategias para insercao estrategica de anuncios (AdSense) no layout do Aue sem prejudicar a UX para pagar as contas de IA.
---

# 💰 Skill: otimizarMonetizacao

Esta skill orienta a inserção estratégica e validação de blocos de anúncios (AdSense) no aplicativo Auê, garantindo a sustentabilidade financeira do projeto sem comprometer a experiência do usuário.

---

## 🎯 Objetivos da Skill
- Posicionar anúncios em pontos de alto engajamento (Feed, tela pós-gravação de áudio, ranking).
- Garantir que o script do Google AdSense só seja carregado quando as variáveis de ambiente (`VITE_ADSENSE_CLIENT`, `VITE_ADSENSE_SLOT_*`) estiverem configuradas.
- Proporcionar experiência fluida: assinantes ou contas com benefício não veem anúncios.

---

## 📐 Diretrizes de Posicionamento de Anúncios

1. **In-Feed (Linha do Tempo):**
   - Inserir um card discreto de anúncio a cada 3 a 5 posts de usuários.
   - O card deve seguir o Design System (mesmas bordas arredondadas e sombras) para não quebrar a estética.

2. **Pós-Avaliação de Áudio (Tela de Resultado):**
   - Exibir o banner de anúncio logo abaixo da nota/pontuação do arroto, enquanto o usuário visualiza suas estatísticas de potência e textura.

3. **Carregamento Condicional & Inerte:**
   - Se as chaves de ambiente não estiverem preenchidas, a área do anúncio não deve renderizar nem deixar espaços vazios em branco.
