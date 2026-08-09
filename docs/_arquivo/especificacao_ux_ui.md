> # ⚠️ ARQUIVADO — SEM AUTORIDADE
>
> Este documento descreve o Auê **antes** do reposicionamento de 2026-08-09,
> quando ele era um webapp/PWA com ambição de rede social e governança por gate
> sequencial.
>
> Hoje o Auê é um **jogo mobile casual, web-first**:
> [`../jogo/VISAO.md`](../jogo/VISAO.md) · [`../escopo/ESCOPO_ATUAL.md`](../escopo/ESCOPO_ATUAL.md) · [`../../AGENTS.md`](../../AGENTS.md)
>
> Ele fica versionado como contexto histórico. **Não use nada daqui como
> argumento para implementar, ampliar escopo ou reverter decisão.** Ver
> [`README.md`](README.md).

---

# Auê — Especificação de UX, UI e Layout

**Versão:** 2.0  
**Produto:** PWA mobile-first de competição de arrotos  
**Voz:** Giam + Guinho + Marcelo

> Este documento explica **como a experiência deve funcionar e parecer**.
> Quem decide **o que entra agora** é
> [`mvp1/CONTRATO_MVP1.md`](./mvp1/CONTRATO_MVP1.md).
>
> O protótipo completo pode ter cinquenta ideias. O lançamento não precisa ter
> cinquenta problemas.

---

# 1. A experiência em uma frase

O Auê precisa parecer um **party game absurdo, rápido e bem feito**.

Não é gravador de áudio.

Não é dashboard.

Não é rede social com arroto pintado por cima.

É isto:

```text
ARROTAR
   ↓
SER JULGADO
   ↓
RIR / XINGAR O RESULTADO
   ↓
DESAFIAR OU COMPARTILHAR
   ↓
ALGUÉM RESPONDE
   ↓
REVANCHE
```

Se a interface atrapalha esse loop, ela está trabalhando contra o produto.

---

# 2. Como os três olham para UX

## Giam

Pergunta se a tela resolve o problema com o mínimo de atrito possível.

Se uma etapa não é necessária para o fluxo ou para segurança/privacidade, ela
precisa justificar por que existe.

## Guinho

Pergunta se isso parece um jogo de disputa de verdade.

Quer nota grande, provocação, suspense, placar, revanche e um produto que não
fale igual SAC tentando fazer meme.

## Marcelo

Pergunta o que acontece quando a pessoa:

- nega o microfone;
- sai no meio;
- grava silêncio;
- aperta duas vezes;
- fica sem internet;
- abre link vencido;
- volta pela navegação;
- tenta quebrar o fluxo porque sim.

Se só o happy path ficou bonito, a tela ainda não terminou.

---

# 3. Princípios obrigatórios

## 3.1 Uma ação principal por vez

Cada estado deve deixar óbvio qual é o próximo movimento.

Exemplos:

- entrada: **ARROTAR**;
- resultado: **DESAFIAR**;
- batalha recebida: **RESPONDER**;
- disputa local: **PRÓXIMO**;
- pódio: **COMPARTILHAR**.

Ações secundárias existem, mas não brigam visualmente com a principal.

## 3.2 Baixa densidade

Evitar:

- card dentro de card;
- dashboard;
- cinco métricas gigantes ao mesmo tempo;
- explicação longa antes da ação;
- navegação cheia;
- menu que parece painel administrativo;
- CTA concorrente em toda esquina.

Preferir:

- espaço;
- tipografia grande;
- um elemento dominante;
- informação progressiva;
- ação clara;
- detalhes que aparecem depois que a pessoa já entendeu o principal.

## 3.3 Mobile primeiro de verdade

Mobile não é desktop espremido.

A mão precisa alcançar as ações importantes. O microfone precisa abrir no
momento certo. O share precisa usar o que o aparelho oferece.

## 3.4 Sem cadastro na frente da brincadeira

O MVP1 usa identidade técnica anônima nos bastidores.

A pessoa não precisa entender Supabase Auth para arrotar.

## 3.5 O ridículo é proposital; o design não é amador

A ideia pode ser "vamos dar 91,4 para um arroto".

A interface ainda precisa parecer produto de verdade.

