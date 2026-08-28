# Auê! — Audio Bible

O áudio no Auê é simultaneamente **controle, conteúdo, prova e matéria-prima do score**.

## 1. Objetivos

1. capturar arrotos de forma consistente em celulares diferentes;
2. dar feedback imediato sem mentir precisão física;
3. validar se há arroto antes de pontuar;
4. preservar reprodução do áudio associado à nota correta;
5. proteger privacidade e recursos do aparelho.

## 2. Papéis do áudio

### Entrada

O jogador joga com o microfone.

### Feedback

O envelope de energia dirige a Bolha.

### Julgamento

Características acústicas alimentam score.

### Prova

No X1/placar, o áudio associado à nota pode ser ouvido.

## 3. Permissão

Solicitar microfone somente após gesto explícito de **ARROTAR**.

Enquanto o sistema mostra o diálogo, a Arena não deve fingir que já está gravando.

Negou → estado de erro com instrução concreta.

## 4. Captura

- `getUserMedia` ou adaptador nativo equivalente;
- MediaRecorder sem forçar MIME incompatível;
- cronômetro visível;
- teto de duração;
- parada manual e automática convergem para o mesmo cleanup.

## 5. Cleanup

Invariante absoluto:

```text
para cada track em stream: track.stop()
fechar/suspender contexts conforme implementação
cancelar timers/RAF
remover listeners
```

Microfone que continua ativo depois do estado é bug crítico.

## 6. Nível visual

A Bolha usa energia relativa, não dB SPL calibrado.

Não rotular intensidade visual como medição física de decibéis.

Pipeline recomendado:

```text
AnalyserNode / PCM
↓
RMS por janela
↓
normalização visual
↓
attack/release
↓
Bolha.drive
```

## 7. Trecho ativo

Score deve ignorar espera antes/depois do arroto.

Base vigente usa janelas curtas e tolerância a pequenos buracos para manter um evento contínuo.

Objetivo de design: medir o evento, não a demora para apertar botão.

## 8. YAMNet

Modelo oficial armazenado/servido pelo produto.

- inferência no aparelho;
- áudio não enviado ao provedor do modelo;
- classe de arroto validada por teste;
- limiar vigente 0,20 documentado com lote real;
- decisão usa máximo ao longo dos frames, não média.

## 9. Fallback do detector

Distinção obrigatória:

- **recusou de verdade:** “não é arroto”;
- **detector indisponível:** seguir fallback definido, sem fingir que o modelo recusou.

Falha técnica e veredito são coisas diferentes.

## 10. Métricas acústicas

### Fôlego

Duração do trecho ativo.

### Força

RMS do trecho ativo. Não chamar de volume físico calibrado.

### Grave

Razão de energia abaixo de 150 Hz em relação ao total analisado.

### Textura

Compatibilidade técnica, peso zero no score atual.

## 11. Normalização

Não aplicar processamento que altere score silenciosamente entre plataformas.

Qualquer mudança de:

- ganho;
- compressão;
- filtro;
- resampling;
- janela;
- threshold;

que afete regra deve ser versionada/testada.

## 12. Resampling

YAMNet espera áudio compatível com seu contrato (16 kHz mono no pipeline vigente). Decodificação/reamostragem devem produzir o mesmo significado entre navegadores.

## 13. Reprodução

Reprodução deve:

- depender de gesto quando a plataforma exigir;
- nunca tocar automaticamente de forma surpreendente;
- impedir gravação simultânea quando iOS/plataforma tornar isso problemático;
- usar o áudio da tentativa que corresponde exatamente à nota exibida.

## 14. X1

Antes de responder, o convidado deve conseguir ouvir o arroto que o desafiou.

No placar, cada linha reproduz seu próprio áudio.

Não reutilizar “último áudio do jogador” se a nota exibida pertence a outra tentativa.

## 15. Roda

O celular está passando entre pessoas.

Requisitos:

- aviso claro de que áudio será gravado;
- turno explícito;
- score permanece até gesto de avançar;
- melhor tentativa guarda seu áudio correspondente.

## 16. Storage

Upload só quando o fluxo exige persistência/compartilhamento entre aparelhos.

- bucket privado;
- MIME validado;
- tamanho limitado;
- URL assinada;
- caminho ligado ao resultado.

## 17. Retenção e exclusão

Regra atual:

- expiração do link ≠ exclusão do arquivo;
- não há expurgo automático;
- autor pode apagar próprio áudio;
- denúncia pode ocultar.

Copy e política precisam dizer a verdade.

## 18. SFX

O arroto já é protagonista. SFX devem ser curtos e secos.

Permitidos:

- toque;
- captura;
- impacto do score;
- vitória;
- contagem.

Evitar trilha contínua obrigatória e efeitos que mascaram o arroto.

## 19. Haptic + áudio

Quando houver haptic, sincronizar com eventos visuais/sonoros relevantes, não com cada microinteração.

## 20. Casos de teste acústico

Biblioteca de QA deve incluir:

- silêncio;
- fala masculina/feminina;
- sopro;
- tosse;
- riso;
- música;
- TV;
- arroto curto;
- arroto longo;
- arroto grave;
- arroto fraco;
- arroto com fala imediatamente depois;
- ambiente barulhento;
- microfone distante;
- microfone saturado.

## 21. Dispositivos

Validar pelo menos:

- Safari iPhone;
- Chrome Android;
- app Android Capacitor;
- app iOS por cabo quando escopo permitir.

Diferentes aparelhos aplicam AGC, noise suppression e codecs distintos. A régua deve ser robusta a isso, não fingir laboratório universal.

## 22. Telemetria de áudio

Pode registrar eventos funcionais como:

- captura iniciou;
- captura terminou;
- detector indisponível;
- não é arroto;
- análise falhou.

Não registrar:

- áudio em telemetria;
- PCM;
- transcrição;
- espectro identificável;
- conteúdo falado.

## 23. Critério de qualidade

O jogador precisa acreditar em três coisas:

1. o jogo está ouvindo;
2. a nota veio daquele arroto;
3. o áudio que o rival ouve é a prova daquele resultado.

Se qualquer uma dessas três crenças quebra, o jogo perde legitimidade.
