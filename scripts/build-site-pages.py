"""Generate the event, franchise and system routes with one shared brand shell."""
from pathlib import Path
import re, json
from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
page=DIST/'index.html'
home=page.read_text(encoding='utf-8')
original_main=re.search(r'<main\b[\s\S]*?</main>',home).group()

for model in ['mini-go','tech-go']:
    out=DIST/f'assets/official-{model}.webp'
    if not out.exists():
        source=ROOT.parent/f'review/official-machines/{model}.png'
        image=ImageOps.exif_transpose(Image.open(source)).convert('RGB')
        image.thumbnail((900,1300),Image.Resampling.LANCZOS)
        image.save(out,'WEBP',quality=90,method=6)

# Link to dedicated routes rather than the former pending-access dialog.
home=home.replace('<a href="#experiencia">A experiência</a><a href="#drinks">Os drinks</a><a href="#momentos">Seus momentos</a>', '<a href="/" aria-current="page">Home</a><a href="#experiencia">A experiência</a><a href="/franquias/">Franquias</a>')
home=re.sub(r'<button class="nav-systems"[^>]*>[\s\S]*?</button>', '<a class="nav-systems" href="/sistemas/">Acessar os sistemas <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" stroke="currentColor" stroke-width="1.5"/></svg></a>',home,count=1)
home=re.sub(r'<button class="mobile-systems"[^>]*>[\s\S]*?</button>', '<a class="mobile-systems" href="/sistemas/">Sistemas <span aria-hidden="true">↗</span></a><a href="/franquias/">Seja franqueado <span aria-hidden="true">↗</span></a>',home,count=1)
home=re.sub(r'<button data-open-systems[^>]*>[\s\S]*?</button>', '<a href="/sistemas/">Acessar os sistemas <span aria-hidden="true">↗</span></a>',home)
home=home.replace('href="https://www.quickgodrinks.com.br/sobre" target="_blank" rel="noopener"','href="/franquias/#rede"').replace('href="https://www.quickgodrinks.com.br/#contato" target="_blank" rel="noopener"','href="/franquias/#conversa"')
home=re.sub(r'  <dialog id="systems-dialog"[\s\S]*?</dialog>\n','',home,count=1)
home=home.replace('/app.js?v=dwell-20','/app.js?v=structure-24')
if '/site-pages.css?' not in home:
    home=home.replace('<link rel="stylesheet" href="/footer-section.css?v=network-21">','<link rel="stylesheet" href="/footer-section.css?v=network-21">\n  <link rel="stylesheet" href="/site-pages.css?v=structure-24">')
home=home.replace('https://quickgodrinksbh.com.br/','https://www.quickgodrinks.com.br/')
if '<nav class="mobile-nav" id="mobile-nav" aria-label="Navegação móvel" hidden><a href="/">Home' not in home:
    home=home.replace('<nav class="mobile-nav" id="mobile-nav" aria-label="Navegação móvel" hidden>', '<nav class="mobile-nav" id="mobile-nav" aria-label="Navegação móvel" hidden><a href="/">Home <span>01</span></a>')
# The existing client-side briefing remains the home sales flow. Update its
# review screen's default contact as well as the JS configuration.
whatsapp='https://wa.me/5567991973749?text=Quero%20um%20or%C3%A7amento%20para%20meu%20evento.'
home=home.replace('href="https://quickgoorcamentos.com/">Acessar o canal atual de orçamentos', 'href="'+whatsapp+'">Conversar no WhatsApp')
home=home.replace('href="https://quickgoorcamentos.com/" target="_blank" rel="noopener">Canal de orçamentos','href="'+whatsapp+'" target="_blank" rel="noopener">Continuar no WhatsApp')
home=home.replace('Confira seu pedido e continue pelo canal atual de orçamentos da Quick GO.','Confira seu pedido e continue pelo WhatsApp da Quick GO.')
home=home.replace('Seu resumo fica nesta página. A equipe confirma disponibilidade, valores e reserva pelo atendimento.','Seu resumo fica nesta página até você abrir o WhatsApp e escolher enviar. A equipe confirma disponibilidade, valores e reserva.')
home=home.replace('Ao abrir o canal de orçamentos, você visita o serviço externo da Quick GO.','Ao continuar no WhatsApp, você visita um serviço externo e escolhe quando enviar seu resumo.')
# Preserve the approved hero and drink carousel; replace only the quote area.
quote_template=(ROOT/'scripts/templates/quote-section.html').read_text(encoding='utf-8').strip()
home=re.sub(r'<section class="(?:booking-section section-pad|quote-home)"[^>]*id="orcamento"[\s\S]*?</section>',quote_template,home,count=1)
home=home.replace('/app.js?v=structure-24','/app.js?v=quote-25')
if '/quote-section.css?' not in home:
    home=home.replace('<link rel="stylesheet" href="/site-pages.css?v=structure-24">','<link rel="stylesheet" href="/site-pages.css?v=structure-24">\n  <link rel="stylesheet" href="/quote-section.css?v=quote-25">\n  <script type="module" src="/quote-embed.js?v=quote-25"></script>')
