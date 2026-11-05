"""Build brand font rules only from font files that are actually present."""
from pathlib import Path
from fontTools.ttLib import TTFont
import json

root = Path(__file__).resolve().parents[1]
directory = root / 'dist/assets/fonts'
available = {}
faces = []
for path in sorted(directory.iterdir()):
    if path.suffix.lower() not in ['.woff2', '.woff', '.otf', '.ttf']:
        continue
    with TTFont(path) as font:
        names = {n.toUnicode() for n in font['name'].names if n.nameID in [1, 16]}
        name = ' '.join(names).lower()
        family = next((f for f in ['Hatton', 'Brixton Sans', 'Anek Devanagari'] if f.lower() in name), None)
        if not family:
            continue
        italic = bool(font['head'].macStyle & 2)
        weight = str(font['OS/2'].usWeightClass)
        if 'fvar' in font:
            axis = next((a for a in font['fvar'].axes if a.axisTag == 'wght'), None)
            if axis:
                weight = f'{int(axis.minValue)} {int(axis.maxValue)}'
        style = 'italic' if italic else 'normal'
        faces.append(f"@font-face{{font-family:'{family}';src:url('/assets/fonts/{path.name}');font-style:{style};font-weight:{weight};font-display:swap}}")
        available.setdefault(family, []).append(path.name)

css = '\n'.join(faces) + "\n:root{--brand-body:'Anek Devanagari',sans-serif;font-family:var(--brand-body)}\n"
# Only installed manual-approved fonts may be rendered. Anek covers every role
# until the actual Hatton and Brixton Sans files are supplied.
css += "body,input,select,textarea,button,h1,h2,h3,h4,.hero-signature,.footer-top>p,.story-film-intro>p{font-family:var(--brand-body)}\n"
if 'Hatton' in available:
    css += "h1,h2,.hero-signature,.footer-top>p,.story-film-intro>p,.story-section h2 em,.story-investment h2 em,.story-film-intro em,.story-occasion h3,.story-faq h2,.story-footer .footer-top em{font-family:'Hatton',var(--brand-body)}\n"
if 'Brixton Sans' in available:
    css += "h3,h4,.eyebrow,.story-occasion h3{font-family:'Brixton Sans',var(--brand-body)}\n"
(root/'dist/brand-typography.css').write_text(css,encoding='utf-8')
(root/'brand-fonts.json').write_text(json.dumps({
    'manual': {'titles':'Hatton','subtitles':'Brixton Sans','body':'Anek Devanagari'},
    'installed':available,
    'pending':[f for f in ['Hatton','Brixton Sans','Anek Devanagari'] if f not in available],
    'bodySource':'https://github.com/google/fonts/tree/main/ofl/anekdevanagari',
    'instructions':'Place the brand webfont files in dist/assets/fonts and run python scripts/build-brand-fonts.py. Only Anek Devanagari is used until Hatton and Brixton Sans are supplied; no outside brand fonts are retained.'
},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Installed:', ', '.join(available))
