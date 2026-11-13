export function quoteEmbedUrl(search, praca = '') {
  const query = new URLSearchParams();
  if (praca) query.set('praca', praca);
  new URLSearchParams(search).forEach((value, key) => {
    if (key.startsWith('utm_')) query.set(key, value);
  });
  const url = new URL('https://quickgoorcamentos.com/embed/orcamento');
  url.search = query.toString();
  return url.href;
}

export function connectQuoteEmbed(frame, browser, praca = '') {
  const url = quoteEmbedUrl(browser.location.search, praca);
  const dialog = browser.document.getElementById('quote-dialog');
  const modal = dialog?.tagName === 'DIALOG';
  frame.src = url;
  const fallback = browser.document.getElementById('open-quote-system');
  if (fallback) fallback.href = url;
  const onMessage = event => {
    if (event.origin !== 'https://quickgoorcamentos.com' || event.source !== frame.contentWindow || !event.data || typeof event.data !== 'object') return;
    const rawHeight = event.data.quickgoAltura;
    if (!modal && (typeof rawHeight === 'number' || typeof rawHeight === 'string') && String(rawHeight).trim()) {
      const height = Number(rawHeight);
      if (Number.isFinite(height) && height > 0 && height <= 30000) frame.style.height = `${Math.max(600, Math.round(height))}px`;
    }
    if (!modal && (event.data.quickgoTopo === true || event.data.quickgoTopo === 1)) {
      frame.scrollIntoView({ behavior: browser.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    }
  };
  browser.addEventListener('message', onMessage);
  return () => browser.removeEventListener('message', onMessage);
}

if (typeof window !== 'undefined') {
  const frame = document.getElementById('quickgo-orcamento');
  if (frame) { connectQuoteEmbed(frame, window, ''); setupQuoteDialog(document, window); } // Empty: the customer chooses the praça inside the official system.
}


export function setupQuoteDialog(doc, browser) {
  const dialog = doc.getElementById('quote-dialog');
  if (!dialog) return;
  let trigger;
  let scrollY = 0;
  let previousStyles;
  const open = element => {
    if (dialog.open) return;
    trigger = element;
    scrollY = browser.scrollY;
    previousStyles = { position: doc.body.style.position, top: doc.body.style.top, width: doc.body.style.width };
    doc.body.style.position = 'fixed';
    doc.body.style.top = `-${scrollY}px`;
    doc.body.style.width = '100%';
    dialog.showModal();
    dialog.querySelector('.quote-dialog-close').focus({ preventScroll: true });
  };
  doc.addEventListener('click', event => {
    const link = event.target.closest('a[href="#orcamento"], [data-open-quote]');
    if (!link) return;
    event.preventDefault();
    open(link);
  });
  dialog.querySelector('.quote-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    Object.assign(doc.body.style, previousStyles);
    browser.scrollTo({ top: scrollY, behavior: 'instant' });
    trigger?.focus({ preventScroll: true });
  });
  if (browser.location.hash === '#orcamento') open(doc.querySelector('a[href="#orcamento"]'));
}
