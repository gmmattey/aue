# Auê Games — fundação compartilhada

> Jogo diferente, fundação igual. A graça pode mudar. A infra não precisa reinventar a roda toda vez.

## 1. Objetivo

Auê Games é a camada comum dos jogos.

Cada jogo continua independente em seu próprio repositório, com marca, regras, conteúdo e evolução próprios.

O que compartilhamos são decisões que não têm motivo para nascer diferentes em cada projeto.

## 2. Regra de custo

Nenhuma decisão técnica cria custo recorrente obrigatório antes de receita real.

Se um recurso exigir plano pago antes de provar valor, primeiro tentamos:

1. simplificar;
2. cachear;
3. reduzir frequência;
4. usar infraestrutura já disponível;
5. adiar o recurso.

Upgrade só entra quando uso/receita justificarem.

## 3. Base tecnológica padrão

### Código do jogo

- TypeScript.
- React + Vite para a camada de interface web.
- PWA mobile-first.
- motor/regra separado da UI.
- testes unitários para regras.

### Multiplataforma

Uma base de código por jogo.

O mesmo repositório gera:

- Web/PWA;
- Android;
- iOS.

Capacitor é o runtime nativo padrão para Android/iOS.

A regra é compartilhar o máximo possível sem fingir que Android e iOS são navegadores com ícone diferente.

Código específico de plataforma fica isolado atrás de adapters/plugins.

## 4. Estrutura recomendada por repositório

Exemplo conceitual:

```text
/src
  /app
  /domain
  /features
  /platform
    /web
    /native
  /services
  /analytics
  /ads
  /sharing
/public
/android
/ios
/supabase
/docs
/content
```

`android/` e `ios/` são cascos gerados/configurados pelo Capacitor, mas fazem parte do mesmo repositório.

Não criar três repositórios por jogo.

## 5. Supabase

Projeto físico compartilhado: projeto hoje chamado 20T, reaproveitado logicamente como **`auê-games`**.

Cada jogo usa namespace/prefixo próprio:

- Auê: `aue_*`
- Na Mosca: `nm_*`
- Quem Mente?: `qm_*`

Regras comuns:

- Auth anônimo como padrão quando identidade for necessária;
- RLS em toda tabela exposta;
- operações sensíveis por RPC/função autoritativa;
- chave de serviço nunca no cliente;
- realtime apenas onde realmente agrega;
- salas/dados transitórios expiram;
- migrations versionadas no Git.

## 6. Identidade do jogador

Padrão inicial: guest-first.

O usuário deve conseguir jogar antes de criar conta permanente.

Quando o jogo precisar reconhecer a mesma pessoa entre ações/sessões, usar Auth anônimo do Supabase.

Nickname não é identidade de segurança.

No futuro, uma conta anônima pode ser convertida em conta permanente caso exista benefício claro para o jogador.

## 7. Analytics

Eventos seguem snake_case e descrevem fatos, não telas.

Exemplos:

- `game_opened`
- `game_started`
- `round_started`
- `round_completed`
- `game_completed`
- `rematch_started`
- `invite_shared`
- `invite_joined`
- `result_shared`

Campos comuns quando fizer sentido:

- `game_id`
- `session_id`
- `room_id`
- `player_count`
- `round_number`
- `entry_source`
- `platform` (`web | android | ios`)
- `distribution_channel`

Não registrar nickname, texto livre ou segredo em analytics por conveniência.

## 8. Compartilhamento

Todo jogo deve conseguir produzir:

- link público;
- preview Open Graph no web;
- compartilhamento nativo via Web Share/Capacitor Share quando disponível;
- deep link para convite quando aplicável;
- fallback copiável.

Links precisam continuar úteis mesmo quando abertos por alguém sem o app instalado.

Prioridade: abrir o jogo no navegador primeiro; oferecer instalação depois.

## 9. Salas multiplayer

Convenção:

- código curto e humano;
- link compartilhável;
- estado autoritativo no backend;
- um canal realtime por sala quando necessário;
- reconexão baseada em snapshot;
- nenhuma regra importante depende apenas de WebSocket estar vivo;
- host é papel transferível, não dono eterno do registro.

## 10. Anúncios

A camada de monetização precisa ser abstraída por plataforma.

### Web

Rede web compatível, inicialmente Google AdSense/H5 quando aprovado e adequado.

### Android/iOS

SDK móvel, inicialmente AdMob quando aprovado.

Não depender de um único componente de anúncio dentro da UI compartilhada.

Criar um adapter conceitual:

```text
AdsService
  showInterstitial(context)
  showRewarded(context)
  canShowAds()
```

A implementação muda conforme plataforma/canal.

Regras de experiência:

- nunca interromper rodada ativa;
- nunca esconder botão de fechar;
- evitar banner competindo com ação principal;
- anúncio só em pausa natural;
- medir impacto na revanche/conclusão.

## 11. Feature flags

Recursos arriscados ou dependentes de canal devem poder ser ligados/desligados sem reescrever regra de jogo.

Exemplos:

- ads;
- desafio diário;
- categoria especial;
- multiplayer;
- cross-promo;
- modo experimental.

MVP pode começar com flags locais/arquivo de configuração. Não criar plataforma cara de feature flag antes de precisar.

## 12. Padrão de erros

O domínio/backend devolve códigos estáveis.

Exemplos:

- `room_not_found`
- `room_expired`
- `room_full`
- `invalid_phase`
- `already_submitted`
- `not_authorized`
- `rate_limited`

A UI converte para linguagem humana.

Não acoplar regra ao texto exibido.

## 13. Privacidade e segurança

Padrão comum:

- coleta mínima;
- dados transitórios expiram;
- conteúdo livre do usuário não vira patrimônio eterno por padrão;
- sem segredo em log;
- sem service-role no cliente;
- entrada do usuário tratada como não confiável;
- política de privacidade clara;
- exclusão/retensão documentadas;
- requisitos de idade/publicidade revisados antes de produção.

## 14. Deploy

### Produção web

Padrão: Cloudflare Pages enquanto for possível permanecer no gratuito e em conformidade com os termos aplicáveis.

`main` representa produção.

Preview pode usar Cloudflare Pages ou Vercel Hobby apenas para uso pessoal/não comercial de desenvolvimento.

### Android

Mesmo repo gera build Android via Capacitor/Gradle.

Artefato de loja conforme canal, preferencialmente AAB quando exigido e APK onde fizer sentido.

### iOS

Mesmo repo gera projeto iOS via Capacitor/Xcode.

Distribuição pública depende das regras e da conta Apple vigentes.

## 15. Cross-promo Auê Games

Cross-promo só aparece depois de uma experiência concluída.

Exemplos:

- resultado final;
- tela de revanche;
- menu secundário.

Nunca interromper uma rodada para anunciar outro jogo nosso.

Evento comum:

`cross_promo_clicked`

Campos:

- `source_game`
- `target_game`
- `platform`

## 16. O que NÃO compartilhar cedo demais

Não criar biblioteca/npm package compartilhada só porque duas funções têm o mesmo nome.

Primeiro compartilha-se a **convenção**.

Código comum só vira pacote compartilhado quando existir repetição real que já esteja custando manutenção.

Evitar monorepo de todos os jogos agora.

## 17. Regra final

Cada jogo precisa continuar fácil de abrir, testar, lançar e até matar sem derrubar os outros.

Auê Games compartilha fundação, não cria um monólito com três jogos grudados pelo intestino.