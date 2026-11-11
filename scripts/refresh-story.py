"""Prepare selected archive media and the editorial middle of the landing page."""
from pathlib import Path
import json, re, subprocess
from PIL import Image, ImageOps
import imageio_ffmpeg

root = Path(__file__).resolve().parents[1]
assets = root / 'dist/assets'
library = {x['id']: x for x in json.loads((root.parent/'review/library.json').read_text(encoding='utf-8-sig'))}
for name, asset_id, size in [('story-wedding',260,(1000,1400)),('story-cheers',42,(1200,800)),('story-blue',65,(900,1100)),('story-touch',259,(1100,1300)),('story-company',265,(1000,1200)),('story-golden',285,(1000,1400))]:
    image = ImageOps.exif_transpose(Image.open(library[asset_id]['file'])).convert('RGB')
    image.thumbnail(size, Image.Resampling.LANCZOS)
    image.save(assets/f'{name}.webp', 'WEBP', quality=88, method=6)

for name, asset_id, start in [('story-serve',119,0),('story-party',218,1),('story-people',290,0)]:
    out = assets/f'{name}.mp4'
    if not out.exists():
        subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-y','-ss',str(start),'-i',library[asset_id]['file'],'-t','8','-vf','scale=540:960:force_original_aspect_ratio=increase,crop=540:960,setsar=1','-an','-c:v','libx264','-profile:v','main','-pix_fmt','yuv420p','-crf','25','-preset','fast','-movflags','+faststart',str(out)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-y','-i',str(out),'-frames:v','1',str(assets/f'{name}.jpg')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

page = root/'dist/index.html'
html = page.read_text(encoding='utf-8')
if 'story-design.css' in html:
    print('Selected media ready; editorial markup is already installed.')
    raise SystemExit(0)
def section(section_id):
    return re.search(r'<section\b[^>]*\bid="'+section_id+r'"[\s\S]*?</section>',html).group()
protected = {key:section(key) for key in ['inicio','drinks','orcamento']}
(root.parent/'review/story-protected.json').write_text(json.dumps(protected,ensure_ascii=False),encoding='utf-8')

intro = '''<section class="story-intro story-section" id="experiencia" aria-labelledby="intro-title">
      <div class="container story-editorial">
        <div class="story-intro-copy"><p class="eyebrow">O BAR É COM A GENTE</p><h2 id="intro-title">Mais festa.<br>Mais encontros.<br><em>Mais um brinde.</em></h2><p>Um bar completo, em um formato que cabe na sua festa. Na tela, cada convidado escolhe seu drink. Em segundos, o próximo brinde está pronto.</p><a class="underlined-link" href="#como-funciona">Conheça a experiência <span aria-hidden="true">↗</span></a><span class="story-index" aria-hidden="true">01 / A EXPERIÊNCIA QUICK GO</span></div>
        <figure class="story-main-photo story-gallery-photo"><img style="--photo-ratio:1000/1250" src="/assets/story-wedding.webp" width="1000" height="1250" alt="Máquina Quick GO em um casamento, entre flores brancas e taças" loading="lazy"><figcaption>Um bar compacto. Uma festa inteira de possibilidades.</figcaption></figure>
        <figure class="story-gallery-photo story-gallery-blue"><img style="--photo-ratio:1100/1365" src="/assets/story-amber.webp" width="1100" height="1365" alt="Drink dourado Quick GO com gelo, servido em um copo de vidro" loading="lazy"></figure><figure class="story-gallery-photo"><img style="--photo-ratio:1100/1375" src="/assets/story-guests.webp" width="1100" height="1375" alt="Convidados brindando junto à máquina Quick GO" loading="lazy"></figure>
      </div>
      <div class="container story-intro-bottom"><span>TECNOLOGIA NO PREPARO.<br>PRESENÇA NA FESTA.</span><p>Do clássico ao tropical, com e sem álcool.<br>Uma carta escolhida para a sua ocasião.</p><a href="#drinks" aria-label="Explorar a carta de drinks">Explore os sabores <span aria-hidden="true">↓</span></a></div>
    </section>'''
html = html.replace(protected.get('experiencia','NEVER_MATCH'),intro) if 'experiencia' in protected else re.sub(r'<section class="intro section-pad"[\s\S]*?</section>',intro,html,count=1)

