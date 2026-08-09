import { ALVOS_DE_ORIGEM, type AlvoDeOrigem } from '../../nucleo/origem/origens';

/**
 * Os seis alvos da origem.
 *
 * **A escolha é a ação.** Não há botão principal neste estado, não há
 * confirmação e não há "continuar": tocou, foi. O `ARENA.md` é explícito, e o
 * motivo é ritmo — pedir confirmação de uma escolha de um toque coloca uma
 * porta no meio da piada.
 */
interface Props {
  onEscolher: (alvo: AlvoDeOrigem) => void;
}

export function EscolhaDaOrigem({ onEscolher }: Props) {
  return (
    <div className="origens">
      {ALVOS_DE_ORIGEM.map((alvo) => (
        <button
          key={alvo.id}
          type="button"
          className="origem"
          onClick={() => onEscolher(alvo)}
        >
          {/* O emoji é enfeite: quem lê por leitor de tela só precisa do
              rótulo, e "🍺 Cerveja" seria lido como "caneca de cerveja
              Cerveja". */}
          <span aria-hidden="true">{alvo.emoji}</span>
          {alvo.rotulo}
        </button>
      ))}
    </div>
  );
}
