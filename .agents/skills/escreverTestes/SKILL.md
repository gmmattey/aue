---
name: escreverTestes
description: Procedimento do Guinho para escrever testes junto com a implementacao do Aue, cobrindo regra de jogo, estado e recurso sensivel.
---

# Skill: escreverTestes

Procedimento do **Guinho** para escrever teste **junto** com a implementação —
não depois, não "na próxima".

Quem audita a suíte no fim é o Marcelo
([`auditarSegurancaETestes`](../auditarSegurancaETestes/SKILL.md)). Esta skill é
sobre escrever.

Ferramenta: `vitest`. Roda com `npm run test`.

---

## 0. Teste verde não é prova de que funciona

Isso vale antes de tudo. Teste cobre regra. Ele **não** cobre microfone travado
no iPhone, áudio que não desbloqueia, safe area ou permissão negada. Celular
real é [`garantirMobileReal`](../garantirMobileReal/SKILL.md), e não tem
substituto.

## 1. O que sempre tem teste

- **Regra de pontuação** — a conta da nota, as faixas, os limites. Fonte:
  [`docs/jogo/REGRAS.md`](../../../docs/jogo/REGRAS.md).
- **Paridade TypeScript ↔ SQL.** Quando a mesma regra existe nos dois lados, o
  teste de paridade é obrigatório
  ([`ESCOPO_ATUAL.md`](../../../docs/escopo/ESCOPO_ATUAL.md) §2.16). Regra
  crítica duplicada sem teste de paridade é bug esperando data.
- **Máquina de estados da Arena** — transição válida acontece, transição
  inválida não acontece, e nenhum estado fica sem saída.
- **Erro tratado** — a falha produz o estado de erro, não um sucesso silencioso.
- **Ciclo de vida de recurso sensível** — stream, `AudioContext`, timer e player
  param quando devem parar. Vazamento de microfone é falha de privacidade, não
  detalhe.
- **Limite e borda** — nota 0, nota 100, gravação vazia, gravação longa demais,
  nome vazio, link expirado.
- **Resposta vazia do servidor** — e este é o que já escapou. Consulta barrada
  por RLS não devolve erro, devolve vazio; o Storage responde 200 sem ter
  removido nada. Toda operação que promete ter feito alguma coisa precisa de um
  teste com **o servidor respondendo nada**, e o resultado esperado é **falha**.
  Foi assim que o apagar arroto passou meses dizendo que apagou.

## 2. O que não vale a pena testar

- valor exato de token visual (cor, px) — isso é o protótipo que decide;
- texto de copy palavra por palavra, que muda de propósito;
- detalhe interno de implementação que ninguém mais chama;
- mock testando mock.

Teste que quebra toda vez que alguém mexe no CSS não protege nada; só cansa.

## 3. Como escrever

- **Nome em PT-BR, descrevendo comportamento do jogo**, não a função.

  ```ts
  // ❌ it('should return 0 when input is null')
  // ✅ it('dá nota zero quando a gravação vem vazia')
  ```

- **Um comportamento por teste.** Se o nome precisa de "e", são dois testes.
- **Arranja, age, confere.** Sem esperteza no meio.
- **Teste de erro é teste de primeira classe**, não apêndice.
- **Nada de teste que passa sem exercitar nada** — se remover a implementação e
  o teste continuar verde, o teste é decorativo.

## 4. Quando o teste é difícil de escrever

Geralmente não é o teste. É o desenho.

Se pra testar a regra de score você precisa montar um componente React inteiro,
a regra está no lugar errado. Isso é sinal de acoplamento — o mesmo cheiro que a
[`validarModularidade`](../validarModularidade/SKILL.md) caça.

Nesse caso: separa a regra, testa a regra, e a tela chama a regra.

## 5. Antes de abrir PR

- [ ] `npm run test` verde
- [ ] `npm run typecheck` verde
- [ ] `npm run lint` verde
- [ ] `npm run build` verde
- [ ] regra nova tem teste
- [ ] erro novo tem teste
- [ ] recurso sensível novo tem teste de parada
- [ ] o que não deu pra testar automaticamente está **escrito** como não testado

Nenhum merge com qualquer um desses vermelho
([`AGENTS.md`](../../../AGENTS.md) §7).

## Relacionados

- **As regras do jogo:** [`docs/jogo/REGRAS.md`](../../../docs/jogo/REGRAS.md)
- **Auditoria de QA:** [`auditarSegurancaETestes`](../auditarSegurancaETestes/SKILL.md)
- **Acoplamento:** [`validarModularidade`](../validarModularidade/SKILL.md)
- **Celular real:** [`garantirMobileReal`](../garantirMobileReal/SKILL.md)
