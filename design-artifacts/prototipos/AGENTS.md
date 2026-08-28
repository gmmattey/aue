# Auê! — protótipo

Este diretório é o protótipo do Auê!, um app de gravar, pontuar e comparar arrotos. Ele é gerenciado pelo app Open Design (`.open-design/project.json`, `.od-skills/`, arquivos `.artifact.json`); não altere esses metadados manualmente. Pertence ao workspace pessoal gmmattey, cuja raiz é `../../gmmattey/Projetos` e cuja fonte canônica é `../../gmmattey/claude-config`.

## Fonte de verdade

`DECISOES.md`, neste diretório, é a fonte de verdade das decisões de produto. Onde o protótipo ou o hub `index.html` contradisserem o `DECISOES.md`, vale o `DECISOES.md`. Leia-o antes de qualquer alteração, inclusive a seção de lacunas abertas — há decisões pendentes de Luiz que não devem ser tomadas em nome dele. O desenho de backend vive em `../BACKEND-DESENHO.md`.

## Agentes

Os agentes ativos são Rafael, Thiago, Marcelo e Rian; suas definições canônicas estão em `../../gmmattey/claude-config/agentes/`. Leia a definição do agente antes de atuar como ele e respeite seus limites: Rafael prioriza e não implementa; Marcelo cuida de experiência, interface e identidade e não implementa código por padrão; Thiago executa apenas escopo autorizado; Rian revisa de forma independente e não edita o que revisa. Entregas relevantes passam por Rian antes de serem consideradas concluídas.

## Natureza do artefato

É um protótipo de navegação: HTML estático, uma tela por arquivo, sem build, sem framework e sem backend. Cada tela repete o próprio `<head>`, tokens e CSS — a duplicação é conhecida e a extração de design system está fora de escopo até que o escopo de telas do MVP esteja fechado. O núcleo do produto (captura e pontuação de áudio) não existe em código e depende de um spike ainda não executado.

A plataforma é PWA. Não há e não houve plano de versão nativa para Android ou iOS; não presuma distribuição em loja, cobrança via IAP nem exigências de App Review.

## Ausência de versionamento

Este diretório não é um repositório git. Edições são irreversíveis. Antes de qualquer alteração ampla, faça uma cópia de segurança; a última está em `../_backups/`. Não trate a ausência de teste ou de histórico como aprovação.

## Limites

Não publique, não provisione recursos que gerem custo, não execute ações destrutivas e não altere marca, nome, paleta ou posicionamento sem autorização explícita de Luiz. Não altere configurações globais do ambiente.

## Exclusão de ambiente

Este projeto pertence apenas ao ambiente pessoal. Buildea, seus repositórios, agentes, políticas e projetos estão explicitamente fora de escopo, assim como `buildea-labs`.
