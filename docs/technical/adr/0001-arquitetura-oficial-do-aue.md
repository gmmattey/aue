# ADR 0001 — A arquitetura oficial do Auê

**Status:** aceito
**Data:** 2026-08-09
**Decidiu:** Giam
**Substitui:** nada
**Vale para:** todo o repositório

---

## O problema

O Auê é um jogo mobile casual, web-first, e a gente quer ele nas lojas depois
sem reescrever o jogo. Já existe código funcionando: React, Vite, Supabase,
YAMNet no aparelho, PWA na Vercel. O risco não é escolher errado agora — é
ninguém ter escrito a escolha, e daqui a seis meses alguém propor Next, alguém
propor React Native, alguém instalar Capacitor no meio da Arena e o jogo virar
dois projetos que se odeiam.

Este ADR fecha a discussão. O que está aqui não se muda por preferência, se
muda por §8.

---

## A decisão em uma frase

**Um único código web — React + TypeScript + Vite + Supabase — organizado em
quatro camadas, com uma fronteira dura entre o jogo e o aparelho, para que a
loja seja uma casca depois e nunca um segundo jogo.**

---

## 1. Stack

Confirmada, não trocada. O que já roda continua:

| Camada | Escolha |
|---|---|
| Interface | React 19 + TypeScript |
| Build | Vite 8, SPA, sem SSR |
| Hospedagem | Vercel (estático + rewrites) |
| Instalação | PWA via `vite-plugin-pwa` / Workbox |
| Backend | Supabase — Postgres, RLS, RPC, Storage, Edge Functions |
| Identidade | sessão anônima do Supabase Auth |
| Juiz de arroto | TensorFlow.js + YAMNet, no aparelho |
| Qualidade | Vitest, `tsc`, oxlint, build |

Por que sem framework de servidor: o Auê é uma máquina de estados que depende de
toque, microfone e áudio. Nada disso renderiza no servidor. As três páginas que
precisam existir para robô (home, privacidade, termos) já saem como HTML
próprio pelas entradas do Vite. Trazer SSR custaria servidor, borda, hidratação
e primeiro carregamento maior em troca de nada que o jogo use — e ainda
complicaria a casca nativa do §4, que precisa de arquivos estáticos.

---

## 2. Arquitetura do jogo — quatro camadas e uma fronteira

```text
┌──────────────────────────────────────────────┐
│  ARENA (UI)                                  │  React. Os dez estados.
│  desenha estado, dispara evento              │  Não sabe o que é microfone.
├──────────────────────────────────────────────┤
│  NÚCLEO                                      │  TypeScript puro.
│  máquina da Arena · score · veredito ·       │  Sem React, sem DOM,
│  regras de batalha e disputa                 │  sem Supabase, sem navigator.
├──────────────────────────────────────────────┤
│  PORTAS                                      │  Só interface. Sem implementação.
│  Captura · Reprodução · Compartilhamento ·   │
│  Armazenamento · CicloDeVida · Backend       │
├──────────────────────────────────────────────┤
│  ADAPTADORES — plataforma/web                │  getUserMedia, MediaRecorder,
│  a única parte que conhece o aparelho        │  Web Audio, navigator.share,
│                                              │  localStorage, supabase-js
└──────────────────────────────────────────────┘
```

O nome disso é porta e adaptador. O motivo de existir aqui é um só: **o dia em
que o Auê virar app de loja, muda o adaptador e mais nada.** Núcleo, portas e
Arena não sabem se estão num Safari, num Chrome ou dentro de uma casca nativa.

### A fronteira, escrita como regra

> **`navigator.*`, `MediaRecorder`, `getUserMedia`, `AudioContext`,
> `OfflineAudioContext`, `localStorage`, `document`, `window` e o cliente do
> Supabase só podem ser tocados dentro de `src/plataforma/web/`.**

Qualquer outro arquivo que precise dessas coisas chama uma porta. Isso vale para
o núcleo, para a Arena e para os testes de regra.

Fronteira que ninguém checa é decoração. Esta vira **teste de arquitetura** —
uma varredura que falha o build se um arquivo fora de `plataforma/` encostar
nessas APIs. O repositório já faz isso com estilo e migração
(`estilosUsados.test.ts`, `leitura-fechada.migracoes.test.ts`); é o mesmo
truque.

### O alvo de pastas

```text
src/
├── nucleo/       regra pura: máquina da Arena, score, veredito, batalha, disputa
├── portas/       as interfaces do que o aparelho faz
├── plataforma/
│   └── web/      os adaptadores. Único lugar com API de navegador
├── arena/        a UI dos dez estados
└── shared/       token, formato, componente burro
```

