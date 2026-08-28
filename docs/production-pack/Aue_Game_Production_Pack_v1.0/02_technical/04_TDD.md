# Auê! — Technical Design Document

**Objetivo:** descrever como implementar o jogo sem duplicar regra, vazar APIs de aparelho para a UI ou criar uma segunda arquitetura.

## 1. Arquitetura em uma frase

**Um único código React + TypeScript + Vite, com núcleo puro e portas/adaptadores para aparelho/backend, Supabase como fonte oficial compartilhada e Capacitor como casca do mesmo build.**

## 2. Stack

### Cliente

- React 19;
- TypeScript;
- Vite;
- PWA;
- Web Audio API;
- MediaRecorder;
- Web Share API quando disponível;
- TensorFlow.js + YAMNet.

### Backend

- Supabase Auth anônimo;
- PostgreSQL;
- RLS;
- RPCs/triggers/constraints;
- Supabase Storage.

### Apps

- Capacitor;
- package id: `com.auegames.aue`;
- mesmo build do Vite;
- nenhuma tela/regra nativa exclusiva.

## 3. Camadas

```text
ARENA (React)
  ↓ eventos / estado
NÚCLEO (TS puro)
  ↓ portas
PORTAS (interfaces)
  ↓
ADAPTADORES
  ├── web
  └── nativo
```

### Arena

Desenha os dez estados, dispara intenção, não acessa diretamente microfone, localStorage ou Supabase.

### Núcleo

Regras puras:

- máquina de estados;
- score;
- veredito;
- batalha;
- Roda;
- desempates internos;
- formatação de regras.

Sem React, DOM, `navigator` ou cliente Supabase.

### Portas

Interfaces para:

- captura;
- reprodução;
- compartilhamento;
- armazenamento local;
- ciclo de vida;
- backend;
- haptic quando aplicável.

### Adaptadores

Único lugar onde APIs específicas da plataforma vivem.

## 4. Fronteira dura

APIs como `navigator`, `MediaRecorder`, `getUserMedia`, `AudioContext`, `OfflineAudioContext`, `window`, `document`, `localStorage`, cliente Supabase e `@capacitor/*` não devem aparecer fora da camada de plataforma/adaptadores permitida pela arquitetura atual.

Teste automatizado deve policiar a fronteira.

## 5. Máquina de estados

Estados canônicos:

```text
IDLE
RECORDING
ORIGIN
JUDGING
RESULT
CHALLENGE
VERSUS
SCOREBOARD
REMATCH
ERROR
```

Estados são domínio, não rotas.

URL de batalha hidrata contexto e leva a estado apropriado.

## 6. Boot

Fluxo:

```text
app abre
↓
carrega configuração
↓
recupera/cria sessão anônima Supabase
↓
lê URL/contexto local descartável
↓
consulta batalha quando necessário
↓
hidrata estado da Arena
```

StrictMode não pode criar múltiplas sessões anônimas. Usar inicialização idempotente/promise de módulo.

## 7. Captura

Fluxo:

```text
intenção de gravar
↓
porta CapturaAudio
↓
getUserMedia / adaptador nativo
↓
MediaRecorder
↓
blob + PCM/análise
↓
liberar stream/context
```

### Invariante crítico

**Todo caminho de saída libera MediaStream e AudioContext.**

Inclui:

- parar;
- timeout;
- erro;
- aba escondida;
- navegação/encerramento;
- descarte;
- tentativa inválida.

## 8. MIME

Não forçar `audio/webm` universalmente. O gravador escolhe tipo suportado; Safari pode produzir MP4/AAC.

Persistir/validar MIME real e aceitar formatos previstos pelo fluxo.

## 9. Análise local

Características acústicas e feedback imediato rodam no aparelho.

Pipeline conceitual:

```text
blob
↓
decode
↓
trecho ativo
├── duração
├── RMS/força
├── energia grave
└── dados compatíveis legados
↓
YAMNet (gate)
↓
score provisório/UI
```

## 10. Detector YAMNet

Classe canônica de arroto no modelo atual: índice 53, `Burping, eructation`.

Limiar atual documentado: 0,20 sobre o máximo dos frames.

Assimetria de falha:

- modelo executou e recusou → sem nota;
- modelo indisponível → não derrubar o jogo; seguir política de fallback vigente.

A inferência não envia áudio para Google.

## 11. Score

Cliente calcula rapidamente. Resultado oficial deve ser validado/recalculado no backend através do contrato versionado.

Fórmula v2:

```text
30% fôlego
30% força
30% grave
10% origem
```

Textura permanece com peso zero quando exigida por compatibilidade.

Teste de paridade entre TS e SQL é obrigatório.

