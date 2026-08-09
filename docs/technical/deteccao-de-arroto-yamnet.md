# Detecção de arroto — o juiz que ouve antes de dar nota

**Estado:** Implementado e ligado (sem flag).
**Feature:** #19 — O juiz, sem caô, sem nota tirada do cu.
**Escopo:** decide se a gravação **contém arroto**. Não mexe na fórmula da nota.

---

## O que mudou no fluxo

Antes, qualquer gravação com som virava nota. Falar "aaaaah" perto do microfone
dava número, classificação e lugar na batalha.

Agora existe uma porta entre gravar e pontuar:

```
gravar
  → analyzeAudio (RMS, grave, textura, duração)   [engine.ts, inalterado]
      ↳ silêncio? -> TelaSemSom, e o juiz nem roda
  → julgarSeEhArroto (YAMNet)                      [juiz/, novo]
      ↳ não é arroto? -> TelaNaoEhArroto, e acabou
  → tela de julgamento (origem) -> RPC -> nota
```

A **fórmula não foi tocada**. `rules.ts`, os quatro limites de normalização, os
pesos e o espelho em SQL (`public.aue_score_v1`) estão exatamente como estavam.
O que a #19 entregou aqui é uma condição de entrada, não uma régua nova.

## O modelo

YAMNet oficial do Google, sem alteração nenhuma, servido do nosso próprio
domínio. Procedência, contrato do grafo e receita de troca de versão:
[`public/modelos/yamnet/PROCEDENCIA.md`](../../public/modelos/yamnet/PROCEDENCIA.md).

**A classe existe, e foi conferida no modelo que usamos:**

```
53,/m/03q5_w,"Burping, eructation"
```

Índice 53 das 521 classes do AudioSet. Isso não é confiança de quem escreveu —
[`classesDoYamnet.test.ts`](../../src/features/audio/juiz/classesDoYamnet.test.ts)
lê o `yamnet_class_map.csv` publicado junto dos pesos e falha se a linha 53
deixar de ser o arroto. É o teste mais importante do conjunto: o índice é a
única amarra entre o app e o modelo, e quando ela quebra **não dá erro** — a
inferência continua rodando e o juiz passa a decidir com a pontuação de outra
classe qualquer.

## O áudio não sai do aparelho

Isto é requisito, não detalhe de implementação:

- os pesos são servidos por `/modelos/yamnet/`, ou seja, pelo nosso domínio;
- a inferência roda no navegador de quem gravou, via WebGL (ou CPU);
- **não existe requisição que leve o áudio para fora.** Nem Google, nem Kaggle,
  nem Supabase, nem endpoint nosso. O único tráfego é o download dos pesos, no
  sentido contrário, e uma vez por aparelho.

O upload do áudio para o Storage continua acontecendo depois, como sempre
aconteceu, e continua governado pelo aviso de privacidade da tela — o juiz não
mudou nada nisso, nos dois sentidos.

## O limiar: 0,20 — e por que este número tem direito de existir

O GATE da #19 é duro com número escolhido no olho, e com razão: as medições
mostraram que RMS, razão de grave e ZCR **não separam** fala de arroto — "a
razão de grave varia de 0,067 a 0,502 num degradê contínuo, sem dois grupos".

Com o YAMNet a história é outra.

**Medição de 2026-08-09.** 43 clipes reais do banco de arroto local (que fica
fora deste repositório de propósito — é áudio de gente) mais os 2 clipes de
demonstração publicados pelo próprio Google. Métrica: **o maior score da classe
53 entre os quadros do clipe**.

| Grupo | n | Distribuição do máximo |
|---|---|---|
| Passaram alto | 40 | 0,7609 · 0,9131 · 0,9426 · 0,9485 · 0,9934 · **36 acima de 0,99** |
| Ficaram no chão | 5 | 0,0224 · 0,00007 · 0,00004 · 0,00000 · 0,00000 |

**Não existe nada entre 0,0224 e 0,7609.** Não é degradê: são dois grupos com um
vão de mais de trinta vezes no meio. É essa separação que autoriza um limiar.

**De que lado errar.** O GATE também diz: "recusar o arroto de quem arrotou de
verdade é pior do que dar nota para uma conversa". Por isso 0,20 e não o meio do
vão (0,39):

- fica **~9× acima** do maior falso positivo medido (0,0224);
- fica **~3,8× abaixo** do arroto mais fraco medido (0,7609).

Um arroto teria que pontuar quatro vezes menos que o pior do lote inteiro para
ser recusado.

[`vereditoDeArroto.test.ts`](../../src/features/audio/juiz/vereditoDeArroto.test.ts)
trava a constante **dentro** do vão medido e **na metade de baixo** dele. Mudar
o limiar exige mudar também os números de medição — e isso aparece na revisão de
PR, ao contrário de um `0.2` virando `0.6` sozinho.

### Achado do lote: três "arrotos" que são fala

Três arquivos nomeados `Arroto (N).m4a` são os que ficaram no chão. O YAMNet os
classifica como **Speech** com 0,816, 0,923 e 0,970.

O `MANIFESTO.md` do banco reclamava justamente da falta de exemplos negativos —
"o lote não tem um único caso garantidamente negativo hoje". Tinha três, com o
nome errado. Eles não foram descartados: são os únicos negativos reais que o
lote tem, e são eles que fixam o piso do vão.

