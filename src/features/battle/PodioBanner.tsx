import React from 'react';

import { formatarNota } from '../../shared/formato/nota';

export interface ColocacaoNoPodio {
  nome: string;
  score: number;
  /**
   * A posição de verdade, vinda de `calcularClassificacao`. Empate divide o
   * número (1, 2, 2, 4).
   *
   * É PROP e não conta local: numerar por índice do array foi exatamente o
   * defeito — o componente não tem como saber que duas linhas seguidas com a
   * mesma nota são um empate e não uma ordem.
   */
  posicao: number;
}

interface PodioBannerProps {
  colocacoes: ColocacaoNoPodio[];
  /** Ex.: "Churrasco · 3 rounds". Some quando não houver. */
  legenda?: string;
}

/** O `id` que o `html2canvas` captura para virar a imagem compartilhável. */
export const ID_DO_PODIO = 'podio-card';

const CORES_DE_MEDALHA = ['var(--gold)', 'var(--silver)', 'var(--bronze)'];

/**
 * O pódio da disputa — e a imagem que vai para o WhatsApp.
 *
 * EXTRAÍDO DE `ChampionshipLobbyScreen`. Lá o pódio era Carol 98,1 / Bruno
 * 95,6 / Rafa 93,0 escritos à mão no JSX, com um roast fixo. O visual estava
 * certo (troféu, campeão em destaque, tokens --gold/--silver/--bronze); o que
 * faltava era receber gente de verdade.
 *
 * O QUE MUDOU ALÉM DOS DADOS:
 *
 * 1. Ganhou `id="podio-card"` no nó raiz. É o gancho do `useShareResult`, que
 *    transforma este bloco em PNG — mesmo mecanismo do cartão de nota
 *    (`score-card`). Sem o id, não há o que capturar.
 *
 * 2. Saiu o roast fixo ("Tecnicamente excelente. Socialmente indefensável.").
 *    Era uma frase única, escrita para uma situação específica, que apareceria
 *    idêntica em toda disputa de todo mundo — e a graça de um roast é ele
 *    caber no caso. Enquanto não existir uma fonte de frases, não ter é melhor
 *    que repetir.
 *
 * 3. Aguenta 1 a 5 colocados, não exatamente 3. Uma disputa de dois amigos não
 *    pode renderizar um terceiro lugar vazio.
 *
 * 4. EMPATE É EMPATE. As posições vêm prontas de `calcularClassificacao`, e o
 *    topo aguenta mais de um campeão. Antes o número saía do índice do array:
 *    dois arrotos de 88,0 viravam 2º e 3º, e o banner ia para o grupo com um
 *    desempate que ninguém deu — impossível de desfazer depois.
 */
export const PodioBanner: React.FC<PodioBannerProps> = ({ colocacoes, legenda }) => {
  /*
    Campeão pela POSIÇÃO, não pelo primeiro do array. Com empate no topo são
    duas ou mais pessoas, e escolher uma delas para o círculo grande seria a
    mesma mentira, só que na linha que mais aparece.
  */
  const campeoes = colocacoes.filter((c) => c.posicao === 1);
  const demais = colocacoes.filter((c) => c.posicao !== 1);
  const campeao = campeoes[0];
  if (!campeao) return null;

  const empateNoTopo = campeoes.length > 1;

  return (
    <div
      id={ID_DO_PODIO}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        textAlign: 'center',
        padding: 'var(--space-5)',
        background: 'var(--bg)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          style={{ width: 52, height: 52, color: 'var(--accent)' }}
          aria-hidden="true"
        >
          <path d="M8 21h8M12 17v4M6 4h12v3a6 6 0 0 1-12 0V4Z" />
          <path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3" />
        </svg>

        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          {legenda ?? 'Fim de jogo'}
        </span>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, textTransform: 'uppercase', margin: 0 }}>
          {empateNoTopo ? 'Empate no topo' : 'Campeão do Auê'}
        </h1>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 6 }}>
          {campeoes.map((pessoa) => (
            <div
              key={pessoa.nome}
              style={{
                // Com empate os círculos dividem o espaço; sozinho, o campeão
                // fica do tamanho de sempre.
                width: empateNoTopo ? 64 : 84,
                height: empateNoTopo ? 64 : 84,
                borderRadius: 999,
                background: 'var(--accent)',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: empateNoTopo ? 24 : 32,
                color: 'var(--bg)',
              }}
              aria-hidden="true"
            >
              {pessoa.nome.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>

        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, textTransform: 'uppercase', marginTop: 4 }}>
          {/*
            "Carol e Bruno" com dois; "Carol, Bruno e Rafa" com três. É como a
            mesa falaria, e é curto o bastante para caber na imagem.
          */}
          {campeoes.length === 1
            ? campeao.nome
            : `${campeoes.slice(0, -1).map((c) => c.nome).join(', ')} e ${campeoes[campeoes.length - 1]!.nome}`}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--accent)', fontWeight: 700 }}>
          {formatarNota(campeao.score)}
        </div>
      </div>

      {demais.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
          {demais.map((pessoa, i) => {
            // Pela POSIÇÃO, não pelo índice: com dois campeões empatados, quem
            // vem depois é o 3º e leva bronze — não prata.
            const cor = CORES_DE_MEDALHA[pessoa.posicao - 1] ?? 'var(--muted)';
            return (
              <div
                key={`${pessoa.nome}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '11px 10px',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    fontWeight: 700,
                    border: `1px solid ${cor}`,
                    color: cor,
                    background: 'var(--surface)',
                  }}
                >
                  {pessoa.posicao}
                </span>

                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 999,
                    background: 'var(--border)',
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: 'var(--font-display)',
                    fontSize: 14,
                  }}
                  aria-hidden="true"
                >
                  {pessoa.nome.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{pessoa.nome}</div>

                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 15, color: cor }}>
                  {formatarNota(pessoa.score)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/*
        A marca entra no banner porque ele vira PNG e viaja sozinho para fora do
        app. Sem ela, o pódio compartilhado é um ranking de nomes que não diz de
        onde veio.
      */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        Auê! · aue.vercel.app
      </div>
    </div>
  );
};
