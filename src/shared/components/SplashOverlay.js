import { useEffect, useState } from 'react';
import { Animated, Image, StyleSheet } from 'react-native';

export default function SplashOverlay({ done }) {
  const [opacity] = useState(() => new Animated.Value(1));
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (!done) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [done, opacity]);

  if (!mounted) return null;

  return (
    <Animated.View
      style={[styles.container, { opacity }]}
      pointerEvents={done ? 'none' : 'auto'}
    >
      <Image
        source={require('../../../assets/caly-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    // RN 0.86 removed StyleSheet.absoluteFillObject — spell it out.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
    elevation: 40,
  },
  logo: { width: 200, height: 200 },
});
