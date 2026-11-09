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
  frame.src = url;
  const fallback = browser.document.getElementById('open-quote-system');
  if (fallback) fallback.href = url;
  const onMessage = event => {
    if (event.origin !== 'https://quickgoorcamentos.com' || event.source !== frame.contentWindow || !event.data || typeof event.data !== 'object') return;
    const rawHeight = event.data.quickgoAltura;
    if ((typeof rawHeight === 'number' || typeof rawHeight === 'string') && String(rawHeight).trim()) {
      const height = Number(rawHeight);
      if (Number.isFinite(height) && height > 0 && height <= 30000) frame.style.height = `${Math.max(600, Math.round(height))}px`;
    }
    if (event.data.quickgoTopo === true || event.data.quickgoTopo === 1) {
      frame.scrollIntoView({ behavior: browser.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    }
  };
  browser.addEventListener('message', onMessage);
  return () => browser.removeEventListener('message', onMessage);
}

if (typeof window !== 'undefined') {
  const frame = document.getElementById('quickgo-orcamento');
  if (frame) connectQuoteEmbed(frame, window, ''); // Empty: the customer chooses the praça inside the official system.
}
