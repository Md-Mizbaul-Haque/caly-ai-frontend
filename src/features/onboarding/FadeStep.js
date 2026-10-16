import { memo, useEffect, useState } from 'react';
import { Animated } from 'react-native';

function FadeStep({ stepKey, children }) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    opacity.setValue(0);
    const anim = Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [stepKey, opacity]);
  return <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>;
}

export default memo(FadeStep);
