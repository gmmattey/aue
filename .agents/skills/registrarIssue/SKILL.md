---
name: registrarIssue
description: Como o Aue escreve issue, PR e commit — linguagem de primo registrando o que precisa ser feito, sem corporativismo.
---

# Skill: registrarIssue

Issue, PR e commit do Auê são **primos anotando o que precisa ser feito**. Não
são documento de banco, não são ticket de service desk, não são história de
sprint.

Quem abre issue normalmente é o **Giam** (é ele quem planeja e prioriza). PR e
commit são do **Guinho**. A voz é a mesma pros três.

Tudo aqui passa obrigatoriamente pela
[`matarCheiroDeIA`](../matarCheiroDeIA/SKILL.md).

A fonte da voz é [`docs/jogo/VOZ.md`](../../../docs/jogo/VOZ.md) — inclusive a
seção "Como escrever uma issue com a voz certa", que esta skill executa.

---

## 1. O formato da issue

### Título

Frase de gente, em PT-BR, minúscula depois da primeira palavra. Diz a parada,
não o épico.

> ❌ "Implementação de mecanismo de tratamento de falhas no fluxo de desafio"
>
> ✅ "quando o desafio não sobe, o jogo tá mentindo que subiu"

### Corpo

```markdown
## Qual é a parada

A situação, contada como alguém do grupo contaria. O que tá acontecendo hoje,
ou o que não existe ainda.

## Tem que bater assim

A sensação e o comportamento esperado. Sem virar manual.

## No protótipo

Onde isso aparece funcionando: arquivo e estado.

## Não viaja

No que isso NÃO pode virar. Escreve mesmo. É o que segura o escopo.

## Tá pronto quando

A lista que o Giam vai conferir no aceite. Cada linha tem que ser conferível.
```

Critério técnico, API, segurança e detalhe de execução entram **onde forem
necessários pra fazer** — não dominam a história da issue.

## 2. O que não entra em issue

- "Como usuário, eu quero… para que…"
- "Critérios de aceitação" (aqui é "Tá pronto quando")
- "Definition of Done", "entregável", "stakeholder", "impacto no negócio"
- estimativa em pontos, t-shirt size, prioridade P0/P1/P2 corporativa
- seção de "contexto" que repete o título com mais palavras
- emoji abrindo cada bullet

## 3. Exemplo

> **quando o desafio não sobe, o jogo tá mentindo que subiu**
>
> **Qual é a parada**
>
> Cara arrota, chama o parceiro no x1, o app mostra o link bonitinho e manda
> compartilhar. Só que se a internet caiu na hora de salvar, o desafio nem
> existe. O outro abre o link e não tem nada. Vira o cara de mentiroso no grupo.
>
> **Tem que bater assim**
>
> O link só aparece depois que o desafio existe de verdade. Se não subiu, fala
> na cara: deu ruim, não foi criado, tenta de novo. E o botão de tentar de novo
> tem que estar ali, não escondido.
>
> **No protótipo**
>
> `arena.html`, estado `CHALLENGE`. O erro segue o padrão do `ERROR`.
>
> **Não viaja**
>
> Isso não é pra virar fila de retry automática, nem histórico de desafios que
> falharam, nem notificação. É só parar de mentir.
>
> **Tá pronto quando**
>
> - com a rede desligada, o link não aparece em momento nenhum;
> - a mensagem de erro diz que o desafio não foi criado;
> - dá pra tentar de novo sem sair do estado;
> - funciona no Safari do iPhone e no Chrome do Android.

## 4. Commit

PT-BR, proporcional ao diff, `tipo(escopo): o que mudou`.

O título diz o que mudou. O corpo diz por que, se não for óbvio. Não vira
redação.

```text
fix(desafio): só mostra o link depois que o desafio existe

Se o salvamento falhava, a tela mostrava o link mesmo assim e o parceiro
abria em nada. Agora o erro aparece e dá pra tentar de novo.
```

## 5. PR

Mesma voz. O corpo do PR carrega, além da história:

- o relatório de qualidade do Marcelinho
  ([`AGENTS.md`](../../../AGENTS.md) §5.4), separando o que foi verificado
  automaticamente, por leitura, em celular real, e o que **não** foi;
- o aceite do Giam ([`AGENTS.md`](../../../AGENTS.md) §5.5).

Essas duas partes podem ser secas e diretas. Relatório não é lugar de piada, e
também não é lugar de enfeite.

## 6. Antes de publicar

- [ ] o título é frase de gente?
- [ ] tem "Não viaja" escrito?
- [ ] o "Tá pronto quando" é conferível linha por linha?
- [ ] passou na [`matarCheiroDeIA`](../matarCheiroDeIA/SKILL.md)?
- [ ] passou no **Teste de Guinho**
      ([`docs/jogo/VOZ.md`](../../../docs/jogo/VOZ.md))?

## Relacionados

- **A voz:** [`docs/jogo/VOZ.md`](../../../docs/jogo/VOZ.md)
- **Sem cheiro de IA:** [`matarCheiroDeIA`](../matarCheiroDeIA/SKILL.md)
- **O plano que vira issue:** [`arquitetarModulo`](../arquitetarModulo/SKILL.md)
- **Falar com o primo:** [`conversarComOPrimo`](../conversarComOPrimo/SKILL.md)
