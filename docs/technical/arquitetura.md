# Arquitetura do Auê

**Status:** descrição da arquitetura implementada  
**Revisado em:** 2026-08-09 (reposicionamento para jogo)

> Este arquivo explica a arquitetura **como ela é hoje**. Ele não amplia escopo:
> o que pertence ao jogo está em
> [`../escopo/ESCOPO_ATUAL.md`](../escopo/ESCOPO_ATUAL.md).
>
> E quando este documento discordar do código ou das migrações, o código e as
> migrações ganham. Documento não executa query.

---

## 0. Onde a arquitetura está indo

O Auê é um **jogo mobile casual, web-first**, e a experiência principal deve
acontecer em **uma Arena que muda de estado** — ver
[`../jogo/ARENA.md`](../jogo/ARENA.md) e o protótipo
[`../design/prototipo-arena/arena.html`](../design/prototipo-arena/arena.html).

**Hoje o código não é isso.** O mesmo loop existe como uma sequência de telas
React (`TelaDeConvite`, `TelaDeGravacao`, `EscolhaDeOrigem`, `TelaDeJulgamento`,
`ResultadoScreen`, `BattleView`, `DisputaLocalScreen`), com rotas `/b/:code` e
`/d/:id`. O comportamento funciona; o que falta é a superfície única.

Duas consequências para qualquer mudança:

1. **Comportamento novo é quase sempre um estado ou uma transição**, não uma
   rota nova. Não acrescente tela ao caminho antigo se der para preparar o
   estado.
2. **Motor separado da tela.** Áudio (`features/audio/engine.ts`,
   `features/audio/juiz/`) e score (`features/audio/rules.ts`) não podem
   depender de componente. É o que torna a migração possível — e o que mantém a
   porta aberta para Android/iOS depois.

A migração está fatiada no [backlog](../escopo/BACKLOG.md) e **não deve
reescrever motor de áudio, score nem backend**.

---

## 1. A ideia arquitetural em uma frase

O Auê faz o trabalho que precisa ser rápido no navegador e usa o Supabase para
o que precisa existir entre aparelhos, sobreviver à sessão ou ter regra de
segurança no servidor.

```text
Celular
  │
  ├─ captura áudio
  ├─ analisa características
  ├─ mostra feedback imediato
  │
  ▼
Supabase
  ├─ sessão anônima
  ├─ resultados persistentes
  ├─ regras oficiais/RPCs
  ├─ batalhas por link
  └─ storage de áudio quando o fluxo exige
```

Nada de inventar uma arquitetura distribuída de banco espacial para julgar um
arroto de três segundos.

---

## 2. Stack implementada

### Frontend

- React 19
- TypeScript
- Vite
- `vite-plugin-pwa`
- Web Audio API
- MediaRecorder API
- Web Share API quando disponível

### Backend

- Supabase Auth
- PostgreSQL
- Row Level Security
- RPCs e triggers
- Supabase Storage
- Edge Functions para fluxos que realmente exigem execução server-side

### Qualidade

- Vitest
- typecheck TypeScript
- lint
- build Vite

---

## 3. O que NÃO existe hoje

A arquitetura antiga descrevia IndexedDB e uma jornada offline-first completa.
Isso **não foi implementado**.

Hoje:

- o PWA possui service worker/cache de assets;
- isso não significa que a jornada inteira de gravação, batalha e persistência
  funcione offline;
- não existe uma camada canônica de IndexedDB para resultados, filas de upload
  e competições presenciais;
- nenhuma feature deve ser descrita como offline-first só porque o app é PWA.

Se offline completo virar prioridade futura, entra como projeto próprio. Não
aparece por osmose em documentação.

---

## 4. Entrada e sessão

O MVP1 não mostra cadastro.

No boot, o cliente tenta criar/recuperar uma **sessão anônima do Supabase**.
Isso dá identidade técnica sem transformar a entrada em formulário.

```text
abre o Auê
   ↓
Supabase Auth anônimo
   ↓
sessão existe nos bastidores
   ↓
fluxo continua sem tela de login
```

A sessão anônima é importante para:

- aplicar RLS;
- associar operações do backend;
- permitir upload/persistência controlada;
- evitar que "sem login visual" vire "backend aberto para qualquer coisa".

### Dependência de deploy