### Máximo, e não média

A decisão usa `max` sobre os quadros. Um arroto dura cerca de um segundo; a
gravação vai até dez. A média mistura o arroto com o silêncio antes e o
"caralho" depois, e afunda conforme a pessoa demora para tocar em PARAR — no
lote há um clipe de 11,6 s com o arroto cravando 1,0 num quadro e **média 0,29**.
Média mediria paciência, não arroto.

## Falhar sem quebrar o jogo

O detector é uma trava contra dar nota para conversa. Ele **não** é uma
dependência nova da qual gravar um arroto passa a depender.

| Situação | Veredito | O que a pessoa vê |
|---|---|---|
| O modelo ouviu e não achou arroto | `nao-e-arroto` | `TelaNaoEhArroto` — e não vira nota |
| Modelo não baixou (404, rede, metrô) | `indisponivel` | nada; o fluxo segue como antes da #19 |
| WebGL caiu | cai para CPU; se o CPU também falhar, `indisponivel` | nada |
| Navegador sem Web Audio | `indisponivel` | nada |
| Saída com forma inesperada ou `NaN` | `indisponivel` | nada |

`julgarSeEhArroto` **nunca lança**. A assimetria é deliberada e está travada em
teste: só o veredito de quem *olhou e recusou* fecha a porta. Um app de arroto
não pode deixar de funcionar porque um arquivo de 16 MB não chegou.

O caminho de falha loga em `console.error` — em produção, essa é a única pista.

## Custo

Medido em navegador real (Chromium desktop, WebGL), com os clipes do lote:

| | |
|---|---|
| Primeira gravação da sessão (baixar o modelo + compilar shaders) | ~1,2 s em rede local |
| Decodificar e reamostrar para 16 kHz | 2–9 ms |
| Inferência, já aquecido | 33–75 ms |
| Inferência no CPU (a rede de segurança) | 1,6–2,1 s |
| Download dos pesos | 16 MB, uma vez por aparelho |

Os 16 MB **não entram no bundle nem no precache do PWA** — se entrassem, toda
primeira visita pagaria por eles só para ver a bolha, e a maioria das visitas
nem grava. Eles são baixados na primeira vez que alguém termina uma gravação e
ficam no cache de runtime `aue-modelos` (ver `vite.config.ts`). O tfjs também é
carregado sob demanda, por `import()` dinâmico dentro de `julgarSeEhArroto`.

**O custo honesto é o primeiro arroto num 4G ruim:** 16 MB antes do veredito.
Se isso doer em aparelho real, o caminho é quantizar os pesos para uint16
(metade do tamanho, perda desprezível) — não é mexer no limiar.

## Os arquivos

| Arquivo | Responsabilidade |
|---|---|
| `juiz/julgarSeEhArroto.ts` | a porta de saída do diretório: Blob → veredito, e nunca lança |
| `juiz/ondaDe16k.ts` | decodifica e converte para mono 16 kHz (quem reamostra é o navegador) |
| `juiz/yamnet.ts` | **o único módulo do `src/` que importa TensorFlow**: carrega, executa, cai para CPU |
| `juiz/vereditoDeArroto.ts` | puro: o limiar, o `max` e a assimetria do fail-open |
| `juiz/classesDoYamnet.ts` | o índice 53 e o que ele significa |
| `fluxo/TelaNaoEhArroto.tsx` | a tela da recusa |

A divisão segue o motivo de sempre neste repositório: os três passos falham por
motivos diferentes e se testam de jeitos diferentes. `vereditoDeArroto` é puro e
testa o limiar sem carregar 16 MB; `yamnet` concentra o recurso caro com ciclo
de vida, como `useGravacao` faz com o microfone.

## O que isto NÃO faz

- **não detecta a origem.** O §3.4 do contrato é explícito: origem é informada
  pela pessoa, e o sistema não deve fingir detectá-la. O YAMNet sabe dizer que
  houve arroto, não que veio de cerveja;
- **não mede qualidade.** A confiança de 0,98 não é nota. Quem dá nota continua
  sendo `rules.ts` e a RPC;
- **não roda no servidor.** A RPC `enviar_resultado` continua aceitando o que
  chega. Quem burlar o cliente continua conseguindo enviar — a trava é de
  produto, não de segurança. Fechar isso exigiria inferência no servidor, com o
  áudio saindo do aparelho, que é exatamente o que a #25 não quer;
- **não é infalível.** O modelo erra. Foi por isso que a recusa tem tom de "não
  achei arroto" e não de "você tentou me enganar", e por isso o limiar erra para
  o lado de deixar passar.

## Se for preciso recalibrar

1. junte áudio novo **gravado dentro do app** (webm/mp4), que é o que o
   MANIFESTO do banco já pedia — o lote atual é WhatsApp e celular;
2. meça o `max` da classe 53 por clipe, com o modelo que está em `public/`;
3. veja se os dois grupos continuam separados e onde ficou o vão;
4. só então mexa em `LIMIAR_DE_ARROTO`, e atualize junto
   `MAIOR_FALSO_POSITIVO_MEDIDO`, `MENOR_ARROTO_MEDIDO` e esta tabela.

Sem medição nova, mexer no limiar é o mesmo chute que o GATE proíbe — só que
agora com um modelo do Google na frente para dar respeitabilidade a ele.
