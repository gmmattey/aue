import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { useDispositivo, useInstalacaoDisponivel } from '../../shared/desktop/useDispositivo';
import { instalar } from '../../shared/desktop/instalacao';

/**
 * O que quem chega pelo desktop vê.
 *
 * ELA É UMA LANDING PAGE, NÃO UM MURO — e essa é a decisão central deste
 * arquivo.
 *
 * O Googlebot renderiza como desktop. Se esta tela fosse só "abra no celular",
 * seria ISSO que o Google indexaria — e o SEO do produto inteiro viraria uma
 * frase pedindo para a pessoa ir embora. Como o app é uma SPA sem HTML
 * estático, esta tela é o ÚNICO conteúdo indexável que existe. Ela precisa
 * explicar o produto de verdade.
 *
 * Daí a ordem: o que é o Auê, como funciona, e só então — no rodapé, sem
 * drama — a observação de que a experiência é melhor no telefone. "Melhor no
 * celular" é uma nota de rodapé, não a mensagem.
 *
 * O QUE ELA NÃO BLOQUEIA: `/b/:code`, `/d/:id` e `/privacidade`. Ver o
 * roteador em `App.tsx` — o link de uma batalha cai no notebook do trabalho o
 * tempo todo, e gravar funciona no desktop (o `getUserMedia` existe lá). Não
 * há motivo para impedir alguém de participar.
 */
export const TelaDesktop: React.FC = () => {
  const { ehIosSafari } = useDispositivo();
  const podeInstalar = useInstalacaoDisponivel();
  const [instalando, setInstalando] = useState(false);

  const aoInstalar = async () => {
    setInstalando(true);
    try {
      await instalar();
    } finally {
      setInstalando(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="appbar">
        <span className="appbar-title">Auê!</span>
      </header>

      <main
        className="screen"
        style={{ gap: 'var(--space-5)', paddingBottom: 'var(--space-6)' }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 34,
            lineHeight: 1.05,
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Auê: grave seu arroto e receba a nota
        </h1>

        {/*
          Estes parágrafos são o conteúdo que o buscador lê. Escritos para
          pessoa, com as palavras que a pessoa digita: arroto, nota, medir,
          campeonato, quem arrota mais alto.
        */}
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--fg)', margin: 0 }}>
          O Auê é um juiz de arroto que cabe no navegador. Você grava, ele ouve e
          devolve uma nota de 0 a 100 — analisando duração, potência,
          profundidade e textura do som. Sem cadastro, sem formulário, sem
          instalar nada para começar.
        </p>

        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--muted)', margin: 0 }}>
          Depois da nota vem a parte boa: você manda o link para um amigo, ele
          ouve o seu arroto, grava a resposta e devolve. A batalha fica em pé por
          7 dias e mais gente pode entrar pelo mesmo link. É o campeonato de
          arroto do grupo, resolvido no WhatsApp — e no fim dá para saber, com
          número, quem arrota mais alto.
        </p>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            Como funciona
          </h2>
          <ol
            style={{
              margin: 0,
              paddingLeft: '1.2em',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              fontSize: 14.5,
              lineHeight: 1.55,
              color: 'var(--muted)',
            }}
          >
            <li>Abra o Auê no celular e toque na bolha para gravar.</li>
            <li>Diga se foi depois de bebida, de comida ou puxando ar — isso pesa na nota.</li>
            <li>Receba o veredito e chame um amigo para a revanche.</li>
          </ol>
        </section>

        <section
          style={{
            padding: 'var(--space-5)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            Levar para o celular
          </h2>

          {/*
            Três caminhos, e NENHUM botão morto.

            Um botão de instalar que não faz nada é pior do que não ter botão:
            a pessoa toca, nada acontece, e ela conclui que o site está
            quebrado. Então cada situação tem a sua resposta honesta.
          */}
          {podeInstalar ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={aoInstalar}
              disabled={instalando}
            >
              {instalando ? 'Abrindo...' : 'Instalar o Auê'}
            </button>
          ) : ehIosSafari ? (
            <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--muted)', margin: 0 }}>
              No iPhone e no iPad, o Safari instala pelo menu: toque em{' '}
              <strong>Compartilhar</strong> e depois em{' '}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
          ) : (
            <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--muted)', margin: 0 }}>
              Seu navegador não oferece instalação de aplicativos. No Chrome ou
              no Edge aparece um botão aqui — mas nada impede de usar o Auê
              direto pelo navegador, é a mesma coisa.
            </p>
          )}

          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--muted)', margin: 0 }}>
            O Auê foi feito para o celular: a gravação precisa do microfone perto
            da boca, e a brincadeira é passar o telefone de mão em mão. Funciona
            no computador, mas rende bem menos.
          </p>
        </section>

        <footer
          style={{
            marginTop: 'auto',
            paddingTop: 'var(--space-5)',
            borderTop: '1px solid var(--border)',
            fontSize: 13,
            color: 'var(--muted)',
          }}
        >
          <Link to="/privacidade" style={{ color: 'var(--muted)', textDecoration: 'underline' }}>
            Política de privacidade e uso
          </Link>
        </footer>
      </main>
    </div>
  );
};
