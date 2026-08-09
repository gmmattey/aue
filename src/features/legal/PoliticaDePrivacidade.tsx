import React from 'react';

import { LayoutLegal, QuemResponde, RodapeLegal, Secao } from './LayoutLegal';
import { ANUNCIOS_ATIVOS } from './anunciosAtivos';

/**
 * Política de privacidade.
 *
 * O QUE ESTE ARQUIVO É: a descrição HONESTA do que o app faz com o áudio e com
 * a identidade das pessoas. Cada afirmação aqui corresponde a comportamento
 * verificável no código ou nas migrações, e está anotada com onde conferir.
 *
 * O QUE ELE NÃO É: um documento jurídico revisado por advogado.
 *
 * O responsável publicado é a Buildea Labs, decidido por Luiz em 2026-08-08 —
 * ver `QuemResponde` em `LayoutLegal.tsx`. O único ramo vermelho que sobrou é o
 * do canal de contato, e ele só aparece quando a build sai sem
 * `VITE_CONTATO_PRIVACIDADE`.
 *
 * AS REGRAS DE USO SAÍRAM DAQUI para `/termos` (`TermosDeUso.tsx`). Esta página
 * fala do que acontece com o dado; a outra, do que a pessoa pode e não pode
 * fazer. Ver o cabeçalho de `LayoutLegal.tsx` para o porquê de serem duas rotas.
 *
 * ALCANÇÁVEL DE TODO LUGAR, e não só do desktop. A lei brasileira não distingue
 * dispositivo, e o aviso de uma linha do `AudioRecorder` precisa levar a algum
 * lugar. O que a versão mobile não tem é um item de MENU para cá — só o link
 * dentro do aviso, no momento em que ele importa.
 */