## 12. Persistência oficial

Postgres guarda o que:

- atravessa aparelho;
- decide competição;
- precisa sobreviver à sessão;
- exige regra de segurança.

Cliente não escreve score arbitrário.

## 13. Áudio no Storage

- bucket privado;
- upload somente quando necessário ao fluxo;
- caminho ligado ao resultado correto;
- URL assinada curta para reprodução;
- não transformar bucket em público por conveniência.

O link da batalha pode expirar antes do arquivo. Retenção atual não é expurgo automático.

## 14. X1

### Capability URL

Código:

- imprevisível;
- não enumerável;
- sem listagem pública;
- prazo validado server-side;
- não deve vazar em logs/telemetria sem necessidade.

### Round

Backend é autoridade para:

- participantes;
- tentativa de cada lado;
- fechamento do round;
- vitória;
- empate;
- placar acumulado;
- limite de rounds.

UI nunca inventa participante ou vencedor.

## 15. Roda

Lógica de turnos deve ser derivável dos resultados persistidos, não depender apenas de ponteiro local frágil.

Armazenamento local pode guardar identificador da mesa como pista descartável, não placar oficial.

## 16. localStorage

Apenas dados descartáveis e versionados.

Regras:

- chave namespaced `aue.*.vN`;
- acesso protegido por try/catch;
- sem áudio;
- sem segredo;
- sem fonte de verdade competitiva.

## 17. Offline

O Auê não é offline-first.

Service worker pode cachear casca e recursos, mas sem rede não deve fingir:

- score oficial;
- criação de batalha;
- resposta remota;
- sincronização que não existe.

Fila offline/IndexedDB exige ADR novo.

## 18. Compartilhamento

Porta de compartilhamento:

1. `navigator.share` quando suportado;
2. `canShare` quando houver arquivo;
3. fallback honesto para cópia de link/texto.

Falha de share nunca apaga score/batalha já criada.

## 19. Ciclo de vida

Observar `visibilitychange` e `pagehide` no adaptador.

Ao esconder durante gravação:

- parar;
- liberar microfone;
- descartar fragmento quando regra assim exigir;
- retornar ao estado honesto.

Não depender de `beforeunload` no iOS.

## 20. Capacitor

Permitido pelo ADR 0002.

Regras:

- mesma Arena;
- mesmo núcleo;
- plugin atrás de porta existente;
- modelo YAMNet pode viajar como asset local no pacote;
- nada fora de plataforma importa Capacitor;
- web nunca vira versão inferior.

## 21. Segurança

Obrigatório:

- RLS em dado acessível ao cliente;
- `anon`/`authenticated` apenas com permissões necessárias;
- não usar `SECURITY DEFINER` como atalho sem justificativa/revisão;
- upload com limites de tamanho/MIME;
- capability codes não enumeráveis;
- decisões competitivas no servidor;
- telemetria sem abrir leitura pública;
- nenhum botão escondido substitui autorização.

A issue de hardening do Supabase deve ser tratada como risco de lançamento.

## 22. Telemetria

Implementar por porta/serviço simples, best-effort.

Falha de evento não bloqueia gameplay.

Não incluir áudio, PII ou códigos completos de batalha.

## 23. Tratamento de erro

Erro é estado de domínio quando afeta jornada.

Nunca:

- mostrar sucesso sem confirmação;
- perder resultado por falha de share;
- ficar preso em loading infinito;
- culpar o jogador por erro técnico.

## 24. Performance

Metas práticas:

- abrir rápido em mobile;
- YAMNet sob demanda na web e local no app quando empacotado;
- não colocar dependência pesada no primeiro paint sem necessidade;
- áudio-reatividade em `requestAnimationFrame` controlada;
- testes em dispositivos reais medianos.

## 25. Qualidade automática

Antes de merge:

- `typecheck`;
- `lint`;
- `test`;
- `build`;
- testes de arquitetura;
- paridade TS/SQL;
- testes de migration/RLS quando tocados.

## 26. Mudanças que pedem ADR

- stack;
- backend;
- motor gráfico;
- segunda base nativa;
- novo armazenamento local persistente;
- novo modelo de identidade;
- score oficial no cliente;
- bucket público;
- capacidade nativa nova;
- monetização in-app;
- publicação pública quando ainda não autorizada.

## 27. Definition of Done técnico

Uma fatia só está pronta quando:

- fluxo funciona ponta a ponta;
- recurso sensível é liberado;
- erro é real e recuperável;
- regra server-side não é burlável pelo caminho óbvio;
- persistência não duplica efeito;
- mobile real foi testado quando a jornada mudou;
- checks automáticos passam.
