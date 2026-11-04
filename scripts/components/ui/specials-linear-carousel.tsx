import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

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
  const [active, setActive] = React.useState(Math.min(initialIndex, items.length - 1));
  const [paused, setPaused] = React.useState(false);
  const [hovering, setHovering] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const [hidden, setHidden] = React.useState(document.hidden);
  const dragging = React.useRef(false);
  const dragged = React.useRef(false);
  const pointer = React.useRef({ x: 0, scroll: 0 });
  const step = cardWidth + gap;
  const count = items.length;
  const current = Math.min(active, Math.max(0, count - 1));

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
  React.useLayoutEffect(() => { scroll.current?.scrollTo({ left: current * step, behavior: 'instant' }); }, [step, width]);

  const select = React.useCallback((index: number, user = true) => {
    const target = Math.max(0, Math.min(count - 1, index));
    if (user) setPaused(true);
    scroll.current?.scrollTo({ left: target * step, behavior: reduceMotion ? 'instant' : 'smooth' });
  }, [count, step, reduceMotion]);
  const prev = React.useCallback(() => select(current - 1), [select, current]);
  const next = React.useCallback(() => select(current + 1), [select, current]);
  React.useImperativeHandle(navigationRef, () => ({ prev, next }), [prev, next]);
  React.useEffect(() => {
    if (!autoAdvance || reduceMotion || paused || hovering || focused || hidden || !visible || count < 2) return;
    const timer = setInterval(() => {
      if (!document.querySelector('dialog[open]')) select((current + 1) % count, false);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoAdvance, reduceMotion, paused, hovering, focused, hidden, visible, count, current, select, intervalMs]);

  const finishDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const viewport = scroll.current;
    if (!viewport) return;
    delete viewport.dataset.dragging;
    select(Math.round(viewport.scrollLeft / step));
    setTimeout(() => { dragged.current = false; }, 160);
  };

  if (!count) return null;
  return <div ref={container} className="specials-linear-carousel" role="region" aria-roledescription="carrossel" aria-label={label}
    data-active-id={items[current].id} data-count={count} data-paused={paused || !!reduceMotion}
    onMouseEnter={() => setHovering(true)} onMouseLeave={() => { setHovering(false); finishDrag(); }}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div ref={scroll} className="linear-scroll" tabIndex={0} aria-label="Arraste ou use as setas para escolher o drink em destaque"
      onScroll={event => setActive(Math.max(0, Math.min(count - 1, Math.round(event.currentTarget.scrollLeft / step))))}
      onWheel={() => setPaused(true)} onTouchStart={() => setPaused(true)}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); prev(); }
        if (event.key === 'ArrowRight') { event.preventDefault(); next(); }
        if (event.key === 'Home') { event.preventDefault(); select(0); }
        if (event.key === 'End') { event.preventDefault(); select(count - 1); }
      }}
      onPointerDown={event => {
        if (event.pointerType !== 'mouse' || (event.target as HTMLElement).closest('button,a')) return;
        dragging.current = true; dragged.current = false; setPaused(true);
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
        {items.map((item, index) => {
          const isActive = index === current;
          return <motion.article key={item.id} className="linear-card" data-active={isActive} data-drink-id={item.id}
            role="group" aria-roledescription="slide" aria-label={`${item.title}, ${index + 1} de ${count}`} aria-hidden={!isActive}
            style={{ width: cardWidth, height: cardHeight }}
            initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : .5, delay: reduceMotion ? 0 : Math.min(index, 3) * .08, ease: 'easeOut' }}
            onClickCapture={event => { if (dragged.current) { event.preventDefault(); event.stopPropagation(); } }}
            onClick={() => { if (!isActive && !dragged.current) select(index); }}>
            <div className="linear-card-surface" inert={!isActive ? true : undefined}>{renderCard(item, { active: isActive })}</div>
          </motion.article>;
        })}
      </div>
    </div>
    <div className="linear-navigation">
      <button className="linear-arrow" onClick={prev} disabled={current === 0} aria-label="Drink anterior"><ChevronLeft size={21} /></button>
      <div className="linear-dots" role="group" aria-label="Escolher drink">{items.map((item, index) =>
        <button key={item.id} className="linear-dot" aria-label={`Ver ${item.title}`} aria-pressed={index === current} onClick={() => select(index)}><span /></button>
      )}</div>
      <button className="linear-arrow" onClick={next} disabled={current === count - 1} aria-label="Próximo drink"><ChevronRight size={21} /></button>
      {autoAdvance && !reduceMotion && <button className="linear-play" aria-label={paused ? 'Ativar troca automática de drinks' : 'Pausar troca automática de drinks'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>}
    </div>
    <p className="linear-caption" aria-live={paused || focused ? 'polite' : 'off'}><span>{String(current + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</span> {items[current].title} <span>Arraste para explorar</span></p>
  </div>;
}
