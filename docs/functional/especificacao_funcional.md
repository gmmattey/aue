# Auê!

## Especificação Funcional e Técnica

**Versão:** 1.0
**Produto:** PWA mobile-first de competição de arrotos

---

# 1. Visão do Produto

## 1.1 Objetivo

O **Auê!** é um jogo social competitivo em que usuários gravam arrotos, recebem uma avaliação automática baseada em características do áudio e podem desafiar amigos ou disputar competições presenciais.

O produto deve ser simples, ridículo, rápido e altamente compartilhável.

A experiência principal deve funcionar sem cadastro:

**Abrir → Arrotar → Receber nota → Desafiar → Compartilhar**

O Auê! não deve nascer como uma rede social tradicional. Recursos sociais serão adicionados progressivamente somente após validação do loop principal.

---

# 2. Princípios do Produto

1. O usuário deve conseguir arrotar antes de criar uma conta.
2. O resultado deve aparecer rapidamente.
3. O julgamento deve parecer divertido, mas usar métricas reais do áudio sempre que possível.
4. O produto não deve fingir precisão científica que não possui.
5. Compartilhamento e desafio são partes centrais do produto.
6. A gamificação deve privilegiar qualidade e competição, e não quantidade de gravações.
7. Recursos sociais complexos não pertencem ao primeiro MVP.
8. O Auê! deve funcionar como PWA em Android, iOS e desktop.
9. O áudio permanece local até o usuário decidir publicar, compartilhar de forma persistente ou competir oficialmente.
10. Rankings oficiais não podem confiar apenas em dados calculados pelo navegador.

---

# 3. Personas

## 3.1 Arrotador casual

Quer gravar um arroto, descobrir a nota e mandar o resultado para amigos.

Principais necessidades:

* nenhuma obrigação de cadastro;
* experiência imediata;
* resultado engraçado;
* compartilhamento simples.

## 3.2 Competidor

Quer superar amigos, vencer duelos, conseguir medalhas e subir no ranking.

Principais necessidades:

* regras consistentes;
* histórico;
* desafios;
* títulos;
* conquistas;
* ranking.

## 3.3 Jogador presencial

Está em uma festa, churrasco, bar, viagem ou encontro com amigos e quer usar um único aparelho como juiz.

Principais necessidades:

* adicionar vários jogadores rapidamente;
* gravações sequenciais;
* classificação final automática;
* possibilidade de revanche.

## 3.4 Usuário social

Quer publicar resultados, acompanhar amigos e interagir.

Essa persona será atendida progressivamente após validação do produto.

---

# 4. Jornada Principal

## 4.1 Primeiro acesso

1. Usuário abre o Auê!.
2. Não há tela obrigatória de cadastro.
3. O CTA principal é apresentado:

**ARROTAR**

4. O usuário concede acesso ao microfone.
5. O sistema realiza uma calibração curta do ambiente.
6. Usuário grava o arroto.
7. Sistema analisa o áudio localmente.
8. Usuário informa a origem.
9. Resultado é exibido.
10. Usuário pode:

* tentar novamente;
* compartilhar;
* desafiar alguém;
* iniciar competição presencial.

---

# 5. Gravação

## 5.1 Formatos

O MVP deve suportar:

* áudio;
* vídeo + áudio, quando disponível.

Áudio é obrigatório para avaliação.

Vídeo é opcional e não altera a pontuação.

## 5.2 Duração

Tempo máximo recomendado:

**10 segundos por gravação.**

O sistema deve detectar automaticamente o intervalo efetivo do arroto dentro da gravação.

## 5.3 Calibração

Antes de cada sessão de medição, o sistema poderá capturar aproximadamente 0,5 a 1 segundo de áudio ambiente.

A calibração será utilizada para estabelecer um baseline de ruído.

---

# 6. Motor de Julgamento

O componente responsável pela avaliação será denominado internamente:

**Auê Judgement Engine**

O motor deve produzir um conjunto normalizado de métricas entre 0 e 100.

## 6.1 Duração

Representa o tempo efetivo durante o qual o sinal permanece acima do threshold relativo ao ruído ambiente.

Exemplo:

**Duração: 3,2 s**

