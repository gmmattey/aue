import React from 'react';
import type { ScoreResult } from '../rules';
import type { ResultadoRow } from '../../../db/supabase';
import type { Fala } from '../../../nucleo/nota/faixas';
import { formatarNota } from '../../../shared/formato/nota';
import { ParciaisEmBarras } from './ParciaisEmBarras';
import { ENDERECO_LEGIVEL } from '../../../shared/enderecoPublico';
import { CAMINHO_DA_MARCA, VIEWBOX_DA_MARCA } from '../../../arena/bolha/caminhoDaMarca';

/**
 * Carrega os `data-od-id` do Open Design: `screen-resultado`, `score-hero`,
 * `score-value`, `score-classification`, `xp-pill`, `judge-quote` e
 * `share-card-brand`.
 */

/*
 * O ENDEREÇO IMPRESSO NA IMAGEM.
 *
 * A foto do cartão viaja como arquivo: sai do app, entra no WhatsApp e pode ser
 * reencaminhada sem o link que a acompanhava. Sem endereço dentro dela, quem vê
 * a nota do amigo três conversas depois não tem como chegar aqui.
 *
 * `ENDERECO_LEGIVEL` (sem `https://`, que ninguém lê num cartão) e não
 * `window.location.host`: este componente é função pura das props — é assim que
 * `CartaoDaNota.test.tsx` o renderiza, sem DOM — e o endereço que precisa
 * aparecer é o público, não `localhost:5173` nem a URL do preview da Vercel.
 */

export interface CartaoDaNotaProps {
  resultado: ScoreResult;
  /**
   * A reação e o veredito daquele arroto, derivados de `(nota, id)` por quem
   * tem o id na mão — e do rótulo da faixa enquanto o id não existe.
   *
   * NUNCA NULA, e isso é uma correção. A prop já aceitou `null` na janela do
   * envio, e o cartão respondia escondendo reação e veredito: a foto que
   * `html2canvas` tira do `#score-card` saía sem a única parte da tela que tem
   * voz, enquanto os botões de rede ao lado já mandavam o rótulo no texto. Duas
   * verdades sobre o mesmo arroto, na mesma tela, sem erro nenhum.
   *
   * Quem monta a fala é o `ResultadoScreen`, numa variável só.
   */
  fala: Fala;
  /** Só para o xp-pill (`xp_ganho` / `e_elegivel_para_xp`). */
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
  fala,
  linhaSalva,
  mostrarXp,
}) => {
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
          A regra da vírgula e a proibição do `toFixed` mudaram de casa: elas
          valiam só para esta tela enquanto outras onze escreviam a mesma nota
          de dois jeitos diferentes. Agora vivem em `shared/formato/nota.ts`,
          onde valem para as doze.
        */}
        <div className="score-num" data-od-id="score-value">
          {formatarNota(resultado.score)}
        </div>
        {/*
          A REAÇÃO, não o nome de criatura que morava aqui. Ela vem derivada de
          `(nota, id do resultado)` — o mesmo par que a imagem fotografada, o
          texto do zap e o X1 aberto no outro aparelho mostram.
        */}
        <h2 className="score-classification" data-od-id="score-classification">
          {fala.reacao}
        </h2>

        {resultado.isArtificial && (
          <div style={{ fontSize: 12, color: 'var(--danger)' }}>
            Categoria artificial — puxou ar
          </div>
        )}

        {/*
          XP fora do corte do MVP.

          O teto de 5 gravações com XP a cada 24h (`calcular_xp_do_resultado`,
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
              linhaSalva.e_elegivel_para_xp
                ? undefined
                : { background: 'transparent', color: 'var(--muted)' }
            }
          >
            {linhaSalva.e_elegivel_para_xp
              ? `+${linhaSalva.xp_ganho} XP`
              : 'Limite de 5 gravações em 24h. Esta não vale XP.'}
          </span>
        )}
      </section>

      {/*
        O VEREDITO. `judge-quote` do protótipo — a única parte da tela com voz, e
        ela não existia no app. Vem pareado com a reação em
        `nucleo/nota/faixas.ts`: as duas são a mesma escolha, e nunca aparecem
        uma sem a outra.
      */}
      <section data-od-id="judge-quote" style={{ marginTop: 'var(--space-5)' }}>
        <span className="quote-mark" aria-hidden="true">
          &ldquo;
        </span>
        <p className="quote">{fala.fraseDoJuiz}</p>
      </section>

      <ParciaisEmBarras parciais={resultado.partialScores} />

      {/*
        MARCA E CHAMADA — o `share-card` do protótipo (`compartilhar.html`), que
        tem o símbolo do Auê no topo e o "Você consegue fazer melhor?" no rodapé.
        O §3.5 exige os dois DENTRO do artefato compartilhado: identidade visual
        e CTA para superar o resultado. A imagem saía com nota, veredito e
        barras, e nada que dissesse de onde ela veio.

        POR QUE AQUI DENTRO, e não como um bloco irmão logo abaixo: o
        `useShareResult` fotografa `document.getElementById('score-card')`, que é
        a `<div>` que abre este arquivo. O que estiver fora dela não entra na
        foto — e subir o `id` para um wrapper para "resolver" isso puxaria player
        de áudio e botões para dentro da imagem. Ver o bloco no topo do arquivo.

        SEM `color-mix` e sem `<svg>` EXTERNO. O html2canvas 1.4.1 não resolve
        `color-mix()` (é o que há em `--accent-soft`) nem sprite por `<use
        href="/icons.svg#...">`: os dois viram buraco na imagem justamente na
        parte que existe para ser vista. SVG *inline*, esse ele desenha — é por
        isso que o símbolo abaixo é um `<path>` escrito na própria árvore, com a
        cor em hex literal.
      */}
      <section
        data-od-id="share-card-brand"
        style={{
          marginTop: 'var(--space-5)',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/*
            O SÍMBOLO DE VERDADE, e não mais um círculo com "!" de texto.

            Aqui saía um `<span>` redondo: a imagem que viajava pro zap levava
            uma bolinha genérica, não a marca. `<svg>` INLINE com o `d` vindo do
            `caminhoDaMarca` resolve dentro da restrição que já estava escrita
            acima — o html2canvas não puxa sprite por `<use href>`, mas desenha
            SVG inline.

            `fill` em hex literal, e não `var(--accent)`: a biblioteca serializa
            o SVG antes de rasterizar, e variável de CSS não sobrevive a essa
            volta. O hex é o mesmo `--accent` do design system.

            Se ainda assim o html2canvas não desenhar, sai a palavra "Auê"
            sozinha — que é o que já funcionava. Nunca um símbolo torto.
          */}
          <svg
            aria-hidden="true"
            width={24}
            height={24}
            viewBox={VIEWBOX_DA_MARCA}
            style={{ display: 'block', flex: 'none' }}
          >
            <path fill="#c6ff00" fillRule="evenodd" d={CAMINHO_DA_MARCA} />
          </svg>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 17,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Auê
          </span>
        </span>

        {/*
          A CHAMADA. "Bate essa" é o convite; o endereço é como se responde a
          ele. Não promete batalha, revanche nem placar — nada disso existe do
          lado de quem só recebeu uma imagem, e o cartão não pode prometer o que
          a foto não entrega.
        */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            lineHeight: 1.4,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            textAlign: 'right',
          }}
        >
          Bate essa
          <br />
          <span style={{ color: 'var(--accent)' }}>{ENDERECO_LEGIVEL}</span>
        </span>
      </section>
    </div>
  );
};
