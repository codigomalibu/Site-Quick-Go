"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { SquareArrowOutUpRight } from "lucide-react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export type CardStackItem = {
  id: string | number;
  title: string;
  description?: string;
  imageSrc?: string;
  href?: string;
  ctaLabel?: string;
  tag?: string;
};

export type CardStackProps<T extends CardStackItem> = {
  items: T[];

  /** Selected index on mount */
  initialIndex?: number;

  /** How many cards are visible around the active (odd recommended) */
  maxVisible?: number;

  /** Card sizing */
  cardWidth?: number;
  cardHeight?: number;

  /** How much cards overlap each other (0..0.8). Higher = more overlap */
  overlap?: number;

  /** Total fan angle (deg). Higher = wider arc */
  spreadDeg?: number;

  /** 3D / depth feel */
  perspectivePx?: number;
  depthPx?: number;
  tiltXDeg?: number;

  /** Active emphasis */
  activeLiftPx?: number;
  activeScale?: number;
  inactiveScale?: number;

  /** Motion */
  springStiffness?: number;
  springDamping?: number;

  /** Behavior */
  loop?: boolean;
  autoAdvance?: boolean;
  intervalMs?: number;
  pauseOnHover?: boolean;

  /** UI */
  showDots?: boolean;
  className?: string;
  label?: string;
  navigationRef?: React.Ref<{ prev: () => void; next: () => void }>;


  /** Hooks */
  onChangeIndex?: (index: number, item: T) => void;

  /** Custom renderer (optional) */
  renderCard?: (item: T, state: { active: boolean }) => React.ReactNode;
};

function wrapIndex(n: number, len: number) {
  if (len <= 0) return 0;
  return ((n % len) + len) % len;
}

/** Minimal signed offset from active index to i, with wrapping (for loop behavior). */
function signedOffset(i: number, active: number, len: number, loop: boolean) {
  const raw = i - active;
  if (!loop || len <= 1) return raw;

  // consider wrapped alternative
  const alt = raw > 0 ? raw - len : raw + len;
  return Math.abs(alt) < Math.abs(raw) ? alt : raw;
}

