> # ⚠️ ARQUIVADO — SEM AUTORIDADE
>
> Este documento descreve o Auê **antes** do reposicionamento de 2026-08-09,
> quando ele era um webapp/PWA com ambição de rede social e governança por gate
> sequencial.
>
> Hoje o Auê é um **jogo mobile casual, web-first**:
> [`../jogo/VISAO.md`](../jogo/VISAO.md) · [`../escopo/ESCOPO_ATUAL.md`](../escopo/ESCOPO_ATUAL.md) · [`../../AGENTS.md`](../../AGENTS.md)
>
> Ele fica versionado como contexto histórico. **Não use nada daqui como
> argumento para implementar, ampliar escopo ou reverter decisão.** Ver
> [`README.md`](README.md).

---

# Auê! — Especificação Funcional e Técnica

**Versão:** 2.0  
**Produto:** PWA mobile-first de competição de arrotos  
**Voz:** escrita como o projeto é pensado por Giam, Guinho e Marcelo

> **Antes de qualquer coisa:** este documento conta a visão funcional ampla do Auê.
> Para saber **o que pode entrar no lançamento agora**, quem manda é
> [`../mvp1/CONTRATO_MVP1.md`](../mvp1/CONTRATO_MVP1.md).
>
> Se este arquivo ficar empolgado demais e o contrato disser “não”, o contrato ganha.

---

# 1. De onde estamos partindo

O Auê não nasceu de workshop, benchmark de consultoria ou reunião com post-it.
Nasceu de primo arrotando, outro tentando superar, gente rindo e alguém falando:
“isso dava um jogo”.

A ideia é simples:

**arrotar → receber uma nota → provocar alguém → ver quem ganhou → repetir.**

O produto tem que continuar parecendo isso mesmo quando crescer.

Se para arrotar a pessoa precisar preencher formulário, entender menu, criar perfil,
escolher avatar, aceitar quinze coisas ou assistir tutorial, fizemos merda.

## Como os três olham para este documento

- **Giam** puxa produto, arquitetura e sustentabilidade: a brincadeira precisa virar software real, simples de operar e capaz de um dia se pagar.
- **Guinho** puxa a verdade do jogo: pontuação, disputa, revanche e uma copy que parece conversa entre amigos — não marca tentando ser jovem.
- **Marcelo** é o cara do “tá, mas e se eu fizer isso aqui?”: se só funciona no caminho perfeito, então ainda não funciona.

A documentação funcional precisa equilibrar os três.

---

# 2. Regra-mãe do produto

Toda funcionalidade precisa responder “sim” para pelo menos uma destas perguntas:

- deixa o arroto mais divertido?
- melhora a disputa?
- facilita desafiar alguém?
- deixa o resultado mais compartilhável?
- reduz uma fricção real?

Se não melhora nada disso, vai para o backlog.

E para o **MVP1**, existe uma regra ainda mais simples:

> Se não está no contrato do MVP1, não entra agora só porque parece legal.

---

# 3. Loop central

```text
ABRIR
  ↓
ARROTAR
  ↓
AUÊ SCORE
  ↓
COMPARTILHAR OU DESAFIAR
  ↓
OUTRA PESSOA ENTRA
  ↓
ARROTAR
  ↓
REVANCHE
```

Esse é o motor do produto.

Tudo o que vier depois — ranking global, conquistas, feed, perfil, ligas — existe
para fortalecer esse loop, nunca para substituí-lo.

---

# 4. Quem usa

## 4.1 O cara que só quer zoar

Abre, arrota, recebe a nota e manda no grupo.

Precisa de:

- zero cadastro obrigatório;
- resultado rápido;
- compartilhamento fácil;
- nenhuma explicação longa.

## 4.2 O competitivo

Não quer só uma nota. Quer saber se ganhou do amigo.

Precisa de:

- regra consistente;
- comparação clara;
- revanche;
- placar;
- futuramente ranking e histórico.

## 4.3 A galera reunida

