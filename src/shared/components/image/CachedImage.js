import { useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';

// Lightweight image with loading + error states.
// Uses the platform's built-in image cache (only caches what is actually
// rendered on screen) — no manual prefetching or bulk caching.
export default function CachedImage({ uri, source, style, className, fallbackContent = null, ...props }) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const resolvedUri = uri ?? source?.uri;

  if (!resolvedUri || failed) {
    return <View className={className} style={[{ alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f6f0', overflow: 'hidden' }, style]}>{fallbackContent}</View>;
  }

  return (
    <View className={className} style={[{ alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f6f0', overflow: 'hidden' }, style]}>
      {loading ? <ActivityIndicator size="small" color="#f2470c" style={{ position: 'absolute' }} /> : null}
      <Image
        source={{ uri: resolvedUri }}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setFailed(true);
          setLoading(false);
        }}
        {...props}
      />
    </View>
  );
}
