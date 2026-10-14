import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { cn } from '@/lib/utils';
import { useTheme } from '../../theme/theme';
export default function ProgressRing({
  eaten = 0,
  goal = 1,
  size = 96,
  strokeWidth = 10,
  color = '#f2470c',
  trackColor,
  children,
}) {
  const { isDark } = useTheme();
  const resolvedTrack = trackColor ?? (isDark ? '#383838' : '#F1E8E0');
  const safeGoal = Math.max(Number(goal) || 0, 1);
  const progress = Math.min(1, Math.max(Number(eaten) || 0, 0) / safeGoal);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }} className={cn('items-center justify-center')}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={resolvedTrack} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
