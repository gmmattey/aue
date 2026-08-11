/**
 * O que a landing de desktop precisa oferecer, e o que ela não pode inventar.
 *
 * O Contrato MVP1 §3.2 pede "caminho claro para abrir/instalar o webapp no
 * dispositivo compatível, **preferencialmente com QR Code** para continuar no
 * celular". A landing entrega isso por dois caminhos que não dependem um do
 * outro: o QR e o endereço copiável.
 *
 * `renderToStaticMarkup` não roda efeitos, então o QR aqui aparece como o seu
 * espaço reservado (`data-od-id="qr-do-app"`), e não como a matriz. Isso é
 * suficiente para o que este arquivo protege: que o bloco esteja montado. Que o
 * código gerado seja um QR válido é assunto de `shared/desktop/qr.test.ts`; que
 * ele seja legível por uma câmera de verdade só um telefone responde.
 */
import { readFileSync, readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import { TelaDesktop } from './TelaDesktop';
import { ENDERECO_LEGIVEL } from '../../shared/enderecoPublico';

function montar(): string {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(TelaDesktop)));
}

describe('landing de desktop — levar o Auê para o celular', () => {
  it('monta o QR Code', () => {
    expect(montar()).toContain('data-od-id="qr-do-app"');
  });

  it('mostra o endereço e oferece copiar — o caminho que não depende de câmera', () => {
    // Leitor de tela, monitor com reflexo, telefone longe, WhatsApp Web na
    // mesma tela: o QR não cobre nenhum desses casos.
    const html = montar();
    expect(html).toContain(ENDERECO_LEGIVEL);
    expect(html).toContain('Copiar');
  });

  it('não escreve o endereço à mão em lugar nenhum', () => {
    // O domínio tem uma fonte só (`shared/enderecoPublico`). Um `aue.web.app`
    // digitado dentro do JSX sobrevive à próxima troca de hospedagem calado.
    const fonte = new URL('./TelaDesktop.tsx', import.meta.url);
    expect(readFileSync(fonte, 'utf8')).not.toContain('aue.web.app');
  });

  it('continua sem botão de instalar morto', () => {
    /*
      O botão de instalar PWA SAIU da landing na #138, e não volta por acidente.

      Ele dependia de `beforeinstallprompt`, que só existe no Chromium: no
      Firefox e no Safari de desktop nunca disparava, e a landing terminava com
      um parágrafo explicando que o navegador da pessoa não instala. Pior que
      isso: instalar o Auê num notebook leva pro lugar errado — o jogo é no
      telefone, e o QR e o link levam pra lá em qualquer navegador.
    */
    const html = montar();
    expect(html).not.toContain('Instalar o Auê');
    expect(html).not.toContain('Adicionar à Tela de Início');
  });

  it('os selos de loja são texto morto, não botão', () => {
    /*
      Nada foi publicado em loja nenhuma. Um selo clicável seria o AGENTS.md §7
      na cara: interface fingindo que funciona. Então ele é `<span>` — sem
      `href`, sem `<button>`, sem `disabled` sugerindo que um dia habilita.
    */
    const html = montar();
    expect(html).toContain('App Store — em breve');
    expect(html).toContain('Google Play — em breve');
    expect(html).not.toMatch(/<a[^>]*>\s*App Store/);
    expect(html).not.toMatch(/<a[^>]*>\s*Google Play/);
    expect(html).not.toMatch(/<button[^>]*>\s*(App Store|Google Play)/);
  });

  it('a landing tem UM botão só, e ele faz alguma coisa', () => {
    /*
      O único `<button>` da tela é o "Copiar" do endereço, e ele copia de
      verdade. Todo o resto que parece controle ou é âncora (`<a href="#...">`)
      ou é desenho: a "CHAMAR NO X1" dentro do celular falso é `div` de
      propósito — se virar `<button>`, alguém clica e nada acontece.
    */
    const botoes = [...montar().matchAll(/<button[\s\S]*?<\/button>/g)].map((m) => m[0]);
    expect(botoes).toHaveLength(1);
    expect(botoes[0]).toContain('Copiar');
  });

  it('leva às páginas de conteúdo — as duas', () => {
    const html = montar();
    expect(html).toContain('href="/como-jogar"');
    expect(html).toContain('href="/como-arrotar"');
  });

  it('leva às DUAS páginas legais, cada uma pelo nome inteiro', () => {
    // Contrato MVP1 §3.10 pede política de privacidade E termos de uso em
    // páginas públicas. Um link só, chamado "privacidade e uso", não cumpre — e
    // "Privacidade" e "Termos" soltos são mais bonitos e menos encontráveis.
    const html = montar();
    expect(html).toContain('href="/privacidade"');
    expect(html).toContain('href="/termos"');
    expect(html).toContain('Política de privacidade');
    expect(html).toContain('Termos de uso');
  });

  it('tem um <h1> só, e é o do hero', () => {
    const html = montar();
    expect([...html.matchAll(/<h1[\s>]/g)]).toHaveLength(1);
    expect(html).toMatch(/<h1>[\s\S]*Humilhe/);
  });

  it('ninguém no app engole o `beforeinstallprompt` do navegador', () => {
    /*
      Junto com o botão morreu o listener. Enquanto ele existiu sem consumidor,
      o app fazia `preventDefault()` no evento e não oferecia nada no lugar: no
      Chrome de Android a promoção de instalação do PRÓPRIO navegador sumia,
      calada, e o sintoma ficava igual a "esse navegador não instala".

      Sem listener, o navegador volta a promover a instalação sozinho — que é o
      caminho certo enquanto o Auê não tiver botão próprio. Se um dia tiver, o
      listener volta JUNTO com quem chama `prompt()`, nunca antes.

      A varredura é no código-fonte inteiro porque o defeito não aparece em
      render nenhum: é efeito colateral de import.
    */
    const raiz = new URL('../../', import.meta.url);
    const arquivos = readdirSync(raiz, { recursive: true, encoding: 'utf8' })
      // No Windows o separador vem `\`, que não resolve como caminho de URL.
      .map((caminho) => caminho.replace(/\\/g, '/'))
      .filter((caminho) => /\.(ts|tsx)$/.test(caminho));

    const culpados = arquivos.filter((caminho) => {
      const fonte = readFileSync(new URL(caminho, raiz), 'utf8');
      return /addEventListener\(\s*['"]beforeinstallprompt['"]/.test(fonte);
    });

    expect(culpados).toEqual([]);
  });
});
