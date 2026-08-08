import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Política de privacidade e uso.
 *
 * O QUE ESTE ARQUIVO É: a descrição HONESTA do que o app faz com o áudio e com
 * a identidade das pessoas. Cada afirmação aqui corresponde a comportamento
 * verificável no código ou nas migrações, e está anotada com onde conferir.
 *
 * O QUE ELE NÃO É: um documento jurídico revisado. Os campos que dependem de
 * decisão do titular — quem é o controlador dos dados e como falar com ele —
 * estão marcados abaixo e precisam ser preenchidos por Luiz antes do
 * lançamento. Inventar um endereço ou uma razão social aqui seria pior do que
 * deixar em branco.
 *
 * ALCANÇÁVEL DE TODO LUGAR, e não só do desktop. A intenção original era manter
 * a política só na versão desktop, mas o aviso de uma linha do `AudioRecorder`
 * precisa levar a algum lugar, e a lei brasileira não distingue dispositivo. O
 * que a versão mobile não tem é um item de MENU para cá — só o link dentro do
 * aviso, no momento em que ele importa.
 */
export const PoliticaDePrivacidade: React.FC = () => {
  const contato = import.meta.env.VITE_CONTATO_PRIVACIDADE as string | undefined;

  return (
    <div className="app-shell">
      <header className="appbar">
        <Link to="/" style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="appbar-title">Auê!</span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Privacidade e uso
          </span>
        </Link>
      </header>

      <main className="screen" style={{ gap: 'var(--space-5)', paddingBottom: 'var(--space-6)' }}>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
          Em linguagem direta, sem letra miúda. Se algo aqui não bater com o que
          o app faz, o errado é o app.
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
            continuam existindo, mas deixam de ser reconhecidas como suas — o
            que inclui perder a possibilidade de apagá-las pelo app.
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
            endereço do áudio é assinado e temporário, mas a chave pública do
            app é, por natureza, pública — então qualquer pessoa com
            conhecimento técnico consegue ouvir qualquer gravação que não tenha
            sido escondida. Se você não quer que algo seja ouvido, não grave.
          </p>
          <p>
            Você pode apagar a sua gravação logo depois de gravá-la, no botão
            "Apagar meu áudio". Ela sai do ar na hora. Quem já tiver baixado o
            arquivo, porém, continua com ele — isso vale para qualquer coisa
            publicada em qualquer lugar da internet.
          </p>
        </Secao>

        <Secao titulo="Os áudios ficam guardados">
          <p>
            As gravações não são apagadas automaticamente. Elas ficam guardadas
            para formar um acervo de arrotos que deve alimentar um feed público
            no futuro. Quando isso acontecer, será anunciado — e esta página será
            atualizada antes.
          </p>
          <p>
            O <strong>link</strong> de uma batalha, esse sim, para de funcionar
            depois de 7 dias. É o link que expira, não a gravação.
          </p>
        </Secao>

        <Secao titulo="Denúncia e moderação">
          <p>
            Toda gravação tem um botão de denúncia. Quando três pessoas
            diferentes denunciam a mesma gravação, ela é escondida
            automaticamente e deixa de tocar para qualquer pessoa. Uma decisão
            tomada à mão sobre uma gravação não é desfeita por denúncias
            posteriores.
          </p>
        </Secao>

        <Secao titulo="O que o Auê não faz">
          <ul style={{ margin: 0, paddingLeft: '1.2em', display: 'grid', gap: 6 }}>
            <li>Não usa Google Analytics nem nenhuma ferramenta de rastreamento.</li>
            <li>Não tem pixel de rede social nem cookie de publicidade.</li>
            <li>Não pede acesso a contatos, câmera, localização ou arquivos.</li>
            <li>Não vende, aluga nem compartilha gravações com terceiros.</li>
            <li>Não exibe anúncios nesta versão.</li>
          </ul>
        </Secao>

        <Secao titulo="Quem gravou junto">
          <p>
            Na disputa presencial, uma pessoa usa o próprio aparelho para gravar
            várias. Quem opera o aparelho é responsável por avisar as demais de
            que estão sendo gravadas e de que o áudio fica guardado. O app não
            tem como pedir isso a cada uma.
          </p>
        </Secao>

        <Secao titulo="Seus direitos">
          <p>
            A Lei Geral de Proteção de Dados garante a você acesso, correção e
            exclusão dos seus dados. Como o Auê não guarda nenhum dado de
            identificação, o pedido prático é a exclusão de uma gravação —
            possível pelo próprio app logo após gravar, ou pelo contato abaixo.
          </p>
          {contato ? (
            <p>
              Para pedidos, escreva para{' '}
              <a href={`mailto:${contato}`} style={{ color: 'var(--accent)' }}>
                {contato}
              </a>
              . Informe o link da batalha e a posição da gravação — sem eles, não
              há como localizar o áudio, justamente porque não guardamos nada que
              identifique você.
            </p>
          ) : (
            /*
              Sem `VITE_CONTATO_PRIVACIDADE` configurada, a página NÃO inventa um
              endereço. Mesmo critério da tela "Apagar minha conta" em
              SettingsScreen: declarar indisponível é melhor do que oferecer um
              caminho que não existe. Isto é um item de lançamento.
            */
            <p style={{ color: 'var(--danger)' }}>
              O canal de contato ainda não foi configurado nesta publicação.
            </p>
          )}
        </Secao>

        <Secao titulo="Regras de uso">
          <p>
            O Auê é uma brincadeira. Não envie gravações com voz de terceiros sem
            que eles saibam, conteúdo sexual, discurso de ódio, ameaça, ou
            qualquer coisa que você não mandaria no grupo da família. Gravações
            denunciadas são escondidas, e o acesso pode ser bloqueado.
          </p>
          <p>
            O serviço é oferecido como está, de graça e sem garantia de
            disponibilidade. Ele pode sair do ar, mudar ou acabar.
          </p>
        </Secao>

        <Secao titulo="Quem responde por isto">
          {/*
            PENDÊNCIA DE LANÇAMENTO: identificação do controlador dos dados.
            Só Luiz pode preencher (pessoa física ou empresa, e como quer ser
            identificado publicamente). Deixar o aviso visível é deliberado —
            some no momento em que for preenchido, e não antes.
          */}
          <p style={{ color: 'var(--danger)' }}>
            A identificação do responsável pelo tratamento dos dados ainda não foi
            publicada.
          </p>
        </Secao>

        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
          Esta página muda junto com o app. Quando algo relevante mudar, o texto
          muda antes.
        </p>

        <Link to="/" className="btn btn-secondary">
          Voltar ao Auê
        </Link>
      </main>
    </div>
  );
};

const Secao: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
    <h2
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 17,
        textTransform: 'uppercase',
        margin: 0,
      }}
    >
      {titulo}
    </h2>
    <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--muted)', display: 'grid', gap: 10 }}>
      {children}
    </div>
  </section>
);
