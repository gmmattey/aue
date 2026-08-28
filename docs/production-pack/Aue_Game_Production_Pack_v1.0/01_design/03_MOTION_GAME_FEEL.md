# Auê! — Motion & Game Feel Specification

## 1. Objetivo

Transformar ações do jogador em resposta corporal imediata. O game feel nasce da sincronização entre toque, microfone, Bolha, score, som e haptic.

## 2. Princípios

1. **Resposta antes da lógica terminar.** Botão cede no toque, não depois da RPC.
2. **Um movimento principal por momento.** Evitar cinco animações concorrendo.
3. **Animação comunica estado.** Se não explica o que aconteceu, cortar.
4. **Payoff tem preparação.** Score não aparece seco.
5. **Reduced motion mantém regra.** Movimento nunca é a única fonte de informação.

## 3. Orçamento de movimento

Por estado:

- 1 movimento principal;
- 1 movimento de suporte;
- 1 evento de impacto quando necessário.

Exemplo em RECORDING:

- principal: deformação da Bolha;
- suporte: timer;
- impacto: snap ao terminar.

## 4. Curvas e sensação

Não fixar uma biblioteca obrigatória, mas preservar intenção:

- toque: rápido e físico;
- entrada de estado: curta;
- julgamento: desacelera;
- revelação: ease-out com impacto inicial;
- derrota: cede;
- vitória: expande;
- revanche: ritual rítmico.

## 5. IDLE

Bolha respira de forma imperfeita e lenta. Não usar loop mecânico perfeitamente periódico.

Amplitude baixa. Movimento quase subconsciente.

## 6. Toque em ARROTAR

Sequência alvo:

1. `pointerdown`: CTA cede imediatamente (`translateY`/scale sutil);
2. permissão já disponível: anel de accent expande;
3. Bolha assume modo de escuta;
4. HUD perde presença;
5. envelope de áudio começa a dirigir deformação.

Anel aproximado: ~720ms, uma única expansão.

## 7. RECORDING

### Envelope

Usar energia RMS por frame suavizada.

Objetivo: resposta expressiva sem jitter.

Conceito:

```text
energia bruta → attack rápido → release mais lento → drive da Bolha
```

Attack deve permitir sentir um arroto súbito. Release não pode deixar a forma tremendo como osciloscópio.

### Limites

Silêncio nunca zera completamente a vida. Arroto forte aumenta amplitude, não transforma Bolha em estrela.

## 8. Finalização

Ao `JÁ FOI` ou timeout:

- parar captura;
- `snap`: compressão rápida + retorno parcial;
- duração alvo ~460ms;
- nenhum CTA concorrendo durante a conferida curta.

## 9. Validação

Se houver pequena espera local, usar micro-batidas corporais discretas, não spinner de progresso.

Se rejeitado:

- shake ~340ms;
- Bolha estabiliza;
- copy e ação aparecem.

## 10. ORIGIN

Bolha “segura” o áudio, comprimida. Escolha de origem reage no toque, sem botão de confirmar.

## 11. JUDGING

- HUD some;
- Bolha contrai;
- palco fica mais silencioso visualmente;
- movimento desacelera;
- sem barra percentual;
- sem loading industrial.

A duração precisa ser percebida como suspense curto, não espera técnica.

## 12. RESULT — revelação

Sequência:

1. pausa mínima;
2. Bolha abre;
3. score aparece com `pop` (~560ms);
4. score conta em ease-out (~900ms quando houver contagem);
5. reação entra;
6. métricas aparecem em cascata curta;
7. ações surgem por último.

Repetições/revanche podem reduzir teatro para preservar ritmo.

## 13. Score alto

Intensidade pode escalar sem alterar estrutura.

95–99:

- pop um pouco maior;
- haptic mais forte quando disponível;
- linhas de impacto muito breves.

100:

- pico máximo permitido;
- sem tela exclusiva;
- sem confete infinito.

## 14. VERSUS

Ao abrir desafio recebido:

- rival e alvo precisam dominar;
- player adversário é funcional;
- aceitar X1 inicia o mesmo arco corporal da gravação.

## 15. SCOREBOARD

### Vitória

`winPop` ~620ms, ouro no vencedor. Expansão curta.

### Derrota

`loseSag` ~520ms, pequena queda/cedida. Sem vermelho.

### Empate

Dois lados entram em peso igual, marca `=`. Movimento convergente ~520ms. Nenhum winner effect.

## 16. REMATCH

Contagem `3 → 2 → 1`.

Cada número ocupa o palco e escala com ritmo consistente. Pode haver haptic discreto por pulso e um mais claro na transição para gravação.

## 17. Roda

Passa-o-celular precisa ser legível e resistente a distração.

Após resultado de cada pessoa:

- score permanece até gesto explícito;
- CTA/próximo turno não deve sumir automaticamente;
- nome e round entram com clareza;
- fundo contextual da Roda é estático.

## 18. Haptics

Momentos permitidos:

- início da gravação;
- captura;
- revelação;
- score excepcional;
- vitória;
- pulso da revanche.

Evitar vibrar em hover, métrica, scroll ou toda mudança de estado.

## 19. SFX

Efeitos de UI econômicos porque o arroto é o áudio central.

Possíveis:

- clique grave curto;
- impacto da nota;
- vitória curtíssima;
- pulso de contagem.

Sem trilha contínua obrigatória. Silêncio ajuda o julgamento.

## 20. Reduced motion

Quando `prefers-reduced-motion`:

- Bolha reduz ou para deformação contínua;
- score aparece diretamente ou com fade muito curto;
- contagem continua legível sem zoom agressivo;
- victory/defeat usam cor/peso e não dependem de movimento;
- replay progressivo pode usar passos.

## 21. Performance

Preferir:

- `transform`;
- `opacity`;
- SVG enxuto;
- `requestAnimationFrame` para áudio-reatividade;
- atualização de path controlada;
- evitar layout thrash.

Testar celulares medianos, não apenas desktop forte.

## 22. Teste de game feel

Sem ler copy, um observador deve distinguir:

- repouso;
- gravação;
- julgamento;
- revelação;
- vitória;
- derrota;
- empate.

Se tudo parece a mesma tela trocando texto, o motion falhou.
