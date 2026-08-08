# Auê — sinais de mercado e hipóteses de validação

**Revisado em:** 2026-08-08  
**Status:** documento estratégico, não requisito de produto

> Isto aqui não prova que o Auê vai viralizar.
>
> Se alguém soubesse provar viralização em Markdown, estaria vendendo isso em
> vez de disputar arroto no churrasco.

O objetivo deste documento é registrar o que **parece promissor**, o que já tem
algum sinal externo e o que precisa ser testado com gente real.

---

## 1. A pergunta de verdade

A pergunta não é:

> "Existe mercado para aplicativo de arroto?"

A pergunta útil é:

> **Uma brincadeira de pontuação + desafio consegue fazer uma pessoa puxar outra
> para dentro e voltar depois da primeira piada?**

Se não, temos uma novelty app: a pessoa abre, ri uma vez e esquece.

Se sim, temos um jogo social simples com loop próprio.

---

## 2. O concorrente que mais ensina hoje

Em 2026, o desenvolvedor do **FartWorld** publicou números do próprio app no
Reddit: após cerca de 27 dias no Google Play, relatou 20 instalações, 2 usuários
ativos, zero avaliações e zero receita, apesar de ter tentado Shorts, Reels e
outras divulgações.

O dado é **auto-relatado por um desenvolvedor**, não auditoria independente, mas
é um sinal útil porque o produto é próximo no espírito: gravação de som corporal
+ pontuação/leaderboard.

A lição para o Auê não é "ninguém gosta desse humor".

É outra:

> **gravar + dar nota + ranking não cria retenção sozinho.**

Fonte consultada:

- Reddit / r/googleplayconsole — "27 days on Google Play, 20 installs, $0..."
  (05/04/2026):
  https://www.reddit.com/r/googleplayconsole/comments/1sd0srx/27_days_on_google_play_20_installs_0_at_least_im/

---

## 3. Onde o Auê precisa ser diferente

O diferencial não deve ser "temos mais features".

Feed, perfil, seguidores e campeonato público são exatamente o tipo de coisa que
pode consumir meses sem resolver a pergunta principal.

O diferencial do MVP1 é:

```text
EU ARROTO
   ↓
AUÊ ME JULGA
   ↓
EU MANDO PARA VOCÊ
   ↓
VOCÊ OUVE E RESPONDE
   ↓
EU RECEBO A REVANCHE
```

A batalha por link `/b/CODIGO` é mais importante para validação do que um ranking
global cheio de gente que ainda não existe.

---

## 4. Concorrência real

O Auê não compete apenas com outros apps de arroto/peido.

Compete pelo mesmo minuto de atenção que a pessoa poderia gastar em:

- WhatsApp;
- TikTok;
- Instagram;
- jogos casuais;
- party games;
- qualquer outra piada que o grupo abandona depois de 30 segundos.

Por isso o produto não ganha por profundidade de cadastro ou quantidade de
abas.

Ganha se for:

- instantâneo;
- engraçado sem explicação;
- compartilhável;
- competitivo;
- bom o bastante para gerar revanche.

---

## 5. Hipóteses do MVP1

### H1 — A nota gera curiosidade

A pessoa quer saber "quanto esse arroto vale?" o suficiente para terminar a
primeira gravação.

**Medir:** gravações iniciadas → resultados exibidos.

### H2 — O resultado merece ser enviado

A nota/classificação é engraçada ou competitiva o suficiente para a pessoa
compartilhar.

**Medir:** resultados → compartilhamentos/desafios.

### H3 — O desafio puxa outra pessoa

Quem recebe `/b/CODIGO` não só abre: grava uma resposta.

**Medir:** batalhas abertas → convidados que gravam.

### H4 — Existe revanche

Depois de perder/ganhar, alguém volta à mesma batalha ou cria outra.

**Medir:** batalhas com 3+ rodadas e retorno em até 7 dias.

### H5 — A disputa local funciona sem aquisição digital

Uma pessoa consegue colocar 2–5 amigos para jogar no mesmo aparelho.

**Medir:** disputas iniciadas → concluídas → compartilhadas.

---

## 6. Métricas que importam no começo

Não precisamos de painel com 47 KPIs para um produto sem tráfego.

Prioridade:

