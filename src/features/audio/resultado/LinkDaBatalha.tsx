import React from 'react';

import { fraseDoPrazo } from '../../battle/prazoDaBatalha';

export interface LinkDaBatalhaProps {
  /**
   * Já não-nulo: a guarda `linkDesafio && (...)` fica no ResultadoScreen, então
   * este componente não precisa se defender de null nem renderizar uma caixa
   * tracejada vazia.
   */
  link: string;
  /**
   * `batalhas.expira_em`, quando quem monta a tela souber dele.
   *
   * HOJE NINGUÉM PASSA, e isso é uma limitação conhecida, não um esquecimento:
   * a RPC `criar_batalha` (20260807000030) devolve só o código do link, e é ele
   * que o `AudioRecorder` guarda. O prazo real exigiria uma segunda ida ao
   * servidor (`obter_batalha`) logo depois de criar, para exibir um número que,
   * neste exato instante, é conhecido — a batalha acabou de nascer com sete
   * dias.
   *
   * Por isso a frase sem a prop diz "a partir de agora": ela é verdadeira na
   * única situação em que esta caixa aparece, que é segundos depois da criação.
   * Com a prop, quem tiver o dado real manda, e o texto passa a contar as horas
   * como o rodapé da batalha já conta.
   */
  expiraEm?: string | null;
}

/**
 * A caixa tracejada que só existe depois que a batalha foi criada: o link em si
 * e o prazo dele.
 *
 * OS BOTÕES POR REDE SAÍRAM DAQUI, e o motivo é o próprio comentário que ficava
 * neste ponto. Ele dizia que WhatsApp, Telegram, X e "copiar link" moravam
 * dentro desta caixa porque, sem batalha, mandariam a home pelada — e o efeito
 * colateral era que a tela de resultado individual, que é a maioria dos casos,
 * ficava sem NENHUM deles, contra o §3.5 do contrato. Hoje eles moram no
 * `CompartilharOResultado`, montado uma única vez logo abaixo desta caixa, e
 * recebem o link da batalha quando ele existe. A resposta à armadilha está
 * escrita lá, por extenso.
 *
 * O AVISO DE GUARDAR O LINK não é zelo excessivo: este é o ÚNICO lugar do app
 * onde o código da batalha existe para quem a criou. Não há listagem de
 * batalhas — não pode haver, `batalhas` tem RLS ligada e nenhuma policy de
 * SELECT (20260807000030), que é justamente o que faz "só quem tem o link"
 * valer de graça. Fechou a aba sem mandar para ninguém, o link se perde de vez.
 * Recuperá-lo é assunto de produto (guardar no aparelho, listar "suas
 * batalhas"), não deste componente — e enquanto não existir, a tela avisa em
 * vez de deixar a pessoa descobrir sozinha.
 */
export const LinkDaBatalha: React.FC<LinkDaBatalhaProps> = ({ link, expiraEm }) => (
  <div
    style={{
      padding: 'var(--space-4)',
      border: '1px dashed var(--border)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
    }}
  >
    <div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        Link da batalha
      </div>
      <a
        href={link}
        target="_blank"
        rel="noreferrer"
        style={{ wordBreak: 'break-all', color: 'var(--accent)' }}
      >
        {link}
      </a>
    </div>

    <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
      Quem tiver este link entra na batalha e pode responder.{' '}
      {expiraEm
        ? fraseDoPrazo(expiraEm)
        : 'Ele para de funcionar em 7 dias, contando de agora.'}{' '}
      Manda para alguém ou guarda o endereço: o Auê não tem lista de batalhas, e
      fora daqui ele não aparece de novo.
    </p>
  </div>
);
