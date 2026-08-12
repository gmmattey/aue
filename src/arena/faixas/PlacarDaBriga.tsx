import { PLACAR_DA_BRIGA } from '../../nucleo/fala/versus';
import type { PlacarDaBriga as PlacarDoDesafio } from '../../portas/desafios';

/**
 * O placar de vitórias — quem tá ganhando essa porra.
 *
 * É a primeira coisa que a pessoa lê no `SCOREBOARD`, acima do último round.
 * Com rounds, o protagonista da tela deixa de ser o maior arroto da noite e
 * passa a ser a briga inteira.
 *
 * **QUEM CONTA VITÓRIA É O SERVIDOR.** A regra de quem venceu um round é
 * versionada no banco (`vencedor_do_round`, que compara só a nota); somar aqui
 * seria a segunda regra esperando divergir da primeira, e a divergência
 * apareceria justo para quem perdeu.
 *
 * NÃO É TOCÁVEL. Não vira botão e não abre histórico — o `ARENA.md` só mostra o
 * placar e o último round.
 */
export function PlacarDaBriga({ placar }: { placar: PlacarDoDesafio }) {
  const [esquerda, direita] = placar.lados;

  /*
    Briga com um lado só ainda não tem placar. Mostrar "Giam 0 × 0 ninguém"
    seria inventar um adversário que não existe.
  */
  if (!esquerda || !direita) return null;

  const empatado = esquerda.vitorias === direita.vitorias;

  return (
    <div className="placar-da-briga">
      <p className="eyebrow">{PLACAR_DA_BRIGA}</p>
      {/*
        UM BLOCO SÓ, LIDO DE UMA VEZ. Peça por peça o leitor de tela diria
        "Giam 4 3 Guinho", que não é placar nenhum. Por isso o `role="img"` com
        o texto inteiro, e os filhos escondidos.
      */}
      <div
        className="placar-linha-da-briga"
        role="img"
        aria-label={`${esquerda.nome} ${esquerda.vitorias} a ${direita.vitorias} ${direita.nome}`}
      >
        <span className="placar-nome-da-briga" aria-hidden="true">
          {esquerda.nome}
        </span>
        {/*
          Ouro em quem está na frente. Empatado, os dois em `--fg`: se o ouro
          aparece quando ninguém ganhou, ele para de significar vitória.
        */}
        <b
          className={
            !empatado && esquerda.vitorias > direita.vitorias
              ? 'placar-vitorias placar-na-frente'
              : 'placar-vitorias'
          }
          aria-hidden="true"
        >
          {esquerda.vitorias}
        </b>
        <span className="placar-x" aria-hidden="true">
          ×
        </span>
        <b
          className={
            !empatado && direita.vitorias > esquerda.vitorias
              ? 'placar-vitorias placar-na-frente'
              : 'placar-vitorias'
          }
          aria-hidden="true"
        >
          {direita.vitorias}
        </b>
        <span className="placar-nome-da-briga" aria-hidden="true">
          {direita.nome}
        </span>
      </div>
    </div>
  );
}
