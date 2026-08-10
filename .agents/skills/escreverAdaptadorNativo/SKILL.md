---
name: escreverAdaptadorNativo
description: Procedimento do Guinho para código nativo entrar no Aue atrás de uma porta existente, sem virar um segundo jogo.
---

# Skill: escreverAdaptadorNativo

Procedimento do **Guinho** para quando a casca precisa fazer algo que o
navegador não faz — vibrar, folha de compartilhamento do sistema, armazenamento
que o sistema não limpa, ciclo de vida de app.

A regra que decide tudo:

> **Plugin nativo entra atrás de uma porta que já existe, ou não entra.**
> ([ADR 0002](../../../docs/technical/adr/0002-o-aue-nas-lojas.md) §1 e §2)

---

## 1. Antes de escrever, responda uma pergunta

**Existe porta em [`src/portas/`](../../../src/portas/) para isso?**

- **Existe** → é adaptador. Segue esta skill.
- **Não existe** → **pare.** Porta nova significa capacidade nova do jogo, e
  capacidade nova não é empacotamento: é escopo, e volta pro Giam. Criar uma
  porta para justificar um plugin é como o app vira um segundo jogo.

## 2. Onde o código mora

```text
src/plataforma/
├── web/      o produto — continua sendo a implementação que manda
└── nativo/   a casca — só o que o aparelho faz diferente
```

A montagem é em [`src/arena/adaptadores.ts`](../../../src/arena/adaptadores.ts),
que já é função e já recebe tudo por injeção. A Arena não sabe qual metade está
rodando, e **não pode passar a saber**: nada de `if (ehApp)` dentro de tela.

**Adaptador nativo não substitui o web — ele fica ao lado.** Se a implementação
web já resolve dentro da casca, não escreva a nativa. Menos código é melhor
casca.

## 3. A fronteira é testada, não prometida

[`src/arquitetura.fronteira.test.ts`](../../../src/arquitetura.fronteira.test.ts)
reprova o build se qualquer arquivo fora de `src/plataforma/` mencionar
Capacitor. Vale para o `src/` inteiro, inclusive o legado.

Se você precisou importar plugin numa tela, o desenho está errado — não o teste.

## 4. Comportamento igual dos dois lados

A porta é um contrato, e o contrato não muda de significado por plataforma:

- **mesmo tipo de retorno, mesmos casos de erro.** Se a web devolve
  `cancelado` quando a pessoa fecha a folha de compartilhamento, o nativo também
  devolve `cancelado` — não `falhou`;
- **nada de capacidade nova entrando de carona.** Adaptador nativo de
  compartilhamento compartilha; não manda notificação porque "já que estamos
  aqui";
- **falha continua sendo falha.** O jeito mais fácil de mentir é o adaptador
  nativo devolver sucesso porque o plugin não reclamou. Plugin que não reclama
  não é plugin que fez — confira o retorno.

Esse último já custou caro na web: a remoção de áudio devolvia sucesso porque a
resposta vinha vazia em vez de vir com erro. Mesma armadilha, outro andar.

## 5. Recurso sensível tem dono e tem parada

Microfone, stream, áudio, timer:
[`ADR 0001`](../../../docs/technical/adr/0001-arquitetura-oficial-do-aue.md) §4.

No app isso aperta mais que no navegador: o sistema manda o app pro fundo sem
avisar, e **desmontar componente não é garantia de limpeza**. Todo caminho de
saída solta o recurso — inclusive o caminho "o usuário apertou o botão de casa".

Quem traduz isso é a porta de ciclo de vida, não cada tela.

## 6. Antes de abrir o PR

- [ ] a porta já existia, e o contrato dela não mudou
- [ ] o código novo está inteiro dentro de `src/plataforma/nativo/`
- [ ] o teste de fronteira continua verde
- [ ] a web continua funcionando **igual** — o mesmo build roda nos dois lugares
- [ ] o adaptador tem teste da regra que ele carrega, não só do caminho feliz
- [ ] recurso sensível tem parada em todo caminho de saída
- [ ] rodou no aparelho ([`rodarNoIphone`](../rodarNoIphone/SKILL.md)), e o que
      não rodou está escrito como não rodado

## Relacionados

- **A decisão das lojas:** [`docs/technical/adr/0002-o-aue-nas-lojas.md`](../../../docs/technical/adr/0002-o-aue-nas-lojas.md)
- **As camadas e a fronteira:** [`docs/technical/adr/0001-arquitetura-oficial-do-aue.md`](../../../docs/technical/adr/0001-arquitetura-oficial-do-aue.md) §2
- **Instalar e testar no aparelho:** [`rodarNoIphone`](../rodarNoIphone/SKILL.md)
- **Teste junto com a implementação:** [`escreverTestes`](../escreverTestes/SKILL.md)
- **Coesão e acoplamento:** [`validarModularidade`](../validarModularidade/SKILL.md)
