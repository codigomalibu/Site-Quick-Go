"""Compose original logo and actual Anek Thin outlines over grounded product art."""
from pathlib import Path
import base64
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen

ASSETS = Path(__file__).resolve().parents[1] / 'dist/assets'
logo = base64.b64encode((ASSETS / 'QG-LOGO2.png').read_bytes()).decode()
base = base64.b64encode((ASSETS / 'franchise-trio-grounded.webp').read_bytes()).decode()
font = instantiateVariableFont(TTFont(ASSETS / 'fonts/anek-devanagari-latin.woff2'), {'wght':100}, inplace=False)
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
units = font['head'].unitsPerEm

def label(text, center, baseline, size):
    width = sum(font['hmtx'][cmap[ord(c)]][0] for c in text)
    scale = size / units
    x = 0
    paths = []
    for char in text:
        name = cmap[ord(char)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        paths.append(f'<path transform="translate({x} 0)" d="{pen.getCommands()}"/>')
        x += font['hmtx'][name][0]
    return f'<g aria-label="{text}" data-font="Anek Devanagari Thin" data-weight="100" fill="#22343B" transform="translate({center-width*scale/2} {baseline}) scale({scale} {-scale})">'+''.join(paths)+'</g>'

parts = [f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1254 1254" width="1254" height="1254"><defs><filter id="black" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter></defs><image width="1254" height="1254" xlink:href="data:image/webp;base64,{base}"/>']
for x,y,w,h in [(506,226,242,68),(133,542,151,50),(971,542,151,50)]:
    parts.append(f'<svg x="{x}" y="{y}" width="{w}" height="{h}" viewBox="117 478 2794 584" preserveAspectRatio="xMidYMid meet"><image width="3000" height="1500" filter="url(#black)" xlink:href="data:image/png;base64,{logo}"/></svg>')
parts += [label('TECH GO',627,348,47),label('MINI GO',208,632,31),label('MINI GO',1047,632,31),'</svg>']
(ASSETS / 'franchise-trio-thin.svg').write_text(''.join(parts),encoding='utf-8')
print('Original logo + Anek Devanagari weight 100 outlines composed.')
