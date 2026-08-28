# Auê! — Release & Definition of Done

## 1. Objetivo

Evitar que “funciona aqui” vire critério de lançamento.

## 2. Definition of Done de uma fatia

Uma mudança só está pronta quando:

- comportamento funciona ponta a ponta;
- erro correspondente está tratado;
- não há botão habilitado que não cumpra o que promete;
- nenhuma informação fictícia aparece como real;
- recurso sensível é liberado corretamente;
- persistência não cria efeito duplicado;
- regra competitiva não pode ser burlada pelo caminho óbvio;
- typecheck verde;
- lint verde;
- testes verdes;
- build verde;
- celular real validado quando toca microfone, áudio, share, batalha ou Roda;
- documentação canônica foi atualizada se a decisão mudou.

## 3. Pré-merge

Checklist:

- branch limpa e atualizada;
- escopo da PR é único/compreensível;
- testes novos para regra nova;
- sem imports proibidos atravessando fronteira;
- sem segredo no código;
- sem feature morta reativada;
- sem TODO crítico escondido;
- screenshots/vídeos quando UI mudou.

## 4. Banco/migration

Antes de produção:

1. ler migration inteira;
2. provar em staging quando possível;
3. validar policies/functions/constraints com queries reais;
4. confirmar compatibilidade do build que está no ar com o novo banco;
5. planejar ordem migration/deploy;
6. após produção, consultar estado real, não confiar apenas em histórico de migrations.

## 5. Segurança

Bloqueia release pública se houver risco conhecido relevante sem decisão explícita.

Verificar:

- RLS;
- EXECUTE em funções;
- `SECURITY DEFINER`;
- buckets;
- URLs assinadas;
- upload MIME/tamanho;
- capability codes;
- leitura anônima indevida;
- telemetria write-only quando aplicável.

## 6. Web release

Antes de publicar:

- `aue.web.app` abre;
- primeira tentativa funciona;
- páginas públicas abrem;
- manifest/icons corretos;
- metadados sociais mínimos;
- Supabase/configuração de produção presentes;
- flags deliberadas;
- nenhum endereço antigo volta a ser fonte canônica por acidente.

## 7. Android internal/closed

- package `com.auegames.aue`;
- versionCode/versionName corretos;
- build release assinado;
- AAB gerado;
- chave de assinatura guardada com segurança;
- YAMNet/asset disponível conforme arquitetura nativa;
- microfone dentro da casca real;
- playback;
- share;
- X1/link quando suportado no corte;
- política/declarações da Play atualizadas.

## 8. Android público

Além do anterior:

- ADR autoriza produção pública;
- requisitos atuais da Play atendidos;
- trilha de teste concluída quando exigida pela conta;
- listing final;
- screenshots;
- política de privacidade;
- Data Safety coerente com comportamento real;
- security blockers fechados ou formalmente aceitos.

## 9. Roda

Não liberar como pronta sem:

- teste 2×1;
- teste 5×3 em aparelho real;
- passagem de celular sem perda de estado;
- pódio correto;
- melhor tentativa/áudio correspondente;
- empates corretos.

## 10. X1

Antes de release que mexe em batalha:

- dois aparelhos;
- host cria;
- guest abre;
- áudio rival toca;
- alvo/score é compreensível;
- guest responde;
- ambos veem placar igual;
- revanche funciona;
- expiração funciona;
- reload não corrompe contexto.

## 11. Game feel

UI não está pronta só por bater screenshot.

Verificar:

- toque responde imediatamente;
- Bolha reage ao som;
- julgamento tem tensão;
- score tem payoff;
- winner/loser/draw são distinguíveis;
- reduced motion funciona;
- 360px funciona.

## 12. Telemetria

Se experimento de aquisição estiver ativo:

- origem/campanha entram;
- funil registra sem duplicar;
- falha de analytics não afeta gameplay;
- privacidade/copy compatíveis.

## 13. Rollback

Toda release com mudança estrutural precisa responder:

- como voltar frontend?;
- migration é reversível?;
- se não for, build anterior continua funcionando?;
- flag pode desligar comportamento sem corromper dado?;
- qual é o ponto de decisão de rollback?

## 14. Release note interna

Registrar:

- versão/commit;
- o que mudou;
- migrations;
- flags;
- aparelhos testados;
- riscos conhecidos;
- rollback;
- links de issues/PRs.

## 15. Critério final

**Não lançar porque a data chegou. Lançar porque o loop principal está íntegro e os riscos conhecidos estão entendidos.**
