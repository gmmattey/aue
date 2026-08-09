---
name: criarComponenteUI
description: Diretrizes do Guinho para construir UI do Aue com qualidade, modularidade e fidelidade ao UX atual.
---

# Skill: criarComponenteUI

Procedimento do **Guinho** para construir componentes do Auê.

A referência de experiência é
[`docs/especificacao_ux_ui.md`](../../../docs/especificacao_ux_ui.md).

A referência de voz é
[`docs/produto/VOZ_E_PERSONALIDADE.md`](../../../docs/produto/VOZ_E_PERSONALIDADE.md).

E o escopo continua vindo de
[`docs/mvp1/CONTRATO_MVP1.md`](../../../docs/mvp1/CONTRATO_MVP1.md).

## 0. Não desenhe feature fora do corte

Componente bonito para feature fora do MVP1 continua sendo feature fora do MVP1.

Antes de criar tela/componente novo, confirme que ele pertence ao fluxo atual ou
é manutenção explícita de código já existente.

## 1. Direção visual

O Auê busca:

- party game premium;
- tema escuro;
- baixa densidade;
- tipografia forte;
- lima/verde ácido como destaque;
- movimento com função;
- score/placar como protagonista.

**Glassmorphism não é obrigação.** Gradiente não é requisito. Tema claro também
não é requisito do MVP1.

Use efeito visual quando ele ajuda hierarquia, não porque uma skill antiga
mandava colocar vidro fosco em tudo.

## 2. Design tokens

Antes de inventar valor:

- procure tokens/variáveis já existentes no código;
- preserve espaçamento e tipografia usados pelos componentes canônicos;
- não crie uma segunda paleta dentro de uma feature;
- não hardcode cor repetida se já existe token equivalente.

Se a documentação e o CSS divergirem, registre a divergência antes de criar mais
uma convenção.

## 3. Uma ação principal

Componente/tela precisa respeitar a hierarquia definida no UX.

Exemplos:

- gravação → ARROTAR/FINALIZAR;
- resultado → DESAFIAR;
- batalha → RESPONDER;
- disputa local → PRÓXIMO;
- pódio → COMPARTILHAR.

Não promova três botões para primary porque todos "são importantes".

## 4. Responsividade

Prioridade: celular real.

- alvo de toque confortável, normalmente pelo menos 44×44 CSS px;
- respeitar safe areas quando necessário;
- testar viewport estreito;
- não depender de hover;
- teclado não pode cobrir campo crítico;
- modal/sheet precisa caber com zoom/tamanho de fonte maior.

Desktop do MVP1 é principalmente landing; não force layout de gameplay desktop
se o contrato não pedir.

## 5. Motion

Animação precisa comunicar:

- gravação;
- processamento;
- revelação;
- vitória/derrota;
- troca de turno.

Regras:

- respeitar `prefers-reduced-motion`;
- não usar `transition: all` por padrão — animar propriedades deliberadas;
- não travar ação esperando animação decorativa;
- não fingir progresso real com barra aleatória.

## 6. Acessibilidade

- nome acessível para botão/ícone;
- foco visível;
- contraste suficiente;
- estado não depende só de cor;
- score e métricas existem em texto;
- erro importante não vive apenas em toast;
- player de áudio tem controle explícito.

## 7. Modularidade

Componente visual não chama banco diretamente se a responsabilidade puder ficar
em hook/camada de dados.

Extraia quando houver responsabilidade independente, não para perseguir um
número arbitrário de linhas.

Sinais de extração:

- regra pura reutilizável;
- ciclo de vida complexo;
- acesso a dados;
- bloco visual com identidade e estado próprios;
- lógica difícil de testar por estar presa à renderização.

## 8. Copy

Não invente copy "do Guinho" de cabeça.

Leia a fonte canônica e use `aplicarTomOgro` quando a tarefa envolver texto.

O componente deve renderizar o estado real. Nunca preencher vazio com nome,
nota ou resultado fictício sem modo demo explícito.

## 9. Antes de entregar

Verifique:

- mobile real/viewport alvo;
- loading;
- erro;
- disabled;
- vazio quando aplicável;
- foco/acessibilidade;
- reduced motion;
- texto longo;
- toque repetido;
- ausência de overflow.

Tela bonita no screenshot e quebrada no Safari continua quebrada.