how = '''<section class="story-how story-section" id="como-funciona" aria-labelledby="how-title"><div class="container">
      <div class="story-heading"><div><p class="eyebrow">DO PRIMEIRO TOQUE AO PRIMEIRO GOLE</p><h2 id="how-title">Você escolhe.<br><em>A Quick GO prepara.</em></h2></div><p>Sem mistério, sem receita para decorar.<br>O seu drink começa com um toque.</p></div>
      <div class="story-steps"><article><div class="story-step-photo"><img style="--photo-ratio:1000/1250" src="/assets/story-golden.webp" width="1000" height="1250" alt="Copo de drink dourado com gelo em um evento" loading="lazy"><span>01</span></div><div class="story-step-title"><h3>Gelo no copo.</h3><span class="step-drawing" aria-hidden="true"></span></div><p>Coloque gelo no copo. Ele já pode ir para o compartimento da máquina.</p></article><article><div class="story-step-photo"><img style="--photo-ratio:1040/1300" src="/assets/story-touch.webp" width="1040" height="1300" alt="Convidada escolhendo um drink na tela da Quick GO" loading="lazy"><span>02</span></div><div class="story-step-title"><h3>Seu favorito na tela.</h3><span class="step-drawing" aria-hidden="true"></span></div><p>Explore a carta do evento e escolha a receita que combina com você.</p></article><article><div class="story-step-photo story-preview"><video class="story-video" muted loop playsinline preload="none" poster="/assets/story-serve.jpg" aria-label="Preparo automático de um drink na máquina Quick GO"><source data-src="/assets/story-serve.mp4" type="video/mp4"></video><span>03</span></div><div class="story-step-title"><h3>Pronto para brindar.</h3><span class="step-drawing" aria-hidden="true"></span></div><p>O preparo é automático. Retire seu drink e volte para o melhor da festa.</p></article></div>
      <div class="story-facts"><span>BAR COMPACTO</span><span>PREPARO AUTOMÁTICO</span><span>COM E SEM ÁLCOOL</span><span>RECEITAS PADRONIZADAS</span></div>
    </div></section>'''
html = re.sub(r'<section class="how-section[\s\S]*?</section>',how,html,count=1)

films = '''<section class="story-films story-section" aria-labelledby="live-title"><div class="container"><div class="story-heading"><div><p class="eyebrow">ACONTECE AO VIVO</p><h2 id="live-title">O melhor da festa<br><em>não fica na tela.</em></h2></div><p>Gente de verdade. Encontros de verdade.<br>Veja a Quick GO em ação.</p></div>
      <div class="story-film-grid"><article class="story-film"><div class="story-preview"><video class="story-video" autoplay muted loop playsinline preload="none" poster="/assets/preview-evento-aniversario.jpg" tabindex="0" aria-label="O primeiro toque. O próximo brinde. Vídeo sem som. Passe o mouse ou mantenha o foco para pausar."><source data-src="/assets/evento-aniversario.mp4" type="video/mp4"></video><span class="story-film-label">QUICK GO EM CELEBRAÇÃO</span></div><p class="story-reel-caption">O primeiro toque. O próximo brinde.</p></article><article class="story-film"><div class="story-preview"><video class="story-video" autoplay muted loop playsinline preload="none" poster="/assets/preview-evento-musica.jpg" tabindex="0" aria-label="A festa acontece em qualquer lugar. Vídeo sem som. Passe o mouse ou mantenha o foco para pausar."><source data-src="/assets/evento-musica.mp4" type="video/mp4"></video><span class="story-film-label">ENCONTROS AO AR LIVRE</span></div><p class="story-reel-caption">A festa acontece em qualquer lugar.</p></article><article class="story-film"><div class="story-preview"><video class="story-video" autoplay muted loop playsinline preload="none" poster="/assets/preview-filme.jpg" tabindex="0" aria-label="Mais tempo para estar junto. Vídeo sem som. Passe o mouse ou mantenha o foco para pausar."><source data-src="/assets/filme.mp4" type="video/mp4"></video><span class="story-film-label">UM DRINK. BOAS COMPANHIAS.</span></div><p class="story-reel-caption">Mais tempo para estar junto.</p></article></div>
    </div></section>'''
