import React, { useCallback, useEffect, useRef, useState } from 'react';
import { assinarUrlDoAudio } from '../../db/supabase';

interface AudioPlaybackProps {
  /** `resultados.caminho_do_audio`. `null`/ausente é o caso normal, não um erro. */
  audioPath?: string | null;
  /** Rótulo acessível — quem é o dono do arroto que vai tocar. */
  rotulo: string;
  /**
   * Frase exibida quando NÃO há áudio. Só passe onde a ausência precisa ser
   * explicada — no desafio, por exemplo, quem chega pelo link do WhatsApp
   * espera ouvir alguma coisa e merece saber por que não vai. Sem esta prop, a
   * ausência simplesmente não ocupa espaço na tela.
   */
  textoQuandoNaoHa?: string;
}

type EstadoDaAssinatura = 'buscando' | 'pronto' | 'indisponivel';

const textoDiscreto: React.CSSProperties = {
  fontSize: 12.5,
  color: 'var(--muted)',
  margin: 0,
};

/**
 * Player do arroto gravado.
 *
 * REGRA CENTRAL: sem áudio TOCÁVEL não existe player. Um `<audio controls>`
 * apontando para caminho vazio, expirado ou negado desenha botão de play, barra
 * de progresso e tempo — tudo o que um player funcionando desenha — e não toca
 * nada. O usuário conclui que o produto está quebrado, ou pior, que o arroto
 * dele sumiu. Ausência de áudio é dita, ou não é mostrada; nunca fingida.
 *
 * POR QUE ISTO VIROU ASSÍNCRONO. O bucket era público e bastava montar a URL.
 * Desde a 20260807000028 ele é privado, e a URL precisa ser ASSINADA — o que é
 * uma ida à rede, autorizada contra a policy de `storage.objects` que exige
 * `resultados.esta_escondido = false`. É esse pedido que dá efeito real ao esconder:
 * arroto escondido não assina, e aqui isso vira "indisponível", não um player
 * mudo.
 *
 * A assinatura VENCE (5 minutos). Se vencer antes do play, o elemento dispara
 * `error` e nós assinamos de novo em vez de deixar um controle morto na tela.
 */
export const AudioPlayback: React.FC<AudioPlaybackProps> = ({
  audioPath,
  rotulo,
  textoQuandoNaoHa,
}) => {
  const [url, setUrl] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoDaAssinatura>('buscando');

  /**
   * Trava de uma retentativa por assinatura. Sem ela, uma URL que o navegador
   * recusa por qualquer motivo permanente vira laço infinito de `error` ->
   * reassinar -> `error`, martelando o Storage.
   */
  const jaTentouDeNovo = useRef(false);

  const assinar = useCallback(async (): Promise<string | null> => {
    if (!audioPath) return null;
    return assinarUrlDoAudio(audioPath);
  }, [audioPath]);

  useEffect(() => {
    if (!audioPath) {
      setUrl(null);
      setEstado('indisponivel');
      return;
    }

    let ativo = true;
    jaTentouDeNovo.current = false;
    setEstado('buscando');

    assinar().then((assinada) => {
      if (!ativo) return;
      setUrl(assinada);
      setEstado(assinada ? 'pronto' : 'indisponivel');
    });

    return () => {
      ativo = false;
    };
  }, [audioPath, assinar]);

  /** A assinatura venceu entre o carregamento da tela e o play. Renova. */
  const aoFalhar = useCallback(async () => {
    if (jaTentouDeNovo.current) {
      setUrl(null);
      setEstado('indisponivel');
      return;
    }
    jaTentouDeNovo.current = true;

    setEstado('buscando');
    const renovada = await assinar();
    setUrl(renovada);
    setEstado(renovada ? 'pronto' : 'indisponivel');
  }, [assinar]);

  const tentarDeNovo = useCallback(async () => {
    jaTentouDeNovo.current = false;
    setEstado('buscando');
    const renovada = await assinar();
    setUrl(renovada);
    setEstado(renovada ? 'pronto' : 'indisponivel');
  }, [assinar]);

  // Sem caminho: a ausência é estrutural, não uma falha de carregamento. Não
  // oferece "tentar de novo", porque não há nada para tentar.
  if (!audioPath) {
    if (!textoQuandoNaoHa) return null;
    return <p style={textoDiscreto}>{textoQuandoNaoHa}</p>;
  }

  if (estado === 'buscando') {
    return (
      <p style={textoDiscreto} role="status">
        Carregando o áudio...
      </p>
    );
  }

  if (estado === 'indisponivel' || !url) {
    /*
      NÃO dizemos por quê. As causas possíveis são "escondido por moderação",
      "apagado pelo dono", "arquivo sumiu" e "rede caiu" — e o cliente não
      consegue distingui-las, porque a policy nega a assinatura sem explicar
      (de propósito: explicar vazaria o estado de moderação). Chutar a causa
      seria inventar dado, então dizemos só o que sabemos.
    */
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <p style={textoDiscreto}>Este áudio não está disponível.</p>
        <button
          type="button"
          onClick={tentarDeNovo}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 999,
            padding: '4px 12px',
            color: 'var(--muted)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <audio
      controls
      /*
        `preload="none"`: o feed pode listar dezenas de posts, e cada `<audio>`
        com preload padrão puxa bytes no primeiro quadro. Só baixa quem tocar em
        play — decisão de custo de Storage e de dados móveis do usuário. Também
        é o que torna a expiração da assinatura possível, e é por isso que
        `onError` existe logo abaixo.
      */
      preload="none"
      src={url}
      aria-label={rotulo}
      onError={aoFalhar}
      style={{ width: '100%', minHeight: 40 }}
    />
  );
};