Está em casa, no churrasco, no escritório, no bar ou em qualquer lugar onde
alguém teve a péssima ideia de perguntar “quem arrota melhor?”.

Precisa de:

- um aparelho só;
- nomes rápidos;
- turnos claros;
- até 5 participantes no MVP1;
- 1 a 3 rounds;
- pódio no final.

## 4.4 O social — depois

Feed, seguidores, comentários, comunidades e perfil público podem fazer sentido
quando existir uso real suficiente para justificar isso.

Não vamos construir uma cidade antes de ter morador.

---

# 5. Primeiro acesso

No celular, o Auê abre direto no produto.

Nada de tela obrigatória de cadastro.
Nada de onboarding em carrossel.
Nada de “conte um pouco sobre você”.

O CTA principal é óbvio:

**ARROTAR**

Ao tocar, o navegador pede a única permissão técnica indispensável para o fluxo:

**microfone.**

O resto só aparece quando realmente for necessário.

---

# 6. Desktop

Desktop não é o lugar ideal para ficar arrotando para o notebook.

A versão desktop funciona principalmente como:

- landing pública do Auê;
- página indexável para busca;
- explicação curta de como funciona;
- porta para continuar no celular;
- acesso a privacidade e termos.

Deve orientar o uso no celular e oferecer um QR Code ou outro caminho simples
para abrir o webapp no dispositivo móvel.

A landing não pode ser só “use no celular e tchau”. O Google precisa encontrar
conteúdo real que explique o produto.

---

# 7. Gravação

## 7.1 Formato principal

O áudio é o formato obrigatório para avaliação.

Tempo máximo recomendado:

**10 segundos por tentativa.**

O navegador usa `MediaRecorder` e APIs de áudio disponíveis no dispositivo.

Vídeo pode existir futuramente como peça de compartilhamento, mas não é requisito
do MVP1 nem interfere na nota.

## 7.2 Ambiente

Quando necessário, o sistema pode capturar um pequeno baseline de ruído do ambiente
para não tratar ventilador, trânsito ou o primo falando no fundo como parte do arroto.

A calibração não deve virar uma etapa burocrática visível se puder acontecer de
forma curta e discreta.

## 7.3 O microfone tem que parar

Ao terminar, cancelar, falhar ou sair da tela, o stream precisa ser encerrado.

Se a luz do microfone continuar acesa depois da brincadeira, está quebrado.

---

# 8. Auê Judgement Engine

O motor de avaliação será chamado internamente de:

**Auê Judgement Engine**

A piada pode ser absurda. O cálculo não pode ser inventado.

O motor trabalha com métricas digitais do áudio e produz valores normalizados.
Ele **não** deve fingir medição acústica científica que o aparelho não consegue fazer.

## 8.1 Duração

Tempo efetivo do evento detectado.

Exemplo:

**Duração: 3,2 s**

## 8.2 Potência

Representa intensidade relativa do sinal digital.

Pode considerar:

- RMS;
- amplitude;
- peak;
- envelope;
- diferença para o ruído de fundo.

Não chamar isso de decibéis acústicos reais.

## 8.3 Profundidade

Representa presença e intensidade relativa de frequências graves.

Pode considerar:

- FFT;
- distribuição espectral;
- energia por bandas;
- frequência dominante;
- centroide espectral.

## 8.4 Textura

É a “personalidade sonora” do evento.

Pode considerar:

- irregularidade do envelope;
- variação espectral;
- sustentação;
- decay;
- rugosidade;
- mudanças internas de frequência;
- múltiplos eventos dentro da mesma gravação.

## 8.5 Origem

A origem é declarada pela pessoa. O Auê não lê mente nem estômago.

Opções de lançamento:

- cerveja;
- refrigerante;
- comida;
- puxando ar;
- outro.

A visão ampla pode diferenciar depois espontâneo, outras bebidas e subtipos.

---

# 9. Auê Score

A pontuação vai de:

**0 a 100.**

Composição de referência:

