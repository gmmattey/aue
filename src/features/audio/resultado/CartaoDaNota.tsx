import React from 'react';
import type { ScoreResult } from '../rules';
import type { ResultadoRow } from '../../../db/supabase';
import { fraseDoJuiz } from '../frasesDoJuiz';
import { ParciaisEmBarras } from './ParciaisEmBarras';

/**
 * Carrega os `data-od-id` do Open Design: `screen-resultado`, `score-hero`,
 * `score-value`, `score-classification`, `xp-pill` e `judge-quote`.
 */

export interface CartaoDaNotaProps {
  resultado: ScoreResult;
  /** Só para o xp-pill (`xp_earned` / `is_xp_eligible`). */
  linhaSalva: ResultadoRow | null;
  /**
   * Já resolvido pelo AudioRecorder (`FLAGS.xp && Boolean(linhaSalva?.user_id)`).
   * A flag é lida LÁ: um componente de apresentação que consulta configuração
   * global deixa de ser função das próprias props e só dá para testar mockando
   * módulo.
   */
  mostrarXp: boolean;
}

/**
 * O ELEMENTO FOTOGRAFADO.
 *
 * `id="score-card"` é a única amarra entre este componente e o `useShareResult`
 * — ele faz `document.getElementById('score-card')` e joga o nó no html2canvas.
 * Nada verifica isso por tipo, então as duas formas de quebrar são silenciosas:
 * subir o id para um wrapper de fora coloca player e botões dentro da imagem
 * compartilhada, e perder o `background`/`border`/`radius` inline faz a foto
 * sair como texto solto sobre o fundo escuro, sem recorte.
 *
 * Regra do arquivo: o que NÃO for para a imagem não entra aqui.
 */
export const CartaoDaNota: React.FC<CartaoDaNotaProps> = ({
  resultado,
  linhaSalva,
  mostrarXp,
}) => {
  const frase = fraseDoJuiz(resultado.classification);

  return (
    <div
      id="score-card"
      data-od-id="screen-resultado"
      /*
        `textAlign: center` saiu do cartão. Ele centralizava TUDO, e agora as
        parciais são linhas com rótulo à esquerda e número à direita — o centro
        vinha do container e brigava com o `space-between`. Quem precisa de
        centro pede: `.score-block` e `.quote` têm o seu.

        O cartão em si não está no protótipo (lá o resultado ocupa a tela
        inteira). Fica porque `id="score-card"` é o elemento que o
        `useShareResult` captura para gerar a imagem compartilhada — sem um
        recorte com fundo próprio não há o que fotografar.
      */
      style={{
        padding: 'var(--space-5)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <section className="score-block" data-od-id="score-hero">
        <p className="eyebrow">Seu Auê</p>
        {/*
          VÍRGULA, e não ponto. O protótipo mostra "91,4"; `toFixed(1)` devolvia
          "91.4". Num app inteiro em português a nota era o único número escrito
          em inglês, bem no lugar onde o olho para.

          Se algum dia isto falhar num Node sem ICU completo, o conserto é o
          ambiente de teste — nunca voltar para `toFixed(1).replace('.', ',')`.
        */}
        <div className="score-num" data-od-id="score-value">
          {resultado.score.toLocaleString('pt-BR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
        </div>
        <h2 className="score-classification" data-od-id="score-classification">
          {resultado.classification}
        </h2>

        {resultado.isArtificial && (
          <div style={{ fontSize: 12, color: 'var(--danger)' }}>
            Categoria artificial — puxou ar
          </div>
        )}

        {/*
          XP fora do corte do MVP.

          O teto de 5 gravações com XP a cada 24h (`process_result_xp`,
          20260807000002) só se aplicava a quem tinha conta — ou seja, a
          ninguém. Com o login anônimo ele passou a valer para todos, e o aviso
          "Limite de 5 gravações em 24h" apareceria na sexta gravação:
          exatamente no meio de uma disputa presencial de 5 pessoas × 3 rounds,
          que são 15 gravações no mesmo aparelho em minutos.

          O teto continua existindo no banco. O que sai da tela é falar de um
          jogo de XP que este lançamento não tem.
        */}
        {mostrarXp && linhaSalva && (
          <span
            className="xp-pill"
            data-od-id="xp-pill"
            style={
              linhaSalva.is_xp_eligible
                ? undefined
                : { background: 'transparent', color: 'var(--muted)' }
            }
          >
            {linhaSalva.is_xp_eligible
              ? `+${linhaSalva.xp_earned} XP`
              : 'Limite de 5 gravações em 24h. Esta não vale XP.'}
          </span>
        )}
      </section>

      {/*
        O VEREDITO. `judge-quote` do protótipo — a única parte da tela com voz, e
        ela não existia no app. A frase vem de `frasesDoJuiz.ts`, por
        classificação; ausente, a seção inteira some em vez de exibir um texto de
        reserva que não julga nada.
      */}
      {frase && (
        <section data-od-id="judge-quote" style={{ marginTop: 'var(--space-5)' }}>
          <span className="quote-mark" aria-hidden="true">
            &ldquo;
          </span>
          <p className="quote">{frase}</p>
        </section>
      )}

      <ParciaisEmBarras parciais={resultado.partialScores} />
    </div>
  );
};
