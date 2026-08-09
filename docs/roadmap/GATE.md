# Gate do roadmap — uma merda de cada vez

Este arquivo existe para impedir o Auê de virar vinte projetos pela metade.

A regra é simples:

> **Só existe uma Feature liberada para implementação por vez.**

Dá para discutir ideia futura, desenhar protótipo e registrar backlog. O que não pode é abrir branch, worktree, PR ou começar código de uma Feature bloqueada.

## O que está liberado agora

**Épico ativo:** #14 — Lançamento — Arrota e chama alguém  
**Feature liberada:** #19 — O juiz — sem caô, sem nota tirada do cu

Todo o resto está bloqueado.

### #18 — CONCLUÍDA em 2026-08-09

Autorização de avanço dada pelo usuário. As três condições do fluxo foram
cumpridas: issues fechadas, entregue em produção e **validada em aparelho
real**.

**Issues fechadas:** #54, #55, #56, #57, #69 e #72.
**PRs:** #73 a #81.

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
- espera pela permissão com a tela de trás intacta sob o prompt nativo;
- áudio vazio e erro técnico com reações de peso diferente;
- shell ancorado: `viewport-fit=cover`, `svh` e a Bolha na mesma posição
  entre as telas.

**Validação em iPhone real, 2026-08-09:**

1. permissão de microfone pedida **uma única vez**, na primeira visita;
2. a tela **não pula** quando a barra do Safari recolhe;
3. a barra de navegação não invade a faixa do gesto;
4. a Bolha não salta entre o convite e a gravação.

Os itens 2 e 3 só eram observáveis ali: no desktop o inset é zero e a barra
não recolhe.

### #19 — liberada agora

**O que ela cobra:** a nota tem que ser defensável. Hoje o motor é heurístico,
com quatro limites de normalização escolhidos no olho
(`src/features/audio/rules.ts`): duração 0–5 s, potência 0–0,3, grave 0–0,2,
textura 0–0,05. O comentário no código diz "heuristic for MVP", e diz a verdade.

**O que já existe de material:** 43 gravações reais medidas com o motor de
verdade, fora do repositório (é áudio de pessoas, e o repositório é público).
Ver o banco de arroto ao lado do repo — `MANIFESTO.md` e `MEDICOES.md`.

**O que trava a #19 hoje, e não é código:**

- [ ] **rótulo humano.** Sem alguém dizer "este é arroto, este é conversa" e
      "este merecia 90", não existe calibrar — existe mexer. As medições já
      mostraram que os números sozinhos NÃO separam fala de arroto: a razão de
      grave varia de 0,067 a 0,502 num degradê contínuo, sem dois grupos;
- [ ] **exemplos negativos de propósito** — alguém falando uma frase normal,
      gravada dentro do app. O lote não tem um único caso garantidamente
      negativo hoje;
- [ ] **gravações feitas no app**, e não só do WhatsApp: o app grava webm/mp4 e
      o WhatsApp entrega ogg/opus, e a conversão desloca o que o motor mede.

Enquanto isso não existir, mexer nos limites é chute com cara de número — e
recusar o arroto de quem arrotou de verdade é pior do que dar nota para uma
conversa.

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

1. ~~**#18** — Só abre e arrota, porra~~ — concluída em 2026-08-09
2. **#19** — O juiz — sem caô, sem nota tirada do cu ← **liberada**
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
