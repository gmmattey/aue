import { useState } from 'react';

import {
  NOME_COMENTARIO,
  NOME_CONFIRMAR,
  NOME_TITULO,
} from '../../nucleo/fala/desafio';

/**
 * A assinatura — cobrada **só no ato de humilhar**, e nunca antes.
 *
 * **É SOBREPOSIÇÃO, NÃO ESTADO** (`ARENA.md` §1). A Arena continua atrás, com
 * a nota no lugar; fechar aqui devolve a pessoa ao resultado sem perder nada.
 * Virar estado faria o jogo ter uma tela de formulário no meio do loop — que é
 * exatamente o que a Arena existe para não ter.
 *
 * Nome é apelido. Não tem senha, não tem e-mail, não tem cadastro.
 */
interface Props {
  ocupado: boolean;
  onConfirmar: (nome: string) => void;
  onFechar: () => void;
}

export function CobrarONome({ ocupado, onConfirmar, onFechar }: Props) {
  const [nome, setNome] = useState('');

  return (
    <div className="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="tituloDoNome">
      <div className="sobreposicao-caixa">
        <h2 id="tituloDoNome" className="grito">
          {NOME_TITULO}
        </h2>
        <p className="comentario">{NOME_COMENTARIO}</p>

        <input
          className="campo-de-nome"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          placeholder="Teu apelido"
          maxLength={24}
          autoComplete="nickname"
          disabled={ocupado}
          aria-label="Teu apelido"
        />

        <button
          type="button"
          className="botao botao-principal"
          onClick={() => onConfirmar(nome)}
          /*
            OCUPADO TRAVA O BOTÃO. Subir áudio em 4G demora, e dois toques
            criariam duas batalhas para o mesmo arroto — duas mensagens no
            grupo, e a segunda ninguém responde.
          */
          disabled={ocupado}
        >
          {ocupado ? 'Mandando…' : NOME_CONFIRMAR}
        </button>

        <button type="button" className="botao-discreto" onClick={onFechar} disabled={ocupado}>
          Agora não
        </button>
      </div>
    </div>
  );
}
