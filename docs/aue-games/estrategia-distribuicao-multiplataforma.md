# Auê Games — estratégia de distribuição multiplataforma

> Fazer uma vez. Empacotar do jeito certo para cada lugar. Não manter três jogos iguais escritos três vezes.

## 1. Decisão

Todo novo jogo Auê Games nasce com **uma única base de código por jogo** preparada desde o começo para:

- Web/PWA;
- Android;
- iOS.

Tecnologia padrão:

- React + TypeScript + Vite;
- Capacitor para Android/iOS;
- PWA para instalação direta e distribuição web.

Isso não significa um único binário.

Significa uma única regra, uma única UI principal e uma única base de código, gerando artefatos diferentes por canal.

## 2. Repositório único por jogo

Exemplo:

```text
na-mosca/
  src/
  public/
  android/
  ios/
  supabase/
  content/
  docs/
  capacitor.config.ts
  vite.config.ts
  package.json
```

Mesmo repositório.

O Antigravity trabalha localmente nele e consegue validar as três saídas.

## 3. Saídas do mesmo projeto

### Web

`npm run build`

Gera arquivos estáticos para:

- Cloudflare Pages;
- build HTML5 para portais compatíveis;
- PWA instalável.

### Android

Build web é sincronizado para o projeto Capacitor Android.

Resultado final pode gerar:

- AAB para Google Play quando exigido;
- APK para testes e canais compatíveis.

### iOS

Build web é sincronizado para o projeto Capacitor iOS.

Xcode gera o binário/distribuição conforme o canal Apple disponível.

## 4. Onde lançar primeiro

### Nível 1 — obrigatório

1. site próprio/Web/PWA;
2. Google Play;
3. Apple App Store.

O objetivo é que o jogador encontre o jogo no Google, jogue sem instalar e, se gostar, instale pela loja/plataforma preferida.

### Nível 2 — excelente para estes jogos

4. itch.io;
5. CrazyGames;
6. Microsoft Store como PWA.

Esses canais aproveitam muito melhor nossa base web do que criar versões específicas do zero.

### Nível 3 — depois do produto provar uso

Avaliar conforme público e esforço:

- Samsung Galaxy Store;
- Huawei AppGallery;
- outras lojas Android;
- distribuição direta de APK;
- outros portais HTML5.

Não integrar dez lojas antes de sabermos se alguém quer jogar.

## 5. Web/PWA é o produto-base

O web não é versão pobre do app.

É o ponto de entrada universal.

Precisa ter:

- URL pública;
- carregamento rápido;
- layout mobile-first;
- manifest PWA;
- service worker quando útil;
- ícones;
- Open Graph;
- sitemap;
- robots;
- metadata indexável;
- rotas públicas úteis;
- deep links de convite.

Um link recebido no WhatsApp deve funcionar mesmo sem app instalado.

## 6. Google Search

Hospedagem não precisa ser Vercel para aparecer no Google.

O requisito é o site ser público, rastreável e tecnicamente saudável.

Cada jogo deve ter pelo menos:

- home indexável;
- title e description próprios;
- canonical URL;
- sitemap;
- robots.txt;
- conteúdo explicando o jogo em HTML acessível ao crawler;
- links internos normais;
- Search Console configurado quando possível.

Não depender de renderização que deixa a página inicial vazia para crawler.

## 7. Hospedagem web

### Produção monetizada

Padrão inicial: Cloudflare Pages.

Motivos:

- encaixa bem no build estático;
- não exige processo 24h;
- já faz parte da arquitetura zero-custo.

### Vercel Hobby

Pode ser usada para:

- preview;
- protótipo;
- desenvolvimento pessoal/não comercial.

**Não usar como produção monetizada enquanto a conta estiver no plano Hobby**, porque o uso comercial é restringido pelos termos atuais da Vercel.

Ter muitos projetos disponíveis no plano não muda essa regra.

Se no futuro a conta usada estiver em um plano que permita uso comercial, Vercel volta a ser uma opção de produção.

## 8. Conta/projeto 20T da Vercel

Não é necessário apagar nem abandonar.

Uso recomendado:

- previews;
- testes de integração;
- protótipos;
- homologação pessoal;
- experimentos.

O mesmo repositório pode alimentar preview na Vercel e produção no Cloudflare Pages.

Isso é útil porque separa ambiente de desenvolvimento do canal público sem duplicar código.

## 9. Anúncios por plataforma

Não colocar código de monetização diretamente dentro da regra do jogo.

Usar adapter de anúncios.

### Web/site próprio

AdSense ou produto Google apropriado para web/H5, depois de aprovação e revisão de política.

### Android/iOS nativo

