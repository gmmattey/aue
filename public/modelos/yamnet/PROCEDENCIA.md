# YAMNet — de onde vieram estes arquivos

Modelo oficial do Google, versionado aqui **sem nenhuma alteração**.

| | |
|---|---|
| Modelo | `google/yamnet`, formato TensorFlow.js, versão `1` |
| Origem dos pesos | `https://www.kaggle.com/api/v1/models/google/yamnet/tfJs/tfjs/1/download` |
| Origem do mapa de classes | [`tensorflow/models`](https://github.com/tensorflow/models/blob/master/research/audioset/yamnet/yamnet_class_map.csv) — `research/audioset/yamnet/yamnet_class_map.csv` |
| Código de referência | `research/audioset/yamnet` no mesmo repositório |
| Licença | Apache 2.0 |
| Baixado em | 2026-08-09 |

## Os arquivos

```
model.json               100 KB   grafo + manifesto dos pesos
group1-shard1of4.bin       4 MB
group1-shard2of4.bin       4 MB
group1-shard3of4.bin       4 MB
group1-shard4of4.bin     3,3 MB
yamnet_class_map.csv      14 KB   as 521 classes, em ordem
```

Total: **16 MB**. Nenhum deles entra no bundle nem no precache do PWA — ver
`vite.config.ts`. Eles são baixados sob demanda, na primeira vez que alguém
termina uma gravação, e ficam no cache `aue-modelos` depois disso.

## Contrato do grafo

```
entrada   waveform    float32 [-1]      onda MONO, 16 kHz, amplitude -1..1
saída     Identity    float32 [N, 521]  sigmoide por classe, por quadro
          Identity_1  float32 [N, 1024] embeddings        (não usamos)
          Identity_2  float32 [N, 64]   espectrograma     (não usamos)
```

Cada quadro cobre 0,96 s, com passo de 0,48 s. O grafo preenche entrada curta
sozinho — mesmo com zero amostra ele devolve um quadro, verificado.

**As 521 saídas não são softmax.** São sigmoides independentes e não somam 1.

## Por que os pesos moram aqui, e não num CDN

1. **O áudio não sai do aparelho.** Servindo do nosso domínio, a única
   requisição envolvida é o download dos pesos — no sentido contrário ao do
   áudio. Não existe caminho pelo qual a gravação de alguém chegue à Google, à
   Kaggle ou a qualquer outro lugar.
2. **`tfhub.dev` morreu.** Era o endereço canônico dos modelos TFJS e hoje
   responde 404; o `storage.googleapis.com/tfhub-tfjs-modules/...` responde 403.
   Depender de um terceiro que já quebrou uma vez é depender de ele quebrar de
   novo.
3. **CSP.** Buscar peso de outro domínio exigiria abrir `connect-src` para ele.

## Como trocar de versão

1. baixe o bundle novo e substitua os cinco arquivos;
2. baixe o `yamnet_class_map.csv` **da mesma versão** — se a ontologia mudar,
   `src/features/audio/juiz/classesDoYamnet.test.ts` falha, e é para isso que
   ele existe;
3. rode `npm run test`. O índice 53 é a única amarra entre o app e o modelo, e
   ela é silenciosa quando quebra: a inferência continua rodando e o juiz passa
   a julgar arroto pela pontuação de outra classe;
4. remeça o limiar. Ver `docs/technical/deteccao-de-arroto-yamnet.md`.
