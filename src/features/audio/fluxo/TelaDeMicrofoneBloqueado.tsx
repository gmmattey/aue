import type React from 'react';
import { IconeDeMicrofoneBloqueado } from './icones';

export interface TelaDeMicrofoneBloqueadoProps {
  /** Pede o microfone de novo. É o mesmo caminho do botão de gravar. */
  onTentarNovamente: () => void;
}

/**
 * MICROFONE BLOQUEADO — porte de `permissao-negada.html`.
 *
 * O que existia antes: uma linha de 13px em cinza, "O navegador bloqueou o
 * microfone. Libere a permissão e toque em gravar de novo." — verdadeira e
 * inútil. Quem chega aqui não sabe ONDE fica essa permissão, e o navegador não
 * pergunta de novo depois de negada: o botão de gravar passa a falhar em
 * silêncio para sempre. Sem os três passos, o produto acabava ali.
 *
 * Os passos são deliberadamente genéricos ("configurações do navegador ou do
 * app"): o caminho real muda entre Safari iOS, Chrome Android e desktop, e
 * inventar um roteiro específico daria instrução errada para a maioria. É o
 * mesmo texto do protótipo, que já tinha resolvido isso.
 *
 * "Tentar novamente" chama `getUserMedia` de novo de propósito. Em parte dos
 * navegadores a permissão volta a ser perguntada depois de liberada nas
 * configurações; nos que não perguntam, a chamada falha e a pessoa continua
 * exatamente nesta tela — que é o resultado honesto, e não um beco.
 */
export const TelaDeMicrofoneBloqueado: React.FC<TelaDeMicrofoneBloqueadoProps> = ({
  onTentarNovamente,
}) => (
  <section className="fx-centro" data-od-id="permission-denied-hero">
    <div className="fx-selo">
      <IconeDeMicrofoneBloqueado />
    </div>

    <div>
      <h1 className="fx-h1">Preciso ouvir essa porra.</h1>
      <p className="fx-sub" style={{ marginTop: 'var(--space-3)' }}>
        Sem microfone eu não consigo julgar.
      </p>
    </div>

    <ol className="fx-passos" data-od-id="permission-fix-steps">
      <li>
        <b>1.</b> Abra as configurações do navegador ou do app.
      </li>
      <li>
        <b>2.</b> Procure por "Permissões" e depois "Microfone".
      </li>
      <li>
        <b>3.</b> Libere o acesso para o Auê e volte aqui.
      </li>
    </ol>

    <div className="fx-rodape" style={{ width: '100%' }}>
      <button
        type="button"
        className="btn btn-primary"
        onClick={onTentarNovamente}
        data-od-id="btn-tentar-novamente"
      >
        TENTAR DE NOVO
      </button>
    </div>
  </section>
);
