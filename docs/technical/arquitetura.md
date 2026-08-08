# DSI: Documento de Solução e Arquitetura - Auê!

> ## ⚠️ Arquitetura PLANEJADA — diverge do que foi construído
>
> **Verificado em 2026-08-07.** Duas divergências confirmadas por leitura do
> código:
>
> - **`IndexedDB` e persistência local offline-first** (citados em 4 pontos
>   deste documento) **não existem**. Não há `indexedDB`, `idb` nem `Dexie` em
>   `src/` nem em `package.json`. O app é PWA por `vite-plugin-pwa`, que gera
>   service worker para cache de assets — isso não é o mesmo que persistência
>   offline da jornada de gravação e avaliação descrita aqui.
> - **O modelo de dados citado** segue os nomes do documento de schema, que
>   também não corresponde ao banco. Ver o aviso em
>   `docs/schema/banco_de_dados.md`.
>
> Fonte de verdade da arquitetura implementada: `src/`, `supabase/migrations/`
> e `supabase/functions/`. Este documento é útil como registro de intenção,
> não como descrição do sistema.

## 1. Visão Geral
O **Auê!** é um jogo competitivo de arrotos focado em uma experiência mobile-first rápida, sem fricção e altamente compartilhável. O sistema é concebido primariamente como um *Progressive Web App (PWA)* *offline-first*, garantindo que a jornada principal de gravação, avaliação e compartilhamento ocorra de forma imediata no navegador do usuário, com sincronização em nuvem e persistência oficial gerida por um backend *serverless*.

---

## 2. Diagrama de Arquitetura em Alto Nível

```mermaid
flowchart TD
    subgraph Client ["Frontend (PWA) - React + Vite + TS"]
        UI[User Interface]
        Engine[Auê Judgement Engine]
        Cache[(IndexedDB / Cache API)]
        ServiceWorker[Service Worker]
    end

    subgraph Backend ["Backend as a Service (Supabase)"]
        Auth[Supabase Auth]
        DB[(PostgreSQL)]
        Storage[Supabase Storage]
        RPC[Edge Functions / RPC]
    end

    User((Usuário)) -->|Interage| UI
    UI -->|Captura Áudio| Engine
    Engine -->|Web Audio API| Engine
    Engine -->|Salva Score Local| Cache
    UI <-->|Gestão Offline| ServiceWorker
    
    UI -->|Sincroniza Oficial / Desafios| RPC
    UI -->|Autenticação| Auth
    UI -->|Upload Áudio (condicional)| Storage
    RPC --> DB
    Auth --> DB
```

---

## 3. Decisões Tecnológicas (Stack)

### 3.1 Frontend (Client-side)
- **Framework Core:** React.js
- **Build Tool / Bundler:** Vite
- **Linguagem:** TypeScript
- **Estado e Persistência Local:** IndexedDB (via wrapper como Dexie.js ou IDB) para *Local Scores* e filas de sincronização.
- **APIs Nativas HTML5:**
  - **Web Audio API:** Para análise e normalização do espectro de áudio.
  - **MediaRecorder API:** Para captura do áudio pelo microfone.
  - **Web Share API:** Para acionar o menu de compartilhamento nativo do dispositivo móvel.
- **PWA:** Manifest e Service Worker para habilitar instalação na tela inicial (A2HS) e suporte a execução offline/conexão intermitente.

### 3.2 Backend e Infraestrutura (Cloud)
- **Provedor BaaS:** Supabase
- **Banco de Dados:** PostgreSQL relacional para escalabilidade das amizades, desafios e rankings futuros.
- **Armazenamento de Mídia:** Supabase Storage (armazenamento sob demanda dos áudios/vídeos de competições oficiais/desafios).
- **Regras e Segurança:** RLS (Row Level Security) nativo do Postgres e JWTs gerados pelo Supabase Auth.
- **Funções *Server-side*:** Supabase Edge Functions / Funções RPC do Postgres (para cálculos seguros de vitória em duelos, XP server-side, anti-fraude em placares).

---

## 4. Componentes Principais

