/**
 * O que a landing de desktop precisa oferecer para cumprir o Contrato MVP1 §3.2.
 *
 * O contrato pede "caminho claro para abrir/instalar o webapp no dispositivo
 * compatível, **preferencialmente com QR Code** para continuar no celular".
 * Antes desta mudança havia só o botão de instalar — que depende de
 * `beforeinstallprompt` e, portanto, não existe no Firefox nem no Safari de
 * desktop. Nesses dois navegadores a landing terminava sem NENHUMA forma de
 * levar o endereço para o telefone.
 *
 * `renderToStaticMarkup` não roda efeitos, então o QR aqui aparece como o seu
 * espaço reservado (`data-od-id="qr-do-app"`), e não como a matriz. Isso é
 * suficiente para o que este arquivo protege: que o bloco esteja montado. Que o
 * código gerado seja um QR válido é assunto de `shared/desktop/qr.test.ts`; que
 * ele seja legível por uma câmera de verdade só um telefone responde.
 */
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

  it('continua sem botão de instalar morto', () => {
    // Mesma regra de sempre, agora com mais coisa na caixa: sem
    // `beforeinstallprompt` capturado não pode haver botão que não faz nada.
    expect(montar()).not.toContain('Instalar o Auê');
  });

  it('leva às DUAS páginas legais, cada uma pelo nome', () => {
    // Contrato MVP1 §3.10 pede política de privacidade E termos de uso em
    // páginas públicas. Um link só, chamado "privacidade e uso", não cumpre.
    const html = montar();
    expect(html).toContain('href="/privacidade"');
    expect(html).toContain('href="/termos"');
    expect(html).toContain('Termos de uso');
  });
});