## 6.2 Potência

Não deve ser apresentada como decibéis acústicos reais.

A métrica utilizará características digitais do sinal, como:

* RMS;
* amplitude;
* peak;
* envelope;
* diferença relativa ao ruído ambiente.

Interface:

**Potência: 87**

## 6.3 Profundidade

Representa a presença e intensidade relativa de baixas frequências.

Pode considerar:

* FFT;
* distribuição espectral;
* energia relativa em bandas graves;
* frequência dominante;
* centroide espectral.

Interface:

**Profundidade: 93**

## 6.4 Textura

Substitui o conceito anterior de “efeito”.

Pode considerar:

* irregularidade do envelope;
* variação espectral;
* sustentação;
* decay;
* rugosidade;
* mudanças internas de frequência;
* presença de múltiplos eventos dentro do mesmo arroto.

Interface:

**Textura: 78**

## 6.5 Origem

A origem será informada pelo usuário.

Opções iniciais:

* aconteceu espontaneamente;
* comida;
* refrigerante;
* cerveja;
* outra bebida;
* puxei ar;
* outro.

O sistema não deve alegar que identificou automaticamente a origem.

---

# 7. Auê Score

A pontuação varia entre:

**0 e 100.**

Composição inicial recomendada:

| Critério     | Peso |
| ------------ | ---: |
| Duração      |  25% |
| Potência     |  20% |
| Profundidade |  25% |
| Textura      |  20% |
| Origem       |  10% |

## 7.1 Pontuação de origem

Sugestão inicial:

* espontâneo: 10;
* comida: 9;
* bebida: 8;
* puxando ar: 0.

Os valores deverão permanecer configuráveis.

## 7.2 Regra de arroto artificial

Arrotos classificados pelo usuário como “puxei ar” participam da categoria Artificial.

Eles:

* recebem Auê Score normalmente;
* podem participar de desafios;
* podem receber XP;
* não competem em recordes naturais;
* não recebem classificação Lendário Natural.

---

# 8. Classificação do Resultado

Faixas iniciais:

* 0–19: Arroto de Hamster
* 20–39: Tentativa Honesta
* 40–59: Arroto Respeitável
* 60–74: Pedreiro Certificado
* 75–84: Trovão Gastrointestinal
* 85–94: Monstro do Esgoto
* 95–99: Arma Biológica
* 100: O ARROTO

As classificações são elementos de entretenimento e não representam avaliação médica ou científica.

---

# 9. Resultado

Após a análise, a tela deve apresentar:

* Auê Score;
* classificação;
* duração;
* potência;
* profundidade;
* textura;
* origem;
* frase de julgamento;
* eventual conquista;
* XP obtido.

Exemplo:

**91,4**

**MONSTRO DO ESGOTO**

Profundidade: 96
Potência: 88
Duração: 86
Textura: 91

> Tecnicamente impressionante. Socialmente indefensável.

CTAs:

* Tentar novamente
* Desafiar alguém
* Compartilhar
* Competição presencial

---

# 10. Compartilhamento

O sistema deve gerar automaticamente um artefato visual compartilhável.

Pode ser:

* imagem;
* vídeo curto;
* card animado.

Conteúdo mínimo:

* Auê Score;
* classificação;
* principais métricas;
* nome ou apelido;
* URL de desafio;
* branding Auê!.

Exemplo:

**LUIZ FEZ 91,4**

**VOCÊ CONSEGUE BATER?**

`aue.app/d/ABC123`

O compartilhamento inicial deve usar recursos nativos do sistema/browser.

Integração direta com TikTok não pertence ao MVP.

---

# 11. Desafio 1v1

## 11.1 Criação

Após obter um resultado, o usuário pode selecionar:

**Desafiar alguém**

O sistema cria um identificador único.

Exemplo:

`aue.app/d/ABC123`

## 11.2 Participação

O convidado:

1. abre o link;
2. vê a pontuação do desafiante;
3. grava seu arroto;
4. recebe sua pontuação;
5. sistema compara os resultados.

## 11.3 Resultado

Exemplo:

**LUIZ — 87,4**

versus

**RENAN — 91,2**

**RENAN VENCEU**

Critério principal:

Auê Score.

