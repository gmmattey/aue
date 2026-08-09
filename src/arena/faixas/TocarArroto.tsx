import { useCallback, useEffect, useRef, useState } from 'react';

import { DONO_APAGOU, INDISPONIVEL } from '../../nucleo/fala/privacidade';
import type { MotivoSemAudio } from '../../portas/desafios';

/**
 * Tocar o arroto de alguém que está no servidor.
 *
 * O ENDEREÇO VENCE EM MINUTOS, e este é o risco número um do X1: a pessoa abre
 * o link, sai pra pegar uma cerveja, volta e o play não funciona. Falhar calado
 * aqui é o mesmo que dizer que o adversário não arrotou.
 *
 * Por isso o endereço é pedido **na hora do play**, e não na montagem da tela:
 * um endereço buscado na abertura já estaria morto quando o dedo chegasse. E
 * se ele vencer no meio, o erro do `<audio>` faz pedir outro e tentar de novo,
 * uma vez.
 *
 * Nada é guardado no aparelho: o áudio do adversário toca direto do servidor.
 */
interface Props {
  rotulo: string;
  audioId: string | null;
  /**
   * Por que não há o que tocar.
   *
   * Muda o que a tela pode dizer: "quem gravou apagou" se conta, porque é a
   * pessoa exercendo um direito e o silêncio pareceria defeito. Moderação
   * **não** se conta a terceiros.
   */
  motivoSemAudio?: MotivoSemAudio | null;
  buscarEndereco: (audioId: string) => Promise<string | null>;
  /** Rótulo curto para o botão, quando o player é uma linha do placar. */
  compacto?: boolean;
}

export function TocarArroto({
  rotulo,
  audioId,
  motivoSemAudio = null,
  buscarEndereco,
  compacto = false,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [endereco, setEndereco] = useState<string | null>(null);
  const [estado, setEstado] = useState<'parado' | 'buscando' | 'tocando' | 'semAudio'>('parado');
  const jaRenovou = useRef(false);

  useEffect(() => {
    /* Trocou de rodada: o endereço velho não serve mais. */
    setEndereco(null);
    setEstado('parado');
    jaRenovou.current = false;
  }, [audioId]);

  const tocar = useCallback(async () => {
    if (!audioId) {
      setEstado('semAudio');
      return;
    }

    setEstado('buscando');
    const novo = await buscarEndereco(audioId);
    if (!novo) {
      setEstado('semAudio');
      return;
    }

    setEndereco(novo);
    setEstado('tocando');
  }, [audioId, buscarEndereco]);

  useEffect(() => {
    if (estado !== 'tocando' || !endereco) return;
    const elemento = audioRef.current;
    if (!elemento) return;

    /*
      `play()` REJEITA quando o navegador barra — e em Safari antigo ele nem
      devolve promessa, devolve `undefined`. Sem as duas proteções isto vira
      rejeição não tratada no console de quem está jogando, ou um `TypeError`
      no meio da briga.
    */
    try {
      const tocando = elemento.play() as Promise<void> | undefined;
      tocando?.catch?.(() => setEstado('parado'));
    } catch {
      setEstado('parado');
    }
  }, [estado, endereco]);

  const aoFalhar = useCallback(async () => {
    /*
      Uma renovação, e só uma. Se o segundo endereço também não tocar, o
      problema não é o prazo — insistir viraria laço infinito pedindo assinatura
      para um arquivo que não existe mais.
    */
    if (jaRenovou.current || !audioId) {
      setEstado('semAudio');
      return;
    }
    jaRenovou.current = true;
    const novo = await buscarEndereco(audioId);
    if (!novo) {
      setEstado('semAudio');
      return;
    }
    setEndereco(novo);
  }, [audioId, buscarEndereco]);

  if (estado === 'semAudio' || motivoSemAudio) {
    return (
      <p className="comentario" role="status">
        {motivoSemAudio === 'apagado' ? DONO_APAGOU : INDISPONIVEL}
      </p>
    );
  }

  return (
    <div className={compacto ? 'tocar tocar-compacto' : 'tocar'}>
      {!compacto ? <span className="player-rotulo">{rotulo}</span> : null}
      {endereco ? (
        <audio
          ref={audioRef}
          className="player-audio"
          src={endereco}
          controls
          preload="none"
          onError={aoFalhar}
        />
      ) : (
        <button type="button" className="botao-tocar" onClick={tocar} disabled={estado === 'buscando'}>
          {estado === 'buscando' ? 'Abrindo…' : `▶ ${rotulo}`}
        </button>
      )}
    </div>
  );
}
