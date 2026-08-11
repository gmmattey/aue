import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { configuracaoAusente } from './db/supabase'
import { garantirSessao } from './shared/auth/sessaoAnonima'
import { TelaDeConfiguracaoAusente } from './shared/components/TelaDeConfiguracaoAusente'

const raiz = createRoot(document.getElementById('root')!)

/*
  Barreira de configuração, ANTES de montar o app.

  `db/supabase` deixou de lançar com credencial vazia justamente para chegar
  até aqui: antes, o import explodia e o navegador ficava com a página em
  branco, sem uma palavra sobre o motivo. Agora ele relata e a tela explica.

  Note que `App` não é montado neste caminho — então nenhuma requisição sai
  para o endereço de placeholder.

  ------------------------------------------------------------------------
  CONSEQUÊNCIA DE BUILD QUE VOCÊ PRECISA CONHECER ANTES DE PUBLICAR
  ------------------------------------------------------------------------
  `configuracaoAusente` deriva de `import.meta.env.VITE_SUPABASE_*`, que são
  substituídas em TEMPO DE BUILD. Logo, este `if` é uma constante para o
  empacotador, e ele elimina o ramo morto:

    - Build COM as variáveis  -> `App` entra no bundle, esta tela some dele.
    - Build SEM as variáveis  -> só esta tela entra. O `App` NÃO É EMPACOTADO.

  Ou seja: um deploy feito sem as variáveis configuradas publica um bundle que
  contém apenas a mensagem de erro, e NENHUMA configuração feita depois no
  painel conserta — é preciso um build novo. Verificado: sem as variáveis o
  chunk principal sai com 433 KB e nenhuma string do app; com elas, 526 KB e
  tudo lá dentro.

  Isso não é um defeito a corrigir, é a natureza de `VITE_*`. Está escrito aqui
  porque o sintoma ("publiquei e só aparece a tela de erro, mesmo depois de
  configurar") é confuso, e a saída é sempre a mesma: configure as variáveis em
  Production E Preview, e rode um NOVO build.
*/
if (configuracaoAusente) {
  raiz.render(
    <StrictMode>
      <TelaDeConfiguracaoAusente variavel={configuracaoAusente} />
    </StrictMode>,
  )
} else {
  /*
    Sessão anônima ANTES do primeiro render, e sem `await`.

    Sem await de propósito: a criação da sessão é uma ida à rede e o app não
    depende dela para desenhar o primeiro quadro. `App` e `AudioRecorder` já
    assinam `onAuthStateChange` desde antes — os dois recebem o `SIGNED_IN`
    quando ele chegar, sem nenhuma mudança neles.

    Fora de qualquer efeito de React de propósito: sob StrictMode os efeitos
    rodam duas vezes em desenvolvimento, e aqui isso significaria dois usuários
    criados por recarga. Ver `sessaoAnonima.ts`.
  */
  void garantirSessao()

  raiz.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