Em caso de empate, utilizar progressivamente:

1. profundidade;
2. potência;
3. duração.

Persistindo empate:

**Empate Técnico do Gás**

---

# 12. Revanche

Após uma derrota, qualquer competidor poderá iniciar revanche.

Não deve haver necessidade de aguardar uma hora no MVP.

Pode existir cooldown posteriormente caso abuso seja identificado.

---

# 13. Competição Presencial

## 13.1 Objetivo

Permitir que várias pessoas utilizem o mesmo dispositivo.

Isso também melhora a comparabilidade entre os resultados, pois todas as medições utilizam o mesmo microfone.

## 13.2 Fluxo

1. Criar competição.
2. Informar nome/apelido dos participantes.
3. Cada participante grava uma vez.
4. Sistema calcula cada Auê Score.
5. Sistema ordena os participantes.
6. Vencedor é declarado.

Quantidade inicial:

**2 a 8 participantes.**

## 13.3 Resultado

Exemplo:

1. Renan — 91,2
2. Luiz — 87,4
3. Felipe — 63,1

**Campeão: Renan**

---

# 14. Gamificação

A gamificação deve ser dividida em quatro sistemas independentes:

* Auê Score;
* XP;
* vitórias;
* reações sociais.

Popularidade não altera a qualidade técnica do arroto.

---

# 15. XP

## 15.1 XP por resultado

Sugestão:

* arroto válido: +5 XP;
* Score 40–69: +5 XP adicionais;
* Score 70–89: +15;
* Score 90–94: +25;
* Score 95+: +35.

## 15.2 XP competitivo

* primeira vitória contra um adversário: +20;
* vitória em competição presencial: +25;
* conquista: valor configurável;
* missão: valor configurável.

## 15.3 Limite de farming

Somente as primeiras:

**5 gravações válidas por dia**

geram XP relacionado à performance.

O usuário continua podendo gravar normalmente após isso.

---

# 16. Níveis

Versão inicial:

1–2 — Estômago Novato
3–4 — Iniciante do Gás
5–7 — Arrotador Amador
8–10 — Mestre do Ruído
11–13 — Barítono Gástrico
14–16 — Trovão Abdominal
17–18 — Demônio do Estômago
19 — Monstro do Auê
20 — Deus do Auê

Após o nível máximo:

* Lenda do Auê I
* Lenda do Auê II
* Lenda do Auê III

O XP necessário por nível deve ser configurável.

---

# 17. Conquistas

Conquistas iniciais:

**Primeiro Auê**
Primeira gravação válida.

**Foi Sem Querer**
Primeiro arroto espontâneo.

**Caralho, Que Foi Isso?**
Primeira nota acima de 90.

**Terremoto Local**
Profundidade acima de 95.

**Curto e Grosso**
Menos de 1 segundo com potência acima de 90.

**Discurso Gástrico**
Duração superior a 5 segundos.

**Coxinha Vingativa**
Origem comida com nota superior a 85.

**Matador de Amigos**
10 vitórias em 1v1.

**David contra Golias**
Vencer adversário significativamente acima do próprio nível.

**Humilhação Pública**
Vencer por diferença superior a 30 pontos.

**Por Um Triz**
Vencer por diferença inferior a 1 ponto.

**Revanche Servida Fria**
Perder e posteriormente vencer o mesmo usuário.

**O Escolhido**
Nota 99+.

**Isso Não Devia Ser Possível**
Score 100.

As conquistas devem poder gerar cards compartilháveis.

---

# 18. Rankings

Os rankings oficiais entram após autenticação.

Rankings iniciais:

* Top da Semana;
* Melhores Naturais;
* Mais Vitórias.

Ranking diário, histórico completo, amigos e categorias específicas ficam para evolução posterior.

---

# 19. Missões

Missões devem incentivar variedade e competição, não quantidade excessiva de gravações.

Exemplos:

* vença dois adversários diferentes;
* consiga profundidade acima de 80;
* participe de uma competição presencial;
* consiga nota acima de 85;
* vença uma revanche.

Evitar missões que incentivem consumo exagerado de alimentos ou bebidas.

---

# 20. Recompensas

Recompensas devem ser cosméticas.

