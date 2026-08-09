import { useState, useEffect } from 'react';
import { supabase } from '../../db/supabase';

export interface RankingEntry {
  /** `user_id::text`. Mantido por compatibilidade; sempre igual a `user_id`. */
  identifier: string;
  /**
   * Nunca nulo: a view `global_ranking` filtra `user_id IS NOT NULL` desde a
   * migração 20260807000015 (o ranking passou a ser só de usuários
   * autenticados). Ver o cabeçalho daquela migração para o porquê.
   */
  user_id: string;
  /**
   * Nome de SAÍDA da view, que NÃO entrou no rename da 20260807000036 — ela
   * está revogada e fora do MVP1. Por baixo, lê `resultados.nome_do_jogador`
   * ou, se vazio, `perfis.apelido`.
   */
  player_name: string | null;
  score: number;
  result_id: string;
  created_at: string;
}

/**
 * Top 50 global. A view devolve APENAS resultados de usuários autenticados —
 * linhas anônimas não entram no ranking (decisão de produto registrada em
 * supabase/migrations/20260807000015_global_ranking_authenticated_only.sql).
 *
 * A view roda com `security_invoker = on`, ou seja, a leitura respeita a RLS
 * de `resultados` e `profiles` com o token de quem chama.
 */
export function useGlobalRanking() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchRanking() {
      try {
        setLoading(true);
        // Supabase auto-generates API access to Views just like Tables
        const { data, error } = await supabase
          .from('global_ranking')
          .select('*')
          .order('score', { ascending: false })
          .limit(50);

        if (error) {
          throw new Error(error.message);
        }

        if (isMounted && data) {
          setRanking(data as RankingEntry[]);
        }
      } catch (err) {
        if (isMounted) setError(err as Error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchRanking();

    // Future enhancement: Listen to changes using Realtime on the underlying table 
    // if a Postgres function or materialized view trigger allows it.
    
    return () => {
      isMounted = false;
    };
  }, []);

  return { ranking, loading, error };
}