| Critério | Peso |
|---|---:|
| Duração | 25% |
| Potência | 20% |
| Profundidade | 25% |
| Textura | 20% |
| Origem | 10% |

Os pesos devem permanecer versionados e rastreáveis.

## 9.1 Origem

Referência inicial:

- espontâneo: 10;
- comida: 9;
- bebida: 8;
- puxando ar: 0.

“Puxando ar” continua recebendo nota, só não deve fingir ser a mesma categoria
de um arroto natural quando existirem recordes oficiais.

## 9.2 Mesma entrada, mesma regra

A mesma versão do algoritmo deve produzir resultado determinístico para as mesmas
métricas de entrada.

Cada resultado registra algo como:

```text
algorithmVersion = aue-score-v1
```

Se o algoritmo mudar, muda a versão. Não apagamos o passado para fingir que sempre
foi assim.

---

# 10. Classificação

Faixas de referência:

- 0–19: **Arroto de Hamster**
- 20–39: **Tentativa Honesta**
- 40–59: **Arroto Respeitável**
- 60–74: **Pedreiro Certificado**
- 75–84: **Trovão Gastrointestinal**
- 85–94: **Monstro do Esgoto**
- 95–99: **Arma Biológica**
- 100: **O ARROTO**

Esses nomes são entretenimento. Não são diagnóstico médico, científico nem
certificado internacional de arroto.

---

# 11. Resultado individual

A tela de resultado deve priorizar:

1. nota;
2. classificação;
3. métricas principais;
4. origem;
5. julgamento curto;
6. próxima ação.

Exemplo:

**91,4**  
**MONSTRO DO ESGOTO**

> Tecnicamente impressionante. Socialmente indefensável.

CTAs do MVP1:

- **Tentar de novo**
- **Desafiar**
- **Compartilhar**
- **Disputa local**

XP, conquista e outras camadas de gamificação ficam escondidas enquanto estiverem
fora do contrato de lançamento.

---

# 12. Compartilhamento

Compartilhar não é enfeite. É distribuição do produto.

O resultado deve poder sair do Auê por:

- WhatsApp;
- X;
- Telegram;
- Web Share API;
- cópia de link como fallback.

O artefato compartilhável deve conter o necessário para provocar alguém:

- Auê Score;
- classificação;
- identidade visual;
- CTA de desafio;
- link da batalha quando houver.

Exemplo de espírito:

**Giam fez 91,4.**  
**Vai deixar isso assim?**

Integrações complexas com APIs de postagem podem vir depois. Primeiro o link tem
que circular.

---

# 13. Batalha remota por link

A batalha por link é a mecânica viral principal do MVP1.

Ela substitui a ideia de um duelo 1x1 rígido por uma sessão temporária em que a
provocação pode continuar.

## 13.1 Criação

Depois da nota, a pessoa escolhe **Desafiar**.

O sistema cria uma batalha com código longo, imprevisível e não enumerável.

Exemplo conceitual:

```text
/b/7Kp9xQm2...
```

## 13.2 Entrada

Quem recebe o link:

1. abre sem cadastro;
2. vê a sequência da batalha;
3. pode ouvir os arrotos disponíveis daquela sessão;
4. grava a própria resposta;
5. recebe a nota;
6. entra na sequência;
7. pode devolver o link e continuar a revanche.

Outros amigos podem entrar pelo mesmo convite.

## 13.3 Sequência

Exemplo:

```text
Giam       82,4
Guinho     94,1
Giam       88,7
Marcelo    76,3
Guinho     95,0
```

Isso parece um feed, mas **não é feed público**.
É histórico privado daquela batalha acessível pelo link.

## 13.4 Expiração

A sessão fica acessível por até:

**7 dias.**

Depois disso, o link não deve mais expor a sequência da disputa.

O destino dos arquivos de áudio após a expiração é uma decisão explícita de
produto e privacidade registrada no contrato do MVP1. Não presumir retenção
permanente só porque o navegador autorizou o microfone.

---

# 14. Desafio 1x1 antigo