home=home.replace('Monte o pedido nesta página e continue pelo canal de orçamentos. O valor considera data, local, duração, convidados e carta. A data só fica reservada após a confirmação da equipe.', 'Preencha o formulário de orçamento nesta página. A equipe considera data, local, duração, convidados e carta para preparar sua proposta. A data só fica reservada após a confirmação do atendimento.')
home=home.replace('Os dados do pedido são usados apenas no navegador para montar o seu resumo. Nada é enviado automaticamente. Ao continuar no WhatsApp, você visita um serviço externo e escolhe quando enviar seu resumo.', 'O formulário de orçamento é fornecido pelo sistema externo quickgoorcamentos.com. Os dados preenchidos e enviados nele são tratados pelo próprio sistema, conforme as condições apresentadas por ele. Ao usar o atendimento pelo WhatsApp, você visita um serviço externo e decide quando enviar sua mensagem.')
for key in ['inicio','drinks']:
    pattern=r'<section\b[^>]*\bid="'+key+r'"[\s\S]*?</section>'
    assert re.search(pattern,original_main).group()==re.search(pattern,home).group()
# The site menu represents only the three actual pages, never home anchors.
page_menu='<a href="/" aria-current="page">Home</a><a href="/franquias/">Franquias</a><a href="/sistemas/">Sistemas</a>'
home=re.sub(r'(<nav class="desktop-nav"[^>]*>)[\s\S]*?</nav>',lambda m:m.group(1)+page_menu+'</nav>',home,count=1)
home=re.sub(r'(<nav class="mobile-nav"[^>]*>)[\s\S]*?</nav>',lambda m:m.group(1)+page_menu+'</nav>',home,count=1)
home=re.sub(r'<a class="nav-systems"[^>]*>[\s\S]*?</a>','',home,count=1)
home=re.sub(r'(<nav aria-label="Explore a Quick GO">)[\s\S]*?</nav>',lambda m:m.group(1)+'<a href="/">Home</a><a href="/franquias/">Franquias</a><a href="/sistemas/">Sistemas</a></nav>',home,count=1)
if '/scroll-reveal.js?' not in home:
    home=home.replace('<link rel="stylesheet" href="/franchise-expansion.css?v=expansion-35"><link rel="stylesheet" href="/brand-polish.css?v=polish-37"><script type="module" src="/brand-motion.js?v=polish-37"></script></head>','<link rel="stylesheet" href="/scroll-reveal.css?v=soft-30">\n  <script type="module" src="/scroll-reveal.js?v=soft-30"></script>\n<link rel="stylesheet" href="/franchise-expansion.css?v=expansion-35"><link rel="stylesheet" href="/brand-polish.css?v=polish-37"><script type="module" src="/brand-motion.js?v=polish-37"></script></head>')
home=home.replace('/app.js?v=menu-28','/app.js?v=soft-30')
page.write_text(home,encoding='utf-8')

footer=re.search(r'<footer class="network-footer"[\s\S]*?</footer>',home).group()
footer=re.sub(r'href="#([^"]+)"',r'href="/#\1"',footer)
privacy='''<dialog id="privacy-dialog" class="privacy-dialog"><button class="dialog-close" data-close aria-label="Fechar privacidade">×</button><p class="eyebrow">PRIVACIDADE</p><h2>Sua privacidade.</h2><p>Os dados do contato de franquias são usados no seu navegador para montar uma mensagem. Nada é enviado automaticamente: você abre o WhatsApp e decide quando enviar.</p><p>Na Home, o formulário de orçamento pertence ao serviço externo quickgoorcamentos.com. Os dados preenchidos nesse formulário são tratados pelo próprio sistema, conforme as condições apresentadas por ele.</p><p>Não instalamos rastreadores de publicidade nesta página. A escolha visual do rodapé não é salva.</p></dialog>'''

