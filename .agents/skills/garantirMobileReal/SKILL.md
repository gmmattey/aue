---
name: garantirMobileReal
description: Procedimento do Guinho para o Aue funcionar em Safari iOS e Chrome Android de verdade, como webapp, sem implementar nativo.
---

# Skill: garantirMobileReal

Procedimento do **Guinho** para o Auê funcionar **no celular de verdade** —
Safari no iPhone e Chrome no Android — e para não fechar a porta de um app
nativo depois.

> ## ESTA SKILL É A WEB. A CASCA TEM AS DELAS.
>
> Até o [ADR 0002](../../../docs/technical/adr/0002-o-aue-nas-lojas.md) aqui
> estava escrito que nativo não se implementava. **Isso caiu**: o Capacitor
> entrou, e `ESCOPO_ATUAL.md` §2.13 hoje fala em empacotar, não em preparar.
>
> O que **não** mudou é o que esta skill cobre: o jogo no **navegador do
> celular** — Safari no iPhone, Chrome no Android, PWA. É o produto
> ([ADR 0001](../../../docs/technical/adr/0001-arquitetura-oficial-do-aue.md) §3),
> e continua sendo por onde o link abre sem instalar nada.
>
> Para o app: [`rodarNoIphone`](../rodarNoIphone/SKILL.md) e
> [`escreverAdaptadorNativo`](../escreverAdaptadorNativo/SKILL.md).

---

## 1. Celular real é alvo de validação, não "quando der"

[`ESCOPO_ATUAL.md`](../../../docs/escopo/ESCOPO_ATUAL.md) §2.12. Safari iOS e
Chrome Android entram na validação de toda mudança que toca a jornada.

Emulador de navegador **não conta** para microfone, áudio, share e safe area.

## 2. Layout que não quebra no celular

- **`svh`, não `vh`.** O `vh` do Safari conta a barra que recolhe e a tela pula.
  A Arena usa `min-height: 100dvh/100svh`.
- **`viewport-fit=cover` + `env(safe-area-inset-*)`.** A barra de ação não pode
  cair na faixa do gesto do iPhone.
- **Altura curta.** Abaixo de 720px o palco encolhe e os espaços apertam — a
  zona de reação continua cabendo **sem rolagem**.
- **Alvo de toque 44px**, CTA principal 56px.
- **Nada depende de hover.** Hover não existe no dedo.
- **Nada depende de teclado físico.** Atalho é bônus, nunca único caminho.
- **Zoom não quebra.** Não desabilite zoom pra "arrumar" layout.

## 3. Microfone e áudio — onde o celular castiga

Este é o pedaço que mais quebra e mais engana em desktop.

- **Permissão pedida uma vez só**, no gesto do jogador, nunca no carregamento.
- **Permissão negada tem estado próprio** e caminho de volta. Não pode virar
  tela morta.
- **Áudio no iOS só desbloqueia com gesto do usuário.** O primeiro som sai de um
  toque real, não de um `useEffect`.
- **Ciclo de vida explícito.** Stream, `AudioContext`, timer e player têm dono e
  têm parada. Sair do estado desliga o microfone — e o jogador vê que desligou.
- **Ligação, chamada, tela bloqueada, trocar de aba.** O que acontece com a
  gravação? Tem que estar decidido, não descoberto.
- **Modo silencioso do iPhone** muda o que sai do alto-falante. O resultado
  precisa ser legível **sem som**.

## 4. PWA

[`ESCOPO_ATUAL.md`](../../../docs/escopo/ESCOPO_ATUAL.md) §2.15: instalável,
com páginas públicas e metadados sociais suficientes pro link render no grupo.

- manifest e ícones válidos nos dois sistemas;
- estado offline existe e conta a verdade — não finge que carregou;
- service worker não pode servir versão velha depois de publicar;
- o link compartilhado abre e mostra preview no WhatsApp.

## 5. O que a web precisa continuar entregando pra casca

Era "não fechar a porta". A porta abriu — e o que garantia isso continua
valendo, agora como manutenção e não como preparação:

- **motor de áudio e motor de score separados da tela** — a regra não mora no
  componente;
- **nada dependente de desktop** — sem atalho obrigatório, sem janela múltipla,
  sem arquivo local;
- **a Arena é empacotável** — uma superfície, sem depender de URL bonita;
- nada de API que só existe em navegador desktop no caminho crítico.

Foi isso que fez a casca ser troca de adaptador em vez de reescrita. Quebrar
qualquer um destes hoje quebra o app junto, e o teste de fronteira não pega
tudo.

## 6. Checklist de aparelho real

Antes de dizer que funciona:

**iPhone / Safari**

- [ ] abre sem a tela pulando quando a barra recolhe
- [ ] a barra de ação não encosta no gesto de home
- [ ] pede microfone uma vez, no toque
- [ ] o primeiro áudio toca (desbloqueio por gesto)
- [ ] com o silencioso ligado, o resultado continua legível
- [ ] compartilhar abre a folha nativa e o link tem preview
- [ ] volta pro jogo depois de trocar de app sem perder estado ou travar o mic

**Android / Chrome**

- [ ] mesmo roteiro acima
- [ ] botão voltar do sistema não joga o jogador pra fora do meio da partida
- [ ] instala como PWA e abre igual

**Os dois**

- [ ] rede ruim: o jogo fala a verdade em vez de rodar pra sempre
- [ ] rede desligada: erro tratado, sem promessa falsa
- [ ] `prefers-reduced-motion` ligado: informação completa, movimento cortado

O que não foi testado **vai escrito como não testado** no relatório
([`AGENTS.md`](../../../AGENTS.md) §5.4).

## Relacionados

- **Escopo mobile:** [`docs/escopo/ESCOPO_ATUAL.md`](../../../docs/escopo/ESCOPO_ATUAL.md) §2.12 e §2.13
- **Medidas e tokens:** [`docs/design/design-system/system/DESIGN.md`](../../../docs/design/design-system/system/DESIGN.md)
- **Construir componente:** [`criarComponenteUI`](../criarComponenteUI/SKILL.md)
- **Auditoria final:** [`auditarSegurancaETestes`](../auditarSegurancaETestes/SKILL.md)