O fluxo legado `/d/CODIGO` pode continuar existindo para não quebrar links já
compartilhados.

Ele não é a mecânica principal de crescimento daqui para frente.

Nada novo deve depender dele quando a batalha `/b/CODIGO` resolver o mesmo caso.

---

# 15. Disputa local

Esse é o modo “junta a galera e vê quem ganha”.

## 15.1 Configuração do MVP1

- 2 a 5 participantes;
- nome ou nick;
- 1 a 3 rounds;
- contexto/local opcional.

Contextos iniciais:

- casa;
- escritório;
- churrasco;
- público;
- outro.

## 15.2 Fluxo

1. criar disputa;
2. cadastrar participantes;
3. definir quantidade de rounds;
4. cada pessoa arrota na própria vez;
5. cada tentativa recebe nota e origem;
6. atualizar placar por round;
7. fechar a disputa;
8. mostrar ranking e pódio.

Todas as tentativas usam o mesmo aparelho, o que ajuda a reduzir diferença de
microfone entre participantes.

## 15.3 Resultado

Exemplo:

1. Guinho — 95,0
2. Giam — 88,7
3. Marcelo — 76,3

**Campeão: Guinho**

Surpresa nenhuma para quem conhece a história do projeto.

## 15.4 Compartilhar a vergonha coletiva

Ao final, gerar um banner com:

- nomes;
- posições;
- notas;
- contexto/local quando informado;
- identidade Auê.

Esse banner usa os mesmos canais de compartilhamento do resultado individual.

---

# 16. PWA

O Auê é webapp primeiro.

Precisa de:

- manifest;
- service worker;
- ícones adequados;
- possibilidade de adicionar à tela inicial quando suportado;
- cache dos assets essenciais;
- atualização controlada;
- comportamento mobile-first.

Offline completo é evolução. O lançamento não deve prometer o que ainda depende
do backend para funcionar.

---

# 17. Conta e identidade

## MVP1

Não existe login obrigatório.

A pessoa consegue:

- gravar;
- receber nota;
- compartilhar;
- entrar em batalha;
- responder;
- participar de disputa local.

Se o backend precisar de identidade técnica para RLS ou Storage, pode usar sessão
anônima invisível. Isso não transforma sessão técnica em cadastro de produto.

## Futuro

Conta registrada pode existir para:

- histórico persistente;
- ranking global;
- conquistas;
- perfil;
- sincronização entre dispositivos.

Quando login social voltar, a preferência é promover/vincular a identidade
anônima existente em vez de jogar fora o histórico e criar outra pessoa do zero.

---

# 18. Privacidade

Regra simples:

**não esconder o que fazemos com o áudio.**

No MVP1:

- microfone é pedido quando necessário;
- batalhas precisam de áudio persistido enquanto a sessão estiver ativa;
- a sessão pública por link expira em até 7 dias;
- termos e privacidade ficam disponíveis em páginas públicas;
- retenção além da sessão precisa de regra explícita antes do lançamento.

Se no futuro quisermos montar um acervo permanente de arrotos, isso precisa ser
tratado como finalidade própria e transparente. Não vale chamar permissão técnica
de microfone de autorização eterna.

Quando conteúdo público existir, entram também mecanismos de denúncia, exclusão
e visibilidade.

---

# 19. Segurança

O produto é idiota. A segurança não pode ser.

Obrigatório conforme a superfície existir:

- Row Level Security;
- identificadores imprevisíveis;
- validação server-side de ações competitivas;
- URLs/controles adequados para conteúdo privado;
- validação de tamanho e formato de upload;
- rate limiting em ações persistentes;
- prevenção de duplicação de eventos;
- proteção contra enumeração e replay;
- nenhuma confiança cega em score enviado pelo navegador para resultado oficial.

Uma batalha “privada por link” só é privada enquanto o código for difícil de
adivinhar e não houver endpoint listando tudo por fora.

---

# 20. Score local e oficial

Existem dois conceitos possíveis.

