# Escopo atual — Auê

**O que pertence ao jogo agora.**

Este documento decide escopo. Se uma ideia não está aqui e não é correção
necessária para manter o jogo funcionando, ela vai para
[`BACKLOG.md`](BACKLOG.md) — não para o código.

Não existe gate sequencial, fila de Features numeradas nem autorização por
etapa. Existe esta lista, e a regra de terminar uma coisa antes de começar
outra.

---

## 1. O produto

Um **jogo mobile casual, web-first**: abre no navegador do celular, arrota,
recebe nota, desafia alguém, responde, revanche.

A experiência acontece em **uma Arena que muda de estado**
([`../jogo/ARENA.md`](../jogo/ARENA.md)), com referência visual em
[`../design/prototipo-arena/arena.html`](../design/prototipo-arena/arena.html).

---

## 2. Dentro do escopo

### 2.1 A Arena

Superfície única, estrutura fixa de quatro faixas, dez estados: `IDLE`,
`RECORDING`, `ORIGIN`, `JUDGING`, `RESULT`, `CHALLENGE`, `VERSUS`, `SCOREBOARD`,
`REMATCH`, `ERROR`.

### 2.2 Arrotar

Um toque começa. Microfone pedido só quando necessário. Bolha reagindo ao áudio
real. Teto de duração com aviso e parada automática.

### 2.3 Detecção real de arroto

O que não é arroto não vira nota. Classificação roda no aparelho.

### 2.4 Origem

Cinco opções mínimas em um toque, no nível principal. Informada pela pessoa,
nunca detectada.

### 2.5 Julgamento e score

Auê Score de 0 a 100, fórmula versionada e espelhada entre TypeScript e SQL.
Espera curta com teatro. Revelação com contagem, métricas depois do número.

### 2.6 Desafiar e link privado

Chamar no X1 como saída principal do resultado. Link privado, imprevisível, não
enumerável, com prazo real de 7 dias lido do banco.

### 2.7 Responder

Quem abre o link joga sem cadastro e **ouve o arroto que o desafiou antes de
responder**.

### 2.8 VS, placar e revanche

Confronto das duas notas, vencedor em ouro, placar com linhas que tocam o arroto
de cada um, revanche que continua a mesma disputa.

### 2.9 Disputa local

O mesmo loop no mesmo aparelho: 2 a 5 participantes, 1 a 3 rounds, contexto
opcional, pódio compartilhável. Hoje protegida pela flag
`VITE_FEATURE_DISPUTA_LOCAL` até rodar de ponta a ponta em telefone real.

### 2.10 Compartilhamento

Mandar a nota e mandar o desafio. Compartilhamento nativo quando existir, cópia
de link como saída honesta quando não existir.

### 2.11 Erros

Um estado honesto para microfone negado, sem som, não é arroto, falha de análise,
falha ao compartilhar, link expirado e ausência de rede/configuração.

### 2.12 Mobile real

Safari iOS e Chrome Android são alvo de validação, não "quando der". Isso inclui
safe areas, `svh`, barra que recolhe e permissão de microfone pedida uma vez só.

### 2.13 Preparação para Android/iOS

Só isso: não fechar a porta. Motor de áudio e de score separados da tela, Arena
empacotável, nada dependente de desktop. **Nenhuma implementação nativa.**

### 2.14 Privacidade mínima

- política de privacidade e termos em páginas públicas, sem interromper o jogo;
- **o que expira é o acesso pelo link, não a gravação** — dito com essas palavras;
- **não existe expurgo automático de áudio**, e nenhuma tela sugere o contrário;
- quem gravou pode apagar o próprio áudio;
- denúncia esconde a gravação;
- áudio não é reusado para acervo, finalidade nova ou treinamento de modelo.

### 2.15 Publicação

O jogo no ar, com Supabase configurado, PWA instalável, páginas públicas e
metadados sociais suficientes para o link render no grupo.

### 2.16 QA

`typecheck`, `lint`, `test` e `build` verdes antes de qualquer merge. Testes de
paridade entre a regra em TypeScript e a versionada em SQL. Fluxo real validado
em celular quando a mudança tocar a jornada.

---

## 3. Fora do escopo

Não estão no produto, e **não são épicos futuros**:

feed · seguidores · comunidades · campeonatos e ligas · temporadas · assinatura
e monetização · XP e níveis · conquistas · ranking global · perfil social ·
notificações push · mensagens privadas · login social obrigatório · app nativo
Android/iOS.

Existe código de várias dessas coisas no repositório, herdado da fase anterior.
Ele está desligado por `src/shared/flags.ts`, com **padrão desligado**, e está na
fila para sair — ver [`BACKLOG.md`](BACKLOG.md).

**Código legado desligado não é roadmap.** Ninguém deve expandi-lo, e ligar uma
dessas flags exige decisão explícita de produto que hoje não existe.

---

## 4. Pronto significa

Um comportamento só está pronto quando:

- funciona de ponta a ponta em navegador mobile real;
- o erro é tratado sem fingir sucesso;
- nada aparece habilitado sem fazer o que promete;
- dado fictício não aparece como real;
- `typecheck`, `lint`, `test` e `build` passam;
- a PR foi revisada e aprovada.

Não contam como pronto: "já fiz a tela", "o backend fica pra depois", "tem mock
mas depois liga", "funciona no meu navegador".
