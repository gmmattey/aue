import React, { useEffect, useState } from 'react';

import { ENDERECO_LEGIVEL, URL_CANONICA_DA_HOME } from '../../shared/enderecoPublico';
import { gerarMatrizQr, ladoComMargem, matrizParaPath } from '../../shared/desktop/qr';
import type { MatrizQr } from '../../shared/desktop/qr';

/**
 * O QR Code que leva a landing de desktop para o telefone. Contrato MVP1 §3.2.
 *
 * POLARIDADE INVERTIDA EM RELAÇÃO AO RESTO DO APP, E ISSO É DELIBERADO. O Auê é
 * escuro; um QR claro sobre fundo escuro é o código NEGATIVO, e boa parte dos
 * leitores — incluindo a câmera nativa de iPhones mais antigos — simplesmente
 * não enxerga. Então este bloco é uma plaquinha clara com módulos escuros,
 * dentro do app escuro. Estética perde para "abre no telefone de qualquer um".
 *
 * NÃO É O ÚNICO CAMINHO. Logo abaixo dele, na landing, está o mesmo endereço em
 * texto com um botão de copiar: quem está num desktop sem câmera à mão, ou usa
 * leitor de tela, não fica dependendo de apontar um telefone para o monitor.
 */
export const CodigoQrDoApp: React.FC<{ lado?: number }> = ({ lado = 156 }) => {
  const [matriz, setMatriz] = useState<MatrizQr | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    /*
      O codificador vem de um chunk separado (ver `shared/desktop/qr.ts`), então
      isto é uma ida à rede — curta, mas assíncrona. `vivo` evita atualizar
      estado depois que o componente saiu, o que sob StrictMode acontece já na
      primeira montagem em desenvolvimento.
    */
    let vivo = true;

    gerarMatrizQr(URL_CANONICA_DA_HOME)
      .then((resultado) => {
        if (vivo) setMatriz(resultado);
      })
      .catch((err) => {
        console.error('Falha ao gerar o QR Code do Auê', err);
        if (vivo) setFalhou(true);
      });

    return () => {
      vivo = false;
    };
  }, []);

  /*
    Falhou: o espaço some. Um quadrado cinza com "não foi possível gerar o QR"
    não ajuda ninguém — o endereço em texto, que é o caminho de verdade, está
    logo abaixo na mesma caixa.
  */
  if (falhou) return null;

  const moldura: React.CSSProperties = {
    width: lado,
    height: lado,
    borderRadius: 'var(--radius-sm)',
    background: 'var(--fg)',
    flexShrink: 0,
  };

  // Enquanto carrega, o mesmo retângulo claro do QR fica no lugar: sem isto a
  // caixa inteira pula de altura quando o código chega.
  if (!matriz) return <div style={moldura} data-od-id="qr-do-app" aria-hidden="true" />;

  const total = ladoComMargem(matriz);

  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      style={moldura}
      data-od-id="qr-do-app"
      role="img"
      aria-label={`QR Code do endereço ${ENDERECO_LEGIVEL}. Aponte a câmera do celular para abrir o Auê.`}
      shapeRendering="crispEdges"
    >
      {/*
        O fundo claro precisa estar DENTRO do svg: é ele que forma a margem
        obrigatória em volta dos módulos.

        `style` e não atributo `fill`: `fill="var(--fg)"` como atributo de
        apresentação tem histórico de não resolver em todos os motores, e um QR
        sem contraste é um QR que não lê.
      */}
      <rect width={total} height={total} style={{ fill: 'var(--fg)' }} />
      <path d={matrizParaPath(matriz)} style={{ fill: 'var(--bg)' }} />
    </svg>
  );
};