---

# 4. Direção visual

Referência conceitual:

**party game premium + competição + cultura digital + esporte absurdo.**

Não copiar uma interface específica. Usar referências para sensação.

## O que queremos roubar conceitualmente

- Wavelength: party game limpo, teatralidade e suspense;
- Kahoot: clareza de disputa, placar e pódio;
- BeReal: pouca cerimônia antes da ação principal;
- jogos competitivos: vencedor/derrota/revanche sem vergonha do placar;
- Duolingo/Strava: referências futuras de progressão, não requisitos do MVP1.

XP, níveis e conquistas **não entram no MVP1 só porque são boas referências de
motion**.

---

# 5. Tema e cor

Direção principal: escuro.

- background: preto profundo/carvão;
- surface: cinza muito escuro;
- primary: lima/verde ácido elétrico;
- texto: branco quente/creme claro;
- danger: vermelho vivo quando houver significado;
- gold: vitória/pódio/estado raro, com parcimônia.

Não transformar tudo em neon sem hierarquia.

Verde não pode parecer hospital nem caricatura de vômito.

---

# 6. Tipografia

Duas funções visuais:

## Display

Pesada, marcante e usada para:

- Auê Score;
- classificação;
- vencedor;
- pódio;
- chamadas curtas.

Exemplo:

```text
91,4
```

O número é protagonista.

## Interface

Sans-serif limpa e muito legível para:

- labels;
- instruções;
- métricas;
- botões;
- mensagens de erro;
- texto institucional.

Copy ogra não é desculpa para baixa legibilidade.

---

# 7. Bolha Auê

A Bolha é a principal assinatura visual do momento de gravação.

Características:

- orgânica;
- grande;
- não perfeitamente circular;
- animada;
- responsiva ao áudio;
- simples o suficiente para rodar bem em celular comum.

## Estados

### Idle

Respiração/pulsação sutil.

### Preparando

Contrai levemente antes da captura.

### Gravando

Reage ao sinal recebido.

- potência influencia expansão;
- profundidade pode dar sensação de peso/largura;
- textura influencia irregularidade;
- duração sustenta o movimento.

Isso é linguagem visual. Não alegar que a geometria da bolha é instrumento de
medição científico.

### Finalizando

Resposta curta que confirma o encerramento.

### Analisando

A bolha muda de comportamento para comunicar processamento.

### Resultado

A bolha pode abrir, explodir ou ceder espaço para a nota.

---

# 8. Motion

Animação só entra se comunicar alguma coisa:

- captura;
- processamento;
- suspense;
- resultado;
- vitória;
- derrota;
- troca de turno.

Não use 1,5 segundo de animação obrigatória toda vez só porque a primeira vez
ficou bonita.

A primeira revelação pode ter teatralidade. Revanche repetida precisa continuar
rápida.

Respeitar `prefers-reduced-motion`.

---

# 9. Entrada mobile

Ao abrir no celular, a pessoa deve entender praticamente sem ler:

> aqui você arrota e recebe uma nota.

Não há carrossel de onboarding.

Não há mural de funcionalidades.

Não há "crie sua conta para começar".

Estrutura sugerida:

```text
Auê

[ Bolha ]

ARROTAR

Desafiar alguém vem depois da primeira nota.
```

Se disputa local estiver habilitada, pode existir acesso secundário para
**DISPUTA LOCAL**, sem competir com ARROTAR.

---

# 10. Permissão de microfone

A permissão precisa ser contextual.

Não pedir microfone ao carregar a página antes da pessoa decidir jogar.

Copy precisa dizer a verdade e caber no tom.

Exemplo:

**PRECISO OUVIR ESSA PORRA.**

Secundário:

> O Auê usa o microfone para gravar e analisar seu arroto.

CTA:

**LIBERAR MICROFONE**

Se o navegador já negar ou bloquear:

- explicar como corrigir;
- não ficar repetindo prompt que o browser não vai abrir;
- não fingir que existe caminho sem microfone para uma feature que depende dele.

---

# 11. Gravação

O momento precisa parecer performático sem ficar confuso.

Estado principal:

```text
MANDA.

[ BOLHA REAGINDO ]

02,7 s

FINALIZAR
```

