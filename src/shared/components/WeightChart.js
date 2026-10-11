import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { formatDateShort, formatMonthShort } from '../utils/format';

const PAD = { top: 18, right: 14, bottom: 24, left: 36 };
const MUTED = '#8A8A8A';
const GRID = '#F1E8E0';

function niceTicks(min, max, count = 4) {
  if (min === max) {
    min -= 2;
    max += 2;
  }
  const rawStep = (max - min) / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(parseFloat(v.toFixed(2)));
  return { lo, hi, ticks };
}

function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Touchable line chart for weight entries.
 * points: [{ date: Date, value: number }] sorted ascending by date.
 * With fewer than 2 points renders a faint dashed preview so the card
 * never looks empty (same height/grid, no tooltip/touch).
 */
export default function WeightChart({ points, width, height, color = '#22C55E' }) {
  const hasData = points.length >= 2;
  // Parent remounts on range/count change (key), so init-to-latest is enough;
  // idx below clamps for in-place value edits.
  const [selected, setSelected] = useState(Math.max(points.length - 1, 0));

  const model = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const p of points) {
      if (p.value < min) min = p.value;
      if (p.value > max) max = p.value;
    }
    // Preview baseline: single log centers the grid, zero logs uses a
    // neutral band so niceTicks still yields real grid lines.
    if (!hasData) {
      if (points.length === 1) {
        min = points[0].value - 2;
        max = points[0].value + 2;
      } else {
        min = 0;
        max = 6;
      }
    }
    const { lo, hi, ticks } = niceTicks(min, max);
    const plotW = Math.max(width - PAD.left - PAD.right, 1);
    const plotH = Math.max(height - PAD.top - PAD.bottom, 1);
    let pts;
    if (hasData) {
      const t0 = points[0].date.getTime();
      const t1 = points[points.length - 1].date.getTime();
      pts = points.map(p => ({
        x: PAD.left + (t1 === t0 ? plotW / 2 : ((p.date.getTime() - t0) / (t1 - t0)) * plotW),
        y: PAD.top + (1 - (p.value - lo) / (hi - lo)) * plotH,
        ...p,
      }));
    } else {
      // Gentle demo wave across the plot; clearly fake (dashed + muted).
      const fractions = [0, 0.33, 0.66, 1];
      const ys = [0.35, 0.5, 0.42, 0.6];
      pts = fractions.map((f, i) => ({
        x: PAD.left + f * plotW,
        y: PAD.top + ys[i] * plotH,
      }));
    }
    return { lo, hi, ticks, pts, plotW, plotH };
  }, [points, width, height, hasData]);

  const idx = hasData ? Math.min(selected, points.length - 1) : -1;
  const sel = idx >= 0 ? model.pts[idx] : null;

  function handleTouch(evt) {
    const x = evt.nativeEvent.locationX;
    let best = 0;
    let bestDist = Infinity;
    model.pts.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setSelected(best);
  }

  const path = smoothPath(model.pts);
  const previewColor = '#C9C9C9';
  const lineColor = hasData ? color : previewColor;

  const firstLabel = hasData
    ? `${formatMonthShort(points[0].date)} ${points[0].date.getFullYear()}`
    : '';
  const lastLabel = hasData
    ? `${formatMonthShort(points[points.length - 1].date)} ${points[points.length - 1].date.getFullYear()}`
    : '';

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {model.ticks.map(v => {
          const y = PAD.top + (1 - (v - model.lo) / (model.hi - model.lo)) * model.plotH;
          return (
            <G key={`g${v}`}>
              <Line x1={PAD.left} y1={y} x2={PAD.left + model.plotW} y2={y} stroke={GRID} strokeWidth={1} strokeDasharray="3 4" />
              <SvgText x={PAD.left - 6} y={y + 3} fontSize={10} fill={MUTED} textAnchor="end">
                {hasData ? v : ''}
              </SvgText>
            </G>
          );
        })}

        {path ? (
          <Path
            d={path}
            fill="none"
            stroke={lineColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={hasData ? undefined : '5 5'}
            opacity={hasData ? 1 : 0.8}
          />
        ) : null}

        {hasData
          ? model.pts.map((p, i) => (
              <Circle
                key={`d${i}`}
                cx={p.x}
                cy={p.y}
                r={i === idx ? 5 : 3}
                fill={i === idx ? '#FFFFFF' : color}
                stroke={color}
                strokeWidth={i === idx ? 2.5 : 1.5}
              />
            ))
          : model.pts.map((p, i) => (
              <Circle key={`d${i}`} cx={p.x} cy={p.y} r={3} fill={previewColor} opacity={0.6} />
            ))}

        <SvgText x={PAD.left} y={height - 6} fontSize={10} fill={MUTED}>
          {firstLabel}
        </SvgText>
        <SvgText x={PAD.left + model.plotW} y={height - 6} fontSize={10} fill={MUTED} textAnchor="end">
          {lastLabel}
        </SvgText>
      </Svg>

      {hasData && (
        <View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleTouch}
          onResponderMove={handleTouch}
        />
      )}

      {sel && (
        <View
          style={{
            position: 'absolute',
            left: Math.min(Math.max(sel.x - 56, 4), width - 116),
            top: Math.max(sel.y - 60, 2),
            width: 112,
            backgroundColor: '#FFFFFF',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: GRID,
            paddingVertical: 5,
            alignItems: 'center',
            shadowColor: '#1A1A1A',
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
          pointerEvents="none"
        >
          <View style={{ width: 28, height: 2, backgroundColor: color, borderRadius: 1, marginBottom: 4 }} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ fontWeight: '800', fontSize: 13, color: '#1A1A1A' }}>{sel.value}</Text>
            <Text style={{ fontSize: 11, color: MUTED, marginLeft: 3 }}>lbs</Text>
          </View>
          <Text style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>{formatDateShort(sel.date)}</Text>
        </View>
      )}
    </View>
  );
}
