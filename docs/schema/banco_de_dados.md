# Schema de Banco de Dados - Auê!

> ## ⛔ NÃO DESCREVE O BANCO ATUAL — documento de projeto, anterior à implementação
>
> **Verificado em 2026-08-07.** Das nove tabelas descritas abaixo, apenas
> `desafios` e `conquistas` existem com esse nome. As demais — `usuarios`,
> `arrotos`, `participacoes_desafio`, `competicoes`, `participacoes_competicao`,
> `conquistas_usuario`, `eventos_xp` — **não existem no banco**.
>
> O schema realmente implementado está em `supabase/migrations/` e tem estas
> tabelas: `profiles`, `resultados`, `desafios`, `comentarios`, `reacoes`,
> `grupos`, `membros_grupo`, `campeonatos`, `participantes_campeonato`,
> `conquistas`, `user_conquistas`, `posts_comunidade`, `seguidores`,
> `favoritos`, `denuncias`, `push_subscriptions`.
>
> Equivalências principais: `usuarios` → `profiles`; `arrotos` → `resultados`;
> `competicoes` → `campeonatos`; `conquistas_usuario` → `user_conquistas`;
> `eventos_xp` → não existe (o XP é calculado por trigger em `resultados`).
>
> **Não use este arquivo como fonte de verdade.** Ele foi mantido por registrar
> a intenção original do produto, não o estado do banco. A fonte de verdade são
> as migrações. Se a intenção original não interessar mais, apague o arquivo —
> o git preserva o histórico.

Este documento descreve a modelagem relacional planejada originalmente para o Auê!. Conforme solicitado, a estrutura está em Português do Brasil (PT-BR).

## 1. Tabela: `usuarios` (Users)
Armazena o perfil dos usuários registrados.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-------------|-----------|
| `id` | `uuid` | PK | Identificador único (referencia `auth.uid()` do Supabase). |
| `nome_exibicao` | `text` | NOT NULL | Nome ou apelido escolhido pelo usuário. |
| `url_avatar` | `text` | NULL | URL para a foto de perfil. |
| `xp_total` | `int` | DEFAULT 0 | Pontuação total de experiência. |
| `nivel` | `int` | DEFAULT 1 | Nível atual do usuário (calculado com base no XP). |
| `prestigio` | `int` | DEFAULT 0 | Nível de prestígio (Lenda I, II, etc). |
| `melhor_nota` | `numeric(5,2)`| DEFAULT 0 | Maior Auê Score alcançado pelo usuário. |
| `total_vitorias` | `int` | DEFAULT 0 | Quantidade de duelos/competições vencidas. |
| `criado_em` | `timestamptz` | DEFAULT now() | Data e hora de criação do perfil. |

---

## 2. Tabela: `arrotos` (Burps)
Registro central de cada avaliação oficial submetida para os servidores.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-------------|-----------|
| `id` | `uuid` | PK | Identificador único da gravação. |
| `usuario_id` | `uuid` | FK (`usuarios.id`), NULL | Quem gravou (NULL para anônimos, se permitirmos uploads não logados). |
| `nota_final` | `numeric(5,2)`| NOT NULL | O *Auê Score* total gerado pela engine. |
| `duracao` | `numeric(5,2)`| NOT NULL | Métrica de duração. |
| `potencia` | `numeric(5,2)`| NOT NULL | Métrica de potência acústica. |
| `profundidade`| `numeric(5,2)`| NOT NULL | Métrica de frequências graves. |
| `textura` | `numeric(5,2)`| NOT NULL | Métrica de variação/rugosidade do som. |
| `origem` | `text` | NOT NULL | Categoria declarada (comida, bebida, espontâneo). |
| `categoria` | `text` | NOT NULL | Classificação ("Natural" ou "Artificial"). |
| `versao_algoritmo` | `text` | NOT NULL | Ex: `aue-score-v1` para rastreabilidade. |
| `url_audio` | `text` | NULL | Caminho no Storage para o áudio original. |
| `url_video` | `text` | NULL | Caminho no Storage (se gravado com vídeo). |
| `verificado` | `boolean` | DEFAULT false| Indica se a gravação foi validada anti-fraude pelo server. |
| `criado_em` | `timestamptz` | DEFAULT now() | Data da gravação/upload. |

---

## 3. Tabela: `desafios` (Challenges - 1v1)
Gerencia os duelos e links compartilháveis entre dois jogadores.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-------------|-----------|
| `id` | `uuid` | PK | Código único que fará parte do link (`aue.app/d/ID`). |
| `criador_id` | `uuid` | FK (`usuarios.id`), NULL | Usuário que criou o desafio inicial. |
| `status` | `text` | DEFAULT 'aberto' | Status: `aberto`, `concluido`, `expirado`. |
| `expira_em` | `timestamptz` | NOT NULL | Data limite para que o desafio seja aceito. |
| `criado_em` | `timestamptz` | DEFAULT now() | Quando o link foi gerado. |

