import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Pressable, Text, View } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import { dateKey } from '../../utils/format';
import {
  zonedParts,
  edgePadding,
  centerTarget,
  nearestToCenter,
  needsSnap,
  buildWindow,
  extendWindow,
} from '../../utils/mealDates';
import ProgressRing from '../ui/ProgressRing';
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Rolling strip window: ±10 day-blocks around the selection at mount, so
// ~5 pills fill the viewport and swiping either way instantly reveals more.
// Only taps change the selection; swiping merely browses (totals below stay
// put). The selected pill ends up centered after mount, tap, swipe release
// (snap), tab return, and parent refresh.
const WINDOW_RADIUS = 10;
const EXTEND_COUNT = 7;
// ~±3 weeks of swipe room: bounds worst-case render cost (every pill mounts
// a real SVG ring — no virtualization in ScrollView) while far exceeding a
// fling's reach. Hitting the cap behaves like a normal list end, never blank.
const MAX_BLOCKS = 63;

// Horizontal day strip where the selected pill always ends up centered —
// like real-world calendar pickers.
export default function DaySelector({
  selected,
  onSelect,
  totalsByDate = {},
  goal = 2000,
  timeZone,
  recenterSignal = 0,
}) {
  const today = new Date();
  const todayKey = dateKey(today, timeZone);
  const selectedKey = dateKey(selected, timeZone);
  const selectedKeyRef = useRef(selectedKey);
  useEffect(() => {
    selectedKeyRef.current = selectedKey;
  }, [selectedKey]);
  const isFocused = useIsFocused();

  const [windowDays, setWindowDays] = useState(() => buildWindow(selectedKey || todayKey, WINDOW_RADIUS, timeZone));
  // Anchor the render-phase rebuild below fired for: a non-converging anchor
  // (e.g. an Invalid Date's empty key) settles after one rebuild instead of
  // looping setWindowDays forever ("Too many re-renders"). State (not a ref)
  // because refs must not be read/written during render.
  const [lastRebuildKey, setLastRebuildKey] = useState(null);
  const [pad, setPad] = useState(0);
  const [ready, setReady] = useState(false);
  const padRef = useRef(0);
  const readyRef = useRef(false);
  const pending = useRef(null);
  // Backward-extension compensation: { key, oldX } of the anchor pill so the
  // viewport doesn't jump when blocks are prepended ahead of it.
  const shiftRef = useRef(null);

  const scrollRef = useRef(null);
  const containerWidth = useRef(0);
  const contentWidth = useRef(0);
  const scrollX = useRef(0);
  const itemLayout = useRef({});

  // A far-away selection (or zone change) rebuilds the window around it.
  // Render-phase adjustment (React-endorsed for derived state): taps land on
  // rendered blocks, so this normally keeps the same array — no extra render.
  // The anchor falls back to today when the selection has no key, and the
  // last-rebuild guard makes a non-converging anchor structurally unable to
  // loop: one rebuild per anchor, then settle.
  const anchorKey = selectedKey || todayKey;
  if (anchorKey && lastRebuildKey !== anchorKey && !windowDays.some((d) => d.key === anchorKey)) {
    setLastRebuildKey(anchorKey);
    setWindowDays(buildWindow(anchorKey, WINDOW_RADIUS, timeZone));
  }

  function setPadBoth(next) {
    padRef.current = next;
    setPad((prev) => (prev === next ? prev : next));
  }

  function markCentered() {
    pending.current = null;
    if (!readyRef.current) {
      readyRef.current = true;
      setReady(true);
    }
  }

  // Scroll `key` to the viewport center. Returns false when measurement is
  // missing (caller keeps the pending request for the next layout pass).
  // Measured item x already includes the edge padding, so padLeft is 0.
  const tryCenter = useCallback((key, animated) => {
    const scroller = scrollRef.current;
    const item = itemLayout.current[key];
    const cw = containerWidth.current;
    if (!scroller || !item || !cw) return false;
    const need = edgePadding(cw, item.w);
    if (need !== padRef.current) {
      // Pill widths changed (e.g. new selection): re-render with corrected
      // padding first; the re-measure pass will complete the scroll.
      setPadBoth(need);
      return false;
    }
    const target = centerTarget(item.x, item.w, cw, 0, contentWidth.current);
    scroller.scrollTo({ x: target, animated });
    return true;
  }, []);

  function requestCenter(key, animated) {
    pending.current = { key, animated };
    if (tryCenter(key, animated)) markCentered();
  }

  function flushPending() {
    const p = pending.current;
    if (!p) return;
    if (tryCenter(p.key, p.animated)) markCentered();
  }

  // Selection change (tap only — swiping never selects): center it.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      requestCenter(selectedKey, false);
      return;
    }
    requestCenter(selectedKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  // Return from another tab: keep the selection, scroll it back to center.
  const wasFocused = useRef(isFocused);
  useEffect(() => {
    if (isFocused && !wasFocused.current) requestCenter(selectedKeyRef.current, true);
    wasFocused.current = isFocused;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  // Parent refresh (new data may resize pills): re-center without animation.
  useEffect(() => {
    if (recenterSignal) requestCenter(selectedKeyRef.current, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterSignal]);

  function measuredLayouts() {
    const out = [];
    for (const d of windowDays) {
      const item = itemLayout.current[d.key];
      if (item) out.push({ key: d.key, x: item.x, w: item.w });
    }
    return out;
  }

  // Grow the window before the user hits a dead end. Backward growth shifts
  // every pill right, so the anchor pill's delta is compensated on its next
  // measure pass and the viewport visibly stays put.
  function maybeExtend() {
    const cw = containerWidth.current;
    const contentW = contentWidth.current;
    if (!cw || !contentW || contentW <= cw) return;
    const x = scrollX.current;
    if (x < cw) {
      const layouts = measuredLayouts();
      if (layouts.length === 0) return;
      shiftRef.current = { key: layouts[0].key, oldX: layouts[0].x };
      setWindowDays((prev) => {
        if (prev.length >= MAX_BLOCKS) return prev;
        const grown = extendWindow(prev, 'backward', EXTEND_COUNT, timeZone);
        return grown.length === prev.length ? prev : grown;
      });
    } else if (x + cw > contentW - cw) {
      setWindowDays((prev) => {
        if (prev.length >= MAX_BLOCKS) return prev;
        const grown = extendWindow(prev, 'forward', EXTEND_COUNT, timeZone);
        return grown.length === prev.length ? prev : grown;
      });
    }
  }

  // Swipe release: snap the nearest pill to center WITHOUT selecting it —
  // browsing never moves the totals below. The needsSnap guard also stops
  // programmatic-scroll momentum echoes from re-issuing scrolls forever.
  function handleSnap() {
    const layouts = measuredLayouts();
    if (layouts.length === 0) return;
    const cw = containerWidth.current;
    const nearest = nearestToCenter(layouts, scrollX.current, cw, 0);
    if (!nearest) return;
    const item = itemLayout.current[nearest];
    if (!item || !cw) return;
    const target = centerTarget(item.x, item.w, cw, 0, contentWidth.current);
    if (!needsSnap(scrollX.current, target)) return;
    requestCenter(nearest, true);
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      style={{ opacity: ready ? 1 : 0 }}
      onScroll={(e) => {
        scrollX.current = e.nativeEvent.contentOffset.x;
        maybeExtend();
      }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        const rotated = w !== containerWidth.current && containerWidth.current !== 0;
        containerWidth.current = w;
        if (rotated && readyRef.current) {
          // Viewport width changed (rotation/split-screen): padding derived
          // from the old width no longer centers. Update it and queue the
          // scroll — the re-measure pass flushes it with fresh offsets
          // (scrolling now would use stale x positions).
          const sel = itemLayout.current[selectedKeyRef.current];
          if (sel) setPadBoth(edgePadding(w, sel.w));
          pending.current = { key: selectedKeyRef.current, animated: false };
        }
        flushPending();
      }}
      onContentSizeChange={(w) => {
        contentWidth.current = w;
        flushPending();
      }}
      onMomentumScrollEnd={handleSnap}
      onScrollEndDrag={(e) => {
        // Slow drags release without momentum: snap immediately. Flings are
        // handled by onMomentumScrollEnd when the glide stops.
        const velocity = e.nativeEvent.velocity;
        if (!velocity || Math.abs(velocity.x) < 0.1) handleSnap();
      }}
      contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingHorizontal: pad, flexGrow: 1, justifyContent: 'center' }}
    >
      {windowDays.map(({ date: d, key }) => {
        const isSelected = key === selectedKey;
        const isToday = key === todayKey;
        const eaten = (totalsByDate[key] && totalsByDate[key].eaten) || 0;
        const parts = zonedParts(d, timeZone);
        return (
          <Pressable
            key={key}
            onPress={() => {
              onSelect(d);
              requestCenter(key, true);
            }}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              itemLayout.current[key] = { x, w: width };
              const shift = shiftRef.current;
              if (shift && shift.key === key) {
                shiftRef.current = null;
                if (scrollRef.current) {
                  scrollRef.current.scrollTo({ x: Math.max(0, scrollX.current + (x - shift.oldX)), animated: false });
                }
              }
              flushPending();
            }}
            accessibilityRole="button"
            accessibilityLabel={`${DAY_LABELS[parts.weekday]} ${parts.d}${isToday ? ', today' : ''}${isSelected ? ', selected' : ''}`}
            accessibilityState={{ selected: isSelected }}
            className={`items-center rounded-card px-3 py-2 min-w-[44px] ${
              isSelected ? 'bg-primary' : isToday ? 'bg-white border border-[#F1E8E0]' : 'bg-transparent'
            }`}
          >
            <Text className={`text-[11px] ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>{DAY_LABELS[parts.weekday]}</Text>
            <Text className={`text-sm font-bold mt-0.5 ${isSelected ? 'text-white' : 'text-ink'}`}>{parts.d}</Text>
            <View className="mt-1.5">
              <ProgressRing
                eaten={eaten}
                goal={goal}
                size={36}
                strokeWidth={4}
                color={isSelected ? '#FFFFFF' : '#f2470c'}
                trackColor={isSelected ? 'rgba(255,255,255,0.35)' : '#F1E8E0'}
              />
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
