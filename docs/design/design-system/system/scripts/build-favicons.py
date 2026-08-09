#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador do conjunto de ícones do Auê! — favicon, iOS e Android.

Rasteriza a MESMA geometria de `assets/aue-bolha-mark.svg` (não um redesenho):
blob orgânico de 5 curvas cúbicas com o "!" integrado como recorte de negativo.
Flat, duas cores da paleta registrada, sem gradiente, sem glow, sem sombra.

Uso:  python system/scripts/build-favicons.py
Saída: assets/favicon/*
"""

import os
import struct
from io import BytesIO
from PIL import Image, ImageDraw

# ── Paleta registrada — DESIGN.md §1.1 / §1.2 ────────────────────────────────
BG = (0x0a, 0x0a, 0x08)   # Preto Carvão
FG = (0xc6, 0xff, 0x00)   # Verde Ácido Elétrico

SS = 8            # supersampling
VB = 240.0        # viewBox do símbolo
OUT = os.path.join('assets', 'favicon')

# ── Geometria do símbolo (idêntica ao SVG) ───────────────────────────────────
BLOB = [
    ((120, 18), (163, 16),  (209, 44),  (216, 89)),
    ((216, 89), (222, 129), (210, 176), (167, 207)),
    ((167, 207), (130, 233), (73, 224), (42, 191)),
    ((42, 191), (14, 160),  (11, 109),  (32, 68)),
    ((32, 68),  (53, 27),   (90, 20),   (120, 18)),
]
# haste do "!": curva superior, reta descendente, curva inferior, fecho
STEM_TOP = ((112, 52), (112, 47.5), (128, 47.5), (128, 52))
STEM_BOT = ((133, 131), (133, 139), (107, 139), (107, 131))
DOT_C, DOT_R = (120, 150), 16


def bezier(p0, p1, p2, p3, steps):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        x = u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0]
        y = u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]
        pts.append((x, y))
    return pts


def blob_polygon(steps=160):
    pts = []
    for c in BLOB:
        seg = bezier(*c, steps)
        pts.extend(seg[:-1])
    return pts


def stem_polygon(width_k=1.0, steps=48):
    """width_k engrossa a haste em torno do eixo x=120 (variante de tamanho pequeno)."""
    def wx(p):
        return (120 + (p[0] - 120) * width_k, p[1])
    top = [wx(p) for p in bezier(*[wx(q) for q in STEM_TOP], steps)]
    bot = [wx(p) for p in bezier(*[wx(q) for q in STEM_BOT], steps)]
    return top + bot


def bbox(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


BLOB_BBOX = bbox(blob_polygon())


def render(size, coverage, width_k=1.0, dot_k=1.0, dot_dy=0.0,
           bg=BG, fg=FG, transparent=False):
    """
    size      — lado final em px
    coverage  — fração do lado ocupada pela MAIOR dimensão do blob
    width_k   — engrossamento da haste do "!"
    dot_k     — fator do raio do pingo
    dot_dy    — deslocamento vertical do pingo (unidades de viewBox)
    """
    S = size * SS
    mode = 'RGBA' if transparent else 'RGB'
    base = (0, 0, 0, 0) if transparent else bg
    img = Image.new(mode, (S, S), base)
    d = ImageDraw.Draw(img)

    x0, y0, x1, y1 = BLOB_BBOX
    span = max(x1 - x0, y1 - y0)
    scale = (S * coverage) / span
    # centraliza o blob pelo seu bbox real, não pelo viewBox
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    ox, oy = S / 2 - cx * scale, S / 2 - cy * scale

    def T(p):
        return (p[0] * scale + ox, p[1] * scale + oy)

    fill = fg + (255,) if transparent else fg
    hole = bg + (255,) if transparent else bg

    d.polygon([T(p) for p in blob_polygon()], fill=fill)
    d.polygon([T(p) for p in stem_polygon(width_k)], fill=hole)

    r = DOT_R * dot_k * scale
    ccx, ccy = T((DOT_C[0], DOT_C[1] + dot_dy))
    d.ellipse([ccx - r, ccy - r, ccx + r, ccy + r], fill=hole)

    return img.resize((size, size), Image.LANCZOS)


def write_ico(path, images):
    """ICO com entradas PNG (suportado por todos os navegadores atuais)."""
    blobs = []
    for im in images:
        buf = BytesIO()
        im.convert('RGBA').save(buf, format='PNG', optimize=True)
        blobs.append(buf.getvalue())
    n = len(blobs)
    header = struct.pack('<HHH', 0, 1, n)
    offset = 6 + 16 * n
    entries, data = b'', b''
    for im, blob in zip(images, blobs):
        w = 0 if im.width >= 256 else im.width
        h = 0 if im.height >= 256 else im.height
        entries += struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, len(blob), offset)
        offset += len(blob)
        data += blob
    with open(path, 'wb') as f:
        f.write(header + entries + data)


def emit_svg(path, coverage, width_k=1.0, dot_k=1.0, dot_dy=0.0,
             bg=None, fg='#c6ff00', label='Auê!'):
    """
    Emite o símbolo como SVG vetorial (curvas, não polígono achatado),
    aplicando os mesmos ajustes ópticos do raster. bg=None → fundo transparente
    (usado no ícone de aba fixada do Safari, que é mascarado pelo sistema).
    """
    x0, y0, x1, y1 = BLOB_BBOX
    s = coverage * VB / max(x1 - x0, y1 - y0)
    tx = VB / 2 - ((x0 + x1) / 2) * s
    ty = VB / 2 - ((y0 + y1) / 2) * s

    def wx(p):
        return (120 + (p[0] - 120) * width_k, p[1])

    f = lambda v: ('%.2f' % v).rstrip('0').rstrip('.')
    pt = lambda p: '%s,%s' % (f(p[0]), f(p[1]))

    d = ['M' + pt(BLOB[0][0])]
    for c in BLOB:
        d.append('C' + ' '.join(pt(p) for p in c[1:]))
    d.append('Z')

    st = [wx(p) for p in STEM_TOP]
    sb = [wx(p) for p in STEM_BOT]
    d.append('M' + pt(st[0]))
    d.append('C' + ' '.join(pt(p) for p in st[1:]))
    d.append('L' + pt(sb[0]))
    d.append('C' + ' '.join(pt(p) for p in sb[1:]))
    d.append('Z')

    r = DOT_R * dot_k
    cx, cy = DOT_C[0], DOT_C[1] + dot_dy
    d.append('M%s,%s m%s,0 a%s,%s 0 1,0 %s,0 a%s,%s 0 1,0 %s,0 Z'
             % (f(cx), f(cy), f(-r), f(r), f(r), f(2 * r), f(r), f(r), f(-2 * r)))

    rect = ('  <rect width="240" height="240" fill="%s"/>\n' % bg) if bg else ''
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" '
        'width="240" height="240" role="img" aria-label="%s">\n'
        '  <title>%s</title>\n'
        '%s'
        '  <g transform="translate(%s %s) scale(%s)">\n'
        '    <path fill="%s" fill-rule="evenodd" d="%s"/>\n'
        '  </g>\n'
        '</svg>\n'
    ) % (label, label, rect, f(tx), f(ty), f(s), fg, ' '.join(d))
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(svg)


def main():
    os.makedirs(OUT, exist_ok=True)
    p = lambda n: os.path.join(OUT, n)

    # ── favicon ──────────────────────────────────────────────────────────────
    # Quase sangrado: aos 16px o que importa é a silhueta chegar inteira.
    #
    # Correção óptica de tamanho pequeno (só aqui, ≤48px):
    #  1. a haste engrossa — no símbolo original ela mede ~1,1px a 16px e some;
    #  2. o pingo desce e encolhe para ABRIR o vão entre haste e pingo.
    # (2) é necessário porque no símbolo registrado os dois se tocam: a haste
    # desce até y=137 e o pingo começa em y=134. A ~180px isso ainda lê como
    # "!" com pingo fundido; a 16px vira uma mancha. Ver nota no handoff — a
    # correção definitiva é no próprio símbolo, não aqui.
    fav16 = render(16, 0.98, width_k=1.45, dot_k=1.10, dot_dy=16)
    fav32 = render(32, 0.96, width_k=1.25, dot_k=0.95, dot_dy=18)
    fav48 = render(48, 0.94, width_k=1.15, dot_k=0.95, dot_dy=16)
    fav16.save(p('favicon-16.png'), optimize=True)
    fav32.save(p('favicon-32.png'), optimize=True)
    fav48.save(p('favicon-48.png'), optimize=True)
    write_ico(p('favicon.ico'), [fav16, fav32, fav48])

    # ── iOS ──────────────────────────────────────────────────────────────────
    # Sem alfa (o iOS pinta preto por baixo de transparência) e com respiro:
    # a máscara squircle do sistema come os cantos.
    render(180, 0.82).save(p('apple-touch-icon.png'), optimize=True)

    # ── Android / PWA ────────────────────────────────────────────────────────
    render(192, 0.88).save(p('android-chrome-192.png'), optimize=True)
    render(512, 0.88).save(p('android-chrome-512.png'), optimize=True)
    # maskable: conteúdo dentro do círculo de segurança de 80% do lado
    render(192, 0.70).save(p('maskable-192.png'), optimize=True)
    render(512, 0.70).save(p('maskable-512.png'), optimize=True)

    # ── vetoriais ────────────────────────────────────────────────────────────
    # O favicon SVG é exibido na aba a ~16–20px, então carrega a mesma correção
    # óptica dos rasters pequenos — não a forma de 512px.
    emit_svg(p('favicon.svg'), 0.94, width_k=1.25, dot_k=0.95, dot_dy=18,
             bg='#0a0a08', fg='#c6ff00', label='Auê!')
    # Aba fixada do Safari: silhueta monocromática, fundo transparente.
    # A cor vem do atributo color= do <link rel="mask-icon">.
    emit_svg(p('safari-pinned-tab.svg'), 0.94, width_k=1.25, dot_k=0.95, dot_dy=18,
             bg=None, fg='#000000', label='Auê!')

    print('bbox do blob:', tuple(round(v, 1) for v in BLOB_BBOX))
    for f in sorted(os.listdir(OUT)):
        print(' ', f, os.path.getsize(os.path.join(OUT, f)), 'bytes')


if __name__ == '__main__':
    main()
