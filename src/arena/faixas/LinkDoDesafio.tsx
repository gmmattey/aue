import { useState } from 'react';

import { COPIADO, COPIAR, NAO_DEU_PRA_COPIAR } from '../../nucleo/fala/desafio';

/**
 * O link do desafio, com copiar.
 *
 * **Quando o navegador não deixa copiar, o jogo diz isso.** Um "Copiado!"
 * mentiroso é pior que botão nenhum: a pessoa vai ao grupo, cola, e manda a
 * mensagem anterior dela sem entender por quê.
 */
interface Props {
  link: string;
  onCopiar: (texto: string) => Promise<boolean>;
}

export function LinkDoDesafio({ link, onCopiar }: Props) {
  const [estado, setEstado] = useState<'parado' | 'copiado' | 'recusado'>('parado');

  return (
    <div className="link-do-desafio">
      <div className="link-linha">
        {/*
          O link inteiro fica selecionável: quando copiar falha, dá para segurar
          e copiar na mão. É a saída honesta, e ela precisa existir na tela.
        */}
        <span className="link-endereco">{link}</span>
        <button
          type="button"
          className="link-copiar"
          onClick={async () => {
            const deu = await onCopiar(link);
            setEstado(deu ? 'copiado' : 'recusado');
          }}
        >
          {estado === 'copiado' ? COPIADO : COPIAR}
        </button>
      </div>
      {estado === 'recusado' ? <p className="comentario">{NAO_DEU_PRA_COPIAR}</p> : null}
    </div>
  );
}
