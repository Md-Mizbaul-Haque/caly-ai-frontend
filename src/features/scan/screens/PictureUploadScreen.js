import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Image, Alert, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, CircleQuestionMark, Zap, ZapOff, ScanLine, ScanBarcode, FileText, Images } from '../../../shared/components/ui/icons';
import { scanImage, lookupBarcode } from '../../../shared/lib/scanApi';

const MODES = [
  { key: 'scan', label: 'Scan Food', icon: ScanLine },
  { key: 'barcode', label: 'Barcode', icon: ScanBarcode },
  { key: 'label', label: 'Food Label', icon: FileText },
  { key: 'library', label: 'Library', icon: Images },
];

/**
 * Picture upload — "Just snap a pic" camera screen.
 * - Scan Food: shutter captures a photo, backend AI identifies foods, result page opens.
 * - Barcode: live barcode scanning via the camera, product lookup on detect.
 * - Food Label: capture a nutrition label photo (same AI pipeline).
 * - Library: pick an existing photo from the gallery.
 */
export default function PictureUploadScreen({ onClose, onResult, cameraPermission }) {
    const [permission, setPermission] = useState(cameraPermission);
  const [requestPermission] = useState(() => {}); // Not used when cameraPermission is provided
  useEffect(() => {
    if (cameraPermission !== undefined) {
      setPermission(cameraPermission);
    }
  }, [cameraPermission]);
  const insets = useSafeAreaInsets();
  const [flashOn, setFlashOn] = useState(false);
  const [mode, setMode] = useState('scan');
  const [busy, setBusy] = useState(false);        // shutter / upload in progress
  const [scanning, setScanning] = useState(false); // AI analyzing
  const [previewUri, setPreviewUri] = useState(null);
  const cameraRef = useRef(null);
  const barcodeLock = useRef(false);
  // Ask the OS once on mount — re-firing requestPermission on every render
  // can loop the system dialog on some Android skins.
  const askedOnce = useRef(false);
  // cameraKey remounts CameraView for Retry; ready gates the shutter so we
  // never capture before the preview exists; mountError replaces eternal black.
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [mountError, setMountError] = useState(null);

  useEffect(() => {
    if (permission && !permission.granted && !askedOnce.current) {
      askedOnce.current = true;
      requestPermission();
    }
  }, [permission, requestPermission]);

  const analyze = useCallback(async (uri, kind = 'scan') => {
    setScanning(true);
    try {
      if (kind === 'barcode') {
        const { item } = await lookupBarcode(uri); // uri is the barcode digits here
        onResult({ kind: 'barcode', item });
      } else {
        const { items, placeholder } = await scanImage(uri);
        setPreviewUri(uri);
        onResult({ kind: 'scan', imageUri: uri, items, placeholder });
      }
    } catch (e) {
      Alert.alert('Scan failed', e.message || 'Could not analyze this photo.');
    } finally {
      setScanning(false);
      setBusy(false);
    }
  }, [onResult]);

  const takePicture = useCallback(async () => {
    if (busy || !cameraRef.current || !cameraReady) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) await analyze(photo.uri, mode === 'label' ? 'label' : 'scan');
    } catch (e) {
      setBusy(false);
      Alert.alert('Camera error', 'Could not take the picture. Try again.');
    }
  }, [busy, cameraReady, mode, analyze]);

  const pickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setBusy(true);
      await analyze(result.assets[0].uri, 'scan');
    }
  }, [analyze]);

  function handleMode(key) {
    setMode(key);
    if (key === 'library') pickFromLibrary();
  }

  function handleBarcodeScanned({ data }) {
    if (busy || barcodeLock.current) return;
    barcodeLock.current = true;
    setBusy(true);
    analyze(data, 'barcode').finally(() => {
      setTimeout(() => { barcodeLock.current = false; }, 1500);
    });
  }

  if (!permission) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-8">
        <ActivityIndicator color="#FFFFFF" />
        <Text className="text-white/70 text-center mt-4">Requesting camera access…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    // canAskAgain === false means the OS will NEVER show the dialog again
    // (permanently denied) — re-calling requestPermission silently no-ops,
    // so the only way out is the system Settings screen.
    const permanentlyDenied = permission.status === 'denied' && permission.canAskAgain === false;
    return (
      <View className="flex-1 bg-black items-center justify-center px-8">
        <Text className="text-white text-center text-base mb-2">
          {permanentlyDenied ? 'Camera is blocked' : 'Camera access needed'}
        </Text>
        <Text className="text-white/70 text-center mb-6">
          {permanentlyDenied
            ? 'You denied camera access permanently, so the preview stays black. Enable it in Settings to scan meals.'
            : 'Caly AI uses the camera to scan your meals.'}
        </Text>
        {permanentlyDenied ? (
          <>
            <Pressable onPress={() => Linking.openSettings()} className="bg-primary rounded-full px-6 py-3">
              <Text className="text-white font-bold">Open Settings</Text>
            </Pressable>
            <Pressable onPress={requestPermission} className="mt-4 px-4 py-2">
              <Text className="text-white/70">I&apos;ve enabled it — check again</Text>
            </Pressable>
          </>
        ) : (
          <Pressable onPress={requestPermission} className="bg-primary rounded-full px-6 py-3">
            <Text className="text-white font-bold">Grant permission</Text>
          </Pressable>
        )}
        <Pressable onPress={onClose} className="mt-4 px-4 py-2">
          <Text className="text-white/70">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isBarcodeMode = mode === 'barcode';

  return (
    <View className="flex-1 bg-black">
      <CameraView
        key={cameraKey}
        ref={cameraRef}
        // style (not className): CameraView forwards props straight to the
        // native view, which ignores className — without a real flex style
        // the preview measures zero-size and the screen stays black.
        style={{ flex: 1 }}
        facing="back"
        mode="picture"
        flash={flashOn ? 'on' : 'off'}
        barcodeScannerSettings={isBarcodeMode ? { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] } : undefined}
        onBarcodeScanned={isBarcodeMode ? handleBarcodeScanned : undefined}
        onCameraReady={() => {
          setCameraReady(true);
          setMountError(null);
        }}
        onMountError={(e) => {
          console.warn('[scan] camera mount error:', e?.message);
          setMountError(e?.message || 'Camera preview failed to start.');
        }}
      />

      {/* Mount failure — replaces an eternal black preview with actions. */}
      {mountError && (
        <View className="absolute inset-0 bg-black items-center justify-center px-8 z-30">
          <Text className="text-white text-center text-base mb-2">Camera couldn&apos;t start</Text>
          <Text className="text-white/70 text-center text-sm mb-6">{mountError}</Text>
          <Pressable
            onPress={() => {
              setMountError(null);
              setCameraReady(false);
              setCameraKey((k) => k + 1);
            }}
            className="bg-primary rounded-full px-6 py-3"
          >
            <Text className="text-white font-bold">Retry camera</Text>
          </Pressable>
          <Pressable onPress={pickFromLibrary} className="mt-4 px-4 py-2">
            <Text className="text-white/70">Use a photo from the gallery instead</Text>
          </Pressable>
          <Pressable onPress={onClose} className="mt-2 px-4 py-2">
            <Text className="text-white/70">Go back</Text>
          </Pressable>
        </View>
      )}

      {/* Scanning overlay */}
      {scanning && (
        <View className="absolute inset-0 bg-black/70 items-center justify-center z-10">
          <ActivityIndicator size="large" color="#f2470c" />
          <Text className="text-white mt-4 text-base">Analyzing your food…</Text>
          {previewUri && (
            <Image source={{ uri: previewUri }} className="w-40 h-40 rounded-2xl mt-6" resizeMode="cover" />
          )}
        </View>
      )}

      {/* Top bar — sits just below the status bar via safe-area inset, no
          extra gap. Title removed for a clean viewfinder. */}
      <View
        pointerEvents="box-none"
        className="absolute top-0 left-0 right-0 px-5 flex-row items-center justify-between z-20"
        style={{ paddingTop: Math.max(insets.top, 16) }}
      >
        <Pressable
          onPress={onClose}
          accessibilityLabel="Close camera"
          className="w-10 h-10 rounded-full bg-black/60 items-center justify-center"
        >
          <X size={20} color="#FFFFFF" />
        </Pressable>
        <Pressable
          onPress={() => Alert.alert('How to scan', 'Scan Food: point at your meal and tap the shutter.\nBarcode: point at the product barcode.\nFood Label: capture the nutrition label.\nLibrary: choose a photo from your gallery.')}
          accessibilityLabel="Help"
          className="w-10 h-10 rounded-full bg-black/60 items-center justify-center"
        >
          <CircleQuestionMark size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Bottom controls — clears the Android system nav keys and iPhone
          home indicator via safe-area inset, so nothing ever overlaps. */}
      <View
        pointerEvents="box-none"
        className="absolute bottom-0 left-0 right-0 z-20"
        style={{ paddingBottom: Math.max(insets.bottom, 24) + 12 }}
      >
        {isBarcodeMode && (
          <View className="items-center mb-6">
            <View className="px-4 py-2 rounded-full bg-black/60">
              <Text className="text-white text-xs">Point at a product barcode</Text>
            </View>
          </View>
        )}

        {/* Mode chips */}
        <View className="flex-row justify-center mb-8" style={{ gap: 8 }}>
          {MODES.map(({ key, label, icon: Icon }) => {
            const active = mode === key;
            return (
              <Pressable
                key={key}
                onPress={() => handleMode(key)}
                disabled={busy}
                className={`w-[70px] rounded-2xl py-2.5 items-center ${active ? 'bg-white' : 'bg-black/60'}`}
                accessibilityLabel={label}
              >
                <Icon size={20} color={active ? '#111111' : '#FFFFFF'} />
                <Text className={`text-[10px] mt-1 ${active ? 'text-[#111111]' : 'text-white'}`}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Flash + shutter row */}
        <View className="flex-row items-center justify-center" style={{ gap: 48 }}>
          <Pressable
            onPress={() => setFlashOn(v => !v)}
            accessibilityLabel={flashOn ? 'Turn flash off' : 'Turn flash on'}
            className="w-11 h-11 rounded-full bg-black/60 items-center justify-center"
          >
            {flashOn ? <Zap size={18} color="#FFFFFF" fill="#FFFFFF" /> : <ZapOff size={18} color="#FFFFFF" />}
          </Pressable>

          <Pressable
            onPress={takePicture}
            disabled={busy || !cameraReady}
            accessibilityLabel="Take picture"
            className="w-[72px] h-[72px] rounded-full bg-white items-center justify-center"
            style={{ opacity: busy || !cameraReady ? 0.5 : 1 }}
          >
            {busy && <ActivityIndicator color="#111111" />}
          </Pressable>

          {/* spacer to keep shutter centered */}
          <View className="w-11 h-11" />
        </View>
      </View>
    </View>
  );
}