Duração máxima de captura: até 10 segundos conforme regra funcional vigente.

A UI deve indicar claramente que está gravando.

Ao sair da tela, cancelar ou falhar, o microfone precisa ser liberado.

---

# 12. Silêncio e gravação inválida

O produto não deve transformar qualquer ruído em "arroto lendário" só para não
decepcionar.

Se não houver material suficiente para análise:

**NÃO PEGUEI UM ARROTO AÍ.**

Ação:

**TENTAR DE NOVO**

Mensagem pode variar, mas precisa deixar claro o motivo funcional.

---

# 13. Origem

Depois da captura/análise necessária, pedir a origem de forma rápida.

Preferência: sheet/seleção compacta, não formulário.

MVP1:

- cerveja;
- refrigerante;
- comida;
- puxando ar;
- outro.

Exemplo de título:

**ISSO VEIO DE ONDE?**

Um toque seleciona.

O Auê nunca deve fingir que detectou automaticamente a origem se quem informou
foi a pessoa.

---

# 14. Análise

A análise é um pequeno momento teatral.

Pode mostrar frases como:

**JULGANDO O ESTRAGO...**

ou

**CALMA. ISSO PRECISA SER AVALIADO.**

Não inventar barra falsa de 37%, 61%, 89% se não existe progresso real. Se a
animação for decorativa, ela não deve parecer telemetria precisa.

O suspense deve durar o necessário para percepção, não para segurar a pessoa à
força.

---

# 15. Resultado — tela mais importante

Prioridade visual:

1. nota;
2. classificação;
3. frase do juiz;
4. principais métricas;
5. desafiar;
6. compartilhar/tentar novamente.

Exemplo:

```text
SEU AUÊ

91,4

MONSTRO DO ESGOTO

Profundidade  96
Potência      88
Duração       86
Textura       91

Tecnicamente impressionante.
Socialmente indefensável.

DESAFIAR

Compartilhar    Tentar de novo
```

Não usar um card separado para cada métrica se quatro linhas resolvem.

---

# 16. Métricas

Métricas ajudam a justificar a nota e tornam o resultado mais interessante.

Elas não podem competir com o score principal.

Preferência:

```text
Profundidade      96
████████████████░

Potência          88
██████████████░░░
```

Sem alegar unidade científica que o motor não mede.

---

# 17. Classificações e copy

Classificações podem ser absurdas. Esse é o produto.

A voz obedece a
[`produto/VOZ_E_PERSONALIDADE.md`](./produto/VOZ_E_PERSONALIDADE.md).

Princípios:

- zoar o arroto, não a pessoa;
- resultado alto pode ser épico;
- resultado baixo pode ser humilhante para o **arroto**;
- a frase precisa continuar compreensível;
- erro nunca recebe piada que esconda o que deu errado.

---

# 18. Compartilhamento

O compartilhamento precisa ser fácil porque ele não é detalhe: é aquisição.

Oferecer, conforme suporte:

- WhatsApp;
- X;
- Telegram;
- Web Share nativo;
- copiar link.

Não exigir SDK de rede social para o MVP1 quando um link/share sheet resolve.

O preview deve destacar:

- Auê Score;
- classificação;
- nome/nick quando houver;
- marca;
- provocação;
- link da batalha quando aplicável.

---

# 19. Criar batalha

No resultado, **DESAFIAR** deve ser um dos caminhos mais fortes.

Ao criar:

1. backend confirma a batalha;
2. link `/b/CODIGO` é retornado;
3. tela mostra ação de compartilhar;
4. não declarar "desafio criado" se a RPC falhou.

A pessoa não precisa entender sala, lobby, servidor ou matchmaking.

Ela precisa entender:

> manda isso para alguém e vê se ele bate sua nota.

---

# 20. Batalha recebida

Quando alguém abre `/b/CODIGO`, a página precisa responder imediatamente:

- quem/qual resultado abriu a provocação;
- quais tentativas já existem;
- qual é o placar atual;
- o que eu faço agora.

CTA principal:

**RESPONDER** / **ARROTAR AGORA**

Sem cadastro obrigatório.

---

# 21. Ouvir os arrotos da batalha

