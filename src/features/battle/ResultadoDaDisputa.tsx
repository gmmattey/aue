import React from 'react';

import type { Batalha } from '../../db/supabase';
import { CompartilharEmRede } from '../../shared/components/CompartilharEmRede';
import { formatarNota } from '../../shared/formato/nota';
import { Convite } from '../audio/MolduraDeLink';
import { cartaoDeLink } from '../audio/estilosDeLink';
import { CartaoDeRodada } from './CartaoDeRodada';
import { PodioBanner } from './PodioBanner';
import { rotuloDoLocal } from './locais';
import { fraseDoPrazo } from '../../nucleo/prazo/prazoDaBatalha';
import { calcularClassificacao, calcularTurno } from './turnos';

interface ResultadoDaDisputaProps {
  batalha: Batalha;
  url: string;
  userId?: string;
}

/**
 * O que `/b/CODIGO` mostra quando a batalha é uma DISPUTA PRESENCIAL.
 *
 * O DEFEITO QUE ISTO FECHA, e ele era grave. A disputa presencial compartilha o
 * pódio pelo mesmo endereço da batalha remota (`DisputaLocalScreen` monta
 * `/b/${codigo_de_acesso}`), e a tela do outro lado não olhava `tipo_de_batalha`: quem
 * abria o link do churrasco caía numa tela de batalha REMOTA, com gravador
 * convidando um estranho a "responder" uma disputa que já tinha acabado.
 *
 * E responder ali não era só estranho, era corrupção de dados: sem
 * `participante_id`, a rodada nova fica FORA do pódio (`turnos.ts` ignora rodada
 * sem participante) e DENTRO da consulta do líder (`obter_batalha`, migração
 * 20260807000033, linhas 243-256, que não filtra por participante). Resultado:
 * um "liderando agora" com o nome de alguém que não estava na mesa, por cima de
 * um pódio que nunca o menciona.
 *
 * POR QUE NÃO EXISTE GRAVADOR AQUI, dito por extenso: a disputa presencial
 * acontece num aparelho só, com as pessoas em volta. Não há como um visitante
 * entrar nela pelo link — ele não é um dos participantes cadastrados, e
 * participante só nasce em `criar_batalha_presencial`. O link do pódio é para
 * OUVIR e provocar, e o convite para jogar é o `Convite` no fim da tela: gravar
 * o seu, no seu aparelho.
 *
 * O `PodioBanner` é o MESMO componente da tela que fecha a disputa, inclusive o
 * `id="podio-card"` que o `html2canvas` captura. Aqui ninguém fotografa nada —
 * quem manda a IMAGEM é quem estava no churrasco, na tela dele; deste lado o
 * que circula é o link. O id vem junto por ser o mesmo componente, e não porque
 * exista captura escondida nesta rota.
 *
 * O `lider` que a RPC devolve também não aparece nesta tela. Ele é o maior
 * `score` da batalha inteira, sem olhar participante; a verdade da disputa
 * presencial é a classificação por participante, que é a mesma regra que a mesa
 * viu ao vivo (`calcularClassificacao`, melhor nota de cada um).
 */
export const ResultadoDaDisputa: React.FC<ResultadoDaDisputaProps> = ({
  batalha,
  url,
  userId,
}) => {
  const rounds = batalha.total_de_rodadas ?? 1;
  const turno = calcularTurno(batalha.participantes, batalha.rodadas, rounds);
  const classificacao = calcularClassificacao(batalha.participantes, batalha.rodadas);

  /*
    `tipo_de_local` é CHECK no banco e não aceita texto livre, então quem escolheu
    "Outro" digitou o lugar no aparelho de quem criou a disputa — e esse texto
    não viaja pelo link. Aqui só chegaria o rótulo genérico "Outro lugar", que
    diz menos que não dizer nada e ainda ocupa a legenda do pódio compartilhado.
    Omitimos: a legenda fica só com os rounds.
  */
  const local = batalha.tipo_de_local === 'outro' ? '' : rotuloDoLocal(batalha.tipo_de_local);
  const legenda = [local, `${rounds} round${rounds > 1 ? 's' : ''}`].filter(Boolean).join(' · ');

  /*
    O pódio só é pódio quando todo mundo cumpriu todos os rounds. Enquanto a
    mesa ainda está jogando, o `PodioBanner` coroaria um "Campeão do Auê" que
    pode perder a liderança no próximo arroto — e quem abriu o link tem como
    saber a diferença, porque ela está escrita.
  */
  const acabou = turno.acabou && classificacao.length > 0;

  return (
    <div className="screen">
      {acabou ? (
        <PodioBanner colocacoes={classificacao} legenda={legenda} />
      ) : (
        <div style={cartaoDeLink}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>
            {legenda ? `${legenda} · em andamento` : 'Disputa em andamento'}
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              textTransform: 'uppercase',
              margin: 'var(--space-2) 0',
            }}
          >
            Ainda tem arroto por vir
          </h1>

          {classificacao.length === 0 ? (
            <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              A galera abriu a disputa e ninguém arrotou ainda. Volta daqui a
              pouco — ou grava o teu enquanto isso.
            </p>
          ) : (
            <>
              <p
                style={{
                  fontSize: 13.5,
                  color: 'var(--muted)',
                  lineHeight: 1.5,
                  marginBottom: 'var(--space-4)',
                }}
              >
                Placar parcial do round {turno.round} de {rounds}. O pódio sai
                quando todo mundo tiver arrotado.
              </p>

              {classificacao.map((colocado, i) => (
                <div
                  key={colocado.nome}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    padding: '10px 0',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {/*
                    `posicao`, e não o índice do array: empate divide o número
                    (1, 2, 2, 4). Numerar por índice inventaria um desempate
                    que a mesa não viu acontecer.
                  */}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)' }}>
                    {colocado.posicao}
                  </span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{colocado.nome}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15 }}>
                    {formatarNota(colocado.nota)}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          textTransform: 'uppercase',
          margin: 'var(--space-5) 0 var(--space-4)',
        }}
      >
        Os arrotos
      </h2>

      {batalha.rodadas.map((rodada) => (
        <CartaoDeRodada
          key={rodada.rodada_id}
          rodada={rodada}
          rotulo={`Round ${rodada.numero_da_rodada}`}
          userId={userId}
        />
      ))}

      <div style={{ ...cartaoDeLink, marginTop: 'var(--space-4)' }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            marginBottom: 'var(--space-2)',
          }}
        >
          Passar adiante
        </div>

        <CompartilharEmRede
          url={url}
          texto={
            acabou
              ? `${classificacao[0]?.nome} ganhou a disputa de arroto no Auê. Ouve aí.`
              : 'Tem disputa de arroto rolando no Auê. Ouve aí.'
          }
        />

        <p
          style={{
            fontSize: 12,
            color: 'var(--muted)',
            marginTop: 'var(--space-4)',
            lineHeight: 1.5,
          }}
        >
          Quem tiver este link ouve os arrotos desta disputa.{' '}
          {fraseDoPrazo(batalha.expira_em)} Os arrotos continuam guardados no Auê.
        </p>
      </div>

      <Convite />
    </div>
  );
};
