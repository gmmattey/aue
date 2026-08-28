# Auê! — QA & Game Test Plan

## 1. Objetivo

Garantir duas coisas diferentes:

1. **o jogo funciona**;
2. **o jogo é divertido e compreensível.**

Teste automatizado cobre regra. Aparelho real cobre a experiência que o teste de unidade não vê.

## 2. Severidade

### P0 — bloqueia release

- microfone continua ativo indevidamente;
- score oficial pode ser forjado pelo cliente;
- áudio de outra pessoa é exposto sem autorização;
- batalha privada é enumerável/listável;
- crash/loop sem saída no caminho principal;
- perda silenciosa de resultado confirmado;
- migration quebra produção.

### P1 — bloqueia gameplay

- não consegue gravar em navegador alvo;
- arroto válido não passa de forma recorrente;
- fala recebe score sistematicamente;
- X1 não abre/responde;
- placar mostra áudio errado;
- revanche não preserva disputa;
- Roda perde turno/resultado.

### P2 — qualidade de lançamento

- copy confusa;
- score entra sem impacto;
- layout corta em dispositivo comum;
- share fallback ruim;
- timing inconsistente.

### P3 — polish

- micro desalinhamento;
- variação estética sem impacto funcional.

## 3. Gates automáticos

Obrigatórios antes de merge:

- typecheck;
- lint;
- unit/integration tests;
- build;
- testes de arquitetura;
- paridade score TS/SQL;
- testes de migrations/RLS quando aplicável.

## 4. Matriz de dispositivos

### Web mobile

- iPhone Safari, largura/altura reais;
- Android Chrome;
- pelo menos um Android intermediário;
- modo PWA instalado quando relevante.

### Native shell

- Android Capacitor em aparelho físico;
- iOS por cabo quando aplicável.

### Layouts mínimos

Checar larguras: 360, 390, 430 px.  
Alturas: aproximadamente 640, 720, 844, 932 px.

## 5. Primeiro uso

### Caso A — permissão liberada

1. abrir sem storage prévio;
2. tocar ARROTAR;
3. permitir microfone;
4. confirmar entrada em gravação;
5. parar;
6. validar origem;
7. receber nota.

Esperado: nenhum cadastro/tutorial intermediário.

### Caso B — permissão negada

Esperado:

- nada é gravado;
- Arena não finge captura;
- erro explica como liberar;
- retentativa possível.

## 6. Cleanup do microfone

Executar durante gravação:

- parar manualmente;
- atingir timeout;
- trocar de aba;
- bloquear tela;
- fechar PWA/app;
- provocar erro;
- voltar à Arena.

Esperado: indicador de microfone some e tracks são encerradas.

## 7. Detector

Casos:

| Entrada | Esperado |
|---|---|
| silêncio | sem score |
| fala comum | recusa na maioria consistente |
| sopro | recusa |
| música | não virar score normal |
| arroto real | aceita |
| arroto fraco | preferir aceitar quando dentro da margem planejada |
| modelo indisponível | fallback honesto, sem crash |

## 8. Score

- 0, 1, 19, 20, 39, 40, 59, 60, 74, 75, 84, 85, 94, 95, 99, 100;
- labels corretos nas bordas;
- inteiro exibido;
- `100` cabe visualmente;
- mesma entrada/fórmula produz resultado coerente;
- servidor e cliente em paridade.

## 9. Origem

Testar todas as opções e peso correspondente. Confirmar que “Outro” não vira melhor opção e “Puxei ar” recebe penalidade prevista.

## 10. Resultado

Verificar ordem perceptiva:

1. nota;
2. reação;
3. métricas;
4. ações.

Não aceitar layout que mostre métricas como protagonista.

## 11. Compartilhamento

Cenários:

- Web Share disponível;
- Web Share indisponível;
- `canShare` recusa arquivo;
- usuário cancela folha de share;
- falha ao copiar;
- falha de rede após resultado.

