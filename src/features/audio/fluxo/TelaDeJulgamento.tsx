import type React from 'react';
import type { Origin, ParciaisAcusticas } from '../rules';
import { EscolhaDeOrigem } from './EscolhaDeOrigem';

/** Os quatro rótulos do protótipo, na ordem em que aparecem lá. */
const MEDIDAS: Array<[rotulo: string, chave: keyof ParciaisAcusticas]> = [
  ['Profundidade', 'depth'],
  ['Potência', 'power'],
  ['Duração', 'duration'],
  ['Textura', 'texture'],
];

export interface TelaDeJulgamentoProps {
  /**
   * As parciais medidas, ou `null` enquanto a análise acústica está correndo.
   *
   * `null` desenha barras de VARREDURA (movimento sem número); com valor, as
   * barras mostram a medida real. Nunca há valor inventado no meio.
   */
  parciais: ParciaisAcusticas | null;
  /** O envio está em curso — a origem já foi escolhida. */
  enviando: boolean;
  onEscolherOrigem: (tipo: Origin, subtipo?: string) => void;
  /** Sair sem nota: solta a gravação e volta para a bolha. */
  onDescartar: () => void;
  /**
   * O campo "como quer aparecer?", ou nada quando a pessoa já escolheu um nome.
   *
   * Entra como NÓ, e não como `nome`/`onMudarNome`, para esta tela continuar
   * sem saber o que é perfil, apelido padrão ou sessão. Quem sabe disso é o
   * `AudioRecorder`, que já lê o perfil; aqui só existe "tem algo a mais para
   * desenhar antes do aviso". Ver `CampoDeNome`.
   */
  campoDeNome?: React.ReactNode;
}

/**
 * TELA DE JULGAMENTO — porte de `julgando.html`, com uma amputação deliberada.
 *
 * O QUE FOI DEIXADO PARA TRÁS, E É O PONTO MAIS IMPORTANTE DESTE ARQUIVO
 * ---------------------------------------------------------------------
 * O protótipo (`julgando.html`, linhas 105-120) tem um cronômetro de 5 a 10
 * segundos aleatórios: se ninguém escolhesse a origem, ele abria o resultado
 * sozinho — "Escolha uma opção ou deixe o Auê decidir".
 *
 * Isso é exatamente o que docs/jogo/REGRAS.md §3 proíbe: *"A origem é
 * informada pelo usuário. O sistema não deve fingir detectá-la
 * automaticamente."* A origem pesa 10% da nota e define `is_artificial` — um
 * padrão silencioso não seria um atalho de UX, seria o app declarando por você
 * uma coisa que só você sabe.
 *
 * Aqui NÃO há temporizador, NÃO há origem padrão e NÃO há caminho que feche o
 * veredito sem alguém tocar numa das opções. Se a análise termina e a pessoa
 * não escolheu, a tela espera. Para sempre, se for o caso — e há uma saída
 * explícita ("Descartar essa") para quem mudou de ideia.
 *
 * AS BARRAS SÃO REAIS. O protótipo anima quatro barras para 92%, 88%, 76% e 84%
 * — números escritos no CSS. Copiar aquilo seria mostrar medida inventada de um
 * áudio que já foi medido de verdade, e a casa inteira tem regra contra isso.
 * Enquanto a análise corre, a barra varre sem número; quando ela termina, a
 * barra vai para a parcial medida.
 */
export const TelaDeJulgamento: React.FC<TelaDeJulgamentoProps> = ({
  parciais,
  enviando,
  onEscolherOrigem,
  onDescartar,
  campoDeNome,
}) => {
  const analisando = parciais === null;

  const aviso = analisando
    ? 'Medindo o estrago...'
    : enviando
      ? 'Fechando o veredito...'
      : 'Escolha a origem. Sem ela não tem nota.';

  return (
    <section className="fx-centro" data-od-id="judging-hero">
      <div>
        <p className="eyebrow">Analisando o estrago</p>
        <h1 className="fx-h1">Segura que tô julgando.</h1>
      </div>

      {/*
        `aria-hidden`: as quatro barras são a mesma informação que a tela de
        resultado apresenta em texto logo em seguida, e aqui elas ainda estão em
        movimento. Quem usa leitor de tela ouve o aviso do `aria-live` abaixo,
        que é o que de fato muda o que fazer.
      */}
      <div className="fx-metricas" aria-hidden="true" data-od-id="judging-metrics">
        {MEDIDAS.map(([rotulo, chave]) => (
          <div className="fx-metrica" key={chave}>
            <div className="fx-metrica-topo">
              <span>{rotulo}</span>
            </div>
            <div className="fx-trilho">
              {parciais ? (
                <div
                  className="fx-preenchimento"
                  style={{ width: `${Math.round(parciais[chave])}%` }}
                />
              ) : (
                <div className="fx-preenchimento fx-preenchimento-indefinido" />
              )}
            </div>
          </div>
        ))}
      </div>

      <EscolhaDeOrigem onEscolher={onEscolherOrigem} desabilitado={analisando || enviando} />

      {/*
        DEPOIS da origem de propósito. A origem é o que destrava a nota e é a
        ação desta tela; o nome é opcional e não trava nada. Acima, ele
        competiria com o "JULGA ESSA PORRA" pela atenção de quem só quer saber
        quanto deu.
      */}
      {campoDeNome}

      <p className="fx-aviso" aria-live="polite" data-od-id="judging-wait">
        {aviso}
      </p>

      {/*
        A SAÍDA. Ela existe porque a tela espera indefinidamente por decisão, e
        porque o envio pode falhar (rede caindo, RPC recusando) e deixar a
        pessoa aqui com uma mensagem de erro e nada para fazer.

        Some enquanto o envio está em curso: descartar no meio do envio soltaria
        o blob debaixo de uma operação que ainda vai lê-lo.
      */}
      {!enviando && (
        <button type="button" className="fx-ghost" onClick={onDescartar} data-od-id="btn-descartar">
          Descartar essa
        </button>
      )}
    </section>
  );
};
