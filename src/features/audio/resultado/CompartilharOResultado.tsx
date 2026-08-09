import React from 'react';
import { CompartilharEmRede } from '../../../shared/components/CompartilharEmRede';
import { formatarNota } from '../../../shared/formato/nota';
// O MESMO endereço que a folha nativa manda (`useShareResult`) e o mesmo do
// `canonical`. Dois endereços saindo da mesma tela seria o pior dos dois mundos.
import { ORIGEM_CANONICA } from '../../../shared/enderecoPublico';

export interface CompartilharOResultadoProps {
  /** A nota da prévia local. Vai no TEXTO da mensagem, não no link. */
  nota: number;
  /** A classificação. Idem. */
  classificacao: string;
  /** O link da batalha, quando ela já foi criada. `null` é o caso comum. */
  linkDesafio: string | null;
}

/**
 * WHATSAPP, TELEGRAM, X E "COPIAR LINK" NO RESULTADO INDIVIDUAL.
 *
 * O §3.5 do contrato pede os cinco caminhos — os quatro daqui mais a folha
 * nativa, que é o botão "Compartilhar" das ações. Os quatro só existiam DENTRO
 * do `LinkDaBatalha`, ou seja, só depois de criar uma batalha: quem gravava e
 * queria mandar a nota para o grupo tinha a folha do sistema e mais nada — e
 * nada no desktop, onde `navigator.share` não existe.
 *
 *
 * A ARMADILHA, E A ESCOLHA — leia antes de "melhorar" isto
 * -------------------------------------------------------
 * O comentário que morava no `LinkDaBatalha` avisava: sem link de batalha estes
 * botões mandariam a home pelada, e "um 'Mandar no WhatsApp' que envia
 * aue.vercel.app pelado não convida ninguém para batalha nenhuma". O aviso
 * estava certo e continua valendo para o LINK. As duas saídas eram:
 *
 *   (a) criar a batalha no toque do botão, para o link ser sempre uma disputa;
 *   (b) mandar o endereço público, com o cartão Open Graph estático, e ser
 *       honesto no texto.
 *
 * ESCOLHIDA A (b), por quatro razões, em ordem de peso:
 *
 * 1. O GESTO SE PERDE. Estes alvos são `<a target="_blank">`. Criar a batalha
 *    antes exigiria `await criarBatalha(...)` e só então abrir a janela — e
 *    abrir janela depois de um `await` já não está no gesto do usuário. Safari
 *    iOS e Chrome Android bloqueiam. O resultado seria um toque que não faz
 *    nada e não diz nada: exatamente o defeito que esta entrega veio consertar,
 *    trocado de lugar.
 *
 * 2. A (a) NÃO ELIMINA O RAMO, SÓ O ESCONDE. Batalha muda é link inútil, e o
 *    `BotaoDeDesafiar` já falha fechado por isso: só `estadoAudio === 'enviado'`
 *    libera. Com upload falhado não há batalha a criar, e a (a) cairia no
 *    endereço público assim mesmo — com a diferença de o usuário não entender
 *    por quê.
 *
 * 3. RECURSO SENSÍVEL PRECISA DE CICLO DE VIDA EXPLÍCITO (AGENTS.md). A batalha
 *    vive 7 dias e deixa qualquer um com o link responder. Criá-la como efeito
 *    colateral de "mandar minha nota no grupo" cria uma sessão que a pessoa não
 *    pediu. "Desafiar um amigo" é o gesto que pede, e ele está na mesma tela, a
 *    um toque — e assim que existe, o link daqui vira o da batalha sozinho.
 *
 * 4. A PREMISSA DO AVISO CAIU. Ele foi escrito quando `public/og-image.png` não
 *    existia. Hoje existe (1200x630) e o `index.html` declara `og:image`,
 *    `og:title` e `og:description`: o link renderiza um cartão do Auê, não um
 *    endereço suspeito.
 *
 * O que a (b) exige em troca — e é o preço que esta tela paga — é que o convite
 * viaje no TEXTO: nota, classificação e a provocação. O link leva o amigo ao
 * Auê; quem diz "bate essa" é a mensagem. E a nota abaixo dos botões conta o
 * que está indo, sem prometer batalha onde não há.
 *
 * Retorna Fragment pelo mesmo motivo do `ResultadoScreen`: rótulo, botões e nota
 * são filhos diretos da coluna com `gap` — um `<div>` aqui colapsaria os três
 * espaçamentos num só.
 */
export const CompartilharOResultado: React.FC<CompartilharOResultadoProps> = ({
  nota,
  classificacao,
  linkDesafio,
}) => (
  <>
    <div
      style={{
        fontSize: 11,
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
    >
      Compartilhar em
    </div>

    <CompartilharEmRede
      url={linkDesafio ?? ORIGEM_CANONICA}
      texto={
        linkDesafio
          ? 'Te desafiei no Auê. Abre o link, ouve o meu arroto e manda o teu.'
          : `Tirei ${formatarNota(nota)} no Auê — ${classificacao}. Bate essa.`
      }
    />

    {/*
      SÓ SEM BATALHA. Com o link criado, quem explica o que viaja é o
      `LinkDaBatalha` ("quem tiver este link entra na batalha... 7 dias"), e
      repetir aqui seria a mesma regra dita em dois lugares.

      O texto fala da BATALHA, e não de "o botão abaixo": "Desafiar um amigo" só
      aparece com o áudio no ar, e mandar tocar num botão que pode não estar na
      tela é a mesma classe de mentira que este passo veio apagar. Quando ele não
      está, quem explica é o `BotaoDeDesafiar`, no lugar dele.
    */}
    {!linkDesafio && (
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
        Vai o link do Auê com a sua nota no texto. Para o amigo responder o seu
        arroto, crie a batalha antes.
      </p>
    )}
  </>
);