Resultado nunca é perdido só porque share falhou.

## 12. X1 ponta a ponta

Usar dois aparelhos reais.

### Host

1. faz score;
2. cria X1;
3. assina quando necessário;
4. envia link.

### Guest

1. abre link;
2. vê rival e nota;
3. reproduz áudio rival;
4. responde;
5. recebe nota;
6. publica resposta.

### Ambos

1. veem mesmo último round;
2. placar de vitórias é igual;
3. áudios correspondem às notas;
4. revanche cria/fecha novo round corretamente.

## 13. X1 edge cases

- abrir próprio link;
- abrir link expirado;
- rede cai antes da resposta;
- rede cai depois do upload e antes da confirmação;
- reload em CHALLENGE;
- reload em SCOREBOARD;
- empate;
- host tenta responder como guest;
- terceiro tenta entrar como participante;
- 50º round;
- tentativa de 51º round.

## 14. Empate

Nota igual deve:

- não dar vitória;
- não usar ouro;
- não aplicar desempate invisível;
- oferecer revanche.

## 15. Roda

### Mínimo

2 jogadores × 1 round.

### Máximo obrigatório antes de liberar geral

**5 jogadores × 3 rounds em celular real.**

Checar:

- nomes vazios geram `Arrotador N` sem duplicação;
- duplicado digitado é tratado;
- ordem correta;
- round correto;
- nenhum resultado some ao passar celular;
- melhor tentativa preservada;
- áudio da melhor tentativa corresponde à nota;
- empate de pódio `1,2,2,4`;
- quem não jogou não aparece.

## 16. Privacidade

- botão de apagar áudio do autor;
- áudio oculto após denúncia conforme fluxo;
- link expirado não abre batalha;
- UI não diz que arquivo foi apagado se apenas link expirou;
- bucket não está publicamente listável.

## 17. Telemetria

Verificar:

- eventos corretos;
- sem duplicação por rerender;
- origem/campanha preservadas;
- falha da telemetria não afeta jogo;
- payload sem PII/áudio/código sensível.

## 18. Game feel test

Teste de 5 segundos sem explicação:

- usuário entende quando está gravando?;
- percebe que o jogo o ouviu?;
- julgamento parece intencional?;
- nota parece recompensa?;
- percebe quem ganhou?;
- sabe o que fazer depois?

## 19. Teste de novato

Entregar o celular sem ensinar.

Observar:

- tempo até tocar ARROTAR;
- hesitação na permissão;
- necessidade de explicar origem;
- reação à nota;
- ação escolhida no resultado;
- se entende X1 recebido.

Não ajudar até o usuário travar de verdade. Registrar o ponto.

## 20. Teste social

Grupo de 3–5 pessoas presencialmente.

Perguntas de observação:

- alguém espontaneamente quer mostrar a nota?;
- alguém pede para jogar depois de ver outro?;
- há zoeira/revanche sem instrução?;
- passam o aparelho naturalmente?;
- o jogo interrompe a conversa ou entra nela?

## 21. Critério “bom jogo”

Não basta zero bugs. O teste deve encontrar sinais de:

- antecipação antes da nota;
- reação emocional ao score;
- comparação;
- provocação;
- repetição;
- convite a outra pessoa.

Se tudo funciona e ninguém quer mandar outro, há problema de design/produto, não QA técnico.

## 22. Relatório de teste

Cada sessão manual registra:

- build/commit;
- aparelho/SO/navegador;
- fluxo;
- resultado;
- vídeo/screenshot quando útil;
- severidade;
- passos de reprodução;
- esperado × observado.

## 23. Release blocker específico atual

Antes de considerar o jogo pronto para distribuição pública, validar explicitamente:

- hardening Supabase;
- score-alvo visível na resposta de X1;
- Roda 5×3 real;
- assinatura/build de release Android;
- conformidade/loja quando aplicável.
