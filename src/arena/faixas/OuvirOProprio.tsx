import { useEffect, useState } from 'react';

import { OUVIR_O_PROPRIO } from '../../nucleo/fala/desafio';
import { criarEnderecoLocal, soltarEnderecoLocal } from '../../plataforma/web/enderecoDeAudio';

/**
 * O player do próprio arroto, enquanto o desafio espera resposta.
 *
 * TOCA O ÁUDIO QUE ESTÁ NA MEMÓRIA, e não o que subiu para o servidor: é
 * instantâneo, não gasta rede e não depende de link assinado. O arquivo do
 * servidor existe para o adversário, não para quem acabou de gravar.
 *
 * O endereço local é solto na saída — cada um segura o arroto inteiro na
 * memória até alguém liberar.
 */
interface Props {
  dados: Blob;
}

export function OuvirOProprio({ dados }: Props) {
  const [endereco, setEndereco] = useState<string | null>(null);

  useEffect(() => {
    const criado = criarEnderecoLocal(dados);
    setEndereco(criado);
    return () => soltarEnderecoLocal(criado);
  }, [dados]);

  if (!endereco) return null;

  return (
    <div className="player">
      <span className="player-rotulo">{OUVIR_O_PROPRIO}</span>
      {/*
        Controles nativos de propósito: o navegador já sabe tocar, pausar,
        arrastar e mostrar duração, e a versão dele funciona com leitor de tela
        sem a gente reimplementar nada. Player desenhado à mão entra quando o
        placar precisar tocar linha por linha (#99), não antes.
      */}
      <audio className="player-audio" src={endereco} controls preload="metadata" />
    </div>
  );
}
