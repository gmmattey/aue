# Contrato de Escopo — MVP1 do Auê

Este documento é a **fonte canônica de escopo do MVP1 de lançamento**.

Ele responde uma única pergunta: **o que pode entrar no primeiro lançamento público do Auê?**

Se houver conflito entre este documento e qualquer especificação funcional ampla, protótipo, README, história do produto, documento de voz, ideia de backlog ou código já existente, **este contrato prevalece para o MVP1**.

A especificação funcional completa continua válida como visão de produto e roadmap, mas não autoriza implementação automática no MVP1.

---

## 1. Objetivo do MVP1

Publicar rapidamente o Auê como webapp/PWA simples, divertido e compartilhável, validando o loop central:

**Abrir → Arrotar → Receber nota → Compartilhar ou desafiar → Revanche**

O MVP1 não é uma rede social completa. É uma brincadeira competitiva entre amigos transformada em produto.

---

## 2. Princípios obrigatórios

1. **Sem cadastro obrigatório.** O usuário deve conseguir usar o MVP sem login e senha.
2. **Pouca fricção.** Nenhum formulário longo, onboarding obrigatório ou autorização desnecessária antes da primeira nota.
3. **Microfone é a única permissão técnica obrigatória para o fluxo principal.**
4. **Nada pode fingir que funciona.** Feature incompleta fica desligada.
5. **Protótipo não implica implementação.** O projeto de protótipos pode conter visão futura.
6. **Código existente fora do MVP1 deve ser preservado, mas não pode bloquear o lançamento.**
7. **Nenhuma funcionalidade nova pode ser implementada enquanto houver fluxo do MVP1 incompleto ou quebrado.** Ideias novas vão para backlog.
8. **A história e a voz do Auê orientam decisões; não ampliam escopo.**

---

## 3. Escopo obrigatório do MVP1

### 3.1 Entrada mobile

- Abrir `aue.vercel.app` no navegador do celular.
- A experiência deve levar diretamente ao Auê, sem exigir cadastro.
- CTA principal simples para iniciar a gravação.
- Solicitar acesso ao microfone somente quando necessário.

### 3.2 Entrada desktop

- Desktop funciona como landing pública/indexável do Auê.
- Explicar rapidamente o que é o produto e orientar o uso pelo celular.
- Oferecer caminho claro para abrir/instalar o webapp no dispositivo compatível, preferencialmente com QR Code para continuar no celular.
- Manter conteúdo suficiente para SEO e compartilhamento social.

### 3.3 Arroto individual

O usuário deve conseguir:

1. iniciar a gravação;
2. gravar o arroto;
3. receber a avaliação do motor;
4. informar a origem;
5. receber a nota e a classificação;
6. tentar novamente;
7. compartilhar;
8. iniciar uma batalha.

### 3.4 Origem do arroto

Opções mínimas:

- cerveja;
- refrigerante;
- comida;
- puxando ar;
- outro.

A origem é informada pelo usuário. O sistema não deve fingir detectá-la automaticamente.

### 3.5 Compartilhamento

O resultado deve ser fácil de compartilhar por:

- WhatsApp;
- X;
- Telegram;
- compartilhamento nativo do dispositivo, quando disponível;
- cópia de link como fallback.

O artefato compartilhado deve priorizar:

- nota;
- classificação;
- identidade visual do Auê;
- CTA para tentar superar o resultado;
- link da batalha quando o compartilhamento for um convite.

### 3.6 Batalha remota por link

A batalha por link é a principal mecânica viral do MVP1.

Fluxo esperado:

1. uma pessoa grava e recebe a nota;
2. cria uma batalha;
3. compartilha o convite;
4. o amigo abre o link sem cadastro;
5. consegue ouvir os arrotos já presentes na sessão enquanto ela estiver ativa;
6. grava sua resposta;
7. recebe sua nota;
8. entra na sequência da disputa;
9. o link pode voltar para os participantes, criando revanche em loop;
10. outros amigos podem entrar somente por meio do convite da mesma batalha.

A sessão deve funcionar como uma sequência privada por link, e não como feed público.

### 3.7 Sessão temporária

- A sessão da batalha fica disponível aos participantes por até **7 dias**.
- Depois da expiração, o conteúdo da sessão não deve continuar acessível pelo link público da batalha.
- O identificador da sessão precisa ser longo, imprevisível e não enumerável.

### 3.8 Disputa local

O MVP1 deve suportar disputa presencial no mesmo aparelho.

Configuração:

- 2 a 5 participantes;
- nome ou nick de cada participante;
- 1 a 3 rounds definidos antes de começar;
- contexto/local opcional da disputa.

Contextos iniciais:

- casa;
- público;
- escritório;
- churrasco;
- outro.

Durante a disputa:

- cada participante arrota na sua vez;
- cada tentativa recebe nota;
- a origem do arroto pode ser informada para cada tentativa;
- ao final de cada round, o placar pode ser atualizado;
- ao final da disputa, o app gera ranking e pódio.

### 3.9 Compartilhamento da disputa local

