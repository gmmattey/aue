import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../db/supabase';

/**
 * A identidade do MVP: uma sessão anônima criada no boot, sem nada na tela.
 *
 * POR QUE ISTO EXISTE
 * -------------------
 * Decisão de produto (Luiz): o MVP não tem login. O usuário abre o site, toca
 * na bolha e grava. Nenhum formulário, nenhum consentimento além da permissão
 * de microfone que o próprio aparelho pede.
 *
 * Só que sem NENHUMA sessão o produto não fecha. A policy de INSERT do bucket
 * `audio_records` é `TO authenticated` e o caminho do arquivo é
 * `${auth.uid()}/${result.id}` (20260807000013 / 000027): sem `auth.uid()` o
 * áudio não sobe. O resultado existiria, com nota e tudo, mas MUDO — e o
 * duelo, que é o produto inteiro, depende de o amigo ouvir o arroto.
 *
 * `signInAnonymously()` resolve isso emitindo um `auth.uid()` de verdade, com
 * JWT assinado e role `authenticated`. Toda a RLS que já existe passa a valer
 * sem uma única policy reescrita. Ver o cabeçalho da migração
 * `20260807000029_login_anonimo.sql`.
 *
 * O QUE NÃO É
 * -----------
 * Não é privacidade e não é segurança de conta. É identidade de aparelho: quem
 * limpar o armazenamento do navegador vira outra pessoa para o app (ver
 * `esquecerSessao` abaixo). É o preço de não ter cadastro, e está dito na
 * política de privacidade em vez de escondido.
 *
 * O CAMINHO DE SAÍDA, quando o login voltar no MVP 2: `linkIdentity()` ou
 * `updateUser({ email })` PROMOVEM a conta anônima preservando o mesmo uid —
 * o histórico do usuário sobrevive ao cadastro. Um `signInWithOAuth` puro
 * criaria uma segunda conta e ele perderia tudo o que gravou. Isso é o melhor
 * argumento a favor deste desenho e o motivo de `FLAGS.loginSocial` vir com um
 * aviso no `.env.example`.
 */

/**
 * Por que uma promessa de módulo, e não um `useEffect`.
 *
 * Sob `StrictMode`, o React monta, desmonta e remonta cada componente em
 * desenvolvimento — efeitos rodam DUAS vezes. Um `signInAnonymously()` dentro
 * de efeito criaria dois usuários em `auth.users`, dois perfis e duas linhas
 * de lixo por recarga de página. A promessa guardada no módulo torna a chamada
 * idempotente por construção: a segunda chamada recebe a primeira promessa,
 * não uma segunda requisição.
 */
let promessa: Promise<Session | null> | null = null;

/**
 * Por que a sessão não existe, quando não existe. `null` enquanto estiver tudo
 * bem (ou antes da primeira tentativa).
 *
 * O caso que importa é `anonymous_provider_disabled`: o provedor anônimo está
 * DESLIGADO no painel do Supabase. Acontece silenciosamente e o sintoma é
 * distante da causa — "o áudio não sobe", que parece problema de Storage.
 */
export let motivoSemSessao: string | null = null;

/**
 * Garante que existe uma sessão, criando uma anônima se preciso.
 *
 * NUNCA lança. Devolve `null` quando não deu, e o app segue no modo degradado:
 * gravar funciona, a nota aparece, o áudio não sobe. Esse modo não é um
 * acidente — é exatamente o comportamento que o app tinha antes do login
 * anônimo, e é por isso que nenhum ramo `if (!session)` do código foi apagado
 * quando esta função entrou. Eles são o fallback.
 */
export function garantirSessao(): Promise<Session | null> {
  if (promessa) return promessa;

  promessa = (async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session) {
        motivoSemSessao = null;
        return data.session;
      }

      const { data: nova, error: erroLogin } = await supabase.auth.signInAnonymously();
      if (erroLogin) throw erroLogin;

      motivoSemSessao = null;
      return nova.session;
    } catch (err) {
      /*
        Falhar aqui não pode derrubar o app. A causa mais provável é de
        configuração (provedor anônimo desligado no painel), e a segunda mais
        provável é rede — nenhuma das duas justifica uma tela de erro para
        quem só queria arrotar no telefone.
      */
      motivoSemSessao = err instanceof Error ? err.message : String(err);
      console.error(
        'Não foi possível criar a sessão anônima. O app segue sem sessão: ' +
          'grava e mostra a nota, mas o áudio não sobe e o duelo fica mudo. ' +
          'Confira Authentication > Providers > Anonymous sign-ins no painel do Supabase.',
        err,
      );
      return null;
    }
  })();

  return promessa;
}

/**
 * Descarta a sessão local e permite que a próxima chamada crie outra.
 *
 * Existe para a política de privacidade ter um botão de verdade atrás dela: é
 * o mais perto de "me esqueça" que dá para oferecer sem cadastro. O que ela
 * NÃO faz, e a tela precisa dizer: não apaga nada do servidor. Os resultados
 * já gravados continuam lá, com o uid antigo — o que se perde é o vínculo,
 * inclusive a capacidade de apagar o próprio áudio depois.
 */
export async function esquecerSessao(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } finally {
    promessa = null;
    motivoSemSessao = null;
  }
}
