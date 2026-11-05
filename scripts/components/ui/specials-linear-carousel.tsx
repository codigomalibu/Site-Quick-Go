import * as React from 'react';
import { flushSync } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type LinearCarouselItem = { id: string | number; title: string; description?: string; imageSrc?: string; tag?: string };
type Navigation = { prev: () => void; next: () => void };
type Props<T extends LinearCarouselItem> = {
  items: T[]; cardWidth?: number; cardHeight?: number; gap?: number;
  autoAdvance?: boolean; intervalMs?: number; label?: string;
  initialIndex?: number;
  navigationRef?: React.Ref<Navigation>;
  renderCard: (item: T, state: { active: boolean }) => React.ReactNode;
};

// Editable reconstruction of the supplied Specials Linear Carousel demo.
// Native horizontal scrolling preserves touch momentum and scroll-snap;
// only the item nearest the center receives the full-color treatment.
export function SpecialsLinearCarousel<T extends LinearCarouselItem>({
  items, cardWidth = 320, cardHeight = 384, gap = 18,
  autoAdvance = false, intervalMs = 4500, label = 'Carta de drinks', initialIndex = 0, navigationRef, renderCard,
}: Props<T>) {
  const reduceMotion = useReducedMotion();
  const scroll = React.useRef<HTMLDivElement>(null);
  const container = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  const [active, setActive] = React.useState(items.length + Math.min(initialIndex, items.length - 1));
  const [moving, setMoving] = React.useState(false);
  const [interacting, setInteracting] = React.useState(false);
  const [hovering, setHovering] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const [hidden, setHidden] = React.useState(document.hidden);
  const dragging = React.useRef(false);
  const dragged = React.useRef(false);
  const pointer = React.useRef({ x: 0, scroll: 0 });
  const settleTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const step = cardWidth + gap;
  const count = items.length;
  const wrap = (index: number) => count ? ((index % count) + count) % count : 0;
  const current = wrap(active);
  const paused = hovering || focused || interacting || hidden || !!reduceMotion;
  const activeRef = React.useRef(active);
  activeRef.current = active;
  const copies = React.useMemo(() => Array.from({ length: items.length * 3 }, (_, index) => ({ item: items[index % items.length], index })), [items]);

  React.useLayoutEffect(() => {
    if (!scroll.current) return;
    const resize = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    resize.observe(scroll.current);
    return () => resize.disconnect();
  }, []);
  React.useEffect(() => {
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { threshold: .2 });
    if (container.current) observer.observe(container.current);
    const visibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  React.useLayoutEffect(() => { scroll.current?.scrollTo({ left: (count + current) * step, behavior: 'instant' }); }, [step, width]);
  React.useEffect(() => () => clearTimeout(settleTimer.current), []);

  // Three identical runs keep neighbors present across both boundaries.
  // After scroll momentum settles, jump to the equivalent middle run before
  // the next paint; the user sees the same image in the same position.
  const recenter = () => {
    const viewport = scroll.current;
    if (!viewport || dragging.current || !count) return;
    const index = Math.round(viewport.scrollLeft / step);
    if (index >= count && index < count * 2) { setMoving(false); return; }
    const target = count + wrap(index);
    viewport.dataset.rebasing = 'true';
    flushSync(() => setActive(target));
    viewport.scrollTo({ left: target * step, behavior: 'instant' });
    requestAnimationFrame(() => requestAnimationFrame(() => { delete viewport.dataset.rebasing; }));
    setMoving(false);
  };

  const selectPhysical = React.useCallback((index: number, user = true) => {
    const viewport = scroll.current;
    if (!viewport) return;
    if (Math.abs(viewport.scrollLeft - index * step) < 1) { setMoving(false); return; }
    setMoving(true);
    viewport.scrollTo({ left: index * step, behavior: reduceMotion ? 'instant' : 'smooth' });
  }, [step, reduceMotion]);

  const select = React.useCallback((index: number, user = true) => {
    const logical = ((index % count) + count) % count;
    const target = [logical, logical + count, logical + count * 2].reduce((best, value) => Math.abs(value - activeRef.current) < Math.abs(best - activeRef.current) ? value : best);
    selectPhysical(target, user);
  }, [count, selectPhysical]);
  const prev = React.useCallback(() => selectPhysical(activeRef.current - 1), [selectPhysical]);
  const next = React.useCallback(() => selectPhysical(activeRef.current + 1), [selectPhysical]);
  React.useImperativeHandle(navigationRef, () => ({ prev, next }), [prev, next]);
  React.useEffect(() => {
    if (!autoAdvance || paused || moving || !visible || count < 2) return;
    // The full dwell starts only after scrolling and invisible rebasing settle.
    // Manual navigation never permanently disables the continuous loop.
    const timer = setInterval(() => {
      if (!dragging.current && !document.querySelector('dialog[open]')) selectPhysical(activeRef.current + 1, false);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoAdvance, paused, moving, visible, count, selectPhysical, intervalMs]);

  const finishDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const viewport = scroll.current;
    if (!viewport) return;
    delete viewport.dataset.dragging;
    selectPhysical(Math.round(viewport.scrollLeft / step));
    setTimeout(() => { dragged.current = false; }, 160);
  };

  if (!count) return null;
  return <div ref={container} className="specials-linear-carousel" role="region" aria-roledescription="carrossel" aria-label={label}
    data-active-id={items[current].id} data-count={count} data-paused={paused} data-moving={moving}
    onMouseLeave={() => { setHovering(false); finishDrag(); }}
    onPointerDownCapture={() => setFocused(false)}
    onFocusCapture={event => setFocused((event.target as HTMLElement).matches(':focus-visible'))}
    onKeyDownCapture={() => setFocused(true)}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div ref={scroll} className="linear-scroll" tabIndex={0} aria-label="Arraste ou use as setas para escolher o drink em destaque. Passe o mouse sobre um drink ou use o foco do teclado para pausar a troca automática."
      onScroll={event => {
        if (event.currentTarget.dataset.rebasing) return;
        setMoving(true);
        setActive(Math.max(0, Math.min(count * 3 - 1, Math.round(event.currentTarget.scrollLeft / step))));
        clearTimeout(settleTimer.current);
        settleTimer.current = setTimeout(recenter, 180);
      }}
      onTouchStart={() => setInteracting(true)} onTouchEnd={() => setInteracting(false)} onTouchCancel={() => setInteracting(false)}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); prev(); }
        if (event.key === 'ArrowRight') { event.preventDefault(); next(); }
        if (event.key === 'Home') { event.preventDefault(); select(0); }
        if (event.key === 'End') { event.preventDefault(); select(count - 1); }
      }}
      onPointerDown={event => {
        if (event.pointerType !== 'mouse' || (event.target as HTMLElement).closest('button,a')) return;
        dragging.current = true; dragged.current = false;
        pointer.current = { x: event.clientX, scroll: event.currentTarget.scrollLeft };
        event.currentTarget.dataset.dragging = 'true';
      }}
      onPointerMove={event => {
        if (!dragging.current) return;
        const distance = event.clientX - pointer.current.x;
        if (Math.abs(distance) > 5) {
          dragged.current = true;
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
        }
        event.currentTarget.scrollLeft = pointer.current.scroll - distance;
      }} onPointerUp={finishDrag} onPointerCancel={finishDrag}>
      <div className="linear-track" style={{ gap, paddingInline: Math.max(0, (width - cardWidth) / 2), minHeight: cardHeight + 48 }}>
        {copies.map(({ item, index }) => {
          const isActive = index === active;
          return <motion.article key={`${item.id}-${index}`} className="linear-card" data-active={isActive} data-drink-id={item.id}
            role="group" aria-roledescription="slide" aria-label={`${item.title}, ${wrap(index) + 1} de ${count}`} aria-hidden={!isActive}
            style={{ width: cardWidth, height: cardHeight }}
            initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : .5, delay: reduceMotion ? 0 : Math.min(wrap(index), 3) * .08, ease: 'easeOut' }}
            onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
            onClickCapture={event => { if (dragged.current) { event.preventDefault(); event.stopPropagation(); } }}
            onClick={() => { if (!isActive && !dragged.current) selectPhysical(index); }}>
            <div className="linear-card-surface" inert={!isActive ? true : undefined}>{renderCard(item, { active: isActive })}</div>
          </motion.article>;
        })}
      </div>
    </div>
    <div className="linear-navigation">
      <button className="linear-arrow" onClick={prev} disabled={count < 2} aria-label="Drink anterior"><ChevronLeft size={21} /></button>
      <div className="linear-dots" role="group" aria-label="Escolher drink">{items.map((item, index) =>
        <button key={item.id} className="linear-dot" aria-label={`Ver ${item.title}`} aria-pressed={index === current} onClick={() => select(index)}><span /></button>
      )}</div>
      <button className="linear-arrow" onClick={next} disabled={count < 2} aria-label="Próximo drink"><ChevronRight size={21} /></button>
    </div>
    <p className="linear-caption" aria-live={paused || focused ? 'polite' : 'off'}><span>{String(current + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</span> {items[current].title} <span>Arraste para explorar</span></p>
  </div>;
}