def shell(route,title,description,content):
    nav=''.join(f'<a href="{href}"'+(' aria-current="page"' if name==route else '')+f'>{label}</a>' for name,href,label in [('home','/','Home'),('franquias','/franquias/','Franquias'),('sistemas','/sistemas/','Sistemas')])
    return f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><meta name="theme-color" content="#102f34"><meta name="robots" content="noindex,follow"><title>{title}</title><meta name="description" content="{description}"><link rel="canonical" href="https://quickgo-drinks.vercel.app/{route}/"><meta property="og:title" content="{title}"><meta property="og:description" content="{description}"><meta property="og:url" content="https://quickgo-drinks.vercel.app/{route}/"><meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta name="twitter:card" content="summary_large_image"><meta property="og:image" content="https://quickgo-drinks.vercel.app/assets/social.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Drink Quick GO com equipamento ao fundo"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="preload" href="/assets/fonts/anek-devanagari-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/product-design.css?v=manual-17"><link rel="stylesheet" href="/drinks-carousel.css?v=loop-14"><link rel="stylesheet" href="/brand-typography.css?v=manual-17"><link rel="stylesheet" href="/footer-section.css?v=network-21"><link rel="stylesheet" href="/site-pages.css?v=structure-24"><script type="module" src="/secondary-pages.js?v=structure-24"></script><script type="module" src="/footer-section.js?v=network-21"></script><link rel="stylesheet" href="/quote-section.css?v=quote-25"><link rel="stylesheet" href="/scroll-reveal.css?v=soft-30"><script type="module" src="/scroll-reveal.js?v=soft-30"></script><link rel="stylesheet" href="/franchise-expansion.css?v=expansion-35"><link rel="stylesheet" href="/brand-polish.css?v=polish-37"><script type="module" src="/brand-motion.js?v=polish-37"></script></head>
<body class="site-secondary {'franchise-premium' if route == 'franquias' else ''}"><a class="skip-link" href="#conteudo">Ir para o conteúdo</a><header class="header" id="header"><a class="brand" href="/" aria-label="Quick GO, início"><img src="/assets/logo.webp" width="190" height="39" alt="Quick GO"></a><nav class="desktop-nav" aria-label="Navegação principal">{nav}</nav><div class="header-actions"><a class="nav-cta" href="/#orcamento">Orçamento do bar <span aria-hidden="true">↗</span></a><button class="menu-toggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="mobile-nav"><span></span><span></span></button></div></header><nav class="mobile-nav" id="mobile-nav" aria-label="Navegação móvel" hidden>{nav}</nav><main id="conteudo">{content}</main>{footer}{privacy}<a class="mobile-booking" href="{'#conversa' if route=='franquias' else '/#orcamento'}">{'Quero ser franqueado' if route=='franquias' else 'Orçamento para meu evento'} <span aria-hidden="true">↗</span></a></body></html>'''

franchise=(ROOT/'scripts/templates/franchise-main.html').read_text(encoding='utf-8')
systems='''<section class="systems-intro-section"><div class="container systems-intro-grid"><div><p class="eyebrow">QUICK GO · SISTEMAS</p><h1>A central<br>dos franqueados.</h1><p>Um espaço para os acessos e ferramentas da rede Quick GO.</p></div><a class="underlined-link" href="/#orcamento">Quero contratar o bar <span aria-hidden="true">↗</span></a></div></section><section class="systems-pending" aria-labelledby="system-title"><div class="container"><div class="systems-pending-panel"><span class="systems-pending-icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><rect x="6" y="14" width="20" height="14" rx="3" stroke="currentColor" stroke-width="1.4"/><path d="M10 14V9a6 6 0 0 1 12 0v5M16 19v4" stroke="currentColor" stroke-width="1.4"/></svg></span><p class="eyebrow">ACESSO DA REDE</p><h2 id="system-title">Estamos preparando<br>seu acesso.</h2><p>A área dos franqueados está em preparação. Os acessos serão disponibilizados aqui quando o sistema estiver pronto.</p><a class="button button-dark" href="/#orcamento">Orçamento para meu evento <span aria-hidden="true">↗</span></a><a class="underlined-link" href="/franquias/">Quero conhecer a franquia <span aria-hidden="true">↗</span></a></div></div></section>'''

for route,content,title,description in [('franquias',franchise,'Franquias Quick GO · Equipamentos e oportunidades de negócio','Conheça a franquia Quick GO, os equipamentos Mini GO e Tech GO e as condições para empreender com a rede.'),('sistemas',systems,'Sistemas Quick GO · Central dos franqueados','A central dos franqueados Quick GO está em preparação. Acompanhe a disponibilização dos acessos da rede.')]:
    directory=DIST/route;directory.mkdir(exist_ok=True)
    (directory/'index.html').write_text(shell(route,title,description,content),encoding='utf-8')
print('Home, Franquias and Sistemas generated.')
