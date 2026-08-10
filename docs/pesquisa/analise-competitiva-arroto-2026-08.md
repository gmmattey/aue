# Pesquisa competitiva — jogos, apps e conteúdo de arroto

> **Pesquisado em 10/08/2026.** Este documento é contexto de mercado e pode envelhecer rápido.
>
> **NÃO é fonte de escopo, regra do jogo, prioridade, arquitetura ou UX.** Para isso, valem `docs/escopo/ESCOPO_ATUAL.md`, `docs/jogo/ARENA.md`, ADRs e a fila vigente no GitHub. Pesquisa serve para pensar melhor — não para abrir feature sozinha.

## Resumo em uma frase

**Burp Rating mede o arroto. BurpMeter tenta transformar o arroto em esporte. O Auê deve transformar o arroto em briga entre amigos.**

Essa é a principal conclusão desta rodada de pesquisa.

O território “gravar um arroto e receber uma nota” já existe. A oportunidade do Auê não está em fingir que inventou isso. Está em reduzir o caminho entre **resultado → provocação → X1 → resposta → revanche** e fazer esse comportamento viajar por link.

---

## 1. Burp Rating

Fonte principal: https://burprating.com/

### O que foi observado

Na data da pesquisa, o site apresenta uma experiência de:

- gravar o arroto;
- receber nota de 0 a 100;
- analisar o som por várias métricas;
- comparar resultados;
- compartilhar;
- manter histórico/streak;
- acompanhar analytics numa proposta “Pro”;
- anúncio de chegada à App Store.

As métricas apresentadas publicamente incluem itens como loudness, duration, bass, chaos, reverb, pitch e rumble.

### Leitura do Auê

O território deles parece ser **análise e acompanhamento do desempenho**.

A experiência tende para algo como:

```text
GRAVAR → ANALISAR → NOTA → HISTÓRICO → COMPARAÇÃO → ANALYTICS
```

Isso é diferente do território que queremos priorizar:

```text
ARROTAR → NOTA → PROVOCAR → X1 → RESPOSTA → REVANCHE
```

### O que vale aprender

- clareza para explicar que existe uma nota;
- resultado precisa parecer concreto, não aleatório;
- a apresentação da pontuação pode dar substância à piada.

### O que NÃO devemos copiar por reflexo

- dashboard de métricas porque “parece completo”;
- streak só porque concorrente usa;
- dezenas de categorias/níveis;
- histórico profundo antes de provar replay;
- assinatura de analytics antes de provar que alguém quer voltar para arrotar.

**Pergunta de filtro:** isso deixa a treta entre duas pessoas melhor ou só transforma o Auê em medidor de arroto?

---

## 2. BurpMeter

Fonte principal: https://play.google.com/store/apps/details?id=com.yourcompany.burpmeter

### O que foi observado

Na data da pesquisa, a ficha pública do Google Play apresentava:

- app publicado;
- 10+ downloads exibidos publicamente;
- atualização em 04/04/2026;
- medição de volume, duração e picos;
- Party Mode para 2–8 pessoas;
- ranking global e por país;
- perfil com recorde/média/quantidade de arrotos;
- compartilhamento;
- anúncios;
- Arena 1x1 em tempo real anunciada como futura.

Esses números são fotografia da loja naquele dia, não indicador permanente de tração.

### Leitura do Auê

O território deles parece ser **arroto como esporte/ranking**.

A experiência sugere algo mais próximo de:

```text
ENTRAR → MEDIR → SALA/PARTY → RANKING → PERFIL
```

O Auê pode ser mais leve:

```text
RECEBEU LINK → ABRIU → ARROTOU → NOTA → MANDOU DE VOLTA
```

### Diferença estratégica importante

O BurpMeter anuncia Arena 1x1 em tempo real. O Auê não precisa exigir simultaneidade.

Uma batalha assíncrona combina melhor com WhatsApp:

- alguém manda agora;
- o outro responde quando puder;
- o mesmo conflito continua depois;
- revanche não depende de os dois estarem online juntos.

### O que vale aprender

- competição é uma direção óbvia da categoria;
- Party Mode mostra que humor corporal funciona melhor com outras pessoas por perto;
- compartilhar precisa existir desde cedo.

### O que NÃO devemos copiar por reflexo

- ranking global;
- ranking por país;
- perfil cheio de estatística;
- sala/código se um link consegue resolver a mesma coisa;
- tempo real só porque parece mais “game”.

**Pergunta de filtro:** o jogador liga mais para ser 8.437º do mundo ou para estar 7 × 6 contra aquele amigo específico?

---

## 3. Outros sinais do mercado

### BURPY

Referência histórica: https://www.androidblip.com/android-games/com.slinfy.burpy.html

Já existiram apps combinando medição, gravação, compartilhamento e modos de disputa. Portanto, “app que mede arroto” não é uma categoria nova.

### Flat Games

Fonte: https://flat00.com/

Tem jogo de humor corporal (“Can You Guess The Gas?”), com pontuação/streak/leaderboard. O gameplay é outro, mas reforça que peido/arroto pode ser tratado como jogo deliberadamente idiota, sem precisar fingir ser utilitário.

### Burp Fest

Fonte: https://www.burpfest.com/

O site publica páginas indexáveis ligadas a eventos/campeonatos e termos de busca de arroto competitivo. Não é concorrente direto do produto, mas é um sinal útil para a frente desktop/SEO: existe conteúdo pesquisável em volta da competição.

