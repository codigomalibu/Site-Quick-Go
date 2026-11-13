"""Add quick system links to the three page menus, preserving the page link."""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]
DESTINATIONS = [
    ('SULTS', 'sults', 'https://quickgo.sults.com.br/login'),
    ('Painel de Administração', 'panel', 'https://painel.quickgodrinks.com.br'),
    ('Orçamentos', 'quotes', 'https://quickgoorcamentos.com/login'),
]
def enhance_nav(match):
    nav = match.group(0)
    nav = re.sub(r'<div class="nav-system-group">[\s\S]*?</div><!-- system-menu -->', lambda old: re.search(r'<a\b[^>]*href="/sistemas/"[^>]*>[\s\S]*?</a>', old.group()).group(), nav)
    def wrap(link):
        items = ''.join(f'<a class="system-quick-link" href="{url}" target="_blank" rel="noopener noreferrer"><img src="/assets/system-{image}.webp" width="1200" height="630" alt=""><span>{title}</span><span class="system-quick-arrow" aria-hidden="true">↗</span></a>' for title, image, url in DESTINATIONS)
        return '<div class="nav-system-group">'+link.group()+'<div class="system-quick-menu" aria-label="Acessos rápidos aos sistemas">'+items+'</div></div><!-- system-menu -->'
    return re.sub(r'<a\b[^>]*href="/sistemas/"[^>]*>[\s\S]*?</a>',wrap,nav,count=1)
for file in ['index.html','franquias/index.html','sistemas/index.html']:
    page = ROOT/'dist'/file
    html = page.read_text(encoding='utf-8')
    html = re.sub(r'<nav class="(?:desktop-nav|mobile-nav)"[^>]*>[\s\S]*?</nav>',enhance_nav,html)
    html = re.sub(r'<link rel="stylesheet" href="/systems-menu.css[^\"]*">','',html)
    html = html.replace('</head>','<link rel="stylesheet" href="/systems-menu.css?v=systems-63"></head>')
    page.write_text(html,encoding='utf-8')
