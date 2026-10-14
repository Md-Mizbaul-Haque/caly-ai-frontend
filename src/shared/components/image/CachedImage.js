import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { useTheme } from '../../theme/theme';

// Lightweight image with loading + error states.
// Spinner is delayed so cached images paint instantly without a flash;
// image bytes are warmed via Image.prefetch by the calling screen.
export default function CachedImage({ uri, source, style, className, fallbackContent = null, ...props }) {
  const { isDark } = useTheme();
  const placeholder = isDark ? '#242424' : '#f8f6f0';
  const resolvedUri = uri ?? source?.uri;
  const [loading, setLoading] = useState(!!resolvedUri);
  const [showSpinner, setShowSpinner] = useState(false);
  const [failed, setFailed] = useState(false);
  const [prevUri, setPrevUri] = useState(resolvedUri);

  // Adjust state when the URL changes (render-phase update, not an effect).
  if (prevUri !== resolvedUri) {
    setPrevUri(resolvedUri);
    setLoading(!!resolvedUri);
    setShowSpinner(false);
    setFailed(false);
  }

  // Only show the spinner if loading takes longer than a cache hit.
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setShowSpinner(true), 120);
    return () => clearTimeout(t);
  }, [loading]);

  if (!resolvedUri || failed) {
    return <View className={className} style={[{ alignItems: 'center', justifyContent: 'center', backgroundColor: placeholder, overflow: 'hidden' }, style]}>{fallbackContent}</View>;
  }

  return (
    <View className={className} style={[{ alignItems: 'center', justifyContent: 'center', backgroundColor: placeholder, overflow: 'hidden' }, style]}>
      {loading && showSpinner ? <ActivityIndicator size="small" color="#f2470c" style={{ position: 'absolute' }} /> : null}
      <Image
        source={{ uri: resolvedUri, cache: 'force-cache' }}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
        fadeDuration={0}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => { setLoading(false); setShowSpinner(false); }}
        onError={() => {
          setFailed(true);
          setLoading(false);
          setShowSpinner(false);
        }}
        {...props}
      />
    </View>
  );
}
