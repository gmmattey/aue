# Gate do roadmap — uma merda de cada vez

Este arquivo existe para impedir o Auê de virar vinte projetos pela metade.

A regra é simples:

> **Só existe uma Feature liberada para implementação por vez.**

Dá para discutir ideia futura, desenhar protótipo e registrar backlog. O que não pode é abrir branch, worktree, PR ou começar código de uma Feature bloqueada.

## O que está liberado agora

**Épico ativo:** #14 — Lançamento — Arrota e chama alguém  
**Feature liberada:** #18 — Só abre e arrota, porra

Todo o resto está bloqueado.

### Situação da #18 — atualizada em 2026-08-09 (segunda revisão)

**Todas as issues de UX da #18 estão fechadas.** #54, #55, #56, #57, #69 e #72.
Tudo em produção, pelas PRs #73 a #80.

O que existe hoje no ar:

- tocar na bolha da Home ou no microfone do rodapé abre o gravador direto,
  sem tela intermediária, quando o aparelho já liberou a permissão antes;
- nenhum formulário antes do primeiro arroto — o campo de nome saiu da porta
  de entrada e virou pergunta da tela de julgamento;
- entrada no padrão da #54: "Manda.", bolha dominando, CTA `ARROTAR`,
  respiração irregular e comprimida no toque;
- a bolha reage ao áudio real durante a gravação, e a onda de dez barras saiu;
- a saída da gravação comprime e segura 150 ms, pelo mesmo caminho para
  `PARAR`, timeout e fim automático;
- o estado de espera pela permissão existe e não troca a tela por trás do
  prompt nativo;
- áudio vazio e erro técnico têm reações de peso diferente — o produto que
  falhou não sacode a tela;
- shell ancorado: `viewport-fit=cover` (safe area passou a funcionar de
  verdade), `svh` no lugar de `dvh` (fim do pulo com a barra do Safari) e a
  Bolha na mesma posição entre as telas.

**Falta UMA coisa, e ela não é código.**

- [ ] **Validar o fluxo num iPhone real.** O que foi validado em aparelho foi
      a abertura do microfone (2026-08-09, permissão pedida uma única vez).
      Tudo que entrou depois — motion, ancoragem, saída da gravação — só foi
      verificado em navegador de desktop.

      Isto não é formalidade. As duas correções centrais da #69
      (`viewport-fit=cover` e `svh`) **só têm efeito observável no Safari do
      iOS**: no desktop o inset é zero e a barra não recolhe. Declarar a #18
      concluída sem essa passada seria exatamente o "funciona no meu
      navegador" que este arquivo lista como algo que NÃO conta como concluir.

**Sobre a autorização de atualizar o gate.** Dada pelo usuário em 2026-08-09 e
usada duas vezes para registrar a situação real. O avanço para a #19 espera a
passada no aparelho — depois dela, é uma palavra.

## Como o gate funciona

1. Leia este arquivo antes de criar branch ou worktree.
2. A issue que você vai implementar precisa ser exatamente a Feature liberada acima.
3. Se não for, não começa código. Nem “só vou adiantar uma coisinha”. Não vai.
4. A Feature atual precisa estar concluída, validada e mergeada.
5. Depois disso, o gate **não avança sozinho**.
6. Só Giam/usuário pode liberar explicitamente a próxima Feature.
7. Novo épico só começa depois que todas as Features do épico anterior estiverem concluídas e houver liberação explícita.

Bug crítico, regressão de produção, segurança ou privacidade podem interromper a fila quando forem necessários para manter o que já existe funcionando. Isso não libera Feature nova.

## Sequência obrigatória

### 🔓 #14 — Lançamento — Arrota e chama alguém

1. **#18** — Só abre e arrota, porra
2. **#19** — O juiz — sem caô, sem nota tirada do cu
3. **#20** — Resultado — caralho, quanto deu?
4. **#21** — Manda no grupo e compra a briga
5. **#22** — Batalha — chama no x1 e aguenta
6. **#23** — Disputa local — passa o celular e vê quem é o apelão
7. **#24** — Desktop — explica a parada e manda pro celular
8. **#51** — A zoeira é daqui, mas o mundo inteiro arrota
9. **#25** — Privacidade — o áudio é dos outros, não viaja
10. **#45** — Tem que funcionar fora do teu Chrome
11. **#46** — A zoeira pegou ou só a gente achou graça?

### 🔒 #15 — Agora ficou pessoal

12. **#26** — Conta — salva minha carreira nessa merda
13. **#27** — Histórico — cadê aquele 96, porra?
14. **#28** — Ranking — quem tá no topo dessa bagaça?
15. **#29** — XP e nível — até arroto agora dá level
16. **#30** — Conquistas — achievement pra merda bem feita
17. **#31** — Juiz com personalidade — escolhe quem vai te esculachar

### 🔒 #16 — Quando tiver gente pra fazer bagunça

18. **#32** — Perfil — qual é a ficha desse maluco?
19. **#33** — Feed — olha a merda que apareceu
20. **#34** — Seguir — esse maluco virou rival
21. **#35** — Reações — coraçãozinho é o caralho
22. **#36** — Comentários — fala merda, mas não vira babaca
23. **#37** — Grupos — junta tua panelinha
24. **#38** — Moderação — a zoeira tem limite

### 🔒 #17 — A brincadeira saiu do controle

25. **#39** — Ligas e campeonatos — agora tem campeonato dessa merda
26. **#40** — Temporadas — zerou, começou outra
27. **#41** — Notificações — te passaram, vai ficar quieto?
28. **#42** — Integrações — espalha essa porra
29. **#43** — Auê+ — se pagar a IA já tá valendo
30. **#44** — App nativo — só se a web pedir arrego

## Coisas que NÃO contam como concluir

- “já fiz a tela”;
- “o backend fica para depois”;
- “tem mock mas depois liga”;
- “funciona no meu navegador”;
- “a outra Feature depende disso então já comecei também”.

Concluir significa cumprir o DoD aplicável, validar o fluxo real, abrir PR, revisar e mergear.

## Regra para agentes

Se pedirem para implementar uma Feature bloqueada, responda que ela está fora do gate atual e indique qual Feature está liberada.

Não faça implementação parcial escondida em refactor, preparação arquitetural ou “deixar pronto para o futuro”.

**Uma porra de cada vez. Termina. Depois arruma outra confusão.**