html = re.sub(r'<section class="live-section[\s\S]*?</section>',films,html,count=1)
moments = '''<section class="story-moments story-section" id="momentos" aria-labelledby="moments-title"><div class="container"><div class="story-heading"><div><p class="eyebrow">CADA OCASIÃO, UMA QUICK GO</p><h2 id="moments-title">A festa muda.<br><em>O brinde acompanha.</em></h2></div><p>Uma experiência que encontra seu lugar.<br>No grande dia ou no próximo encontro.</p></div><div class="story-occasion-grid">
      <a class="story-occasion story-occasion-main" href="#orcamento" data-event="Casamento / mini wedding"><img src="/assets/mini-wedding.webp" width="1000" height="1200" alt="Quick GO entre flores e luzes em um mini wedding" loading="lazy"><div><span>01 / CASAMENTOS & MINI WEDDINGS</span><h3>O grande dia.<br>Do seu jeito.</h3><p>Dos encontros intimistas à pista cheia.</p><b aria-hidden="true">↗</b></div></a>
      <a class="story-occasion" href="#orcamento" data-event="Corporativo / ativação"><img src="/assets/story-company.webp" width="1000" height="1200" alt="Convidados de um evento corporativo brindando com Quick GO" loading="lazy"><div><span>02 / CORPORATIVOS & ATIVAÇÕES</span><h3>Seu evento.<br>Outra conversa.</h3><b aria-hidden="true">↗</b></div></a>
      <a class="story-occasion" href="#orcamento" data-event="Festa em casa"><img src="/assets/pool-party.webp" width="1000" height="1200" alt="Amigos brindando com drinks junto à piscina" loading="lazy"><div><span>03 / ANIVERSÁRIOS & ENCONTROS</span><h3>Qualquer motivo.<br>Um bom brinde.</h3><b aria-hidden="true">↗</b></div></a>
      </div><div class="story-moments-bottom"><p>Qual é o seu próximo motivo para celebrar?</p><a class="underlined-link" href="#orcamento">Vamos preparar seu evento <span aria-hidden="true">↗</span></a></div></div></section>'''
html = re.sub(r'<section class="moments-section[\s\S]*?</section>',moments,html,count=1)
investment = '''<section class="story-investment" id="investimento" aria-labelledby="investment-title"><div class="story-investment-photo"><img style="--photo-ratio:1100/1375" src="/assets/story-event-bar.webp" width="1100" height="1375" alt="Bar Quick GO instalado em um evento, com convidados e drinks" loading="lazy"></div><div class="story-investment-copy"><p class="eyebrow">FEITO PARA O SEU EVENTO</p><h2 id="investment-title">Seu espaço.<br>Sua carta.<br><em>Sua Quick GO.</em></h2><p>Cada celebração pede uma proposta. Data, cidade, convidados e carta de drinks ajudam a encontrar o formato para a sua festa.</p><ul><li><span>01</span> Conte onde e quando vai acontecer.</li><li><span>02</span> Escolha os sabores que têm a sua cara.</li><li><span>03</span> Receba as condições para o seu evento.</li></ul><a class="button button-dark" href="#orcamento">Quero uma proposta <span aria-hidden="true">↗</span></a><small>Valores, disponibilidade e reserva confirmados pela equipe.</small></div></section>'''
html = re.sub(r'<section class="investment-section[\s\S]*?</section>',investment,html,count=1)
html = html.replace('class="faq-section section-pad"','class="faq-section section-pad story-faq"').replace('class="footer"','class="footer story-footer"')
html = html.replace('<link rel="stylesheet" href="/drinks-carousel.css?v=loop-14">','<link rel="stylesheet" href="/drinks-carousel.css?v=loop-14">\n  <link rel="stylesheet" href="/story-design.css?v=story-15">\n  <script type="module" src="/story-media.js?v=story-15"></script>')
for key, value in protected.items():
    actual = re.search(r'<section\b[^>]*\bid="'+key+r'"[\s\S]*?</section>',html).group()
    assert actual == value, f'Protected section changed: {key}'
page.write_text(html,encoding='utf-8')
print('Editorial sections ready; hero, drinks and booking unchanged.')
