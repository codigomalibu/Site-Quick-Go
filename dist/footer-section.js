// Theme changes are limited to the footer; the event page keeps its brand palette.
const footer = document.querySelector('.network-footer');
const toggle = document.querySelector('#footer-theme');
if (footer && toggle) {
  toggle.addEventListener('click', () => {
    const dark = toggle.getAttribute('aria-checked') !== 'true';
    toggle.setAttribute('aria-checked', String(dark));
    footer.dataset.theme = dark ? 'dark' : 'light';
  });
}
