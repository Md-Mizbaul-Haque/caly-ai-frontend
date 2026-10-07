import { useWindowDimensions } from 'react-native';

// Compact auth/onboarding layout for short screens (small Android phones,
// landscape, split-screen). Below the threshold the scaffold and ruler
// screens tighten gaps and scale the hero number so the primary input
// (ruler, options) stays visible without scrolling. All values come from the
// existing theme scale — nothing new is introduced.
export const COMPACT_HEIGHT = 700;

export function useCompactAuth(threshold = COMPACT_HEIGHT) {
  const { height } = useWindowDimensions();
  return height < threshold;
}