AdMob / Google Mobile Ads SDK por integração nativa/Capacitor.

### Portais de jogos

O canal pode exigir o próprio SDK de anúncios.

Exemplo:

- CrazyGames SDK.

Nesse caso, a implementação de `AdsService` muda para o adapter do canal.

A rodada não sabe quem está mostrando o anúncio.

## 10. Build por canal

Variável conceitual:

`DISTRIBUTION_CHANNEL`

Valores iniciais:

- `web_direct`
- `android_play`
- `ios_app_store`
- `itchio`
- `crazygames`
- `microsoft_store`

Essa informação pode definir:

- provider de anúncios;
- botão de instalar;
- cross-promo;
- analytics;
- SDK específico do canal;
- comportamento de compartilhamento.

Nunca alterar regra de pontuação por canal.

## 11. itch.io

Estratégia:

- gerar build web autocontido;
- assets com caminhos relativos;
- `index.html` na raiz do pacote;
- layout responsivo/fullscreen;
- testar modo mobile-friendly;
- não depender de URL absoluta do domínio principal para assets essenciais.

O backend Supabase pode continuar externo via HTTPS quando permitido pela integração.

Antes da publicação, validar CORS/CSP e funcionamento dentro do iframe.

## 12. CrazyGames

Tratar como adapter de distribuição próprio.

O build HTML5 continua vindo da mesma base.

Antes do envio:

- integrar SDK oficial do CrazyGames apenas no adapter desse canal;
- mapear lifecycle do gameplay;
- anúncios pelo SDK do portal quando exigido;
- convite/conta do portal somente se trouxer benefício;
- respeitar requisitos técnicos e de QA do portal.

Não espalhar chamadas `CrazyGames.SDK` pelos componentes da aplicação.

## 13. Microsoft Store

PWA é o caminho preferido.

A mesma aplicação web pode ser empacotada/publicada como PWA na Microsoft Store.

Isso é distribuição adicional com pouco desvio de produto.

Não construir versão Windows nativa no MVP.

## 14. Google Play

Capacitor gera o shell Android.

Antes de loja:

- package id definitivo;
- ícones/splash;
- política de privacidade;
- Data Safety consistente;
- classificação etária;
- anúncios configurados conforme público;
- build assinado;
- testes em aparelho real;
- requisitos vigentes da conta de desenvolvedor atendidos.

## 15. Apple App Store

Capacitor gera o shell iOS, mas publicação exige atenção extra.

O app precisa parecer e funcionar como produto de verdade, não apenas um site preguiçosamente embrulhado.

Usar recursos nativos quando melhorarem a experiência:

- share sheet;
- haptics;
- status bar/safe areas;
- deep links;
- armazenamento apropriado;
- SDK móvel de anúncios.

Antes da submissão:

- política de privacidade;
- App Privacy preenchido;
- classificação etária;
- anúncios em conformidade;
- review notes claras;
- funcionamento completo sem depender de outro app.

## 16. iOS fora da App Store

Para o público brasileiro, o canal universal alternativo é o **Web/PWA pelo Safari**.

Distribuições alternativas nativas da Apple dependem de mercado/região e regras específicas vigentes; não devem ser tratadas como nosso canal principal no Brasil.

Portanto:

- Web/PWA é a alternativa sem App Store;
- App Store é o canal nativo principal de iOS.

## 17. Android fora da Play Store

Existem mais opções.

Prioridade:

1. PWA/site;
2. portais HTML5;
3. lojas Android alternativas selecionadas;
4. APK direto somente quando houver motivo.

APK direto cria atrito e alerta de segurança para usuário comum. Não deve ser nosso principal funil.

## 18. Ordem de lançamento recomendada

### Onda A — validar rápido

- web direto;
- PWA;
- itch.io.

### Onda B — distribuição principal

- Google Play;
- Apple App Store;
- Microsoft Store PWA.

### Onda C — aquisição por portais

- CrazyGames;
- outros portais que provarem bom encaixe.

A ordem pode sobrepor fases se os builds já estiverem prontos.

## 19. Custos inevitáveis de loja

Infraestrutura pode continuar em R$ 0 adicional, mas algumas lojas possuem custo de conta/programa.

Isso não é custo técnico recorrente do servidor; é custo de distribuição.

Decisão de pagar inscrição deve ocorrer quando o jogo estiver pronto para aquele canal.

Não contratar servidor pago só porque uma loja exige cadastro.

## 20. Regra final

Web, Android e iOS são três portas para o **mesmo jogo**, não três produtos mantidos separadamente.

A arquitetura precisa tornar publicar em uma nova porta um problema de adapter, build e política — não uma reescrita do jogo.