Exemplos:

* molduras;
* avatares;
* badges;
* animações de vitória;
* frases especiais;
* efeitos visuais;
* títulos;
* estilos de card;
* personalidade do juiz.

Nenhuma recompensa deve melhorar Auê Score ou oferecer vantagem competitiva.

---

# 21. Personalidades do Juiz

Sistema de personalização da apresentação do resultado.

Exemplos:

### Clássico

“Pontuação 82. Excelente profundidade.”

### Debochado

“82. Foi bom. Não começa a se achar.”

### Narrador esportivo

“QUE PERFORMANCE! OITENTA E DOIS PONTOS!”

### Medieval

“O estômago deste cidadão anuncia a chegada da peste.”

O motor matemático permanece igual. Apenas apresentação e copy mudam.

---

# 22. Conta e Autenticação

## MVP

Conta não é obrigatória.

Usuário anônimo pode:

* gravar;
* receber nota;
* tentar novamente;
* participar de competição presencial;
* criar ou receber desafio temporário;
* compartilhar.

## Conta registrada

Necessária para:

* XP persistente;
* conquistas;
* ranking;
* histórico sincronizado;
* perfil público futuro.

Métodos prioritários:

* Google;
* e-mail / magic link.

Apple poderá ser adicionado posteriormente se necessário.

---

# 23. Rede Social

Não pertence ao MVP inicial.

Fases futuras poderão incluir:

* perfil;
* seguir usuários;
* feed;
* reações;
* comentários;
* amigos;
* grupos.

Chat individual e em grupo deve ser tratado como funcionalidade de longo prazo devido a requisitos de abuso, moderação, segurança e privacidade.

---

# 24. Reações

Quando o feed existir, substituir likes/dislikes genéricos por reações próprias.

Exemplos:

* 💀 Morri
* 🤢 Nojento
* 📢 Trovão
* 👑 Monstro
* 🍼 Fraquinho

Reações não concedem XP diretamente.

---

# 25. Arquitetura

## 25.1 Visão geral

```text
Usuário
   │
   ▼
Auê! PWA
   │
   ├── MediaRecorder
   ├── Web Audio API
   ├── Auê Judgement Engine
   ├── IndexedDB
   └── Service Worker
   │
   ▼
Backend
   ├── Auth
   ├── Banco PostgreSQL
   ├── Storage
   ├── API / Edge Functions
   └── Jobs / Rankings
```

---

# 26. Stack recomendada

## Frontend

Recomendação:

**React + TypeScript + Vite**

Motivos:

* aplicação essencialmente client-side;
* PWA;
* simplicidade;
* bundle pequeno;
* bom suporte a APIs nativas;
* sem necessidade inicial de renderização server-side complexa.

Principais APIs:

* Web Audio API;
* MediaRecorder API;
* Web Share API;
* IndexedDB;
* Service Worker;
* Web App Manifest.

## Backend

Recomendação:

**Supabase**

Componentes:

* PostgreSQL;
* Auth;
* Storage;
* Realtime futuramente;
* Edge Functions;
* Row Level Security.

Motivo principal:

A evolução prevista possui diversas relações entre:

* usuários;
* arrotos;
* desafios;
* competidores;
* conquistas;
* rankings;
* reações;
* comentários.

O modelo relacional é adequado para essa evolução.

---

# 27. Estrutura sugerida do frontend

```text
src/
  app/
  features/
    recording/
    judgement/
    results/
    challenges/
    competitions/
    gamification/
    sharing/
    auth/
  shared/
    audio/
    storage/
    ui/
    utils/
  workers/
  db/
```

O motor de áudio deve permanecer desacoplado da interface.

---

# 28. Auê Judgement Engine

Interface conceitual:

```ts
interface BurpAnalysis {
  duration: number
  power: number
  depth: number
  texture: number
  originScore: number
  finalScore: number
}
```

Entrada:

```ts
AudioBuffer
AmbientBaseline
BurpOrigin
```

Saída:

```ts
BurpAnalysis
```

O cálculo deve ser determinístico para uma mesma versão do algoritmo.

---

# 29. Versionamento do algoritmo

Cada análise deve registrar:

