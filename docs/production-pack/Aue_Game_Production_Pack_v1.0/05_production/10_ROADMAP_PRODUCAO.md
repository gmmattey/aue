# Auê! — Roadmap de Produção

Este não é um roadmap de desejos. É a ordem para transformar o Auê em jogo distribuível e aprender com usuários sem continuar construindo no escuro.

## Princípio

**Terminar → medir → descobrir gargalo → corrigir.**

Não “feature → feature → feature”.

## Fase 0 — Congelar o núcleo

Objetivo: impedir expansão de escopo durante a prova de mercado.

Não iniciar:

- feed;
- ranking global;
- XP;
- perfil;
- comunidade;
- temporadas;
- monetização complexa;
- chat;
- creator platform.

## Fase 1 — Segurança e integridade

Prioridade máxima:

1. hardening Supabase e permissões excessivas;
2. validar migrations/policies;
3. assegurar que score oficial continua server-side;
4. garantir storage/áudio privado;
5. revisar capability URLs.

**Saída:** produto pode ser exposto a gente real sem depender de “ninguém vai tentar”.

## Fase 2 — Fechar a qualidade do loop

1. corrigir score-alvo durante resposta do X1;
2. executar X1 de ponta a ponta em dois aparelhos;
3. Roda 5 jogadores × 3 rounds em aparelho real;
4. corrigir bugs encontrados, sem ampliar feature;
5. validar game feel dos estados principais.

**Saída:** loop inteiro confiável.

## Fase 3 — Telemetria v1

Implementar eventos mínimos:

- abriu;
- começou;
- nota;
- share;
- X1;
- resposta;
- revanche;
- Roda.

Origem/campanha via parâmetros simples.

**Saída:** enxergar onde as pessoas desaparecem.

## Fase 4 — Aquisição experimental

Durante 14 dias:

- 3 conceitos de conteúdo;
- 12–18 variações;
- TikTok/Reels/Shorts;
- seed manual de X1;
- zero feature nova salvo blocker real.

**Saída:** dado sobre `view → entrada → arroto → X1`.

## Fase 5 — Corrigir o maior gargalo

Escolher UM gargalo por evidência.

### Se ninguém entra

Trabalhar conteúdo/CTA/distribuição.

### Se entra e não arrota

Trabalhar IDLE, confiança, permissão, performance inicial.

### Se arrota e não recebe nota

Trabalhar detector/áudio/erro.

### Se recebe nota e não compartilha

Trabalhar resultado/provocação/X1.

### Se abre X1 e não responde

Trabalhar VERSUS/alvo/zero atrito.

### Se responde e não pede revanche

Trabalhar placar/game feel/provocação.

## Fase 6 — Android

Em paralelo, sem tratar loja como canal mágico de aquisição:

1. release signing;
2. AAB;
3. internal/closed track;
4. teste em aparelho;
5. requisitos da conta/Play;
6. ADR para produção pública quando chegar o momento.

A Play é distribuição adicional, não substituto de aquisição.

## Fase 7 — Repetir experimento

Novo lote de conteúdo após corrigir gargalo.

Comparar coortes/campanhas de forma simples.

Não mudar score e acquisition creative simultaneamente se isso impedir leitura do resultado.

## Fase 8 — Monetização apenas com comportamento provado

Perguntas antes de monetizar:

- existe tráfego recorrente?;
- existe volume de partidas?;
- X1 traz jogadores?;
- há retorno?;
- publicidade interfere no payoff?;
- vale mais anúncio, patrocínio de conteúdo ou produto premium futuro?

Abrir ADR/decisão específica antes de anúncios dentro de app, assinatura ou compra.

## Fase 9 — Escala

Só depois de sinais reais considerar:

- ferramenta de analytics dedicada;
- automação de conteúdo;
- infraestrutura adicional;
- internacionalização;
- App Store;
- recursos de retenção.

## Métricas por fase

### Produto

- ativação;
- taxa de score;
- share/X1;
- resposta;
- revanche.

### Growth

- view → acesso;
- acesso → tentativa;
- tentativa → score;
- score → X1;
- X1 → resposta.

### Qualidade

- falhas de captura;
- detector indisponível;
- share errors;
- batalha errors;
- abandono por estado.

## Regra de decisão

Uma feature nova só entra se houver uma destas justificativas:

1. corrige blocker;
2. fortalece claramente um tempo do core loop;
3. responde gargalo medido;
4. cumpre requisito de publicação/segurança;
5. foi formalmente aprovada como mudança de produto.

“Seria maneiro” vai para estacionamento, não para sprint.

## Próximo marco recomendado

**Auê Acquisition-ready:**

- segurança saneada;
- X1 claro;
- Roda validada;
- telemetria ligada;
- 3 templates de conteúdo;
- primeiro lote publicado;
- funil consultável.

Esse marco vale mais agora que adicionar uma décima feature.