// Adapted from the user's CardStack source for a static React island.
// Native anchors replace next/link; layout, fan geometry and spring motion
// remain component-owned, without requiring a Next.js server or Tailwind.
export function CardStack<T extends CardStackItem>({
  items, initialIndex = 0, maxVisible = 7,
  cardWidth = 520, cardHeight = 320, overlap = .48, spreadDeg = 48,
  perspectivePx = 1100, depthPx = 140, tiltXDeg = 12,
  activeLiftPx = 22, activeScale = 1.03, inactiveScale = .94,
  springStiffness = 280, springDamping = 28,
  loop = true, autoAdvance = false, intervalMs = 2800, pauseOnHover = true,
  showDots = true, className, onChangeIndex, renderCard,
  label = 'Carrossel de cards', navigationRef,
}: CardStackProps<T>) {
  const reduceMotion = useReducedMotion();
  const len = items.length;
  const [active, setActive] = React.useState(() => wrapIndex(initialIndex, len));
  const [hovering, setHovering] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const [hidden, setHidden] = React.useState(document.hidden);
  const container = React.useRef<HTMLDivElement>(null);
  const dragged = React.useRef(false);
  const activeIndex = wrapIndex(active, len);

  React.useEffect(() => { setActive(a => wrapIndex(a, len)); }, [len]);
  React.useEffect(() => {
    if (len) onChangeIndex?.(activeIndex, items[activeIndex]!);
  }, [activeIndex, items, len, onChangeIndex]);
  React.useEffect(() => {
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { threshold: .25 });
    if (container.current) observer.observe(container.current);
    const visibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  const select = React.useCallback((index: number, user = true) => {
    if (user) setPaused(true);
    setActive(loop ? wrapIndex(index, len) : Math.max(0, Math.min(len - 1, index)));
  }, [len, loop]);
  const prev = React.useCallback(() => select(activeIndex - 1), [activeIndex, select]);
  const next = React.useCallback(() => select(activeIndex + 1), [activeIndex, select]);
  React.useImperativeHandle(navigationRef, () => ({ prev, next }), [prev, next]);

  React.useEffect(() => {
    if (!autoAdvance || reduceMotion || paused || !visible || hidden || focused || len < 2 || (pauseOnHover && hovering)) return;
    const timer = window.setInterval(() => {
      if (!document.querySelector('dialog[open]')) setActive(a => loop ? wrapIndex(a + 1, len) : Math.min(a + 1, len - 1));
    }, Math.max(700, intervalMs));
    return () => clearInterval(timer);
  }, [autoAdvance, reduceMotion, paused, visible, hidden, focused, len, pauseOnHover, hovering, intervalMs, loop]);

  if (!len) return null;
  const maxOffset = Math.max(0, Math.floor(maxVisible / 2));
  const spacing = Math.max(10, Math.round(cardWidth * (1 - overlap)));
  const stepDeg = maxOffset ? spreadDeg / maxOffset : 0;
  const stageHeight = cardHeight + 100;
  const activeItem = items[activeIndex]!;

  return <div ref={container} className={cn('card-stack', className)} role="region" aria-roledescription="carrossel" aria-label={label}
    data-active-id={activeItem.id} data-paused={paused || !!reduceMotion} data-count={len}
    onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}>
    <div className="card-stack-stage" style={{ height: stageHeight }} tabIndex={0} aria-label="Use as setas para explorar os drinks"
      onKeyDown={e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
        if (e.key === 'Home') { e.preventDefault(); select(0); }
        if (e.key === 'End') { e.preventDefault(); select(len - 1); }
      }}>
      <div className="card-stack-wash" aria-hidden="true" />
      <div className="card-stack-shadow" aria-hidden="true" />
      <div className="card-stack-fan" style={{ perspective: perspectivePx }}>
        <AnimatePresence initial={false}>
          {items.map((item, i) => {
            const off = signedOffset(i, activeIndex, len, loop), abs = Math.abs(off);
            if (abs > maxOffset) return null;
            const isActive = off === 0;
            const pose = { x: off * spacing, y: abs * 10 + (isActive ? -activeLiftPx : 0), z: -abs * depthPx,
              rotateZ: off * stepDeg, rotateX: isActive ? 0 : tiltXDeg, scale: isActive ? activeScale : inactiveScale };
            return <motion.article key={item.id} className="card-stack-card" data-active={isActive} data-stack-id={item.id}
              aria-hidden={!isActive} role="group" aria-roledescription="slide" aria-label={`${item.title}, ${i + 1} de ${len}`}
              style={{ width: cardWidth, height: cardHeight, zIndex: 100 - abs, transformStyle: 'preserve-3d' }}
              initial={reduceMotion ? false : { ...pose, opacity: 0, y: pose.y + 40 }}
              animate={{ ...pose, opacity: 1 }} exit={{ opacity: 0, scale: .8 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: springStiffness, damping: springDamping }}
              onClick={() => { if (!isActive && !dragged.current) select(i); }}>
              <motion.div className="card-stack-surface" inert={!isActive ? true : undefined}
                drag={isActive ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={.18} dragMomentum={false}
                onDragStart={() => { dragged.current = true; setPaused(true); }}
                onDragEnd={(_event, info) => {
                  const threshold = Math.min(160, cardWidth * .22);
                  if (info.offset.x > threshold || info.velocity.x > 650) prev();
                  else if (info.offset.x < -threshold || info.velocity.x < -650) next();
                  window.setTimeout(() => { dragged.current = false; }, 120);
                }}>
                {renderCard ? renderCard(item, { active: isActive }) : <DefaultFanCard item={item} />}
              </motion.div>
            </motion.article>;
          })}
        </AnimatePresence>
      </div>
    </div>
    <div className="card-stack-navigation">
      <button className="stack-arrow" onClick={prev} disabled={!loop && activeIndex === 0} aria-label="Drink anterior"><ChevronLeft size={20} /></button>
      {showDots && <div className="stack-dots" role="group" aria-label="Escolher drink">{items.map((item, index) =>
        <button key={item.id} onClick={() => select(index)} className="stack-dot" aria-label={`Ver ${item.title}`} aria-pressed={index === activeIndex}><span /></button>
      )}</div>}
      <button className="stack-arrow" onClick={next} disabled={!loop && activeIndex === len - 1} aria-label="Próximo drink"><ChevronRight size={20} /></button>
      {autoAdvance && !reduceMotion && <button className="stack-play" onClick={() => setPaused(p => !p)} aria-label={paused ? 'Ativar troca automática de drinks' : 'Pausar troca automática de drinks'} aria-pressed={paused}>
        {paused ? <Play size={15} /> : <Pause size={15} />}
      </button>}
      {activeItem.href && <a href={activeItem.href} target="_blank" rel="noreferrer" aria-label={`Abrir ${activeItem.title}`}><SquareArrowOutUpRight size={16} /></a>}
    </div>
    <p className="stack-caption" aria-live={paused || focused ? 'polite' : 'off'}><span>{String(activeIndex + 1).padStart(2, '0')} / {String(len).padStart(2, '0')}</span> {activeItem.title} <span>Arraste para explorar</span></p>
  </div>;
}

function DefaultFanCard({ item }: { item: CardStackItem }) {
  return <div className="default-fan-card">
    {item.imageSrc && <img src={item.imageSrc} alt={item.title} draggable={false} />}
    <div><strong>{item.title}</strong>{item.description && <p>{item.description}</p>}</div>
  </div>;
}

