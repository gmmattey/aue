-- =============================================================================
-- Achievements System (Conquistas & Badges)
--
-- RENOMEAÇÃO EM 2026-08-07: a tabela de conquistas desbloqueadas se chamava
-- `user_conquistas` e passou a `conquistas_usuario`. Era a única tabela do
-- schema que misturava inglês e português no mesmo nome e que invertia a ordem
-- usada por todas as outras tabelas de junção (`membros_grupo`,
-- `participantes_campeonato`, `posts_comunidade` — qualificador no fim).
-- Ver `docs/schema/nomenclatura.md`.
--
-- A migração foi EDITADA NO LUGAR, não substituída por um ALTER TABLE ... RENAME,
-- porque nada da 20260807000015 em diante havia sido aplicado em nenhum
-- ambiente. Confirme antes de aplicar:
--
--     SELECT version FROM supabase_migrations.schema_migrations
--     WHERE version >= '20260807000018' ORDER BY version;
--
-- Se a 20260807000018 aparecer nesse resultado, o banco tem a tabela com o nome
-- ANTIGO e esta edição não o alcança — nesse caso, aplique o rename à mão
-- (o Postgres reaponta sozinho a PK, as FKs, as policies e o índice):
--
--     ALTER TABLE public."user_conquistas" RENAME TO conquistas_usuario;
-- =============================================================================

-- 1. Create conquistas catalog table
CREATE TABLE IF NOT EXISTS public.conquistas (
  id text PRIMARY KEY,
  nome text NOT NULL,
  descricao text NOT NULL,
  icone text NOT NULL,
  categoria text DEFAULT 'geral' NOT NULL,
  is_rare boolean DEFAULT false NOT NULL,
  is_secret boolean DEFAULT false NOT NULL
);

-- 2. Create conquistas_usuario unlocked badges table
CREATE TABLE IF NOT EXISTS public.conquistas_usuario (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  conquista_id text REFERENCES public.conquistas(id) ON DELETE CASCADE NOT NULL,
  unlocked_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, conquista_id)
);

-- Enable RLS
ALTER TABLE public.conquistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conquistas_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conquistas catalog viewable by everyone"
ON public.conquistas FOR SELECT TO public USING (true);

CREATE POLICY "Unlocked conquistas viewable by everyone"
ON public.conquistas_usuario FOR SELECT TO public USING (true);

CREATE POLICY "System can insert unlocked conquistas"
ON public.conquistas_usuario FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

GRANT SELECT ON public.conquistas TO anon, authenticated;
GRANT SELECT, INSERT ON public.conquistas_usuario TO anon, authenticated;

-- 3. Seed initial conquistas from prototype design
INSERT INTO public.conquistas (id, nome, descricao, icone, categoria, is_rare, is_secret) VALUES
  ('primeiro_aue', 'Primeiro Auê', 'Gravou a primeira performance de arroto no app.', 'mic', 'iniciante', false, false),
  ('passou_70', 'Passou de 70', 'Alcançou um Auê Score de 70 ou mais.', 'star', 'desempenho', false, false),
  ('primeira_vitoria', 'Primeira vitória', 'Venceu seu primeiro duelo 1x1.', 'trophy', 'duelo', false, false),
  ('madrugador', 'Arroto matinal', 'Gravou um arroto entre 05:00 e 08:00 da manhã.', 'sun', 'habito', false, false),
  ('tres_dias', '3 dias seguidos', 'Manteve uma sequência diária de 3 dias gravando.', 'flame', 'habito', false, false),
  ('desafiante', 'Desafiante', 'Enviou 5 desafios diretos para amigos.', 'swords', 'social', false, false),
  ('social', 'Comunidade', 'Participou de um grupo ou comentou em uma performance.', 'users', 'social', false, false),
  ('nivel_4', 'Nível 4', 'Alcançou o Nível 4 na sua jornada.', 'award', 'progresso', false, false),
  ('top_20', 'Top 20', 'Entrou no Top 20 do Ranking Global.', 'crown', 'ranking', true, false),
  ('passou_90', 'Passou de 90', 'Alcançou um score devastador acima de 90.', 'zap', 'desempenho', true, false),
  ('campeao', 'Campeão do Auê', 'Venceu um campeonato de comunidade.', 'medal', 'campeonato', true, false),
  ('secreta', '???', 'Conquista misteriosa secreta.', 'lock', 'secreta', true, true)
ON CONFLICT (id) DO NOTHING;

-- 4. Trigger to automatically evaluate score-based achievements after result insertion
CREATE OR REPLACE FUNCTION public.check_result_achievements()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    -- Primeiro Auê
    INSERT INTO public.conquistas_usuario (user_id, conquista_id)
    VALUES (NEW.user_id, 'primeiro_aue')
    ON CONFLICT DO NOTHING;

    -- Passou de 70
    IF NEW.score >= 70 THEN
      INSERT INTO public.conquistas_usuario (user_id, conquista_id)
      VALUES (NEW.user_id, 'passou_70')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Passou de 90
    IF NEW.score >= 90 THEN
      INSERT INTO public.conquistas_usuario (user_id, conquista_id)
      VALUES (NEW.user_id, 'passou_90')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_check_result_achievements ON public.resultados;
CREATE TRIGGER trigger_check_result_achievements
  AFTER INSERT ON public.resultados
  FOR EACH ROW EXECUTE PROCEDURE public.check_result_achievements();
