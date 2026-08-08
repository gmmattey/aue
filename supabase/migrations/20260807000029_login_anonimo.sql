-- =============================================================================
-- Login anônimo: o selo de fundador deixa de ser concedido a visitante.
--
-- CONTEXTO. Decisão de produto (Luiz): o MVP não tem login. Nenhum formulário,
-- nenhum consentimento além da permissão de microfone do próprio aparelho. A
-- identidade passa a vir de `supabase.auth.signInAnonymously()`, disparado
-- invisivelmente no boot do app (`src/shared/auth/sessaoAnonima.ts`).
--
-- POR QUE ESSE CAMINHO, E NÃO UM `device_id` DE NAVEGADOR. A 20260807000011
-- (seção 5) e a 20260807000016 (linhas 62-70) já rejeitaram pseudo-id gerado no
-- cliente, e pelo motivo certo: ele é escolhido pelo próprio atacante, então
-- daria uma falsa sensação de limite. O login anônimo dá um `auth.uid()` REAL,
-- emitido pelo GoTrue, com JWT assinado. E dá um segundo ganho, maior: o role
-- do JWT é `authenticated`, então TODA a RLS existente — Storage,
-- `definir_audio_do_resultado`, `denuncias`, `can_use_as_challenger` — passa a
-- funcionar sem que uma única policy precise ser reescrita.
--
-- É por isso que esta migração é tão pequena. Ela conserta a ÚNICA coisa que o
-- login anônimo quebra no banco.
--
-- O QUE QUEBRA. `handle_new_user()` é um trigger AFTER INSERT em `auth.users`,
-- sem filtro nenhum — ele dispara para usuário anônimo também. Hoje ele chama
-- `aue_vaga_de_fundador_disponivel()` para todo mundo. Com login anônimo, as
-- 500 vagas do corte de fundador (20260807000024) seriam consumidas por
-- VISITANTES nas primeiras horas — muitos deles a mesma pessoa em abas
-- diferentes, ou a mesma pessoa depois de limpar o navegador. O selo morreria
-- no primeiro dia, sem que ninguém que se cadastrasse de verdade o recebesse.
--
-- O QUE ESTA MIGRAÇÃO NÃO FAZ, DELIBERADAMENTE:
--
--   1. NÃO apaga usuários anônimos antigos, e a documentação do Supabase
--      sugere fazer isso.
--
--      VERIFICADO NO BANCO em 2026-08-08, e o resultado é diferente do que se
--      supõe: `profiles.id` referencia `auth.users` com ON DELETE CASCADE (o
--      perfil some), mas `resultados.user_id`, `batalhas.owner_id` e
--      `rodadas_batalha.user_id` são todos ON DELETE SET NULL. Ou seja, o
--      conteúdo NÃO é apagado junto — ele fica ÓRFÃO.
--
--      Isso é pior do que apagar, não melhor. Uma batalha compartilhada no
--      WhatsApp continua no ar, mas todo mundo nela vira "Anônimo", e ninguém
--      consegue mais apagar o próprio áudio (`remover_audio_do_resultado`
--      exige que o resultado seja seu). Um teste real deste cenário deixou 6
--      resultados, 2 batalhas e 5 rodadas sem dono nenhum.
--
--      Se um dia a limpeza for necessária, ela precisa decidir o que fazer com
--      o conteúdo antes — não é um DELETE em `auth.users`.
--
--   2. NÃO mexe em policy nenhuma. Ver acima: `TO authenticated` já cobre
--      anônimo. Se algo parecer precisar de policy nova, releia o JWT antes de
--      escrever a policy — provavelmente já funciona.
--
-- SE APARECER ABUSO. O cadastro anônimo é criação de linha sem custo para quem
-- ataca. O primeiro botão a apertar é CAPTCHA para sign-in anônimo, no painel
-- (Authentication > Settings), não uma mudança de schema. Não é bloqueante para
-- o lançamento.
--
-- PRÉ-REQUISITO DE PAINEL, sem o qual o app inteiro degrada em silêncio:
--   Authentication > Providers > Anonymous sign-ins LIGADO.
--   Desligado, `signInAnonymously()` devolve 422 `anonymous_provider_disabled`,
--   o app cai no modo sem sessão (grava e mostra a nota, mas o áudio não sobe)
--   e o duelo fica mudo.
--
-- VERIFICAR DEPOIS DE APLICAR:
--   1. select count(*) from public.profiles p
--        join auth.users u on u.id = p.id
--       where p.is_founder and u.is_anonymous;
--      -> DEVE ser 0, sempre.
--   2. select count(*) from public.profiles where is_founder;
--      -> NÃO pode subir conforme visitantes anônimos entram no site.
--   3. npm test -- o `deriva-de-funcoes.migracoes.test.ts` precisa continuar
--      verde: ele lê a ÚLTIMA definição de handle_new_user() (que passa a ser
--      esta) e exige `SET search_path` e a delegação a
--      `aue_vaga_de_fundador_disponivel()`.
--
-- VALIDADO: aplicada com sucesso num Postgres 17.6 real (projeto Supabase do
-- Auê, 2026-08-08), junto com as 31 anteriores, na ordem, sem erro. O
-- comportamento foi exercitado ponta a ponta por RPC com sessões anônimas
-- reais — ver o resumo no docs/lancamento.md.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- ATENÇÃO — esta é a QUINTA definição de `handle_new_user()`.
--
-- As anteriores: 20260807000001, 000004, 000022, 000024. Cada uma recopiou o
-- corpo para mexer num detalhe. É exatamente o padrão que fez o acúmulo de XP
-- se perder DUAS vezes em `protect_profile_stats()` — ver o cabeçalho de
-- `src/features/gamification/deriva-de-funcoes.migracoes.test.ts`.
--
-- Se você está aqui para mudar a regra do selo de fundador: NÃO mexa nesta
-- função. A regra mora em `aue_vaga_de_fundador_disponivel()`, e ela foi
-- extraída na 20260807000024 justamente para que esta função não precisasse
-- ser recopiada de novo. Esta migração recopia o corpo porque precisa de uma
-- informação que só existe em `NEW` (se o usuário é anônimo), e não dentro da
-- função da vaga.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  /*
    Leitura por `to_jsonb(NEW)` em vez de `NEW.is_anonymous`, de propósito.

    `auth.users` é schema gerenciado pelo Supabase: a coluna `is_anonymous`
    chegou junto com o suporte a login anônimo no GoTrue. Referenciá-la por
    nome faz a função DEIXAR DE COMPILAR num projeto cuja versão do GoTrue
    ainda não a tenha — e o erro apareceria na criação de conta, ou seja, no
    primeiro acesso de todo usuário novo.

    Pelo jsonb, coluna ausente vira NULL e o COALESCE resolve para `false`:
    degrada para o comportamento anterior a esta migração, em vez de quebrar.
  */
  v_anonimo boolean := COALESCE((to_jsonb(NEW) ->> 'is_anonymous')::boolean, false);
BEGIN
  INSERT INTO public.profiles (id, apelido, avatar_url, is_founder)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Arrotador ' || substr(NEW.id::text, 1, 6)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    /*
      CASE, e não `NOT v_anonimo AND public.aue_vaga_de_fundador_disponivel()`.

      O Postgres NÃO garante avaliação em curto-circuito de AND — ele pode
      avaliar o lado direito primeiro. E o lado direito aqui não é puro: a
      função toma `pg_advisory_xact_lock`. Com a forma AND, todo cadastro
      anônimo disputaria um lock que não deveria nem tocar, serializando a
      criação de contas no exato caminho que precisa ser barato.

      CASE tem ordem de avaliação garantida pela linguagem.
    */
    CASE
      WHEN v_anonimo THEN false
      ELSE public.aue_vaga_de_fundador_disponivel()
    END
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Cria public.profiles para todo usuário de auth.users. Visitante anônimo '
  '(signInAnonymously) NUNCA recebe o selo de fundador: as 500 vagas são para '
  'quem se cadastra de fato. A regra das vagas mora em '
  'aue_vaga_de_fundador_disponivel() — não a recopie aqui.';