Ao final, gerar um banner compartilhável com:

- nome/nick dos participantes;
- posições do pódio;
- notas;
- contexto/local, quando informado;
- identidade visual do Auê.

O banner deve poder ser compartilhado pelos mesmos meios do resultado individual.

### 3.10 Privacidade e política de uso

- Política de privacidade e termos/política de uso devem existir em páginas públicas.
- Não precisam interromper o fluxo principal com formulários ou telas obrigatórias.
- Requisitos legais e de transparência prevalecem sobre a intenção de reduzir fricção.

### 3.11 SEO mínimo

O MVP1 deve estar tecnicamente preparado para descoberta por mecanismos de busca.

Isso inclui, no mínimo:

- landing pública com conteúdo indexável;
- `robots.txt`;
- `sitemap.xml`;
- `canonical`;
- title e description adequados;
- Open Graph;
- metadata social;
- conteúdo real suficiente para explicar o Auê.

**Aparecer ou ranquear no Google não é critério de aceite controlável pelo código.** O requisito é estar corretamente preparado para indexação.

---

## 4. Fora do MVP1

As funcionalidades abaixo podem existir em código, protótipo ou documentação de roadmap, mas ficam fora do primeiro lançamento e não podem bloquear o MVP1:

- feed público;
- comunidades;
- criação de grupos/comunidades;
- seguidores/seguindo;
- perfil social completo;
- login social obrigatório;
- ranking global;
- XP, níveis e conquistas avançadas;
- missões e recompensas;
- campeonatos/ligas online;
- assinatura Auê+;
- cobrança/pagamento;
- notificações push;
- mensagens privadas;
- feed algorítmico;
- integração direta com APIs de postagem de redes sociais;
- app nativo Android/iOS.

Código existente dessas áreas deve permanecer preservado e, quando necessário, ficar protegido por feature flag com padrão desligado.

---

## 5. Regra para código já existente

Classificar o que já existe em três grupos:

### MVP1
Necessário para o fluxo de lançamento e deve ser estabilizado.

### Reaproveitável
Código útil para o futuro ou que pode servir ao MVP1 depois, mas não precisa aparecer agora.

### Desligado
Feature futura, mock, fluxo incompleto ou funcionalidade que aumenta o risco do lançamento.

**Não refatorar o projeto inteiro apenas para adequá-lo ao MVP1.** A estratégia é podar a superfície pública, conectar o fluxo principal, validar e publicar.

---

## 6. Definition of Done do MVP1

O MVP1 só é considerado pronto quando os fluxos abaixo funcionarem de ponta a ponta em navegador mobile real:

### Fluxo individual

**Abrir → permitir microfone → gravar → receber nota → compartilhar**

### Batalha remota

**Gravar → criar batalha → compartilhar link → segundo aparelho abrir → ouvir → responder → receber nota → sequência atualizar → revanche**

### Disputa local

**Criar disputa → cadastrar participantes → executar rounds → gerar ranking/pódio → compartilhar resultado**

Além disso:

- erros devem ser tratados sem fingir sucesso;
- nenhuma feature desligada pode deixar CTA ou rota quebrada;
- dados fictícios não podem aparecer como reais;
- build, typecheck, lint e testes obrigatórios do repositório devem passar;
- deploy público deve funcionar com configuração real do Supabase e demais dependências do MVP1.

---

## 7. Hierarquia documental

Para decisões do MVP1, usar esta ordem:

1. **`docs/mvp1/CONTRATO_MVP1.md`** — o que entra agora.
2. **`AGENTS.md`** — quem trabalha e como o trabalho é executado.
3. **documentação técnica e migrações** — como o comportamento aprovado é implementado.
4. **`docs/produto/VOZ_E_PERSONALIDADE.md`** — como o produto fala e se comporta.
5. **`docs/produto/HISTORIA_DO_AUE.md`** — por que o produto existe e qual contexto humano o moldou.
6. **`docs/functional/especificacao_funcional.md`** — visão funcional ampla e roadmap; não amplia o MVP1 por conta própria.
7. **protótipos completos** — visão visual futura; somente o recorte identificado como MVP1 representa o lançamento.

---

## 8. Regra obrigatória para agentes

> Nenhuma funcionalidade nova pode ser implementada enquanto houver fluxo do MVP1 incompleto ou quebrado. Ideias novas devem ser registradas no backlog, nunca implementadas automaticamente.

> Protótipo não implica implementação. O índice completo representa visão futura; o índice MVP1 representa o contrato visual do lançamento.

> Em caso de dúvida sobre escopo, pare de ampliar e consulte este contrato.

---

## 9. Ponto de decisão ainda não resolvido por este contrato

O destino dos áudios após a expiração da sessão de 7 dias precisa permanecer uma decisão explícita de produto e privacidade.

O contrato **não presume** que a permissão técnica do microfone autorize retenção permanente ou reutilização futura. Se o produto mantiver áudios para um acervo futuro, a regra de retenção, transparência e eventual escolha do participante deve ser definida antes do lançamento público.