1. `%` que começa e termina o primeiro Auê;
2. `%` de resultados compartilhados;
3. `%` de resultados que viram batalha;
4. `%` de links de batalha abertos;
5. `%` de convidados que realmente gravam;
6. batalhas com 3 ou mais rodadas;
7. retorno em até 7 dias;
8. disputas locais concluídas;
9. compartilhamento de pódio.

Os dois sinais mais importantes são:

- **alguém puxou outra pessoa para dentro?**
- **alguém voltou sem a gente implorar?**

---

## 7. Distribuição

### WhatsApp primeiro

Para o MVP1, o WhatsApp é um canal natural porque o produto nasceu de grupos de
amigos/família e o link privado funciona sem precisar construir audiência
pública dentro do Auê.

### X e Telegram

São canais simples para link/card e podem entrar via share comum, sem API
complexa.

### TikTok/Reels

Podem ser importantes se resultados virarem assets verticais bons, mas isso é
**hipótese de aquisição**, não dependência do MVP1.

Não atrasar lançamento esperando integração oficial de postagem.

---

## 8. Monetização

A meta do projeto é simples: seria ótimo se o Auê pagasse pelo menos as próprias
contas de IA.

Mas anúncio antes de tráfego é decoração arquitetural.

Ordem mais saudável:

1. provar que alguém joga;
2. provar que alguém compartilha;
3. provar que alguém volta;
4. medir volume;
5. então monetizar sem estragar o loop.

O código de AdSense já pode existir desligado. Isso não significa que anúncio
precisa aparecer no MVP1.

---

## 9. AdSense e conteúdo gerado por pessoas

A política atual do Google deixa uma coisa clara: quando um site/app exibe
conteúdo gerado por pessoas nas páginas monetizadas, **o publisher continua
responsável por garantir conformidade desse conteúdo com as políticas do
programa**.

Isso importa para qualquer futuro feed/comentário/áudio público.

No MVP1, manter batalha por link e feed público desligado reduz bastante a
superfície de moderação, mas não elimina responsabilidade sobre o que for
armazenado/exibido.

Fontes oficiais consultadas em 08/08/2026:

- Google AdSense — Visão geral do conteúdo gerado pelo usuário:
  https://support.google.com/adsense/answer/1355699?hl=pt-BR
- Google AdSense — Políticas e Restrições para publishers:
  https://support.google.com/adsense/answer/10008391?hl=pt-BR

Políticas mudam. Revalidar antes de ativar monetização.

---

## 10. O que NÃO concluir desses sinais

Não concluir que:

- "não existe concorrente, então vai dar certo";
- "TikTok garante viralização";
- "ranking gera retenção";
- "AdSense vai pagar as contas com poucos usuários";
- "quanto mais feature social, mais viral";
- "um vídeo com muita view significa instalação".

O relato do FartWorld é justamente um alerta contra confundir visualização de
promoção com uso recorrente do produto.

---

## 11. Estratégia de validação

### Fase 1 — núcleo

Entregar:

- nota;
- compartilhamento;
- batalha por link.

Pergunta:

> alguém desafia alguém?

### Fase 2 — roda presencial

Entregar disputa local.

Pergunta:

> uma pessoa consegue criar uma brincadeira para o grupo inteiro?

### Fase 3 — retenção

Observar comportamento real antes de escolher mecanismo:

- ranking;
- conquistas;
- conta;
- feed;
- eventos;
- temporadas.

A feature seguinte deve responder a um problema medido, não ao nosso tédio.

---

## 12. Critério de sinal verde

Não existe um número mágico universal neste documento.

Sinal verde é observar combinação consistente de:

- compartilhamento espontâneo;
- convidados convertendo em jogadores;
- batalhas com revanche;
- retorno em dias diferentes;
- gente pedindo alguma continuação que o produto ainda não tem.

Se ninguém compartilha, o problema provavelmente vem **antes** de marketing.

Se compartilha e ninguém responde, o convite/landing/batalha precisa melhorar.

Se respondem uma vez e somem, temos problema de retenção.

Essa leitura é mais útil do que adicionar uma aba nova para ver se resolve.

---

## 13. Veredito atual

O Auê tem uma premissa simples, memorável e compartilhável o suficiente para
merecer teste real.

Isso é diferente de dizer que tem "altíssima capacidade de viralização".

O que temos hoje é uma **boa hipótese de loop viral**:

**resultado → desafio → resposta → revanche.**

O MVP1 existe para descobrir se essa hipótese sobrevive ao contato com pessoas
que não são os três primos.