export const PoliticaDePrivacidade: React.FC = () => {
  const contato = import.meta.env.VITE_CONTATO_PRIVACIDADE as string | undefined;

  return (
    <LayoutLegal rotulo="Privacidade">
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
        Em linguagem direta, sem letra miúda. Se algo aqui não bater com o que o
        app faz, o errado é o app.
      </p>

      <Secao titulo="O Auê não pede cadastro">
        <p>
          Não existe login, senha, e-mail ou formulário. Ao abrir o site, o app
          cria automaticamente uma identidade anônima para o seu aparelho, só
          para conseguir guardar a sua gravação e ligá-la à sua batalha. Essa
          identidade não tem nome, e-mail nem qualquer dado seu.
        </p>
        <p>
          Se você limpar os dados do navegador, essa identidade se perde e você
          passa a ser tratado como uma pessoa nova. As gravações antigas
          continuam existindo, mas deixam de ser reconhecidas como suas — o que
          inclui perder a possibilidade de apagá-las pelo app.
        </p>
      </Secao>

      <Secao titulo="O microfone">
        <p>
          O acesso ao microfone é pedido pelo seu próprio navegador, e só no
          momento em que você toca em gravar. Nada é capturado antes disso, e o
          microfone é liberado assim que a gravação termina. A gravação dura no
          máximo 10 segundos.
        </p>
      </Secao>

      <Secao titulo="O que acontece com o seu áudio">
        <p>
          O áudio é enviado e guardado no Auê. Ele fica disponível para quem
          abrir a batalha em que você gravou.
        </p>
        <p>
          <strong>Isso não é um segredo, e não vamos fingir que é.</strong> O
          endereço do áudio é assinado e temporário, mas a chave pública do app
          é, por natureza, pública — então qualquer pessoa com conhecimento
          técnico consegue ouvir qualquer gravação que não tenha sido escondida.
          Se você não quer que algo seja ouvido, não grave.
        </p>
        <p>
          Você pode apagar a sua gravação no botão <strong>"Apagar o meu
          arroto"</strong>. Ele aparece na tela do desafio que você criou e na
          sua linha do placar — ou seja, enquanto você tiver o link daquela
          disputa aberto no mesmo navegador. O som sai do servidor na hora, e a
          nota da disputa continua lá.
        </p>
        <p>
          <strong>Se o arquivo não sair, o app diz que não saiu.</strong> Ele
          não escreve "apagado" enquanto a gravação estiver no servidor — e você
          pode tentar de novo.
        </p>
        <p>
          Duas coisas que continuam valendo, e não temos como mudar: se você
          perder o link da disputa ou limpar os dados do navegador, o app não
          reconhece mais aquelas gravações como suas e a exclusão passa a
          depender de um pedido pelo contato abaixo. E quem já tiver baixado o
          arquivo continua com ele, o que vale para qualquer coisa publicada em
          qualquer lugar da internet.
        </p>
      </Secao>

      {/*
        RETENÇÃO — a seção mais fácil de escrever errado.

        Decisão de produto de Luiz: passados os 7 dias, o ACESSO é bloqueado e o
        ARQUIVO É MANTIDO. Não existe rotina de expurgo, nem prazo, nem plano de
        prazo. O texto anterior dizia "as gravações não são apagadas
        automaticamente", o que é verdade mas deixa a pessoa completar a frase
        sozinha com um prazo que ela imagina. Aqui isso está dito com todas as
        letras: retenção por tempo indeterminado.

        NÃO INVENTE UM PRAZO AQUI. Um prazo escrito numa política é uma promessa
        que alguém precisa cumprir com código que não existe.
      */}
      <Secao titulo="Os áudios ficam guardados, sem prazo para sair">
        <p>
          O <strong>link</strong> de uma batalha para de funcionar depois de 7
          dias. A partir daí ninguém consegue abrir aquela disputa nem ouvir o
          que foi gravado ali pelo app. <strong>O que expira é o acesso.</strong>
        </p>
        <p>
          <strong>O arquivo continua guardado.</strong> Ele não é apagado no
          sétimo dia nem depois: não existe prazo de exclusão automática, e
          inventar um aqui seria mentira. As gravações ficam para formar um
          acervo de arrotos que deve alimentar um feed público no futuro. Quando
          isso acontecer, será anunciado — e esta página será atualizada antes.
        </p>
        <p>
          Na prática: apagar é com você, e o botão está onde você vê o seu
          próprio arroto — no desafio que você criou e na sua linha do placar.
          Enquanto tiver o link da disputa e o mesmo navegador, dá para apagar
          quando quiser. Perdeu o link ou limpou o navegador, aí a exclusão
          passa a depender de um pedido pelo contato abaixo.
        </p>
      </Secao>

      <Secao titulo="Denúncia e moderação">
        <p>
          Toda gravação tem um botão de denúncia. Quando três pessoas diferentes
          denunciam a mesma gravação, ela é escondida automaticamente e deixa de
          tocar para qualquer pessoa. Uma decisão tomada à mão sobre uma gravação
          não é desfeita por denúncias posteriores.
        </p>
      </Secao>

      {/*
        ANÚNCIOS — texto DERIVADO da configuração, não escrito à mão.

        Ver `anunciosAtivos.ts`: a frase muda junto com as variáveis do AdSense,
        e `coerenciaDeAnuncios.test.tsx` monta a tela de resultado para conferir
        que os dois lados concordam. Antes, esta afirmação era uma frase solta na
        lista de "o que o Auê não faz" — e bastava preencher duas variáveis na
        Vercel para o documento legal publicado virar mentira, sem nada quebrar.
      */}
      <Secao titulo="Anúncios">
        {ANUNCIOS_ATIVOS ? (
          <>
            <p>
              Esta versão <strong>exibe anúncios do Google AdSense</strong>. Eles
              aparecem depois do conteúdo, nunca encostados nos botões de ação.
            </p>
            <p>
              Para servir esses anúncios, o Google carrega um script no seu
              navegador e pode gravar cookies ou identificadores no seu aparelho.
              Esse tratamento é do Google e segue as políticas dele, não as
              nossas. O Auê não envia ao Google a sua gravação, a sua nota nem
              qualquer coisa ligada à sua identidade anônima.
            </p>
          </>
        ) : (
          <p>
            <strong>Não exibe anúncios nesta versão.</strong> Nenhum script de
            publicidade é carregado e nenhum cookie de anúncio é gravado no seu
            aparelho.
          </p>
        )}
      </Secao>

      <Secao titulo="O que o Auê não faz">
        <ul style={{ margin: 0, paddingLeft: '1.2em', display: 'grid', gap: 6 }}>
          <li>Não usa Google Analytics nem nenhuma ferramenta de rastreamento.</li>
          <li>Não tem pixel de rede social.</li>
          <li>Não pede acesso a contatos, câmera, localização ou arquivos.</li>
          <li>Não vende, aluga nem compartilha gravações com terceiros.</li>
        </ul>
      </Secao>

      <Secao titulo="Quem gravou junto">
        <p>
          Na disputa presencial, uma pessoa usa o próprio aparelho para gravar
          várias. Quem opera o aparelho é responsável por avisar as demais de que
          estão sendo gravadas e de que o áudio fica guardado. O app não tem como
          pedir isso a cada uma.
        </p>
      </Secao>

      <Secao titulo="Seus direitos">
        <p>
          A Lei Geral de Proteção de Dados garante a você acesso, correção e
          exclusão dos seus dados. Como o Auê não guarda nenhum dado de
          identificação, o pedido prático é a exclusão de uma gravação — possível
          pelo próprio app logo após gravar, ou pelo contato abaixo.
        </p>
        {contato ? (
          <p>
            Para pedidos, escreva para{' '}
            <a href={`mailto:${contato}`} style={{ color: 'var(--accent)' }}>
              {contato}
            </a>
            . Informe o link da batalha e a posição da gravação — sem eles, não há
            como localizar o áudio, justamente porque não guardamos nada que
            identifique você.
          </p>
        ) : (
          /*
            Sem `VITE_CONTATO_PRIVACIDADE` configurada, a página NÃO inventa um
            endereço. Mesmo critério da tela "Apagar minha conta" em
            SettingsScreen: declarar indisponível é melhor do que oferecer um
            caminho que não existe.

            O valor de lançamento existe e está no `.env.example`. Este ramo
            continua de pé porque `VITE_*` é resolvida em tempo de BUILD: um
            deploy feito sem a variável no ambiente publica a política com este
            aviso vermelho, e configurá-la depois no painel não conserta — exige
            build novo. É item do checklist de lançamento, não decoração.
          */
          <p style={{ color: 'var(--danger)' }}>
            O canal de contato ainda não foi configurado nesta publicação.
          </p>
        )}
      </Secao>

      <QuemResponde />

      <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
        Esta página muda junto com o app. Quando algo relevante mudar, o texto
        muda antes.
      </p>

      <RodapeLegal paraOnde="/termos" rotulo="Ler também os termos de uso →" />
    </LayoutLegal>
  );
};
