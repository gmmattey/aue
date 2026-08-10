---
name: regrasDoAndroid
description: O que o Camillo trouxe do SignallQ sobre Android real — permissao, fabricante que mata app em segundo plano, nivel de API e o que a Play cobra. Consultar antes de encostar na casca de Android.
---

# Skill: regrasDoAndroid

O que o **Camillo** aprendeu apanhando de Android de verdade desde o Linka, e
que vale para o Auê.

**Isto é conhecimento de plataforma, não procedimento.** O passo a passo de
construir, assinar e subir a casca de Android nasce quando a máquina Windows
rodar isso pela primeira vez — escrever antes seria inventar.

> **O que NÃO veio junto, de propósito:** as regras de tela nativa em Kotlin e
> Compose, e as de diagnóstico de rede, que são o produto de lá. Aqui o Android
> é o **mesmo site dentro de uma casca**
> ([ADR 0002](../../../docs/technical/adr/0002-o-aue-nas-lojas.md)). Trazer
> regra de Compose seria convite para tela nativa, que é justamente o que o ADR
> proíbe.

---

## 1. Permissão: o Auê pede uma só, e ela é o jogo inteiro

`RECORD_AUDIO`. Sem ela não existe arroto, nota, desafio, nada.

O que o SignallQ aprendeu e vale igual aqui:

- **pedir no gesto, nunca no boot.** Permissão pedida na abertura é negada por
  reflexo — a pessoa nem leu. O Auê pede no toque em ARROTAR, que é quando o
  pedido faz sentido sozinho;
- **negar não pode virar tela morta.** Tem que existir caminho de volta e uma
  frase que explique o que foi perdido. O estado de erro já existe na Arena;
- **negou duas vezes, o Android para de perguntar.** A partir daí o pedido não
  abre mais diálogo nenhum, e o app precisa mandar a pessoa para os ajustes do
  sistema — sem isso ela fica presa achando que o jogo quebrou;
- **toda permissão pedida tem que estar declarada.** Pedir o que não foi
  declarado falha em silêncio.

Dentro de uma casca, quem pede é o webview — mas quem **autoriza** é o sistema,
e a declaração é do app. As duas metades precisam bater.

## 2. Fabricante que mata app em segundo plano

Este é o ponto onde o Android castiga mais que o iPhone, e é o que decide se a
regra do microfone se sustenta
([ADR 0001](../../../docs/technical/adr/0001-arquitetura-oficial-do-aue.md) §4).

- **Samsung em economia extrema de bateria** pausa trabalho de segundo plano de
  um jeito fora do padrão: simplesmente não dispara, sem erro, sem log, sem
  callback. No SignallQ isso deixou monitoramento mudo por horas e ninguém viu;
- **MIUI (Xiaomi)** é agressivo com segundo plano e derruba callback de sistema
  no meio;
- **Motorola** é o mais próximo do Android puro — menos surpresa.

O que isso significa para o Auê, que é um jogo e não um serviço: **não confie no
app continuar vivo quando sai da frente.** Sair da tela solta o microfone na
hora, por decisão nossa, e não porque o sistema vai avisar — porque ele não
avisa.

## 3. Nível de API e aparelho velho

- o aparelho barato é o que acha bug: pouca memória, processador que engasga,
  sistema antigo sem as APIs novas;
- **API disponível é sempre com guarda.** Chamar coisa nova em aparelho velho
  quebra na mão do usuário, não na sua;
- aparelho de topo serve para conferir que o caminho feliz está bonito. Aparelho
  de entrada serve para descobrir o que quebra.

Matriz mínima de teste, herdada do SignallQ e adaptada:

| Aparelho | Serve para |
|---|---|
| Motorola de entrada (linha G) | sistema antigo, pouca memória, microfone ruim |
| Samsung recente | economia de bateria agressiva, app morto em segundo plano |
| Qualquer um com Android puro | o comportamento de referência |

## 4. O que a Play cobra por causa do microfone

- **permissão sensível tem justificativa.** Gravação de áudio entra no
  formulário de segurança de dados, e a resposta precisa bater com o que o app
  faz de verdade — no Auê: grava, julga, envia, e quem gravou pode apagar;
- **a política de privacidade tem que existir e estar linkada.** Já existe
  (`/privacidade`);
- **classificação etária** é declaração, e declaração errada volta.

Nada disso é código. Tudo isso trava envio, e é a parte que sempre pega quem
achou que era só apertar um botão no fim.

## 5. O que essa skill não cobre

- construir, assinar e subir a casca — nasce quando a máquina Windows rodar;
- Compose, Kotlin, ktlint — não escrevemos tela nativa aqui;
- serviço em segundo plano, localização, Wi-Fi, DNS — é o produto de lá, não
  este.

## Relacionados

- **A decisão das lojas:** [`docs/technical/adr/0002-o-aue-nas-lojas.md`](../../../docs/technical/adr/0002-o-aue-nas-lojas.md)
- **Código nativo atrás da porta:** [`escreverAdaptadorNativo`](../escreverAdaptadorNativo/SKILL.md)
- **O mesmo cuidado do lado do iPhone:** [`rodarNoIphone`](../rodarNoIphone/SKILL.md)
- **O jogo no navegador do celular:** [`garantirMobileReal`](../garantirMobileReal/SKILL.md)