---

## 4. Tabela: `participacoes_desafio` (Challenge Entries)
Relaciona os arrotos a um desafio 1v1 específico.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-------------|-----------|
| `id` | `uuid` | PK | Identificador da participação. |
| `desafio_id` | `uuid` | FK (`desafios.id`) | A qual desafio pertence. |
| `usuario_id` | `uuid` | FK (`usuarios.id`), NULL | Quem está submetendo. |
| `arroto_id` | `uuid` | FK (`arrotos.id`) | Qual arroto foi utilizado na tentativa. |
| `nota` | `numeric(5,2)`| NOT NULL | Snapshot da nota para facilitar busca. |
| `criado_em` | `timestamptz` | DEFAULT now() | Data de submissão do jogador no duelo. |

*(Nota: Um desafio normalmente terá 2 registros nesta tabela: o arroto de quem desafiou e o arroto de quem respondeu).*

---

## 5. Tabela: `competicoes` (Competitions - Presenciais/Múltiplos)
Partidas entre vários participantes (ex: modo festa em um único aparelho).

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-------------|-----------|
| `id` | `uuid` | PK | Identificador único da sessão de campeonato. |
| `dono_id` | `uuid` | FK (`usuarios.id`), NULL | Quem criou a sala da competição. |
| `tipo` | `text` | NOT NULL | `presencial` ou `online` (futuro). |
| `status` | `text` | DEFAULT 'andamento'| Status: `andamento`, `finalizada`. |
| `criado_em` | `timestamptz` | DEFAULT now() | Início da competição. |

---

## 6. Tabela: `participacoes_competicao` (Competition Entries)
Vínculo dos múltiplos jogadores à tabela de competições.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-------------|-----------|
| `id` | `uuid` | PK | Identificador único. |
| `competicao_id`| `uuid` | FK (`competicoes.id`)| Qual a competição correspondente. |
| `nome_jogador` | `text` | NOT NULL | Como o usuário digitou o próprio nome na roda presencial. |
| `usuario_id` | `uuid` | FK (`usuarios.id`), NULL | Se o jogador tiver conta (opcional em presenciais). |
| `arroto_id` | `uuid` | FK (`arrotos.id`) | Qual gravação ele fez na vez dele. |
| `posicao_final`| `int` | NULL | Colocação final (1º, 2º, 3º...) atualizada no fim do jogo. |

---

## 7. Tabela: `conquistas` (Achievements - Dicionário)
Tabela de referência para os badges do jogo.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-------------|-----------|
| `id` | `uuid` | PK | Identificador da conquista. |
| `codigo` | `text` | UNIQUE, NOT NULL | Ex: `primeiro_aue`, `terremoto_local`. |
| `nome` | `text` | NOT NULL | Nome de exibição ("Terremoto Local"). |
| `descricao` | `text` | NOT NULL | Regra visual (ex: "Profundidade acima de 95"). |
| `recompensa_xp`| `int` | NOT NULL | Quantidade de XP concedida ao desbloquear. |

---

## 8. Tabela: `conquistas_usuario` (User Achievements)
Relação Muitos-para-Muitos indicando quais usuários desbloquearam o que.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-------------|-----------|
| `usuario_id` | `uuid` | FK (`usuarios.id`) | (PK Composta c/ conquista_id). |
| `conquista_id` | `uuid` | FK (`conquistas.id`)| Qual conquista foi desbloqueada. |
| `desbloqueado_em`| `timestamptz` | DEFAULT now() | Quando o usuário atingiu o marco. |

---

## 9. Tabela: `eventos_xp` (XP Events - Farming & Log)
Registro histórico de transações de experiência, essencial para auditar o limite diário de farming (5 por dia).

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-------------|-----------|
| `id` | `uuid` | PK | ID do evento de experiência. |
| `usuario_id` | `uuid` | FK (`usuarios.id`) | Quem ganhou os pontos. |
| `tipo` | `text` | NOT NULL | Ex: `performance_diaria`, `vitoria_1v1`, `conquista`. |
| `quantidade` | `int` | NOT NULL | XP concedido (pode ser negativo em sistemas futuros). |
| `referencia_id`| `uuid` | NULL | ID da tabela de origem (pode apontar p/ `arrotos.id`). |
| `criado_em` | `timestamptz` | DEFAULT now() | Data que o XP foi concedido. |

---

## 10. Considerações de Banco de Dados
- **Soft Deletes:** Não aplicados de forma rígida ao MVP, mas recomendados caso futuramente usuários queiram excluir a conta (LGPD/GDPR) mantendo integridade nos duelos.
- **Armazenamento Seguro:** Tabelas que vinculam um `usuario_id` estarão protegidas por **Row Level Security (RLS)** do Supabase, proibindo que um cliente altere a tabela de `eventos_xp` via requisição web direta, forçando que a pontuação passe por validação via API / Edge Function.
