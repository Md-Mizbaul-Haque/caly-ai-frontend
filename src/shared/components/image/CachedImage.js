import React, { useState, useEffect } from 'react';
import { Image, ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache configuration - following appCache.js pattern
const IMAGE_CACHE_PREFIX = 'caly.image.';
const IMAGE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export default function CachedImage({ uri, style, fallbackContent, ...props }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [cachedData, setCachedData] = useState(null);

  // Generate cache key from URI
  const cacheKey = IMAGE_CACHE_PREFIX + encodeURIComponent(uri);

  // Load image from cache or network
  useEffect(() => {
    if (!uri) {
      setIsLoading(false);
      return;
    }

    const loadImage = async () => {
      try {
        // Try to load from cache first
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < IMAGE_CACHE_TTL) {
            setCachedData(data:image/\;base64,\);
            setIsLoading(false);
            return;
          }
        }

        // Fetch from network
        const response = await fetch(uri);
        if (!response.ok) throw new Error(HTTP \);

        // Get blob and convert to base64 for caching
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = btoa(
          String.fromCharCode(...new Uint8Array(arrayBuffer))
        );
        const type = response.headers.get('content-type')?.split('/')[1] || 'jpeg';

        // Cache the image
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: base64,
            type,
            timestamp: Date.now(),
          })
        );

        setCachedData(data:image/\;base64,\);
        setIsLoading(false);
      } catch (error) {
        console.warn('Failed to load image:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    loadImage();
  }, [uri, cacheKey]);

  if (isLoading && !hasError && !cachedData) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size='small' color='#f2470c' />
        {fallbackContent}
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.container, style]}>
        {fallbackContent}
      </View>
    );
  }

  return <Image source={{ uri: cachedData }} style={[styles.image, style]} {...props} />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f6f0', // cream color from theme
  },
  image: {
    // Image will maintain its aspect ratio
  },
});

