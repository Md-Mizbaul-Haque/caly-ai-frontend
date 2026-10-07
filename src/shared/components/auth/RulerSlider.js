import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Text, View } from 'react-native';

const TICK_W = 12;

function round1(n) { return Math.round(n * 10) / 10; }

// Memoized: tick rows are static, so parent re-renders during a swipe skip
// all of them and only the display number updates.
const Tick = memo(function Tick({ major, label }) {
  return (
    <View style={{ width: TICK_W }} className="items-center">
      <View style={{ width: 2, height: major ? 40 : 22, backgroundColor: '#1A1A1A' }} />
      {major && <Text className="text-[11px] text-[#8A8A8A] mt-1">{label}</Text>}
    </View>
  );
});

// Virtualized ruler with exact center math (single source of truth):
//
//   scroll offset → selected index → selected weight → displayed weight
//
// Geometry (all derived, nothing hardcoded): the list viewport width V is
// measured at runtime. Each side gets a spacer of S = (V - TICK_W) / 2, so
// tick i's CENTER sits at content-x S + i*T + T/2 and the needle (viewport
// center, x + V/2) aligns with it exactly when x = i*TICK_W. Therefore:
//
//   offsetFor(i) = i * TICK_W
//   indexFor(x)  = round(x / TICK_W), clamped to [0, count - 1]
//
// The scroll range maps exactly onto [offsetFor(0), offsetFor(count - 1)],
// and snapToInterval={TICK_W} stops land precisely on tick centers — the
// center tick and the committed value can never disagree by construction.
function RulerSlider({ min, max, step, value, onChange, testID = 'ruler' }) {
  const ref = useRef(null);
  const count = Math.floor((max - min) / step) + 1;
  const ticks = useMemo(
    () => Array.from({ length: count }, (_, i) => round1(min + i * step)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [min, max, step]
  );
  const safeValue = Math.min(max, Math.max(min, value ?? min));

  // Measured viewport width (the list is inset by the screen padding, so the
  // window width must NOT be assumed). Falls back to the inset estimate for
  // the very first frame before layout.
  const [viewW, setViewW] = useState(() => Dimensions.get('window').width - 48);
  const onListLayout = useCallback((e) => {
    const w = e.nativeEvent.layout.width;
    setViewW((prev) => (Math.abs(prev - w) < 0.5 ? prev : w));
  }, []);
  const spacerW = (viewW - TICK_W) / 2;

  const onChangeRef = useRef(onChange);
  // Latest prop mirror for the equality guard in commitIndex. Synced in an
  // effect (never during render); a stale read can only cause one redundant
  // commit, never a wrong value, since candidates derive from live offsets.
  const valueRef = useRef(value);
  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  });
  // Key of the last value we committed or synced to. The sync effect below
  // only moves the scroll for OUTSIDE changes (mount, unit switch) — never
  // for the user's own drag, so it can't fight momentum.
  const lastCommittedKey = useRef(null);
  const lastIndexRef = useRef(-1);
  // Scroll events from a fresh mount arrive before positioning; they must not
  // commit a transient offset as the value (this corrupted a unit toggle to
  // a near-min value). Reset synchronously on range change, armed again in
  // the same layout pass that positions the list — ordering is safe because
  // scroll events are always delivered asynchronously after commit.
  const readyRef = useRef(false);
  const prevRangeRef = useRef(`${min}|${step}`);

  function commitIndex(i) {
    const clamped = Math.min(count - 1, Math.max(0, i));
    lastIndexRef.current = clamped;
    // clamped is already an exact grid index — no snapping helper needed.
    const v = round1(min + clamped * step);
    // Skip repeats: the positioning scroll's own event re-reports the
    // current value, which must not trigger another state update.
    if (v === valueRef.current) {
      lastCommittedKey.current = `${min}|${step}|${v}`;
      return;
    }
    lastCommittedKey.current = `${min}|${step}|${v}`;
    onChangeRef.current(v);
  }

  // Release handler: commit the landed index. The native snap (snapToInterval
  // lands exactly on tick centers by construction) animates the final ≤6px
  // glide on its own — no programmatic scroll here, so the release feels
  // smooth instead of jump-cut. Momentum-end fires after the glide with the
  // exact offset; drag-end (no momentum) commits the release offset, which
  // rounds to the same grid stop the snap glides to.
  function settle(offsetX) {
    if (!readyRef.current) return;
    commitIndex(Math.round(offsetX / TICK_W));
  }

  // Layout effect (pre-paint): positions the list correctly on the very first
  // frame — no visible jump and no follow-up correction commits.
  useLayoutEffect(() => {
    const rangeKey = `${min}|${step}`;
    if (prevRangeRef.current !== rangeKey) {
      prevRangeRef.current = rangeKey;
      readyRef.current = false;
    }
    const key = `${rangeKey}|${safeValue}`;
    if (lastCommittedKey.current !== key) {
      lastCommittedKey.current = key;
      const idx = Math.min(count - 1, Math.max(0, Math.round((safeValue - min) / step)));
      lastIndexRef.current = idx;
      ref.current?.scrollToOffset({ offset: idx * TICK_W, animated: false });
    }
    readyRef.current = true;
  }, [safeValue, min, step, count]);

  const renderItem = useCallback(({ index, item }) => {
    const major = index % 10 === 0;
    return <Tick major={major} label={major ? item : null} />;
  }, []);

  const keyExtractor = useCallback((t) => String(t), []);

  const getItemLayout = useCallback(
    (_, index) => ({ length: TICK_W, offset: spacerW + index * TICK_W, index }),
    [spacerW]
  );

  const spacer = useMemo(() => <View style={{ width: spacerW }} />, [spacerW]);

  return (
    <View testID={testID}>
      <View className="items-center mb-2">
        <View style={{ width: 3, height: 56, backgroundColor: '#f2470c', borderRadius: 2 }} />
      </View>
      <FlatList
        ref={ref}
        key={`${min}|${step}`}
        horizontal
        data={ticks}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        ListHeaderComponent={spacer}
        ListFooterComponent={spacer}
        onLayout={onListLayout}
        showsHorizontalScrollIndicator={false}
        snapToInterval={TICK_W}
        decelerationRate="fast"
        disableIntervalMomentum
        nestedScrollEnabled
        scrollEventThrottle={16}
        windowSize={5}
        initialNumToRender={31}
        maxToRenderPerBatch={60}
        updateCellsBatchingPeriod={8}
        removeClippedSubviews
        onScroll={(e) => {
          if (!readyRef.current) return;
          const i = Math.min(
            count - 1,
            Math.max(0, Math.round(e.nativeEvent.contentOffset.x / TICK_W))
          );
          if (i !== lastIndexRef.current) commitIndex(i);
        }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
        onScrollEndDrag={(e) => settle(e.nativeEvent.contentOffset.x)}
      />
    </View>
  );
}

// Parent re-renders on every context tick while dragging; memo keeps the
// ruler subtree cheap unless its own range/value props actually change.
export default memo(RulerSlider);
