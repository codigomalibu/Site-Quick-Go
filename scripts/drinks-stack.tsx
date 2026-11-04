import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Heart, ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { CardStack, type CardStackItem } from './components/ui/card-stack';

type DrinkItem = CardStackItem & { category: string; imageAlt: string };
type State = { filter: string; selected: string[] };
type Options = { items: DrinkItem[]; selected: string[]; onFavorite: (id: string) => void; onDetails: (id: string) => void };

export function mountDrinkStack(host: HTMLElement, options: Options) {
  let state: State = { filter: 'all', selected: options.selected };
  const subscribers = new Set<() => void>();
  const navigation = React.createRef<{ prev: () => void; next: () => void }>();
  const update = (patch: Partial<State>) => { state = { ...state, ...patch }; subscribers.forEach(fn => fn()); };
  const subscribe = (fn: () => void) => { subscribers.add(fn); return () => { subscribers.delete(fn); }; };
  const getSnapshot = () => state;

  function DrinkStack() {
    const current = React.useSyncExternalStore(subscribe, getSnapshot);
    const [width, setWidth] = React.useState(host.clientWidth);
    const reduceMotion = useReducedMotion();
    React.useLayoutEffect(() => {
      host.dataset.stackReady = 'true';
      const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
      observer.observe(host); return () => observer.disconnect();
    }, []);
    const items = React.useMemo(() => options.items.filter(item => current.filter === 'all' || item.category === current.filter), [current.filter]);
    const cardWidth = width < 600 ? Math.min(300, width * .74) : Math.min(365, width * .36);
    const cardHeight = Math.round(cardWidth * 1.19);
    const renderCard = React.useCallback((item: DrinkItem, { active }: { active: boolean }) => {
      const selected = current.selected.includes(String(item.id));
      return <div className="stack-drink">
        <img src={item.imageSrc} alt={item.imageAlt} width="800" height="1000" draggable={false} decoding="async" />
        <div className="stack-drink-shade" aria-hidden="true" />
        <span className="stack-drink-tag">{item.tag}</span>
        <motion.button className="stack-favorite" whileTap={reduceMotion ? undefined : { scale: .88 }}
          disabled={!active} aria-label={`${selected ? 'Remover' : 'Adicionar'} ${item.title} ${selected ? 'dos' : 'aos'} favoritos`} aria-pressed={selected}
          onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); options.onFavorite(String(item.id)); }}>
          <Heart size={21} fill={selected ? 'currentColor' : 'none'} strokeWidth={1.5} />
        </motion.button>
        <div className="stack-drink-copy"><h3>{item.title}</h3><p>{item.description}</p>
          <button disabled={!active} onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); options.onDetails(String(item.id)); }} aria-label={`Conhecer o ${item.title}`}>
            Conhecer o drink <ArrowUpRight size={19} strokeWidth={1.6} />
          </button>
        </div>
      </div>;
    }, [current.selected, reduceMotion]);
    return <CardStack key={current.filter} items={items} label="Carta de drinks Quick GO" cardWidth={cardWidth} cardHeight={cardHeight}
      maxVisible={5} overlap={width < 600 ? .64 : .52} spreadDeg={24} depthPx={width < 600 ? 70 : 105} tiltXDeg={10}
      activeLiftPx={20} navigationRef={navigation} autoAdvance intervalMs={4500} pauseOnHover showDots renderCard={renderCard} />;
  }
  host.removeAttribute('tabindex');
  host.classList.add('has-card-stack');
  host.setAttribute('role', 'presentation');
  createRoot(host).render(<DrinkStack />);
  return {
    filter: (filter: string) => update({ filter }),
    favorites: (selected: string[]) => update({ selected }),
    prev: () => navigation.current?.prev(), next: () => navigation.current?.next(),
  };
}
