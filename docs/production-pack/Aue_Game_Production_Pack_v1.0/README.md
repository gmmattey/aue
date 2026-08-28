# Auê! — Game Production Pack v1.0

Pacote de documentação para desenvolvimento, teste, evolução e lançamento do **Auê!**.

**Data de consolidação:** 27 de agosto de 2026  
**Produto:** Auê!  
**Categoria:** jogo mobile casual competitivo  
**Estratégia:** web-first, mobile-first, mesma base de jogo empacotável via Capacitor  
**Frase de produto:** **Arrote. Receba a nota. Humilhe seus amigos.**

## Para que este pacote existe

O objetivo é permitir que uma pessoa, agente de IA, designer ou desenvolvedor entenda o Auê sem transformar o produto em outra coisa no caminho.

Este pacote consolida quatro perguntas:

1. **O que estamos construindo?** — GDD.
2. **Como isso deve parecer e reagir?** — Art Bible + Motion/Game Feel.
3. **Como isso funciona por dentro?** — TDD + Audio Bible.
4. **Como sabemos se está bom e se alguém quer jogar?** — QA + Telemetria + Aquisição.

## Ordem recomendada de leitura

1. `00_DOCUMENT_AUTHORITY.md`
2. `01_design/01_GDD.md`
3. `01_design/02_ART_BIBLE.md`
4. `01_design/03_MOTION_GAME_FEEL.md`
5. `02_technical/04_TDD.md`
6. `02_technical/05_AUDIO_BIBLE.md`
7. `03_quality/06_QA_TEST_PLAN.md`
8. `04_growth/07_TELEMETRIA_METRICAS.md`
9. `04_growth/08_AQUISICAO_CONTENT_BIBLE.md`
10. `05_production/09_RELEASE_DEFINITION_OF_DONE.md`
11. `05_production/10_ROADMAP_PRODUCAO.md`

## Regra de ouro

Este pacote é uma **consolidação de produção**. Quando existir conflito com o repositório em execução, vale a seguinte ordem:

1. código e migrações que realmente rodam;
2. ADRs aceitos;
3. `docs/escopo/ESCOPO_ATUAL.md`;
4. `docs/jogo/ARENA.md` para estados;
5. `docs/jogo/REGRAS.md` para gameplay;
6. protótipo e Design System canônicos para geometria/tokens;
7. este pacote como consolidação e guia operacional.

Se o código estiver certo e o documento estiver velho, o documento deve ser corrigido. Não se adapta o jogo a uma mentira escrita.

## Não é roadmap escondido

Este pacote **não ressuscita**:

- feed;
- seguidores;
- perfil social;
- ranking global;
- XP e níveis;
- conquistas;
- temporadas;
- campeonatos;
- assinatura;
- push;
- mensagens privadas;
- marketplace;
- rede social de arrotos.

Código velho, tabela velha ou documento arquivado não é autorização de produto.

## Conteúdo do ZIP

```text
Aue_Game_Production_Pack_v1.0/
├── README.md
├── 00_DOCUMENT_AUTHORITY.md
├── 01_design/
│   ├── 01_GDD.md
│   ├── 02_ART_BIBLE.md
│   └── 03_MOTION_GAME_FEEL.md
├── 02_technical/
│   ├── 04_TDD.md
│   └── 05_AUDIO_BIBLE.md
├── 03_quality/
│   └── 06_QA_TEST_PLAN.md
├── 04_growth/
│   ├── 07_TELEMETRIA_METRICAS.md
│   └── 08_AQUISICAO_CONTENT_BIBLE.md
├── 05_production/
│   ├── 09_RELEASE_DEFINITION_OF_DONE.md
│   └── 10_ROADMAP_PRODUCAO.md
└── references/
    └── telas-do-jogo-conceito.png
```

## North Star

**Arrotos que geram outro arroto.**

Uma visita não é o objetivo. Uma nota isolada não é o objetivo. O ciclo ganha vida quando um resultado provoca outra pessoa a jogar.
