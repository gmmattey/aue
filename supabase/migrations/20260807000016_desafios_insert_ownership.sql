-- =============================================================================
-- R3 — `desafios` aceitava INSERT com `challenger_result_id` de qualquer pessoa.
--
-- A policy "Enable insert for everyone" (20260807000010) tem
-- `WITH CHECK (true)` — herdado do MVP anônimo de 20260807000000. Como os ids
-- de `resultados` são visíveis (o feed da comunidade e a própria view de
-- ranking devolvem `id`), qualquer pessoa podia criar um desafio apontando
-- para o resultado de outra e sair distribuindo o link como se fosse seu.
--
-- Correção: o `challenger_result_id` precisa pertencer a quem insere.
--
-- NÃO VALIDADO: sem Postgres neste ambiente, nada aqui passou por parser.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Predicado de posse.
--
-- SECURITY DEFINER de propósito: a checagem não pode depender de a policy de
-- SELECT de `resultados` continuar sendo `USING (true)`. Se um dia o feed for
-- restringido, esta função continua enxergando a linha para decidir a posse —
-- e ela só devolve boolean, não vaza conteúdo.
--
-- `auth.uid()` continua funcionando dentro de SECURITY DEFINER: ele lê o GUC
-- `request.jwt.claims`, que é da sessão/transação e não do dono da função.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_use_as_challenger(p_result_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resultados r
    WHERE r.id = p_result_id
      AND (
        -- Caso 1 — usuário logado: o resultado tem de ser dele.
        (auth.uid() IS NOT NULL AND r.user_id = auth.uid())

        -- Caso 2 — usuário anônimo: ver justificativa abaixo.
        OR (
          auth.uid() IS NULL
          AND r.user_id IS NULL
          AND r.created_at > timezone('utc'::text, now()) - interval '60 minutes'
        )
      )
  );
$$;

COMMENT ON FUNCTION public.can_use_as_challenger(uuid) IS
  'Posse do resultado usado como desafiante. Usada na policy de INSERT de desafios (R3).';

GRANT EXECUTE ON FUNCTION public.can_use_as_challenger(uuid) TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- DECISÃO SOBRE O DESAFIO ANÔNIMO — e o dano residual que ela deixa.
--
-- Bloquear o anônimo por completo seria a opção mais segura, mas mataria o
-- fluxo principal do MVP: gravar sem login e mandar o link para um amigo
-- (src/features/audio/AudioRecorder.tsx -> createChallenge). Isso é regra de
-- produto, não decisão de engenharia — então o anônimo CONTINUA PERMITIDO,
-- com o dano reduzido em vez de eliminado.
--
-- Por que não dá para fazer melhor com as peças disponíveis:
--   Uma linha anônima não tem dono. Não existe, no Postgres, nada que ligue
--   "quem inseriu aquele resultado" a "quem está inserindo este desafio" —
--   `auth.uid()` é NULL nos dois casos, o IP não chega de forma confiável pelo
--   PostgREST, e qualquer pseudo-id vindo do browser é escolhido pelo próprio
--   atacante (mesmo argumento já registrado em 20260807000011, seção 5).
--
-- Mitigação aplicada: janela de 60 minutos desde `created_at`. O fluxo
-- legítimo cria o desafio segundos depois de gravar (AudioRecorder mantém o
-- resultado em estado e o botão "Desafiar" fica ao lado); um atacante precisa
-- descobrir o uuid de um resultado anônimo E agir dentro da janela.
--
-- CUSTO DE UX ACEITO: um anônimo que deixe a aba aberta por mais de uma hora
-- antes de clicar em "Desafiar" recebe erro. O erro é visível
-- (AudioRecorder.tsx:144-147 mostra "Erro ao criar desafio"), não é falha
-- silenciosa, e a saída é regravar. Uma janela maior tornaria a mitigação
-- decorativa; uma menor quebraria uso normal.
--
-- Alternativa descartada: permitir apenas UM desafio por resultado anônimo
-- (sem janela de tempo). Resolveria o roubo, mas criaria negação de serviço —
-- o atacante "queima" o resultado antes do dono usá-lo. Trocaria um dano por
-- outro pior.
--
-- DANO RESIDUAL ACEITO: dentro desses 60 minutos, quem conseguir o `id` de um
-- resultado anônimo (via feed da comunidade, por exemplo) pode criar um
-- desafio em cima dele. O efeito é criar um link de duelo exibindo o score de
-- um desconhecido. Não há conta envolvida, não gera XP, não altera perfil, não
-- expõe nada que o feed já não exponha, e o `player_name` mostrado é o que a
-- própria pessoa digitou publicamente. Fechar isso de verdade exige
-- identidade — ou seja, exigir login para desafiar.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Enable insert for anonymous users" ON public.desafios;
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.desafios;
DROP POLICY IF EXISTS "Enable insert for owner of challenger result" ON public.desafios;

CREATE POLICY "Enable insert for owner of challenger result"
ON public.desafios FOR INSERT
TO anon, authenticated
WITH CHECK (public.can_use_as_challenger(challenger_result_id));

-- Observação sobre o UPDATE: a policy "Enable update for everyone"
-- (20260807000010) segue aberta de propósito — responder a um desafio é
-- justamente a ação de quem recebeu o link e pode não ter conta. O
-- `challenged_result_id`, esse sim, é um resultado que o respondente acabou de
-- gravar; amarrá-lo à posse repetiria o mesmo impasse do anônimo sem ganho
-- real, já que um desafio só pode ser respondido uma vez (trigger
-- `protect_desafio_fields`, 20260807000010).
