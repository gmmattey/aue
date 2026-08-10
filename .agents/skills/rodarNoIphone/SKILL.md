---
name: rodarNoIphone
description: Procedimento do Guinho para construir, assinar e instalar a casca iOS do Aue num iPhone de verdade, com os portoes que travam o caminho.
---

# Skill: rodarNoIphone

Procedimento do **Guinho** para pôr o Auê rodando **dentro do app**, num iPhone
de verdade.

O que decide se a casca funciona não é o build — é o microfone, o áudio e o
ciclo de vida no aparelho. Simulador não prova arroto.

Autoridade: [ADR 0002](../../../docs/technical/adr/0002-o-aue-nas-lojas.md).

---

## 1. Antes de qualquer coisa: o build é outro

A casca **não** usa o build da web. Usa o modo `casca`:

```bash
npm run casca:ios
```

Isso é `build:casca` (mesmo código, sem service worker) mais o `cap sync`. As
duas metades importam:

- **sem service worker** porque dentro do app os arquivos já vieram pela loja, e
  um cache por cima só serve para o app continuar servindo a versão velha;
- **`cap sync` copia o `dist/`**, então sincronizar sem construir antes empacota
  a versão anterior e ninguém avisa.

O modo existe em vez de uma variável na linha de comando porque `VITE_X=1 vite
build` não funciona no Windows, e o Android se desenvolve no Windows
([ADR 0002](../../../docs/technical/adr/0002-o-aue-nas-lojas.md) §7).

**Sem as chaves do Supabase no `.env.local`, o app abre na tela de "não está
configurado".** Ela é honesta e é o comportamento certo — mas quem esquece disso
passa meia hora achando que a casca quebrou.

## 2. Os portões da máquina, na ordem em que eles aparecem

Todos já morderam. Quase todos exigem a mão do dono do Mac, porque pedem senha.

| Sintoma | O que é | Quem resolve |
|---|---|---|
| Qualquer comando `git` responde "you have not agreed to the Xcode license" | licença do Xcode nunca aceita — e nesta máquina o `git` passa por ela | dono do Mac: `sudo xcodebuild -license accept` |
| "Found no destinations" / "iOS 26.5 is not installed" | Xcode instalado, plataforma iOS não baixada (~8 GB) | `xcodebuild -downloadPlatform iOS` |
| "Signing for App requires a development team" | nenhuma conta Apple registrada no Xcode | dono do Mac: Xcode → Settings → Accounts → **+** |
| "Developer Mode disabled" | trava do iOS 16+ no aparelho | dono do aparelho: Ajustes → Privacidade e Segurança → Modo de Desenvolvedor, e **reinicia** |
| `errSecInternalComponent` no `codesign` | o chaveiro recusou a chave para um processo sem tela | rodar uma vez pelo Xcode (▶) e responder **Sempre Permitir** |
| "Invalid trust settings ... restore system default" | alguém mexeu na confiança do certificado no chaveiro | Acesso às Chaves → aba **Certificados** → o certificado → Confiar → **Usar Padrões do Sistema** |
| O app instala e não abre | conta gratuita: o aparelho ainda não confia no desenvolvedor | Ajustes → Geral → VPN e Gerenciamento de Dispositivo → Confiar |

**Não mande o dono do Mac mexer em "Chaves" quando o problema é "Certificados".**
Isso já quebrou a assinatura uma vez e custou uma ida e volta.

## 3. O caminho que funciona

Simulador (não serve para microfone, serve para ver a tela):

```bash
xcrun simctl boot <udid>
xcodebuild -scheme App -destination 'platform=iOS Simulator,id=<udid>' -configuration Debug -derivedDataPath /tmp/aue-dd CODE_SIGNING_ALLOWED=NO build
xcrun simctl install <udid> /tmp/aue-dd/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch <udid> com.auegames.aue
xcrun simctl io <udid> screenshot /tmp/tela.png
```

iPhone de verdade, com o aparelho **plugado e desbloqueado**:

```bash
xcrun devicectl list devices
xcodebuild -scheme App -destination 'id=<device-id>' -configuration Debug -derivedDataPath /tmp/aue-dev -allowProvisioningUpdates build
xcrun devicectl device install app --device <device-id> /tmp/aue-dev/Build/Products/Debug-iphoneos/App.app
```

Duas coisas que economizam tempo:

- **a primeira captura de tela sempre parece quebrada.** O webview leva alguns
  segundos; tirar foto cedo mostra preto e manda todo mundo caçar bug que não
  existe. Espere e tire de novo antes de acusar;
- **o painel de simulador integrado pode recusar** dizendo que o Xcode não está
  selecionado quando ele está. Nesse caso vá de `xcrun simctl` e **avise que foi
  por ali** — trocar de ferramenta em silêncio é o começo de um relatório falso.

## 4. O time de assinatura não vai para o repositório

O `DEVELOPMENT_TEAM` fica **fora** do controle de versão: o repositório é
público e o time é conta pessoal. Quem clonar escolhe o time uma vez no Xcode.

Se aparecer no `git status` depois de um build, é ruído de máquina — não commite.

## 5. O que só o aparelho responde

Build verde não é entrega. No iPhone, com o jogo na mão:

- [ ] o loop inteiro: arrotar, o juiz recusar o que não é arroto, receber a
      nota, criar o desafio, abrir o link no segundo aparelho, responder, placar
      e revanche
- [ ] o iPhone pede o microfone **uma vez**, no toque, com o texto do
      `Info.plist`
- [ ] **mandar o app pro fundo solta o microfone** — conferido pelo indicador do
      próprio sistema, não por leitura de código
      ([ADR 0001](../../../docs/technical/adr/0001-arquitetura-oficial-do-aue.md) §4)
- [ ] voltar do fundo não deixa gravação órfã nem timer rodando
- [ ] com o silencioso ligado, o resultado continua legível
- [ ] o link do desafio criado dentro do app aponta para o endereço público, não
      para o endereço interno da casca
- [ ] retrato travado, e nada encostando na faixa do gesto

O que não foi testado **vai escrito como não testado**
([`AGENTS.md`](../../../AGENTS.md) §5.4). "Compilou" não é uma dessas linhas.

## 6. O que esta skill não autoriza

- publicar em loja, TestFlight ou produção aberta — exige ADR novo
  ([ADR 0002](../../../docs/technical/adr/0002-o-aue-nas-lojas.md) §1);
- plugin novo que não sirva a uma porta existente — ver
  [`escreverAdaptadorNativo`](../escreverAdaptadorNativo/SKILL.md);
- tela, regra ou feature que só existe no app.

## Relacionados

- **A decisão das lojas:** [`docs/technical/adr/0002-o-aue-nas-lojas.md`](../../../docs/technical/adr/0002-o-aue-nas-lojas.md)
- **Código nativo atrás da porta:** [`escreverAdaptadorNativo`](../escreverAdaptadorNativo/SKILL.md)
- **O mesmo jogo no navegador:** [`garantirMobileReal`](../garantirMobileReal/SKILL.md)
- **Auditoria final:** [`auditarSegurancaETestes`](../auditarSegurancaETestes/SKILL.md)