## Score local

Serve para resposta rápida e brincadeira casual.

## Score oficial

Serve quando o resultado passa a ter consequência persistente, como ranking ou
recorde futuro.

Nesse caso, o cliente não deve simplesmente mandar:

```text
minhaNota = 100
```

e o servidor responder “parabéns”.

O backend valida ou recalcula o necessário antes de considerar o resultado
oficial.

---

# 21. Stack

## Frontend

**React + TypeScript + Vite**

Porque o produto é fortemente client-side, usa APIs nativas do navegador e não
precisa de uma catedral de infraestrutura para um arroto.

APIs principais:

- MediaRecorder;
- Web Audio API;
- Web Share API;
- Service Worker;
- Web App Manifest.

## Backend

**Supabase**

Usos:

- PostgreSQL;
- Auth/sessão anônima;
- Storage;
- RPCs;
- RLS;
- Edge Functions quando necessário.

A visão futura tem relações entre pessoas, resultados, batalhas, conquistas,
ranking e reações. Banco relacional faz sentido para isso.

---

# 22. Organização de código

O motor de áudio não deve depender da tela.
A tela não deve conhecer detalhes de RLS.
Compartilhamento não deve recalcular score.

Em outras palavras: cada coisa faz o próprio trabalho.

Estrutura conceitual:

```text
src/
  features/
    audio/
    battle/
    local-competition/
    sharing/
    results/
  shared/
    ui/
    formato/
    auth/
    flags/
  db/
```

A estrutura real do repositório prevalece sobre exemplos antigos deste documento.
Não reorganizar pastas só para fazer o desenho acima ficar bonito.

---

# 23. Performance

Metas de produto:

- interface principal rápida em conexão móvel comum;
- análise do áudio sem espera desnecessária;
- lazy loading para coisas secundárias;
- bundle inicial controlado;
- nada de baixar uma biblioteca pesada porque talvez alguém clique num botão três telas depois.

Referência:

- interface utilizável em até ~2 s em condição móvel razoável;
- análise local idealmente concluída em até ~3 s após o fim da gravação.

Esses números são metas, não desculpa para esconder loading quebrado.

---

# 24. SEO e descoberta

O código não controla a vontade do Google.

O que controlamos:

- landing pública;
- conteúdo indexável real;
- `robots.txt`;
- `sitemap.xml`;
- canonical;
- title e description;
- Open Graph;
- metadata social;
- URLs públicas coerentes.

“Está preparado para indexação” é requisito técnico.
“Vai aparecer em primeiro para arroto” não é promessa que um commit consegue cumprir.

---

# 25. Observabilidade

Queremos saber se a brincadeira funciona, não vigiar a vida de ninguém.

Eventos úteis para o MVP1:

```text
app_open
recording_started
recording_completed
score_generated
retry_clicked
share_clicked
battle_created
battle_opened
battle_entry_completed
local_competition_created
local_competition_completed
```

Nada disso exige capturar áudio desnecessariamente para analytics.

---

# 26. Métricas que importam

O MVP1 precisa responder:

1. quantas pessoas começam a gravar?
2. quantas terminam?
3. quantas tentam de novo?
4. quantas compartilham?
5. quantas criam batalha?
6. quantas pessoas abrem um convite?
7. quantas dessas realmente gravam?
8. quantas batalhas têm revanche?
9. quantas disputas locais chegam ao pódio?
10. quantas pessoas retornam em até 7 dias?

Uma métrica central:

**Battle Conversion Rate**

```text
convidados que gravam
÷
convites abertos
```

Métrica viral aproximada:

**K-factor** — quantos novos participantes cada pessoa ativa traz para a brincadeira.

---

# 27. O que entra no MVP1

A lista oficial está no contrato. Resumo operacional:

## Solo

- PWA mobile-first;
- gravação de áudio;
- Auê Judgement Engine;
- Auê Score;
- origem declarada;
- resultado;
- tentar novamente;
- compartilhar.

## Batalha remota

