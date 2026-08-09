---
name: otimizarMonetizacao
description: Guia para monetizar o Aue somente quando o estagio do produto autorizar, sem estragar o loop nem violar politicas.
---

# Skill: otimizarMonetizacao

Esta skill existe porque o projeto tem uma meta real: um dia pagar pelo menos as
próprias contas de IA.

Ela **não é autorização para colocar anúncio agora**.

## 0. Gate obrigatório

Antes de propor qualquer bloco de anúncio, cobrança ou Auê+:

1. leia [`docs/mvp1/CONTRATO_MVP1.md`](../../../docs/mvp1/CONTRATO_MVP1.md);
2. leia [`docs/auditoria_de_mercado.md`](../../../docs/auditoria_de_mercado.md);
3. confirme se monetização foi explicitamente ativada para o estágio atual.

No MVP1 atual, monetização pública está fora do corte. Código já existente pode
continuar **inerte atrás de flag/configuração**, mas não deve ser ligado só
porque a infraestrutura existe.

## 1. Ordem de prioridade

Antes de otimizar receita, o produto precisa provar:

1. gente termina o primeiro Auê;
2. gente compartilha;
3. convidado responde;
4. existe revanche/retorno;
5. há volume suficiente para monetização não ser teatro.

Sem isso, otimizar posição de banner é escolher a cor da catraca antes de abrir
o parque.

## 2. Quando anúncios forem autorizados

Princípios:

- nunca bloquear gravação, resultado, desafio ou revanche;
- nunca colocar anúncio colado em CTA para induzir clique acidental;
- nunca imitar componente do jogo;
- carregar script do provedor apenas quando configuração válida existir;
- ambiente sem chave deve renderizar **zero anúncio e zero buraco vazio**;
- respeitar políticas atuais do provedor e revalidá-las antes de ligar produção.

## 3. UGC e responsabilidade

Se no futuro anúncios aparecerem perto de conteúdo gerado por pessoas — áudio,
comentário, feed, perfil — o publisher continua responsável pela conformidade da
página.

Feed público está desligado no MVP1; não use a existência do código antigo como
justificativa para desenhar monetização in-feed agora.

## 4. Assinatura/Auê+

Não mostrar compra como funcional se não existir:

- provedor de pagamento;
- confirmação real;
- restauração/estado de assinatura;
- tratamento de falha;
- política correspondente.

Botão "assinar" que termina em `alert('sucesso')` é mock, não monetização.

## 5. Métrica

Quando monetização entrar, medir impacto no loop principal junto da receita.

Receita que derruba compartilhamento, resposta da batalha ou retorno pode estar
comendo justamente a coisa que geraria escala.

## 6. Saída esperada da skill

Uma proposta de monetização deve dizer:

- por que entra agora;
- onde aparece;
- o que nunca bloqueia;
- configuração necessária;
- política relevante;
- métrica de receita;
- métrica de dano à UX;
- rollback para desligar imediatamente.

Se a resposta para "por que entra agora?" for apenas "para pagar a IA", registre
como objetivo e espere o produto provar uso primeiro.
