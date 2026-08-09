import { useState } from 'react';

import {
  APAGADO,
  APAGANDO,
  APAGAR_O_MEU,
  CONFIRMAR_COMENTARIO,
  CONFIRMAR_NAO,
  CONFIRMAR_SIM,
  CONFIRMAR_TITULO,
  NAO_DEU_PRA_APAGAR,
} from '../../nucleo/fala/privacidade';

/**
 * Apagar o próprio arroto.
 *
 * **A CONFIRMAÇÃO É OBRIGATÓRIA** e diz o que some e o que fica, em vez de
 * perguntar "tem certeza?". Apagar não tem volta, e quem toca precisa saber
 * que a nota da disputa continua lá — senão a pessoa evita apagar por medo de
 * perder o placar.
 *
 * **NUNCA DIZ "APAGADO" SEM TER APAGADO.** Se o arquivo não sair do servidor,
 * a tela mostra a falha e oferece tentar de novo. Essa é a diferença entre
 * esta função ser honesta ou ser enfeite.
 */
interface Props {
  onApagar: () => Promise<'apagado' | 'naoDeu'>;
}

type Estado = 'parado' | 'confirmando' | 'apagando' | 'apagado' | 'falhou';

export function ApagarMeuArroto({ onApagar }: Props) {
  const [estado, setEstado] = useState<Estado>('parado');

  if (estado === 'apagado') {
    return (
      <p className="comentario" role="status">
        {APAGADO}
      </p>
    );
  }

  if (estado === 'confirmando' || estado === 'apagando' || estado === 'falhou') {
    return (
      <div className="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="tituloApagar">
        <div className="sobreposicao-caixa">
          <h2 id="tituloApagar" className="grito">
            {CONFIRMAR_TITULO}
          </h2>
          <p className="comentario">{CONFIRMAR_COMENTARIO}</p>

          {estado === 'falhou' ? (
            <p className="comentario aviso-de-erro" role="status">
              {NAO_DEU_PRA_APAGAR}
            </p>
          ) : null}

          <button
            type="button"
            className="botao botao-perigo"
            disabled={estado === 'apagando'}
            onClick={async () => {
              setEstado('apagando');
              const resposta = await onApagar();
              setEstado(resposta === 'apagado' ? 'apagado' : 'falhou');
            }}
          >
            {estado === 'apagando' ? APAGANDO : CONFIRMAR_SIM}
          </button>

          <button
            type="button"
            className="botao-discreto"
            disabled={estado === 'apagando'}
            onClick={() => setEstado('parado')}
          >
            {CONFIRMAR_NAO}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" className="botao-discreto" onClick={() => setEstado('confirmando')}>
      {APAGAR_O_MEU}
    </button>
  );
}