```text
algorithmVersion
```

Exemplo:

```text
aue-score-v1
```

Isso permite alterar pesos e lógica futuramente sem perder a rastreabilidade de resultados anteriores.

---

# 30. Score local e Score oficial

Existem dois níveis de resultado.

## Local Score

Calculado integralmente no aparelho.

Utilizado para:

* resposta instantânea;
* uso offline;
* brincadeira casual.

## Official Score

Utilizado em:

* ranking;
* recordes;
* competições oficiais;
* desafios competitivos persistentes.

Nesse fluxo:

1. gravação é enviada ao backend;
2. backend valida ou recalcula características;
3. Official Score é registrado.

O cliente nunca deve poder informar diretamente ao servidor uma pontuação considerada oficial.

---

# 31. Persistência local

IndexedDB deve armazenar:

* configurações;
* sessões não sincronizadas;
* resultados locais;
* gravações aguardando upload;
* competições presenciais em andamento.

O áudio não deve permanecer indefinidamente sem necessidade.

---

# 32. Modelo de Dados

## users

```text
id
display_name
avatar_url
xp
level
prestige
best_score
total_wins
created_at
```

## burps

```text
id
user_id
score
duration
power
depth
texture
origin
category
algorithm_version
audio_url
video_url
verified
created_at
```

## challenges

```text
id
creator_user_id
status
expires_at
created_at
```

## challenge_entries

```text
id
challenge_id
user_id
burp_id
score
created_at
```

## competitions

```text
id
owner_user_id
type
status
created_at
```

## competition_entries

```text
id
competition_id
player_name
user_id
burp_id
position
```

## achievements

```text
id
code
name
description
xp_reward
```

## user_achievements

```text
user_id
achievement_id
unlocked_at
```

## xp_events

```text
id
user_id
type
amount
reference_id
created_at
```

## rankings

Preferencialmente derivados de scores e vitórias, e não armazenados como uma única lista gigante.

---

# 33. Storage

Bucket inicial:

```text
burps/
```

Estrutura:

```text
/{userId}/{burpId}/audio
/{userId}/{burpId}/video
```

Uploads devem ocorrer somente quando necessários.

Gravação casual local não deve ser enviada automaticamente.

---

# 34. Privacidade

Princípio:

**Local primeiro.**

O áudio só é enviado quando o usuário executa uma ação que exige persistência.

Exemplos:

* publicar;
* competir oficialmente;
* participar de ranking;
* sincronizar histórico.

O sistema deverá possuir:

* exclusão de conta;
* exclusão de conteúdo;
* política de retenção;
* configuração de visibilidade;
* mecanismos de denúncia quando conteúdo público existir.

---

# 35. Segurança

Obrigatório:

* Row Level Security;
* URLs assinadas para conteúdo privado;
* validação server-side de ações competitivas;
* rate limiting;
* prevenção de duplicação de eventos XP;
* identificadores imprevisíveis;
* proteção contra replay de desafios;
* validação de tamanho e formato de uploads.

---

# 36. Antiabuso

Limites iniciais:

* máximo de gravações locais: sem bloqueio rígido;
* máximo de gravações que geram XP por performance: 5/dia;
* uploads persistentes: rate limit configurável;
* criação de desafios: rate limit configurável.

O limite antigo de 10 gravações por hora não deve bloquear a brincadeira local.

---

# 37. Processamento de Áudio

Processamento inicial no navegador.

Etapas:

```text
Microfone
   ↓
Captura
   ↓
Baseline ambiente
   ↓
Detecção do evento
   ↓
Extração de features
   ↓
Normalização
   ↓
Cálculo do Auê Score
```

Features iniciais:

* RMS;
* peak;
* duração;
* spectral centroid;
* energia por banda;
* envelope;
* decay;
* variação espectral.

---

# 38. Performance

Metas iniciais:

* interface utilizável em até 2 segundos em conexão móvel comum;
* resposta da análise local em até 3 segundos após encerramento da gravação;
* interação principal possível offline;
* carregamento inicial mínimo;
* lazy loading para recursos secundários.

---

# 39. PWA

Obrigatório:

