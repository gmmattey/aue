import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';

import { ChallengeView } from './features/audio/ChallengeView';
import { TelaDesktop } from './features/desktop/TelaDesktop';
import { PoliticaDePrivacidade } from './features/legal/PoliticaDePrivacidade';
import { TermosDeUso } from './features/legal/TermosDeUso';
import { ComoJogar } from './features/publico/ComoJogar';
import { ComoArrotar } from './features/publico/ComoArrotar';
import { AvisoDeOffline } from './shared/components/AvisoDeOffline';
import { useDispositivo } from './shared/desktop/useDispositivo';
import { Arena } from './arena/Arena';


/**
 * Quem entra pela raiz: a landing no desktop, o app no celular.
 *
 * O gate embrulha SÓ esta rota. `/b/:code`, `/d/:id` e `/privacidade` abrem
 * igual em qualquer aparelho — o link de uma batalha cai no notebook do
 * trabalho o tempo todo, e gravar funciona no desktop. Bloquear ali seria
 * impedir alguém de participar de uma disputa para a qual foi convidado.
 */
/**
 * A SEGUNDA PORTA DE ENTRADA DO JOGO: alguém abrindo um link de desafio.
 *
 * Com a chave ligada, a Arena monta no confronto. Desligada — que é o padrão —
 * o link continua caindo no fluxo de hoje, intacto: ninguém que já tem um link
 * na mão pode ficar sem resposta por causa de uma feature que ainda não subiu.
 *
 * Quem lê a URL é este componente. A Arena recebe o código pronto e continua
 * sem saber o que é rota.
 */
function EntradaPorLink() {
  const { code } = useParams<{ code: string }>();
  const { ehDesktop } = useDispositivo();

  
  /*
    O gate de desktop NÃO vale aqui. O link chega por mensagem e a pessoa abre
    onde estiver — mandar ela "pegar o celular" depois de ter sido chamada para
    uma briga é perder a briga.
  */
  void ehDesktop;
  return <Arena codigoDoDesafio={code} />;
}

function EntradaPrincipal() {
  const { ehDesktop } = useDispositivo();

  /*
    A ARENA ENTRA POR AQUI, E SÓ COM A CHAVE LIGADA.

    `VITE_FEATURE_ARENA` vem desligada por padrão, como toda flag da casa. Sem
    ela — que é o caso da produção enquanto a Arena não cobre o loop — a raiz
    serve exatamente o que servia antes, sem uma vírgula de diferença.

    Uma coisa ou outra, nunca as duas: a Arena é uma superfície de estado, e
    montar as telas antigas por baixo dela seria manter dois donos do
    microfone na mesma página.

    O gate de desktop continua valendo por cima: a Arena é desenhada para
    celular, e o desktop segue sendo a ponte que manda a pessoa para o telefone.
  */
  if (ehDesktop) return <TelaDesktop />;
  return <Arena />;
}

export function App() {
  return (
    <>
      {/*
        FORA do Router de propósito: o aviso de rede não depende de rota nenhuma
        e vale igual na batalha, na gravação e na política. Fica em posição fixa,
        por cima, sem bloquear nada — ver o componente.
      */}
      <AvisoDeOffline />
      <Router>
        <Routes>
          {/*
            Batalha em sessão — o duelo do MVP. Todo link novo aponta para cá.
          */}
          <Route path="/b/:code" element={<EntradaPorLink />} />
          {/*
            Desafio de turno único — LEGADO. Fica no ar indefinidamente porque
            links /d/CODIGO já podem ter sido compartilhados, e um link que
            alguém mandou no WhatsApp não deixa de existir porque o produto
            mudou de ideia.
          */}
          <Route path="/d/:id" element={<ChallengeView />} />
          {/*
            As duas páginas legais ficam FORA do gate de desktop de propósito: o
            aviso de uma linha do AudioRecorder aponta para /privacidade e é
            lido no celular, e um link de termos mandado para um revisor de
            AdSense pode cair em qualquer aparelho.

            Cada uma tem também um HTML de entrada próprio na raiz do projeto
            (`privacidade.html`, `termos.html`), servido pela hospedagem quando
            a URL é aberta direto — é dali que vem o `canonical` verdadeiro de
            cada uma. Estas rotas aqui são o que responde na navegação interna,
            sem recarregar a página.
          */}
          <Route path="/privacidade" element={<PoliticaDePrivacidade />} />
          <Route path="/termos" element={<TermosDeUso />} />
          {/*
            `/como-jogar` — a página que explica o jogo para quem chegou pelo
            buscador. Fora do gate de desktop pelo mesmo motivo das legais: ela
            é conteúdo público, e conteúdo público abre em qualquer aparelho.

            Não é estado da Arena e não é alcançável de dentro dela. Ver
            `src/features/publico/ComoJogar.tsx`.
          */}
          <Route path="/como-jogar" element={<ComoJogar />} />
          {/*
            `/como-arrotar` — a página que responde a busca de quem ainda nem
            conhece o Auê ("como arrotar", "como arrotar alto"). Mesmo lugar da
            de cima: conteúdo público, fora do gate de desktop, fora da Arena.

            Ver `src/features/publico/ComoArrotar.tsx`.
          */}
          <Route path="/como-arrotar" element={<ComoArrotar />} />
          <Route path="*" element={<EntradaPrincipal />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