O áudio existente faz parte da graça.

A interface deve:

- deixar claro quem fez cada tentativa/nick informado;
- mostrar score junto;
- ter controle explícito de play;
- não tocar tudo automaticamente;
- informar quando áudio não estiver disponível.

Nunca substituir áudio ausente por mock para "a timeline não ficar vazia".

---

# 22. Sequência da batalha

A batalha é uma linha de provocações, não feed social.

Exemplo:

```text
Giam      82,1
Guinho    91,4
Giam      88,7
Marcelo   76,2
Guinho    93,0  👑
```

Depois da tentativa:

- atualiza a sequência;
- mostra posição/placar;
- oferece compartilhar/revanche;
- não empurra pessoa para perfil, feed ou cadastro.

---

# 23. Link expirado

Sessão expirada não é erro genérico.

Exemplo:

**ESSE AUÊ JÁ ERA.**

Secundário:

> A batalha ficou disponível por 7 dias.

CTA:

**FAZER UM NOVO AUÊ**

A expiração precisa vir do backend, não só de relógio visual no cliente.

---

# 24. Disputa local

A disputa local transforma um aparelho em juiz da roda.

MVP1:

- 2 a 5 participantes;
- nick/nome curto;
- 1 a 3 rounds;
- contexto opcional;
- turnos claros;
- placar por round;
- pódio final.

Não pedir conta para cada pessoa. Isso mataria o churrasco antes do primeiro
arroto.

---

# 25. Criar disputa local

Tela compacta:

```text
QUEM VAI PASSAR VERGONHA?

Giam
Guinho
Marcelo
+ adicionar

Rounds: 1   2   3

Contexto: churrasco

COMEÇAR
```

Limites visíveis:

- mínimo 2;
- máximo 5;
- máximo 3 rounds.

Não permitir começar em estado inválido para depois mostrar erro no round 1.

---

# 26. Turno

A tela de turno precisa deixar impossível confundir quem joga.

```text
AGORA É O GUINHO

Round 2 de 3

[ BOLHA ]

ARROTAR
```

Depois da nota:

- mostrar o resultado daquele participante;
- permitir confirmar/seguir;
- ir para o próximo sem navegação confusa.

---

# 27. Placar entre rounds

O placar deve ser rápido e divertido.

Não virar planilha.

Mostrar:

- posição;
- nick;
- melhor nota/critério definido pela regra funcional;
- quem está liderando.

CTA:

**PRÓXIMO ROUND**

---

# 28. Pódio final

Momento de celebração.

Prioridade:

1. campeão;
2. pódio;
3. notas;
4. compartilhar;
5. jogar de novo.

A animação pode ser mais forte aqui porque é fim de sessão.

---

# 29. Banner da disputa

O resultado compartilhável precisa funcionar fora do Auê.

Conteúdo mínimo:

- marca;
- nome da disputa/contexto quando houver;
- campeão;
- posições;
- notas;
- convite curto para abrir o Auê.

Evitar colocar informação demais até o banner virar print de Excel neon.

---

# 30. Desktop

No MVP1, desktop é **landing**, não prioridade de gameplay.

Objetivos:

- explicar o produto;
- permitir indexação;
- mostrar como funciona;
- levar para o celular;
- disponibilizar privacidade/termos.

Hero sugerido:

**O JOGO QUE JULGA SEU ARROTO.**

> Grave, receba uma nota e desafie seus amigos.

CTA/ponte:

- QR Code;
- abrir no celular;
- instrução simples de instalação PWA quando fizer sentido.

Não mostrar dashboard social desativado para preencher espaço.

---

# 31. SEO e conteúdo da landing

A landing precisa ter texto real indexável, sem virar artigo de 4 mil palavras
antes do CTA.

Blocos possíveis:

- o que é o Auê;
- como funciona a nota;
- como funciona a batalha;
- disputa local;
- FAQ;
- privacidade/termos.

SEO não justifica criar páginas finas repetindo "arroto" cinquenta vezes.

---

# 32. Privacidade e termos

Devem existir em páginas públicas e também ser acessíveis no mobile de forma
discreta.

Não esconder política porque ela "estraga o visual".