- batalha por link privado não enumerável;
- sequência de participantes;
- áudio acessível durante a sessão;
- revanche em loop;
- até 7 dias de acesso.

## Disputa local

- 2 a 5 participantes;
- 1 a 3 rounds;
- contexto/local;
- nota por tentativa;
- ranking;
- pódio compartilhável.

## Web pública

- landing desktop;
- SEO técnico;
- privacidade;
- termos/política de uso.

## Identidade

- sem login obrigatório;
- sessão anônima técnica quando necessária.

---

# 28. O que NÃO entra no MVP1

Pode existir em código, design ou sonho do Guinho. Não entra agora:

- feed público;
- seguidores;
- comunidades;
- perfil social completo;
- ranking global;
- XP visível;
- níveis;
- conquistas avançadas;
- missões;
- recompensas;
- ligas/campeonatos online;
- chat;
- notificações push;
- Auê+;
- pagamento;
- integração direta com TikTok Content Posting API;
- app Android/iOS nativo.

Código pronto dessas áreas fica preservado e desligado por flag quando necessário.

---

# 29. Depois que o MVP provar que alguém liga para isso

A visão futura continua existindo.

## Gamificação

Pode incluir:

- XP;
- níveis;
- títulos;
- conquistas;
- missões;
- recompensas cosméticas.

Referências já pensadas:

### Níveis

- Estômago Novato
- Iniciante do Gás
- Arrotador Amador
- Mestre do Ruído
- Barítono Gástrico
- Trovão Abdominal
- Demônio do Estômago
- Monstro do Auê
- Deus do Auê
- Lenda do Auê

### Conquistas

- **Primeiro Auê** — primeira gravação válida;
- **Foi Sem Querer** — primeiro espontâneo;
- **Caralho, Que Foi Isso?** — nota acima de 90;
- **Terremoto Local** — profundidade acima de 95;
- **Curto e Grosso** — curto com potência alta;
- **Discurso Gástrico** — duração acima de 5 s;
- **Coxinha Vingativa** — comida com nota alta;
- **Matador de Amigos** — sequência de vitórias;
- **David contra Golias** — vitória improvável;
- **Por Um Triz** — vitória por menos de 1 ponto;
- **Revanche Servida Fria** — perder e depois ganhar;
- **O Escolhido** — 99+;
- **Isso Não Devia Ser Possível** — 100.

Nenhuma recompensa futura melhora a nota. Pagou, ganhou ou desbloqueou cosmético;
não comprou potência de arroto.

---

# 30. Ranking futuro

Quando houver identidade persistente suficiente para isso, podem existir:

- Top da Semana;
- Melhores Naturais;
- Mais Vitórias;
- categorias especiais.

Ranking oficial precisa de validação server-side e regra antiabuso.

Popularidade nunca altera Auê Score.

---

# 31. Rede social futura

Pode incluir:

- perfil;
- seguir;
- feed;
- reações;
- comentários;
- grupos.

Se um dia isso entrar, usar vocabulário e mecânicas coerentes com jogo — não copiar
Instagram e trocar o coração por um arroto.

Chat é ainda mais distante porque traz moderação, abuso, privacidade e custo de
operação que não ajudam ninguém a arrotar melhor.

---

# 32. Reações futuras

Se houver feed, as reações podem ser próprias do Auê:

- 💀 Morri
- 🤢 Nojento
- 📢 Trovão
- 👑 Monstro
- 🍼 Fraquinho

Reação não dá XP direto e não altera qualidade técnica do resultado.

---

# 33. Personalidades do juiz — futuro

A matemática continua a mesma. O que muda é a forma de falar.

Exemplos:

### Clássico

“82. Boa profundidade.”

### Debochado

“82. Foi bom. Não começa a se achar.”

### Narrador esportivo

“QUE PERFORMANCE! OITENTA E DOIS!”

### Medieval

“O estômago deste cidadão anuncia a chegada da peste.”

Personalidade nunca pode esconder erro, inventar dado ou ofender a pessoa.
A piada é com o arroto.

