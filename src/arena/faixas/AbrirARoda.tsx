import { useState } from 'react';

import { LUGARES_DA_RODA, ROTULO_DO_LOCAL } from '../../nucleo/disputa/locais';
import {
  MAXIMO_NA_RODA,
  MINIMO_NA_RODA,
  ROUNDS_POSSIVEIS,
  daParaAbrirARoda,
  nomesDaRoda,
} from '../../nucleo/disputa/regras';
import {
  RODA_ABRIR,
  RODA_ABRINDO,
  RODA_AGORA_NAO,
  RODA_AVISO,
  RODA_COMENTARIO,
  RODA_MAIS_UM,
  RODA_NOME_PLACEHOLDER,
  RODA_ONDE,
  RODA_ROUNDS,
  RODA_SEM_LUGAR,
  RODA_TIRAR,
  RODA_TITULO,
} from '../../nucleo/fala/roda';
import type { LocalDaRoda } from '../../portas/disputaLocal';

/**
 * A sobreposição que monta a mesa.
 *
 * **É SOBREPOSIÇÃO, NÃO ESTADO** (`ARENA.md` §1) — mesma casca do `CobrarONome`
 * e pelo mesmo motivo: a Arena continua atrás, respirando, e fechar aqui devolve
 * a pessoa ao `IDLE` sem nada ter acontecido. Um estado de configuração no meio
 * do loop é exatamente a tela de formulário que a Arena existe para não ter.
 *
 * O AVISO DE GRAVAÇÃO FICA ONDE OS NOMES SÃO ESCRITOS, sempre visível e acima
 * do CTA. Quem digita os nomes é quem tem como avisar a mesa, e este é o único
 * ponto do jogo em que uma pessoa registra o áudio de outra.
 */
interface Props {
  ocupado: boolean;
  onAbrir: (nomes: string[], rounds: number, local: LocalDaRoda | null) => void;
  onFechar: () => void;
}

export function AbrirARoda({ ocupado, onAbrir, onFechar }: Props) {
  /* Começa com dois campos: é o mínimo, e mostrar cinco vazios assusta. */
  const [nomes, setNomes] = useState<string[]>(['', '']);
  const [rounds, setRounds] = useState(1);
  const [local, setLocal] = useState<LocalDaRoda | null>(null);

  const podeAbrir = daParaAbrirARoda(nomes) && !ocupado;

  return (
    <div className="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="tituloDaRoda">
      <div className="sobreposicao-caixa">
        <h2 id="tituloDaRoda" className="grito">
          {RODA_TITULO}
        </h2>
        <p className="comentario">{RODA_COMENTARIO}</p>

        <div className="roda-nomes">
          {nomes.map((nome, i) => (
            <div className="roda-nome-linha" key={i}>
              <input
                className="campo-de-nome"
                value={nome}
                onChange={(evento) =>
                  setNomes((atuais) =>
                    atuais.map((n, j) => (j === i ? evento.target.value : n)),
                  )
                }
                placeholder={RODA_NOME_PLACEHOLDER}
                maxLength={24}
                disabled={ocupado}
                aria-label={`Nome de quem entra, ${i + 1}`}
              />
              {/* Só some quando restam os dois obrigatórios. */}
              {nomes.length > MINIMO_NA_RODA ? (
                <button
                  type="button"
                  className="roda-tirar"
                  aria-label={RODA_TIRAR}
                  disabled={ocupado}
                  onClick={() => setNomes((atuais) => atuais.filter((_, j) => j !== i))}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {nomes.length < MAXIMO_NA_RODA ? (
          <button
            type="button"
            className="botao-discreto"
            disabled={ocupado}
            onClick={() => setNomes((atuais) => [...atuais, ''])}
          >
            {RODA_MAIS_UM}
          </button>
        ) : null}

        <p className="rotulo-da-roda">{RODA_ROUNDS}</p>
        <div className="origens roda-rounds">
          {ROUNDS_POSSIVEIS.map((n) => (
            <button
              key={n}
              type="button"
              className={rounds === n ? 'origem origem-escolhida' : 'origem'}
              aria-pressed={rounds === n}
              disabled={ocupado}
              onClick={() => setRounds(n)}
            >
              {n}
            </button>
          ))}
        </div>

        <p className="rotulo-da-roda">{RODA_ONDE}</p>
        <div className="origens">
          {LUGARES_DA_RODA.map((lugar) => (
            <button
              key={lugar}
              type="button"
              className={local === lugar ? 'origem origem-escolhida' : 'origem'}
              aria-pressed={local === lugar}
              disabled={ocupado}
              onClick={() => setLocal(lugar)}
            >
              {ROTULO_DO_LOCAL[lugar]}
            </button>
          ))}
          {/* O padrão é não dizer. Dá para voltar atrás sem recarregar nada. */}
          <button
            type="button"
            className={local === null ? 'origem origem-escolhida' : 'origem'}
            aria-pressed={local === null}
            disabled={ocupado}
            onClick={() => setLocal(null)}
          >
            {RODA_SEM_LUGAR}
          </button>
        </div>

        <p className="comentario">{RODA_AVISO}</p>

        <button
          type="button"
          className="botao botao-principal"
          /*
            DESABILITADO ENQUANTO FALTA NOME, e não mensagem depois do toque: a
            régua é a mesma do servidor, então dá para dizer antes.

            E desabilitado enquanto sobe, pelo mesmo motivo do `CobrarONome`:
            dois toques criariam duas rodas, e a mesa ficaria com metade das
            notas em cada uma.
          */
          disabled={!podeAbrir}
          onClick={() => onAbrir(nomesDaRoda(nomes), rounds, local)}
        >
          {ocupado ? RODA_ABRINDO : RODA_ABRIR}
        </button>

        <button type="button" className="botao-discreto" onClick={onFechar} disabled={ocupado}>
          {RODA_AGORA_NAO}
        </button>
      </div>
    </div>
  );
}
