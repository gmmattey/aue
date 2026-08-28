# Design do Auê

Tudo que é referência visual do jogo mora aqui — e **só o que está aqui tem
autoridade**.

## Direção artística

[`AUÊ!.md`](AUÊ!.md) é o Art Bible recebido em 27 de agosto de 2026. Ele
consolida a linguagem visual: preto carvão, branco quebrado, verde ácido, ouro
para vitória, vermelho para falha real, Bolha como personagem sem rosto,
áudio-reatividade, motion com função, tipografia de impacto, composição mobile
de 360–430px e regras de reduced motion.

Ele orienta a execução, mas não cria estados nem substitui as fontes canônicas:
o protótipo decide geometria e comportamento; o design system decide tokens e
componentes; `docs/jogo/ARENA.md` decide a máquina de estados.

A imagem de telas recebida junto com o Art Bible é uma prancha visual: mostra
variações de tentativa, X1, Roda e estados especiais. É referência de composição
e hierarquia, não uma lista adicional de rotas ou estados.

## As duas fontes canônicas de design

```text
docs/design/prototipo-arena/arena.html          comportamento e geometria
docs/design/design-system/system/DESIGN.md      token, nome, regra e intenção
```

Quando as duas divergirem entre si: o protótipo decide como a coisa se comporta
e onde ela fica; o design system decide o nome do token, o valor e a intenção.

Qualquer outro protótipo, especificação, deck, landing ou kit de marketing que
contradiga esses dois arquivos é **resíduo** — não é legado, não é referência
futura e não deve ser portado.

### ⚠️ Uma exceção, e ela é do produto

Os dois arquivos acima **afirmam ser a única fonte canônica de UX/UI**. No que
toca à **máquina de estados da Arena, não são.**

**Quem decide quais estados existem é
[`../jogo/ARENA.md`](../jogo/ARENA.md)** — dez estados, com os nomes de lá.
Protótipo, design system, handoff e export **não criam, não renomeiam e não
removem estado**. Eles decidem como cada estado se parece, se move e mede.

Isso é decisão de produto, registrada na precedência em
[`AGENTS.md`](../../AGENTS.md) §2.

Consequências diretas nesta entrega:

- os 19–20 estados descritos no handoff e no `DESIGN.md` §12 **não são a
  máquina**; a máquina é a da `ARENA.md`;
- **`AD_BREAK` está fora** — não é estado, não é momento, e ninguém desenha nada
  que dependa dele. O próprio design system concorda (§12.4 e §20), e
  monetização está fora do escopo
  ([`../escopo/ESCOPO_ATUAL.md`](../escopo/ESCOPO_ATUAL.md) §3);
- **`ORIGIN` continua sendo um estado.** O handoff afirma que nada acontece
  entre o arroto e a nota; nesse ponto ele não vale.

## O protótipo

```text
prototipo-arena/
├── arena.html            o protótipo canônico da Arena
├── manifest.json         manifesto do protótipo
├── DESIGN-HANDOFF.md     regras de implementação e o que não fazer
│                         (a lista de estados dele NÃO vale — ver acima)
└── DESIGN-MANIFEST.json  metadados da exportação
```

Abra `arena.html` direto no navegador. Roda sozinho, sem build e sem servidor.

**Não existe outro arquivo de protótipo.** Se um HTML aparecer ao lado do
`arena.html`, é resíduo de exportação antiga e deve ser apagado, não portado.

O protótipo simula microfone e backend. O que ele define é **forma e
comportamento**, não implementação.

### O `DESIGN-HANDOFF.md` desta versão vale

Diferente do handoff genérico das versões anteriores — que mandava fazer uma
rota por arquivo HTML —, este handoff é específico do Auê e **está alinhado com
a decisão do produto**: uma Arena só, com `#arena[data-state]` assumindo 20
valores. Estado não é página nem rota.

Leia ele antes de implementar qualquer estado.

## O design system

```text
design-system/
├── system/                    ← O SISTEMA. É aqui que mora a verdade.
│   ├── DESIGN.md              documento canônico (v4, derivado do arena.html)
│   ├── BRAND-SYSTEM.md        marca
│   ├── guide.md               resumo de cor, tipo e pilares de mensagem
│   ├── variables.css          os tokens em CSS
│   ├── variables.dark.css
│   ├── tokens.default.json    os tokens em JSON
│   ├── tokens.dark.json
│   ├── tokens.compact.json
│   ├── theme.json · seed.json · brand.json
│   ├── index.html · kit.html · kit.dark.html      kit navegável
│   ├── artifacts/             peças de exemplo (deck, email, landing…)
│   ├── assets/                símbolo da Bolha
│   └── scripts/               geração de token e favicon
├── assets/                    símbolo + favicons completos
├── aue-design-system-showcase.html
├── brand.html
├── favicon-set.html
├── site.webmanifest
└── image.png
```

`system/DESIGN.md` é o documento canônico. Os HTMLs são visualização navegável
do mesmo sistema.

## O que foi apagado nesta versão, e por quê

Substituído pelo material desta entrega:

- **`docs/design/DESIGN_SYSTEM.md`** — resumo de tokens da versão anterior,
  escrito à mão. Substituído por `design-system/system/DESIGN.md` e pelos
  arquivos de token, que são gerados e não divergem do protótipo.
- **os ~60 HTMLs antigos de `prototipo-arena/`** e o
  `_backup-antes-v2-tokens/` — descreviam feed, comunidades, campeonatos,
  assinatura, conquistas, ranking, perfil, seguidores, tutorial e configurações,
  que não pertencem ao gameplay atual.
- **`docs/opendesign_prototype/`** — cópia inteira do protótipo antigo.
- **o kit de marca anterior** em `design-system/`.

Não importado do zip do design system, por ser resíduo da ferramenta de
exportação:

- **`context/local-code/`** — uma cópia desatualizada do código deste próprio
  repositório. Reimportar isso sobrescreveria `src/`, `supabase/` e
  `package.json` com uma versão velha.
- **`context/input-DESIGN.md`** e os arquivos da raiz do zip (`DESIGN.md`,
  `guide.md`, `brand.json`, `DESIGN-MANIFEST.json`) — camada antiga do export,
  superada pelos equivalentes em `system/`.
- **`DESIGN-HANDOFF.md` da raiz do zip** — handoff genérico da ferramenta.
  Manda começar por `context/local-code/aue/index.html` e tratar os arquivos
  exportados como contrato de pixel. Contradiz a decisão do produto.

Os zips originais das duas entregas ficam em [`fontes/`](fontes/) por
procedência.

## Relacionados

- **O que o jogo é:** [`../jogo/VISAO.md`](../jogo/VISAO.md)
- **Os estados escritos:** [`../jogo/ARENA.md`](../jogo/ARENA.md)
- **A voz:** [`../jogo/VOZ.md`](../jogo/VOZ.md)
- **O escopo:** [`../escopo/ESCOPO_ATUAL.md`](../escopo/ESCOPO_ATUAL.md)
- **Quem desenha:** [`AGENTS.md`](../../AGENTS.md) §3 — design, UX, UI e copy
  são do Giam