Ao mesmo tempo, não criar um modal gigante obrigatório só para parecer
compliance se a regra legal não exigir aquele formato.

Privacidade precisa ser clara especialmente sobre:

- microfone;
- upload do áudio;
- quem acessa batalha por link;
- validade da sessão;
- retenção/exclusão do arquivo.

O destino do áudio após 7 dias ainda é decisão pendente e não deve receber copy
enganosa antes de ser resolvido.

---

# 33. Erros

Todo erro precisa ter três coisas:

1. o que aconteceu;
2. se algo foi ou não salvo/enviado;
3. o próximo passo possível.

Exemplo ruim:

> Ops! Algo inesperado aconteceu.

Exemplo melhor:

> Deu ruim no envio. Sua nota apareceu, mas a batalha não foi criada.
>
> **TENTAR DE NOVO**

Humor não pode esconder perda de dado.

---

# 34. Estados obrigatórios

Para cada fluxo assíncrono, desenhar no mínimo:

- idle;
- carregando/processando;
- sucesso;
- vazio quando fizer sentido;
- erro recuperável;
- erro sem recuperação imediata;
- offline quando o backend for necessário;
- expirado quando houver validade temporal.

"Depois a gente vê o erro" é como nasce botão que fica girando para sempre.

---

# 35. Acessibilidade

Mesmo sendo um jogo visual e sonoro:

- contraste precisa passar;
- foco de teclado precisa existir onde desktop/web exigir;
- botões precisam ter nome acessível;
- estado não pode depender só de cor;
- motion reduzido precisa ser respeitado;
- score/métricas precisam existir como texto, não só animação;
- áudio precisa ter controle explícito;
- mensagens importantes não podem existir apenas em toast de 1 segundo.

O Auê pode ser ogro. A interface não precisa ser hostil.

---

# 36. Navegação do MVP1

Evitar navegação permanente cheia de destinos futuros.

O MVP1 precisa principalmente de:

- jogar/arrotar;
- batalha recebida por link;
- disputa local, quando habilitada;
- acesso discreto a informações/privacidade.

Feed, ranking, perfil e ligas ficam fora da navegação enquanto as flags estiverem
desligadas.

---

# 37. O que fica no protótipo completo, mas não no MVP1

Pode continuar desenhado para preservar visão:

- feed público;
- comunidades;
- seguidores;
- perfil social;
- login;
- ranking global;
- XP;
- níveis;
- conquistas;
- ligas/campeonatos online;
- notificações;
- Auê+;
- assinatura;
- personalidades avançadas do juiz.

Essas telas devem ser tratadas como **roadmap/protótipo**, não como backlog
implícito.

---

# 38. Dois índices de protótipo

Quando o projeto de protótipos suportar os dois recortes:

- `index.html` — visão completa/futura;
- `index-mvp1.html` — apenas o lançamento.

Os dois podem compartilhar componentes e design system.

Não duplicar cinquenta telas só para separar escopo.

O índice completo não tem autoridade sobre o contrato do MVP1.

---

# 39. Definition of Done de UX

Uma jornada não está pronta porque o Figma ficou bonito ou porque o componente
renderizou.

Validar em telefone real:

## Individual

```text
abrir
→ tocar em arrotar
→ permitir microfone
→ gravar
→ informar origem
→ receber nota
→ compartilhar
```

## Batalha

```text
grava
→ cria link
→ manda para outro aparelho
→ outro aparelho abre
→ ouve
→ responde
→ placar atualiza
→ revanche
```

## Disputa local

```text
cria
→ adiciona pessoas
→ escolhe rounds
→ executa turnos
→ vê pódio
→ compartilha
```

Também validar:

- microfone negado;
- gravação vazia;
- falha de upload;
- link inválido;
- link expirado;
- reload durante estado importante;
- toque repetido;
- viewport pequeno;
- Safari iOS;
- Chrome Android;
- reduced motion.

---

# 40. Regra final

Quando existir dúvida entre "mais completo" e "mais rápido para brincar", o
MVP1 escolhe **mais rápido para brincar**, desde que segurança, privacidade e
integridade não sejam sacrificadas.

O Auê precisa dar vontade de mandar o link para um amigo antes de dar vontade de
abrir Configurações.