* manifest;
* service worker;
* instalação na Home Screen;
* funcionamento offline básico;
* cache dos assets essenciais;
* atualização automática controlada;
* ícones adequados;
* splash/launch experience quando suportado.

---

# 40. Modo Offline

Offline deve permitir:

* abrir app após primeiro acesso;
* gravar;
* analisar;
* receber Auê Score;
* executar competição presencial;
* consultar resultados recentes locais.

Ações dependentes do backend ficam em estado:

**Aguardando conexão**

---

# 41. TikTok

Não faz parte do MVP técnico.

Primeira estratégia:

```text
Gerar card/vídeo
        ↓
Web Share API
        ↓
Usuário escolhe TikTok / WhatsApp / Instagram / outro
```

Integração oficial com Content Posting API será avaliada posteriormente.

---

# 42. Observabilidade

Registrar eventos de produto sem capturar áudio desnecessariamente.

Eventos iniciais:

```text
app_open
recording_started
recording_completed
score_generated
retry_clicked
share_clicked
challenge_created
challenge_completed
competition_created
competition_completed
achievement_unlocked
signup_completed
```

---

# 43. Métricas de sucesso

O MVP deverá responder principalmente:

1. Quantas pessoas iniciam uma gravação?
2. Quantas completam?
3. Quantas tentam novamente?
4. Quantas compartilham?
5. Quantas criam desafio?
6. Quantas pessoas acessam via desafio?
7. Quantas pessoas desafiadas também gravam?
8. Quantos usuários retornam em até 7 dias?

Métrica principal:

**Challenge Conversion Rate**

```text
desafiados que gravam
÷
desafios abertos
```

Métrica viral:

**K-factor aproximado**

Quantidade média de novos participantes gerados por cada usuário ativo.

---

# 44. MVP 1

O MVP inicial contém apenas:

### Core

* PWA;
* gravação de áudio;
* calibração ambiente;
* Auê Judgement Engine;
* Auê Score;
* origem declarada;
* resultado;
* classificação;
* frase de julgamento;
* tentar novamente.

### Viral

* card compartilhável;
* Web Share;
* desafio por link;
* resultado do duelo.

### Competição

* modo presencial;
* 2 a 8 participantes;
* ranking da sessão;
* vencedor.

### Gamificação

* XP;
* níveis;
* conquistas essenciais;
* histórico local.

### Infraestrutura

* Supabase;
* autenticação opcional;
* Storage somente quando necessário;
* persistência de desafios.

---

# 45. Fora do MVP

Não implementar inicialmente:

* feed global;
* seguidores;
* amigos;
* chat;
* grupos;
* comentários;
* stories;
* notificações push;
* TikTok API;
* ranking diário;
* dezenas de categorias;
* IA generativa obrigatória;
* marketplace;
* monetização.

---

# 46. Roadmap

## MVP 1 — Arrote e desafie

Validar o loop principal.

## MVP 2 — Liga Auê!

Adicionar:

* contas completas;
* ranking;
* perfis;
* conquistas expandidas;
* eventos.

## MVP 3 — Comunidade

Adicionar:

* feed;
* seguir usuários;
* reações;
* comentários;
* compartilhamento interno.

## MVP 4 — Social avançado

Avaliar:

* grupos;
* competições online;
* temporadas;
* notificações;
* integrações externas.

Chat somente será considerado se houver demanda real.

---

# 47. Regra central

Qualquer nova funcionalidade deverá responder positivamente a pelo menos uma destas perguntas:

**Torna o arroto mais divertido?**

**Torna a competição melhor?**

**Torna mais fácil desafiar outra pessoa?**

**Torna o resultado mais compartilhável?**

Se a resposta for não, a funcionalidade não entra no produto inicial.

---

# 48. Loop central do Auê!

```text
ARROTAR
   ↓
AUÊ SCORE
   ↓
XP / CONQUISTA
   ↓
DESAFIAR
   ↓
VENCER OU PERDER
   ↓
COMPARTILHAR
   ↓
OUTRA PESSOA ENTRA
   ↓
ARROTAR
```

Esse é o motor de crescimento do produto.

---

# 49. Definição do Produto

**Auê!**

Um campeonato de arroto no seu bolso.

**Arrote. Seja julgado.**
