import type React from 'react';

export interface CampoDeNomeProps {
  valor: string;
  onMudar: (valor: string) => void;
  /** Trava enquanto o envio corre — o nome já foi lido, mudar não teria efeito. */
  desabilitado: boolean;
}

/**
 * "Como quer aparecer?" — DEPOIS do arroto, nunca antes.
 *
 * Este campo ficava na tela inicial, abaixo do botão de gravar. Quem tocava na
 * bolha da Home chegava numa tela cujo conteúdo era um botão e um formulário,
 * antes de ter arrotado uma vez — e antes de ter qualquer motivo para se
 * importar com nome. docs/jogo/REGRAS.md §7 pede "nenhum formulário
 * onboarding obrigatório ou autorização desnecessária antes da primeira nota".
 * Um campo de texto na porta de entrada é pouco, mas é da mesma família.
 *
 * POR QUE AQUI, E NÃO NA TELA DE RESULTADO (que seria ainda mais tarde)
 * --------------------------------------------------------------------
 * Porque o nome não é enfeite de tela: `executarEnvio` grava o apelido NO
 * PERFIL antes de chamar `enviar_resultado`, e a RPC ignora o nome enviado e lê
 * o perfil quando existe `auth.uid()` — que hoje é sempre, por causa do login
 * anônimo. Perguntar depois do envio faria a nota já enviada, e a batalha
 * criada a partir dela, saírem com "Arrotador a1b2c3".
 *
 * A tela de julgamento é o último instante em que a resposta ainda chega a
 * tempo. E é um bom instante: a pessoa está parada, esperando o veredito.
 *
 * NUNCA BLOQUEIA. Não é obrigatório, não trava o botão de julgar e não tem
 * validação. Quem ignorar continua com o apelido que o banco inventou, que é
 * exatamente o que acontecia antes.
 */
export const CampoDeNome: React.FC<CampoDeNomeProps> = ({ valor, onMudar, desabilitado }) => {
  return (
    <label className="fx-nome" data-od-id="judging-name">
      <span className="fx-nome-rotulo">Como quer aparecer? (opcional)</span>
      <input
        type="text"
        className="fx-nome-campo"
        value={valor}
        maxLength={40}
        disabled={desabilitado}
        onChange={(evento) => onMudar(evento.target.value)}
        placeholder="Teu nome na batalha"
      />
    </label>
  );
};