### Conteúdo social

Exemplo de agregação temática: https://www.snapchat.com/topic/burping-challenge

Há vídeos/desafios de arroto circulando em plataformas sociais. Isso sustenta a hipótese da #135: **o próprio arroto pode ser conteúdo que traz gente para o jogo**.

Isso ainda precisa ser validado pelo Auê. View não significa jogador.

---

## 4. Onde o Auê pode ser diferente

### Não competir pela “ciência do arroto”

Não precisamos ganhar a disputa de quem exibe mais métricas.

A tecnologia da nota importa, mas o jogador não precisa sair pensando:

> “meu bass foi 87 e meu reverb 72.”

A reação desejada é mais próxima de:

> **94.**  
> **Tá maluco.**  
> **Duvido bater.**

E o próximo botão está ali.

### Não competir pelo “ranking mundial do arroto”

Uma disputa pessoal tende a ter mais contexto emocional do que um ranking anônimo.

Exemplo:

```text
LUIZ 7 × 6 RENAN
```

Isso carrega história. “#8.437 do Brasil” provavelmente carrega menos.

A #134 de rivalidade por rounds explora exatamente esse território — mas ela continua obedecendo à prioridade e às decisões canônicas. Esta pesquisa não autoriza a implementação por conta própria.

### O território: a treta

O Auê deve tentar possuir mentalmente:

- provocação;
- X1 por link;
- resposta assíncrona;
- revanche;
- placar da rivalidade;
- linguagem reconhecível;
- compartilhamento que já chega contando a história.

**Resultado é munição. Não relatório.**

---

## 5. Oportunidade de aquisição: desktop e SEO

Os concorrentes diretos encontrados estão muito orientados a apresentar o app/produto.

A oportunidade do Auê é construir também uma porta de descoberta:

```text
BUSCA / CONTEÚDO
      ↓
CONHECE O AUÊ
      ↓
PEGA O CELULAR
      ↓
ARROTA
      ↓
NOTA
      ↓
X1 / COMPARTILHA
      ↓
OUTRA PESSOA ENTRA
```

Isso conversa com a #138.

Conteúdos iniciais possíveis:

- como arrotar;
- como arrotar de propósito;
- como arrotar alto;
- como jogar Auê;
- arrotos da internet;
- conteúdo de competição/recordes quando houver algo realmente útil para dizer.

### Regra importante

SEO não pode virar fábrica de texto.

Não abrir páginas quase idênticas só para capturar palavra-chave. Cada página precisa ser útil para pessoa de verdade e terminar aproximando o usuário do jogo.

---

## 6. Monetização: sinais, não decisão

Na data da pesquisa:

- BurpMeter informa presença de anúncios no Google Play;
- Burp Rating apresenta proposta de camada Pro/analytics, sem preço público encontrado nesta rodada.

Isso prova apenas que concorrentes estão testando caminhos de monetização. **Não prova que funcionam.**

Para o Auê, a recomendação desta pesquisa é proteger primeiro o loop:

```text
ARROTAR → NOTA → PROVOCAR / COMPARTILHAR
```

Não interromper esse momento com monetização antes de validar replay e distribuição.

Monetização continua sendo decisão de produto separada.

---

## 7. Mapa competitivo rápido

| Produto | Território aparente | Risco/oportunidade para o Auê |
|---|---|---|
| Burp Rating | análise e nota do arroto | não disputar por quantidade de métricas |
| BurpMeter | esporte, ranking e party | reforça valor da competição, mas não exige copiar ranking global |
| BURPY | referência histórica de medição/versus | prova que “medir arroto” não é novidade |
| Flat Games | humor corporal como jogo | mostra que a idiotice pode ser o próprio gameplay |
| Burp Fest | eventos + conteúdo indexável | reforça oportunidade de conteúdo/SEO |
| Auê | **treta entre amigos** | precisa provar que link → resposta → revanche gera repetição |

---

## 8. Regras para agentes usando esta pesquisa

1. **Não transformar concorrente em roadmap.** Concorrente ter uma feature não é motivo para o Auê ter também.
2. **Não declarar tração sem evidência.** Download, preço, loja e funcionalidades mudam. Verifique de novo na web antes de usar em decisão relevante.
3. **Separar fato de interpretação.** “Google Play mostra 10+ downloads” é observação datada. “Isso é ameaça 5/10” seria opinião, não fato.
4. **Pesquisa não abre escopo.** Uma oportunidade encontrada aqui passa pelo fluxo normal do projeto.
5. **Use o posicionamento como filtro:** a ideia fortalece **treta, X1, resposta ou revanche**? Se não, precisa de motivo muito bom.
6. **Atualize a data** se esta análise for revisitada e houver mudança relevante nos concorrentes.

---

## 9. Fontes consultadas nesta rodada

- Burp Rating — https://burprating.com/
- BurpMeter / Google Play — https://play.google.com/store/apps/details?id=com.yourcompany.burpmeter
- BURPY (registro histórico) — https://www.androidblip.com/android-games/com.slinfy.burpy.html
- Flat Games — https://flat00.com/
- Burp Fest — https://www.burpfest.com/
- Snapchat / burping challenge — https://www.snapchat.com/topic/burping-challenge

Se uma decisão futura depender de qualquer dado dessas páginas, **pesquise novamente**. Este arquivo registra o que vimos em 10/08/2026, não congela a internet.