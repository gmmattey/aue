import React, { useCallback, useState } from 'react';
import { criarDenuncia, DenunciaDuplicadaError } from '../../db/supabase';

interface ReportButtonProps {
  /** `resultados.id` do arroto denunciado. */
  resultId: string;
  /**
   * Id do usuário logado. Sem ele o botão aparece desabilitado e explica por
   * quê — a policy de `denuncias` é `TO authenticated` desde a 20260807000023,
   * porque denúncia anônima era um botão de sabotagem (três POSTs escondiam
   * qualquer gravação).
   */
  userId?: string;
}

/**
 * Motivos oferecidos.
 *
 * Todos passam do mínimo de 3 caracteres da constraint `denuncias_reason_len`
 * (20260807000023). São texto livre no banco; a lista fechada existe para o
 * usuário não precisar redigir nada e para a fila de revisão ser agrupável.
 */
const MOTIVOS = [
  'Conteúdo sexual',
  'Violência ou crueldade',
  'Discurso de ódio',
  'Não é um arroto',
  'Outro motivo',
] as const;

type Estado = 'fechado' | 'escolhendo' | 'enviando' | 'enviado' | 'duplicado' | 'erro';

const linkDiscreto: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--muted)',
  fontSize: 12,
  fontWeight: 600,
  padding: '8px 4px',
  textDecoration: 'underline',
};

/**
 * Denunciar um arroto.
 *
 * PRIMEIRO PRODUTOR da tabela `denuncias`, criada na 20260807000014. Até aqui o
 * mecanismo inteiro — tabela, policies, índice único e o gatilho que esconde
 * com 3 denunciantes distintos — era código inalcançável: nada em `src/` jamais
 * inseriu uma linha. Moderação automática sem caminho de entrada é moderação
 * que não existe.
 *
 * Deliberadamente discreto e no fim do card. É uma ação de exceção; competir em
 * peso com curtir e comentar convida ao uso impulsivo, e o custo de uma
 * denúncia frívola recai sobre o autor do arroto.
 */
export const ReportButton: React.FC<ReportButtonProps> = ({ resultId, userId }) => {
  const [estado, setEstado] = useState<Estado>('fechado');

  const denunciar = useCallback(
    async (motivo: string) => {
      setEstado('enviando');
      try {
        await criarDenuncia(resultId, motivo);
        setEstado('enviado');
      } catch (err) {
        // Denunciar duas vezes NÃO é falha: o índice único
        // `denuncias_uma_por_pessoa_por_resultado` fez o trabalho dele. Dizer
        // "erro" aqui faria a pessoa tentar de novo achando que não registrou.
        if (err instanceof DenunciaDuplicadaError) {
          setEstado('duplicado');
          return;
        }
        console.error('Falha ao denunciar', err);
        setEstado('erro');
      }
    },
    [resultId],
  );

  if (estado === 'enviado') {
    return (
      <p role="status" style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
        {/*
          Sem prometer prazo nem resultado. A revisão é manual e feita por uma
          pessoa só; "vamos analisar em 24h" seria um compromisso que ninguém
          assumiu. O que a denúncia FAZ de fato — somar para o corte de três
          pessoas distintas — está dito sem números falsos.
        */}
        Denúncia registrada. Ela entra na fila de revisão.
      </p>
    );
  }

  if (estado === 'duplicado') {
    return (
      <p role="status" style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
        Você já denunciou este arroto.
      </p>
    );
  }

  if (!userId) {
    return (
      <button type="button" disabled title="Entre para denunciar" style={{ ...linkDiscreto, cursor: 'not-allowed' }}>
        Entre para denunciar
      </button>
    );
  }

  if (estado === 'fechado' || estado === 'erro') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button type="button" onClick={() => setEstado('escolhendo')} style={linkDiscreto}>
          Denunciar
        </button>
        {estado === 'erro' && (
          <p role="alert" style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>
            Não foi possível registrar a denúncia. Tenta de novo.
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface)',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700 }}>Por que está denunciando?</span>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {MOTIVOS.map((motivo) => (
          <button
            key={motivo}
            type="button"
            disabled={estado === 'enviando'}
            onClick={() => denunciar(motivo)}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 999,
              padding: '6px 12px',
              fontSize: 12,
              color: 'var(--fg)',
              opacity: estado === 'enviando' ? 0.6 : 1,
            }}
          >
            {motivo}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setEstado('fechado')}
        disabled={estado === 'enviando'}
        style={{ ...linkDiscreto, alignSelf: 'flex-start' }}
      >
        {estado === 'enviando' ? 'Enviando...' : 'Cancelar'}
      </button>
    </div>
  );
};
