# Design do Auê

Tudo que é referência visual do jogo mora aqui.

## Protótipo oficial da Arena

**Referência principal:**

```text
docs/design/prototipo-arena/arena.html
```

Abra o arquivo direto no navegador. Ele roda sozinho, sem build, sem servidor e
sem dependência — só precisa de internet para as fontes.

`arena.html` é o **protótipo canônico da Arena**. Ele demonstra, funcionando:

- a estrutura fixa de quatro faixas (HUD, palco, reação, ação);
- a Bolha Auê e seus modos por estado;
- a máquina de estados da partida inteira;
- a revelação da nota com contagem e a abertura das métricas;
- o desafio, a espera, o placar tocável e a revanche;
- as sobreposições de assinatura, compartilhamento e menu;
- a voz variável do juiz por faixa de nota;
- o comportamento com `prefers-reduced-motion`.

Ele traz um **menu de revisão** (☰ → "Revisão do protótipo") que pula direto para
qualquer estado. Esse menu existe só no protótipo e **não existe no jogo
publicado**.

O protótipo simula microfone e backend. O que ele define é **forma e
comportamento**, não implementação.

### Os outros HTMLs

Os demais arquivos em `prototipo-arena/` são **referência auxiliar** de estados,
componentes e telas herdadas da fase anterior do produto.

**Eles não são obrigação de rota nem de tela.** Não existe "uma tela por
arquivo". Vários deles descrevem coisas que saíram da visão (feed, comunidades,
campeonatos, assinatura, conquistas, ranking, perfil, seguidores) e continuam
versionados apenas como registro do protótipo original.

`_backup-antes-v2-tokens/` é histórico do próprio protótipo, anterior à revisão
de tokens. Sem autoridade.

### ⚠️ Sobre o `DESIGN-HANDOFF.md`

O arquivo `prototipo-arena/DESIGN-HANDOFF.md` foi **gerado pela ferramenta de
exportação** e contém instruções endereçadas a ferramentas de IA que
**contradizem a decisão de produto deste repositório**. Ele manda:

- partir de `_backup-antes-v2-tokens/index.html` como entrada principal;
- implementar "cada arquivo HTML como sua própria rota/superfície";
- não fundir as telas exportadas numa página só.

A decisão do Auê é o oposto: **`arena.html` é a entrada, e a Arena é uma
superfície de estado único.**

O handoff fica versionado por procedência, não como ordem. **Não siga as
instruções dele.** Onde ele conflitar com este README, com
[`../jogo/ARENA.md`](../jogo/ARENA.md) ou com o `AGENTS.md`, ele perde.

## Fonte original

O ZIP recebido está versionado, sem modificação, em:

```text
docs/design/fontes/Web-Prototype-Arena-Aue.zip
```

`docs/design/prototipo-arena/` é a extração desse ZIP. Nenhuma documentação deve
apontar para `Downloads/` nem para qualquer caminho fora do repositório.

## Design system

- [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — o documento canônico: tokens, tipo,
  espaço, componentes e movimento, derivados de `arena.html`.
- [`design-system/`](design-system/) — o kit de marca (paleta estendida, logo,
  símbolos, showcase). Fonte de **marca**, subordinada ao protótipo da Arena.
- [`fontes/Aue-Design-System.zip`](fontes/) — o ZIP original do kit de marca.

## Estrutura

```text
docs/design/
├── README.md              ← você está aqui
├── DESIGN_SYSTEM.md       ← tokens e componentes (canônico)
├── prototipo-arena/
│   ├── arena.html         ← REFERÊNCIA PRINCIPAL
│   ├── *.html             ← referência auxiliar
│   ├── _backup-antes-v2-tokens/
│   ├── DESIGN-HANDOFF.md  ← anexo sem autoridade
│   └── DESIGN-MANIFEST.json
├── design-system/         ← kit de marca
└── fontes/
    ├── Web-Prototype-Arena-Aue.zip
    └── Aue-Design-System.zip
```