**Hoje o código não está assim** — o loop ainda é uma sequência de telas React em
`features/`, e é isso que as issues [#84](https://github.com/gmmattey/aue/issues/84)
e [#85](https://github.com/gmmattey/aue/issues/85) resolvem. Metade do núcleo já
existe e já é pura: `features/audio/engine.ts`, `rules.ts` e `juiz/`. A pasta
nova chega **junto com a Arena**, não como um refactor gigante de fim de semana.

Enquanto a mudança não acontece: **código novo já nasce do lado certo da
fronteira.** Não se acrescenta uma chamada de `navigator` numa tela nova porque
"por enquanto está todo mundo assim".

---

## 3. Web e loja — a estratégia

O que faz o Auê espalhar é o link no grupo. Alguém arrota, chama o outro no X1,
manda o link, o outro abre e joga **sem instalar nada**. Se a resposta ao
desafio exigisse baixar app, o loop morria no primeiro toque.

Consequência direta e permanente:

> **A web é o produto. Loja é distribuição adicional. A web nunca vira a versão
> "pobre" da nativa.**

O caminho é este, nesta ordem:

1. **Agora — PWA.** Roda no navegador, instala na tela inicial de quem quiser,
   abre por link. É o que está no escopo.
2. **Depois — Capacitor**, envolvendo o **mesmo build** do Vite, com adaptadores
   nativos no lugar dos web. Hoje na 8.5 (jul/2026): projeto iOS por Swift
   Package Manager, Node 22+, Xcode 26+, cenas do iOS 27 já adotadas.
3. **Nunca — segundo código.**

### Capacitor: escolhido, e não instalado

O Capacitor é a casca decidida. Ele **não entra no repositório agora**. Sem
`capacitor.config.ts`, sem pasta `ios/`, sem pasta `android/`, sem plugin,
enquanto não existir decisão de publicar. Instalar "pra deixar preparado" traz
dependência nativa, ciclo de build e atualização de Xcode para dentro de um jogo
que ainda não tem a Arena de pé.

O que a gente faz agora é **não fechar a porta**, e isso é a fronteira do §2 mais
quatro cuidados:

- caminho de asset relativo, nada dependendo de estar na raiz de um domínio;
- rota funcionando sem servidor reescrevendo URL (dentro da casca não existe
  `vercel.json`);
- autenticação por token no cabeçalho, como o Supabase já faz — nada preso a
  cookie de mesma origem;
- link de batalha `/b/CODIGO` continua sendo uma URL de verdade, porque no dia
  da loja ele vira link universal.

### O risco da App Store, dito na cara

Apple rejeita site embrulhado em webview pela diretriz 4.2. Isso não é boato, é
a rejeição mais comum de app assim, e uma casca que só abre o site tem chance
real de voltar. Então:

> **Publicar na App Store não é apertar um botão no fim.** Exige valor nativo de
> verdade — gravação nativa, funcionamento sem rede, vibração, notificação,
> compartilhamento do sistema — e isso é escopo próprio, com decisão do dono do
> produto antes de começar.

Play Store é mais tranquilo, e a mesma casca serve. Não é motivo para publicar
só no Android e chamar de multiplataforma.

---

## 4. Áudio e microfone

É o coração do jogo e a parte que mais quebra em celular de verdade.

**Captura.** `getUserMedia` sempre a partir de um toque, nunca no boot.
`MediaRecorder` **sem forçar formato** — o tipo sai do próprio gravador
(`gravador.mimeType`). Cravar `audio/webm` mata o iPhone: Safari grava
`audio/mp4`/AAC e só passou a aceitar Opus a partir do iOS 18.4. Já é assim no
código e continua sendo lei.

**Análise.** Decodificação e reamostragem para 16 kHz por `OfflineAudioContext`,
com reamostrador próprio onde ele não existe, e o YAMNet rodando em cima disso.
O modelo tem 16 MB: fica **fora** do precache do service worker e é baixado sob
demanda na primeira gravação, com cache de runtime depois. Ninguém paga 16 MB no
4G para ver uma bolha.

**A regra que não se negocia:**

> **Todo caminho de saída solta o `MediaStream` e fecha o `AudioContext`.**
> Parar, descartar, estourar tempo, dar erro, trocar de estado, esconder a aba,
> fechar o app.

Microfone vazado é defeito de privacidade. A porta de captura existe justamente
para ter um dono só desse ciclo de vida, em vez de cada tela lembrar de limpar a
própria bagunça.

**O que o iPhone impõe, e vira desenho da Arena:**

- enquanto existe captura ativa, o iOS joga o som para o alto-falante;
- permissão de microfone em aba do Safari não persiste de forma confiável entre
  sessões; instalado na tela inicial, persiste melhor;
- tocar áudio também precisa de gesto.

Por isso a Arena **nunca** grava e toca ao mesmo tempo. No VERSUS a pessoa ouve
o arroto do desafiante e **depois** grava, em passos separados. Isso não é só
desenho, é o que o aparelho permite.

---

## 5. Armazenamento

Três lugares, com fronteira clara:

| Onde | O que | Regra |
|---|---|---|
| Postgres (Supabase) | tudo que é oficial, competitivo ou atravessa aparelho | fonte da verdade |
| Storage (Supabase) | o áudio | bucket privado, URL assinada de minutos |
| `localStorage` | pista local: última batalha, disputa em andamento | descartável |

`localStorage` é o **único** armazenamento local adotado, e sempre por um
utilitário com chave namespaced e versionada (`aue.coisa.v1`), com todo acesso
protegido — Safari em modo privado **lança exceção** em vez de devolver vazio.
Nada de identificação pessoal, nada de áudio, nada que doa se sumir.

**IndexedDB não está adotado.** Não é proibido para sempre; é uma decisão que
exige §8. Sem isso, alguém adiciona uma fila local "pequena" e três meses depois
o jogo tem uma segunda fonte da verdade que ninguém consegue explicar.

---

## 6. Compartilhamento, ciclo de vida, sessão e offline

**Compartilhar.** `navigator.share` quando existir, `canShare` antes de mandar
arquivo, cópia do link quando não existir. Nenhuma tela promete compartilhamento
que o navegador não faz. Tudo por trás da porta, para o plugin nativo entrar no
lugar sem a Arena saber.

**Ciclo de vida.** A porta de ciclo de vida traduz o navegador em evento de
jogo: escondeu, voltou, saiu. Escutar `visibilitychange` e `pagehide` —
`beforeunload` não é confiável em iOS. Ao esconder: para de gravar e solta o
microfone. O iPhone mata aba com fome, então **desmontagem de componente não é
garantia de limpeza**.

**Sessão.** A sessão anônima do Supabase é recuperada no boot, uma vez só, por
promessa de módulo (`StrictMode` monta duas vezes; efeito criaria dois usuários).
Sem ela não existe `auth.uid()`, e sem `auth.uid()` o áudio não sobe.

Recuperar uma partida é **pela URL**. `/b/CODIGO` carrega a batalha do banco. O
que está no armazenamento local é atalho, nunca a verdade — quem limpa o
navegador vira outra pessoa para o jogo, e isso está dito na política de
privacidade em vez de escondido.

**Offline.** O jogo **não é offline-first**, e nenhum texto pode sugerir que
seja. O service worker guarda a casca e o modelo do juiz. Arrotar sem rede não
gera nota oficial, não cria batalha e não responde desafio — vai para o estado
de erro, dizendo a verdade. Fila de envio local só existe se virar escopo por
§8.

---

## 7. Backend

Supabase fica. Sem ORM, sem API própria em Node, sem segunda nuvem.

- **RLS em tudo** que o cliente enxerga.
- **Decisão competitiva é do servidor.** O navegador calcula para responder
  rápido; a nota oficial passa por RPC com constraint e trigger versionados.
  Cliente não escreve nota.
- **A fórmula vive em dois lugares** — TypeScript e SQL — e tem teste de
  paridade. O teste protege os arquivos versionados, não prova o que o banco
  remoto recebeu. Migração continua sendo validada no staging antes da produção.
- **Código de batalha é capability URL:** imprevisível, não enumerável, sem
  listagem pública, com expiração validada no servidor e não escondida na tela.
- **Edge Function só onde precisa mesmo rodar no servidor** — hoje a prévia de
  link. Não é onde se joga lógica de jogo por conveniência.
- Variável `VITE_*` entra no bundle em tempo de build. Mudar no painel sem
  publicar de novo não muda nada.

---

## 8. O que exige revisão formal

Nada nesta lista se decide dentro de uma PR. Cada item exige **ADR novo,
decisão do Giam e, quando muda o jogo, resposta do dono do produto**:

1. trocar React, Vite, TypeScript ou o modelo de SPA sem servidor;
2. adotar framework de servidor, renderização no servidor ou borda;
3. adotar segunda biblioteca de interface, ou motor gráfico de jogo;
4. trocar o Supabase, ou acrescentar outro backend;
5. instalar Capacitor, criar pasta nativa, ou publicar em qualquer loja;
6. começar qualquer coisa nativa em Swift, Kotlin, React Native ou Flutter;
7. adotar IndexedDB, fila offline ou qualquer segunda fonte da verdade local;
8. tirar a nota oficial do servidor, ou deixar o cliente escrever resultado;
9. tornar público o bucket de áudio, ou afrouxar RLS de dado exposto;
10. quebrar a fronteira do §2, inclusive "só nesta tela";
11. entrar dependência de runtime pesada — acima de ~50 kB comprimidos — no
    caminho de abrir o jogo;
12. mudar o modelo de identidade — login de verdade, cadastro obrigatório,
    conta que não seja anônima.

O que **não** exige ADR: adaptador novo atrás de porta existente, componente,
teste, migração que segue a nomenclatura, refactor dentro de uma camada,
dependência de desenvolvimento.

---

## 9. Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| **Next.js / Remix** | SSR não serve para toque, microfone e áudio. Custaria servidor e hidratação para resolver três páginas estáticas que já estão resolvidas, e ainda atrapalharia a casca nativa, que quer arquivo estático. |
| **React Native / Expo** | Reescreveria a interface inteira e o caminho de áudio, e mataria o link que abre sem instalar — o que faz o jogo espalhar. Viraria dois códigos com duas regras de nota. |
| **Flutter** | Reescrita total, em outra linguagem, com web pior. Jogar fora o que já funciona por uma promessa de loja. |
| **Nativo puro (Swift/Kotlin)** | Três primos, um jogo de arroto. Dois aplicativos separados é o caminho mais rápido para nenhum dos dois ficar pronto. |
| **Motor de jogo (Unity, Phaser, Pixi)** | A Arena é interface com áudio, não cena renderizada. Entraria megabyte de motor para desenhar uma bolha que o DOM desenha. |
| **TWA só no Android** | Resolve o Play e não resolve o iPhone. Sobrariam dois mecanismos de empacotamento em vez de um. |
| **Firebase** | O Supabase já está de pé, com RLS, RPC e teste de paridade da fórmula em SQL. Trocar é migrar dado e regra de segurança em troca de nada. |
| **API própria em Node/Vercel Functions** | RPC com RLS já entrega decisão no servidor. Uma API no meio seria mais uma coisa para autenticar, hospedar e manter. |
| **IndexedDB / offline-first agora** | Não existe demanda provada. A documentação antiga já descreveu offline que nunca foi implementado; não vamos repetir a mentira do outro lado. |
| **Tauri Mobile** | Imaturo para iOS neste momento e sem ganho sobre o Capacitor para o que a gente precisa. |
| **Trocar por Svelte / Web Components** | Ganho estético, custo de reescrever o que já passa nos testes. |

---

## 10. O que isso custa

Registrar o preço, porque decisão sem custo é propaganda:

- **A fronteira dá trabalho.** Chamar o microfone direto é uma linha; por porta
  são três arquivos. O ganho aparece na loja e nos testes, não no dia em que se
  escreve.
- **Capacitor é dívida adiada, não evitada.** Quando chegar, vem com Xcode,
  certificado, revisão da Apple e o risco da 4.2.
- **PWA no iPhone tem teto.** Permissão que não persiste em aba, som forçado
  para o alto-falante, aba morrendo em segundo plano. A Arena é desenhada em
  cima dessas limitações em vez de brigar com elas.
- **YAMNet são 16 MB.** Sob demanda e cacheado, mas quem arrota pela primeira
  vez no 4G espera.
- **Sem SSR, quem indexa é HTML estático.** Só as três páginas públicas
  aparecem para robô. Batalha nunca deveria aparecer mesmo.

---

## 11. O que se cobra numa revisão

Toda PR passa por isto:

- nenhum arquivo fora de `plataforma/` toca API de navegador;
- todo caminho de saída de gravação solta o microfone;
- nada que dependa de rede finge que funcionou sem confirmação do servidor;
- nota oficial não foi escrita pelo cliente;
- nada novo em armazenamento local sem chave versionada e acesso protegido;
- nenhuma dependência pesada entrou no caminho de abrir o jogo;
- nada da lista do §8 entrou de carona.

---

**Autoridade:** este documento decide **como o Auê é construído por dentro**.
Não decide o que o jogo é ([`../../jogo/VISAO.md`](../../jogo/VISAO.md)), nem
quais estados a Arena tem ([`../../jogo/ARENA.md`](../../jogo/ARENA.md)), nem o
que pertence ao escopo agora
([`../../escopo/ESCOPO_ATUAL.md`](../../escopo/ESCOPO_ATUAL.md)). E, como
sempre, **código e migração que rodam vencem qualquer documento** — inclusive
este. Quando o código estiver certo e o ADR errado, corrige o ADR.