`Anonymous sign-ins` precisa estar habilitado no projeto Supabase.

As variáveis `VITE_SUPABASE_*` entram no bundle em tempo de build. Alterá-las no
painel sem rebuild não muda o JavaScript já publicado.

---

## 5. Gravação

A captura de áudio fica isolada da lógica de persistência.

Fluxo conceitual:

```text
getUserMedia
   ↓
MediaRecorder
   ↓
blob de áudio
   ↓
análise local
   ↓
resultado provisório/UI
   ↓
persistência quando necessária
```

O hook de gravação é responsável por um invariante crítico:

> todo caminho de saída precisa liberar o `MediaStream`.

Isso inclui parar, descartar, timeout, erro e desmontagem da tela. Vazamento de
microfone é defeito de segurança/privacidade, não detalhe cosmético.

---

## 6. Auê Judgement Engine

O motor extrai características digitais do áudio e produz as parciais usadas no
Auê Score.

Dimensões atuais do produto:

- duração;
- potência;
- profundidade;
- textura;
- origem declarada.

A interface pode ser engraçada. A matemática precisa ser determinística e
versionada.

### Duas camadas de confiança

O navegador calcula para resposta rápida, mas o cliente não deve ter autoridade
para escrever qualquer nota arbitrária como resultado oficial.

A regra oficial é protegida no backend por RPC/constraints/triggers versionados.
`enviar_resultado` é parte desse caminho.

Existe teste de coerência entre a fórmula TypeScript e a versão SQL no
repositório. Isso protege os **arquivos versionados**, mas não prova que o banco
remoto recebeu a mesma migração.

---

## 7. Resultado individual

O resultado liga três coisas:

1. análise;
2. apresentação;
3. decisão do que persistir/compartilhar.

A interface não deve misturar essas responsabilidades num componente gigante.

O resultado pode existir sem feed, ranking, XP ou conta social. Essas features
são complementares e ficam atrás de flags quando fora do corte.

---

## 8. Batalha por link — `/b/CODIGO`

A batalha é a mecânica viral principal do MVP1.

Não é feed público e não depende de perfil social.

```text
resultado
   ↓
criar batalha
   ↓
código imprevisível
   ↓
/b/CODIGO
   ↓
amigo abre
   ↓
consulta sequência pelo código
   ↓
ouve / grava / recebe nota
   ↓
nova rodada entra na batalha
```

### Modelo de acesso

As tabelas `batalhas` e `rodadas_batalha` usam RLS e o acesso da aplicação passa
por RPCs que recebem o código da batalha.

O código funciona como uma **capability URL**: quem possui o link consegue
participar enquanto a sessão estiver válida.

Consequências:

- o código precisa ser imprevisível e não enumerável;
- não deve existir listagem pública de batalhas;
- logs e analytics não devem vazar o código sem necessidade;
- expiração precisa ser validada no backend, não só escondida na UI.

### Expiração

O acesso público da batalha expira em até 7 dias.

O destino do arquivo de áudio depois disso é uma **decisão pendente de produto
e privacidade**, registrada no contrato do MVP1. Não assumir retenção eterna só
porque o upload aconteceu.

---

## 9. Desafio legado — `/d/CODIGO`

O fluxo antigo de desafio 1v1 continua no código por compatibilidade com links
já criados.

Estado: **LEGADO**.

Regras:

- não direcionar novas jornadas para `/d/`;
- não ampliar funcionalidade ali;
- correções de segurança/compatibilidade continuam permitidas;
- novas mecânicas competitivas usam `/b/`.

---

## 10. Disputa local

A disputa presencial usa um único aparelho como juiz.

No MVP1:

- 2 a 5 participantes;
- 1 a 3 rounds;
- turnos sequenciais;
- origem por tentativa;
- placar durante a disputa;
- pódio no final;
- compartilhamento do resultado.

A lógica de turnos deve permanecer separada da tela para ser testável sem
renderizar o app inteiro.

A feature fica atrás de `VITE_FEATURE_DISPUTA_LOCAL` até passar pelo fluxo de
ponta a ponta num aparelho real.

---

## 11. Feature flags

`src/shared/flags.ts` é a fonte única de flags de produto no frontend.

Regra:

> ausente = desligada.

