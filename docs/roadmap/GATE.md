# Gate do roadmap — uma merda de cada vez

Este arquivo existe para impedir o Auê de virar vinte projetos pela metade.

A regra é simples:

> **Só existe uma Feature liberada para implementação por vez.**

Dá para discutir ideia futura, desenhar protótipo e registrar backlog. O que não pode é abrir branch, worktree, PR ou começar código de uma Feature bloqueada.

## O que está liberado agora

**Épico ativo:** #14 — Lançamento — Arrota e chama alguém  
**Feature liberada:** #18 — Só abre e arrota, porra

Todo o resto está bloqueado.

### Situação da #18 — atualizada em 2026-08-09

A #18 **continua aberta**. Boa parte dela está em produção; o que falta está
listado abaixo, e é o que impede o gate de avançar.

**Em produção** (PRs #73, #74, #75, #76):

- tocar na bolha da Home ou no microfone do rodapé abre o gravador direto,
  sem tela intermediária, quando o aparelho já liberou a permissão antes —
  **validado em iPhone real**, permissão pedida uma única vez;
- nenhum formulário antes do primeiro arroto: o campo de nome saiu da porta de
  entrada e virou pergunta da tela de julgamento;
- entrada no padrão da #54: "Manda.", bolha dominando, CTA `ARROTAR`, com a
  respiração e a comprimida do toque nas faixas da issue;
- a bolha da gravação reage ao áudio real (#56), e a onda de dez barras saiu da
  tela de gravação.

**Falta para a #18 fechar:**

- [ ] **#56** — a saída da gravação: a bolha comprime, segura 120–180 ms e passa
      ao próximo estado sem tela branca, com `PARAR`, timeout e fim automático
      pelo mesmo caminho. Exige mexer na máquina de estados do `AudioRecorder`,
      não é CSS;
- [ ] **#72** — motion do microfone (#55) e do erro (#57): compressão ao pedir
      permissão, shake curto no áudio vazio, reação menor no erro técnico, e o
      respeito a `prefers-reduced-motion` em cada um;
- [ ] **#54** — segue aberta até a #69 (ancoragem do shell) responder pela regra
      de "nada sobe ou desce porque a barra do Safari abriu".

**Por que o gate não avançou para a #19 mesmo com autorização dada.**
Em 2026-08-09 o usuário autorizou atualizar o gate. Avançar para a #19 exigiria
declarar a #18 concluída, e ela não está — três issues do próprio épico UX
continuam abertas apontando para ela. Escrever "concluída" aqui tornaria este
arquivo, que é a fonte da verdade sobre o que pode começar, um documento que
mente. A autorização foi usada para registrar a situação real; o avanço espera
os itens acima.

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
