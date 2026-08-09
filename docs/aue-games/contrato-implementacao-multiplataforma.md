# Auê Games — contrato de implementação multiplataforma

> Antigravity: uma base, três portas. Se aparecer três regras de pontuação, alguém fez merda.

## 1. Princípio

Cada jogo possui **um único repositório e uma única fonte de verdade de produto**.

Web, Android e iOS reutilizam:

- domínio;
- regras;
- componentes principais;
- estado;
- serviços de backend;
- analytics comum;
- conteúdo;
- testes de regra.

Código específico de plataforma é exceção explícita.

## 2. Stack esperada

- React;
- TypeScript strict;
- Vite;
- Capacitor;
- Vitest;
- Supabase;
- PWA.

Escolher versões estáveis atuais no momento da implementação e registrar lockfile.

Não trocar stack sem motivo documentado.

## 3. Adapters obrigatórios

Interfaces conceituais:

```text
PlatformService
AdsService
ShareService
StorageService
AnalyticsService
DeepLinkService
HapticsService
```

A regra do jogo nunca importa diretamente:

- Capacitor;
- AdMob;
- CrazyGames SDK;
- APIs de browser específicas;
- APIs nativas Android/iOS.

## 4. Detecção de canal

Plataforma e canal são coisas diferentes.

Exemplo:

```text
platform: web | android | ios
channel: web_direct | android_play | ios_app_store | itchio | crazygames | microsoft_store
```

Não inferir regra de monetização apenas por user-agent.

Build/config deve informar o canal.

## 5. Variáveis públicas de build

Convenção inicial:

```text
VITE_APP_ENV
VITE_GAME_ID
VITE_DISTRIBUTION_CHANNEL
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ADS_ENABLED
VITE_ANALYTICS_ENABLED
```

Somente valores que podem ser públicos usam `VITE_*`.

Service role, secrets de assinatura e credenciais de loja nunca entram no bundle web.

## 6. Fluxo de build

### Web

```text
install
→ test
→ typecheck
→ build
→ artefato web
```

### Android

```text
build web
→ capacitor sync android
→ testes específicos
→ Gradle/Android Studio
→ AAB/APK
```

### iOS

```text
build web
→ capacitor sync ios
→ testes específicos
→ Xcode
→ archive/distribuição
```

Não copiar arquivos manualmente entre projetos como processo oficial.

## 7. CI

CI mínimo por PR/main:

- install reproduzível;
- typecheck;
- testes unitários;
- build web.

Android/iOS entram na automação quando fizer sentido e quando ambiente/credenciais permitirem.

Falha de CI bloqueia alegação de fase concluída.

## 8. Testes por plataforma

### Compartilhados

- motor;
- pontuação;
- estados;
- validações;
- serialização;
- contratos do backend.

### Web

- PWA;
- deep link web;
- SEO/meta;
- responsive;
- compartilhamento/fallback.

### Android

- back button;
- safe areas;
- teclado;
- share nativo;
- deep links;
- anúncios;
- retorno do background;
- rotação se suportada.

### iOS

- safe areas/notch;
- teclado;
- share sheet;
- deep links;
- anúncios;
- retorno do background;
- comportamento do WebView;
- haptics.

## 9. UX comum e UX nativa

Não criar layouts diferentes sem necessidade.

A linguagem visual é uma só.

Adaptações permitidas:

- safe area;
- gesto/back;
- share sheet;
- haptics;
- teclado;
- permissões;
- dialogs do sistema;
- integração de loja.

## 10. PWA

Todo jogo precisa funcionar como produto completo no navegador.

O PWA não pode exigir instalação.

Instalar é convite, não pedágio.

Requisitos:

- manifest;
- ícones;
- theme/background;
- comportamento offline mínimo quando útil;
- update controlado;
- install prompt somente em momento adequado;
- deep links continuam funcionando no navegador.

## 11. App nativo não é iframe remoto

Padrão preferido do Capacitor: empacotar os assets produzidos pelo build dentro do app.

Não transformar o binário em navegador que simplesmente abre `https://jogo...`.

Motivos:

- experiência mais previsível;
- melhor comportamento offline/inicialização;
- revisão de loja;
- menor dependência de uma página remota;
- controle de versão.

Backend e conteúdo dinâmico continuam remotos quando necessário.

## 12. Atualizações

Mudança de frontend web publica imediatamente no canal web.

Mudança que altera binário/plugin nativo exige novo build de loja.

Não criar mecanismo próprio de baixar código executável remoto para contornar revisão de loja.

## 13. Anúncios

`AdsService` recebe contexto, não componente de tela.

Exemplo conceitual:

```text
showInterstitial('post_game')
```

Implementações:

- web direct → provider web;
- Android/iOS → provider móvel;
- CrazyGames → SDK CrazyGames;
- itch.io → política/configuração própria do canal.

Se provider não estiver configurado:

```text
canShowAds() = false
```

O jogo continua funcionando.

## 14. SEO não entra no app nativo

SEO é responsabilidade da versão web pública.

Cada jogo precisa ter páginas públicas suficientes para explicar:

- o que é;
- como jogar;
- jogar agora;
- privacidade;
- termos;
- suporte;
- eventualmente conteúdo indexável relevante.

Rotas privadas de sala não precisam ser indexadas.

## 15. Deep links

Links devem ser web-first.

Exemplo:

```text
https://<host>/sala/ABCD
```

Sem app:

→ abre web.

Com app e associação configurada:

→ pode abrir app.

Não usar esquema proprietário como único link compartilhável.

## 16. Conteúdo por portal

O jogo não deve depender de portal específico para conteúdo principal.

SDK de portal pode oferecer:

- ads;
- conta;
- cloud save;
- invite;
- eventos.

Integrações são opcionais/adapters.

## 17. Aceite de uma fase multiplataforma

Uma feature central só pode ser chamada de pronta quando:

1. regra compartilhada está testada;
2. web funciona;
3. não existe bloqueio arquitetural conhecido para Android/iOS;
4. adapter necessário está definido;
5. divergência de plataforma está documentada.

Antes do lançamento nativo, validar em aparelhos reais.

## 18. O que o Antigravity não pode fazer sozinho

- criar três implementações independentes;
- trocar Capacitor por outra stack sem decisão;
- adicionar serviço pago;
- colocar secret no frontend;
- mudar regra de monetização;
- mudar regra de jogo;
- usar Vercel Hobby para produção comercial;
- publicar loja/deploy sem pedido;
- embutir SDK de portal pelo projeto inteiro;
- marcar teste como feito sem executar.

## 19. Saída esperada a cada fase

Antigravity deve entregar:

- o que implementou;
- arquivos principais alterados;
- comandos executados;
- testes e resultados;
- pendências;
- divergências entre web/Android/iOS;
- próximo passo recomendado.

Sem relatório de 80 páginas.

## 20. Regra final

A pergunta para qualquer mudança é:

> isso pertence ao jogo ou ao canal onde ele está rodando?

Se pertence ao jogo, compartilha.

Se pertence ao canal, isola em adapter.