Isso é deliberado. Um ambiente sem configuração extra precisa publicar o corte
mais conservador, não desbloquear feature velha por acidente.

Áreas como feed, ranking, perfil, XP, login social, ligas, assinatura e push
podem existir em código sem fazer parte do MVP1.

Flag não transforma feature quebrada em roadmap pronto. Ela só impede exposição.

---

## 12. Storage de áudio

O Storage entra quando um fluxo precisa que outro aparelho consiga acessar o
áudio ou que o resultado seja persistido.

O princípio é:

- não subir áudio sem necessidade funcional;
- não tornar bucket público por conveniência;
- usar controle de acesso compatível com o fluxo;
- separar "precisa ficar disponível durante a batalha" de "pode ser guardado
  indefinidamente".

A política de retenção está **decidida** e registrada em
[`../jogo/REGRAS.md`](../jogo/REGRAS.md) §8: passados os 7 dias, o acesso pelo
link é bloqueado e o arquivo é mantido, sem expurgo automático. Tecnicamente
isso significa que a expiração vive nas RPCs (`obter_batalha`,
`responder_batalha`) e **não** no Storage — não existe rotina que apague objeto
do bucket, e a limpeza oportunista de batalhas mortas remove a linha, não o
arquivo.

---

## 13. Banco de dados

A fonte de verdade do schema versionado é:

```text
supabase/migrations/
```

Documentos de schema servem para explicar domínio e convenções. Eles não
substituem as migrações.

Antes de criar tabela, coluna, policy ou RPC, leia
[`../schema/nomenclatura.md`](../schema/nomenclatura.md).

---

## 14. Segurança

Princípios obrigatórios:

- RLS em dados expostos ao cliente;
- server-side para decisões competitivas que não podem confiar no browser;
- IDs/códigos imprevisíveis;
- validação de tamanho e formato de upload;
- nenhuma feature pode fingir autorização por esconder botão;
- erro precisa ser explícito;
- dados falsos nunca aparecem como se fossem produção.

Segurança prevalece sobre o tom do produto. Uma mensagem pode dizer "deu ruim";
a policy não pode ser engraçadinha.

---

## 15. PWA e desktop

### Mobile

É onde a brincadeira acontece.

A prioridade é:

- abrir rápido;
- pedir microfone no momento certo;
- gravar;
- julgar;
- compartilhar/desafiar.

### Desktop

No MVP1, desktop funciona principalmente como landing pública/indexável e
ponte para o celular.

Não é objetivo forçar paridade de gameplay desktop antes do fluxo mobile estar
estável.

---

## 16. Observabilidade

Telemetria deve responder perguntas de produto sem coletar áudio por padrão.

Eventos úteis:

- abriu;
- iniciou gravação;
- concluiu gravação;
- recebeu score;
- compartilhou;
- criou batalha;
- abriu batalha;
- respondeu batalha;
- iniciou/concluiu disputa local.

Métrica não precisa virar infraestrutura de Big Data antes de existir tráfego.

---

## 17. O que existe em código mas saiu da visão

- login social visível;
- feed público;
- ranking global;
- XP e níveis;
- conquistas;
- perfil social;
- grupos e comunidades;
- ligas/campeonatos online;
- push;
- assinatura;
- integração direta de postagem em redes sociais.

Tudo isso está desligado por `src/shared/flags.ts`, com padrão desligado, e é
**dívida esperando remoção** — issue
[#109](https://github.com/gmmattey/aue/issues/109). **Não é roadmap.** Ninguém
deve expandir esse código, e ligar uma dessas flags exigiria decisão de produto
que hoje não existe.

Continuam sendo futuro possível, sem autorização: IndexedDB/offline-first
completo e app nativo Android/iOS. **Nenhum dos dois deve ser começado agora.**

---

## 18. Definition of Done técnico

Uma fatia só está pronta quando:

- funciona no navegador real alvo;
- falhas têm estado de erro verdadeiro;
- recurso sensível é liberado corretamente;
- persistência não duplica efeito;
- regra server-side não pode ser burlada pelo caminho óbvio;
- typecheck, lint, testes e build passam;
- configuração de produção necessária está documentada;
- nenhuma tela afirma que algo aconteceu se o backend não confirmou.

No Auê, "parece que funcionou" não é arquitetura. É bug esperando churrasco.