---

# 34. Antiabuso

Não vamos punir quem está numa mesa com amigos porque alguém decidiu arrotar seis
vezes.

Princípios:

- gravação local não precisa de bloqueio rígido;
- uploads persistentes podem ter rate limit;
- criação de batalhas pode ter rate limit;
- gamificação futura pode limitar XP para evitar farming;
- limites de backend não devem destruir a brincadeira presencial.

Quando XP voltar, a referência histórica de 5 gravações válidas por dia pode ser
reavaliada no contexto certo.

---

# 35. Modelo de dados — visão conceitual

Os nomes reais do banco e as migrações são a fonte de verdade técnica.
Este bloco explica entidades, não manda renomear schema.

Entidades esperadas ao longo da evolução:

```text
pessoas / perfis
resultados de arroto
batalhas
entradas de batalha
disputas locais
participantes / tentativas
conquistas
XP
ranking
reações
comentários
```

**Não usar este desenho para “corrigir” automaticamente as tabelas existentes.**
O banco real está em `supabase/migrations/`.

---

# 36. Storage

Áudio só sobe quando o fluxo precisa dele.

No MVP1, batalha remota precisa persistir áudio para os participantes ouvirem durante
a sessão.

Uploads devem ter:

- formato validado;
- tamanho controlado;
- caminho não previsível por enumeração;
- política de acesso coerente com a batalha;
- regra de retenção definida.

Não guardar arquivo eternamente por acidente.

---

# 37. Definition of Done

Uma tela bonita não está pronta só porque abriu no Chrome do desenvolvedor.

Para o MVP1, os três fluxos abaixo precisam funcionar de ponta a ponta em aparelho
real:

## Solo

**abrir → liberar microfone → gravar → receber nota → compartilhar**

## Batalha

**gravar → criar link → abrir no segundo aparelho → ouvir → responder → atualizar sequência → revanche**

## Disputa local

**criar → cadastrar participantes → rodar rounds → fechar placar → gerar pódio → compartilhar**

E Marcelo ainda vai perguntar:

- e se negar microfone?
- e se o áudio vier vazio?
- e se a rede cair?
- e se abrir link expirado?
- e se clicar duas vezes?
- e se o Storage falhar?
- e se o backend devolver lixo?

Se a resposta for “aí dá ruim”, ainda tem trabalho.

Além disso:

- `typecheck` passa;
- `lint` passa;
- testes obrigatórios passam;
- build passa;
- nenhuma feature desligada deixa rota ou CTA quebrado;
- dado fake nunca aparece como real.

---

# 38. Roadmap em português claro

## MVP1 — Arrota e chama alguém

Solo, compartilhamento, batalha por link, disputa local, landing e privacidade.

É o que precisa provar que existe gente disposta a brincar.

## Depois — competição persistente

Contas opcionais, histórico, ranking, XP e conquistas podem voltar quando fizer
sentido medir retorno e competição entre sessões.

## Depois — social

Feed, perfis, seguidores, reações e comunidades entram somente se houver massa
crítica suficiente para não parecer uma praça vazia.

## Bem depois — plataforma

Ligas, temporadas, integrações externas, monetização avançada e outras ideias
só existem se o produto já tiver motivo para continuar vivo.

---

# 39. Sustentabilidade

O Auê é hobby, mas hobby também manda boleto.

Publicidade e outras formas simples de monetização fazem parte da visão do produto.
Só não podem atrapalhar o loop principal nem se disfarçar de conteúdo.

No MVP1, monetização pode ficar tecnicamente preparada e desligada até aprovação,
configuração e volume fazerem sentido.

Não seguramos o lançamento para construir uma máquina de receita antes de existir
alguém usando.

---

# 40. A frase que fecha tudo

O Auê é uma brincadeira entre amigos que virou software.

Se ficar sofisticado demais para alguém entender em cinco segundos, voltamos algumas
casas.

**Arrote. Seja julgado. Chama outro.**
