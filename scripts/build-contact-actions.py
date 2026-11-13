"""Keep each sales page's contact shortcut pointed at its own form."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
for route, target, label, caption in [
    ('index.html', '#orcamento', 'Ir ao formulário de orçamento para seu evento', 'Orçamento para seu evento'),
    ('franquias/index.html', '#conversa', 'Ir ao formulário de contato de franquias', 'Fale sobre sua franquia'),
]:
    page = ROOT / 'dist' / route
    html = page.read_text(encoding='utf-8')
    html = re.sub(r'<a\b[^>]*\bid="contact-form-shortcut"[\s\S]*?</a>', '', html)
    html = re.sub(r'<link rel="stylesheet" href="/contact-actions\.css[^\"]*">', '', html)
    html = html.replace('</head>', '<link rel="stylesheet" href="/contact-actions.css?v=systems-62"></head>')
    button = (f'<a id="contact-form-shortcut" class="contact-form-shortcut" href="{target}" '
              f'aria-label="{label}"><span class="contact-shortcut-caption" aria-hidden="true">{caption}</span>'
              '<span class="contact-shortcut-arrow" aria-hidden="true">↗</span></a>')
    html = html.replace('</body>', button + '</body>')
    if route.startswith('franquias/'):
        html = re.sub(r'<a class="nav-cta"[^>]*>[\s\S]*?</a>',
                      '<a class="nav-cta" href="#conversa">Entrar em contato <span aria-hidden="true">↗</span></a>', html, count=1)
    page.write_text(html, encoding='utf-8')