### 4.1 Auê Judgement Engine
Motor matemático e determinístico executado integralmente no frontend para gerar o *Local Score* sem depender da latência da rede.
- **Inputs:** `AudioBuffer`, nível de ruído ambiente calibrado, Categoria selecionada.
- **Outputs (Normalizados 0-100):** Duração, Potência (RMS, Peak), Profundidade (Frequência Dominante, Energia Grave), Textura (Variação de Envelope), Origem.
- **Versionamento:** O algoritmo precisa ser versionado (ex: `aue-score-v1`) no objeto retornado para permitir recálculo oficial ou comparações justas no futuro.

### 4.2 Gerenciador de Sincronização (Local vs Oficial)
- Todo arroto gera um **Local Score** armazenado via IndexedDB.
- O sistema marca a entidade como `pending_sync`.
- Quando ocorre um gatilho de persistência (Ex: usuário gera um Link de Desafio, compartilha o perfil, ou participa ativamente do Ranking Global) e há conexão com a internet, o Service Worker / Camada de Rede despacha a gravação ao *Storage* e os metadados ao *Postgres*. O Backend valida (ou assina) os dados convertendo-os num **Official Score**.

---

## 5. Fluxos de Dados (Data Flow)

### 5.1 Fluxo de Avaliação de Arroto (Jornada Principal)
1. **Calibração:** Usuário clica em "Arrotar", a `MediaRecorder API` captura < 1s para o baseline de ruído.
2. **Gravação:** Captura do áudio do arroto (máx 10s).
3. **Análise:** O ArrayBuffer de áudio é injetado no `Auê Judgement Engine`.
4. **Local Score:** As 4 dimensões (Potência, Duração, Profundidade, Textura) são calculadas. 
5. **Classificação:** O peso da origem declarada é somado. O *Score* final de 0 a 100 determina o título (ex: "Monstro do Esgoto").
6. **Armazenamento Local:** Salvamento offline via IndexedDB. A exibição na interface ocorre quase instantaneamente.

### 5.2 Fluxo de Desafio (1v1)
1. **Geração:** O Desafiante escolhe um resultado local e aperta "Desafiar".
2. **Upload Inicial:** O áudio e o metadado (caso não estejam na nuvem ainda) são subidos via API para o Supabase. O backend cria um registro de `challenges` e retorna uma URL (ex: `aue.app/d/xyz`).
3. **Recepção:** O Convidado abre a URL, o PWA inicializa carregando o target a ser batido.
4. **Tentativa do Convidado:** Grava o arroto -> Avalia Localmente -> Envia pro Backend (`challenge_entries`).
5. **Resolução:** O Banco via RPC (ou trigger) compara os dois Scores, resolve empates e declara o Vencedor.

---

## 6. Estratégia de Segurança e Antiabuso

- **Score Oficial vs Score Client:** O cliente calcula, mas para qualquer validação competitiva que vá para a internet (ranking, desafios), as funções SQL/Edge avaliam coerência. Para o MVP, aceitaremos o metadado enviado pelo cliente. No futuro (V2), o arquivo de áudio deve ser validado por Edge Function para impedir manipulação de API externa com scores de "100" falsos.
- **Row Level Security (RLS):**
  - Usuários só podem dar UPDATE em suas próprias *entries*.
  - *Burps* são públicos para leitura (`SELECT`), mas restritos para deleção/modificação (`DELETE/UPDATE`).
- **Limitação de Farming:** O backend implementará via trigger que apenas as primeiras 5 gravações de um `user_id` em um intervalo de 24h computam pontos na tabela `xp_events`. As demais entram no banco para histórico, sem ganho monetário virtual.

---

## 7. Diretrizes de Performance
1. **Bundle Size:** O uso do Vite e divisão lógica via *Code Splitting* por rotas vai garantir um First Contentful Paint veloz.
2. **Lazy Loading:** Telas como Histórico Completo, Configurações de Usuário e Rankings serão carregadas sob demanda.
3. **Web Worker:** Caso o `Auê Judgement Engine` demonstre bloquear a Thread Principal (UI travando) durante a manipulação do `AudioBuffer`, sua lógica deve ser delegada a um *Dedicated Web Worker*.
