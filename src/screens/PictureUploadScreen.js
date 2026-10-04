import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Image, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { X, CircleQuestionMark, Zap, ZapOff, ScanLine, ScanBarcode, FileText, Images } from '../shared/components/ui/icons';
import { scanImage, lookupBarcode } from '../shared/lib/scanApi';

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
export default function PictureUploadScreen({ onClose, onResult }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [flashOn, setFlashOn] = useState(false);
  const [mode, setMode] = useState('scan');
  const [busy, setBusy] = useState(false);        // shutter / upload in progress
  const [scanning, setScanning] = useState(false); // AI analyzing
  const [previewUri, setPreviewUri] = useState(null);
  const [detected, setDetected] = useState([]);   // [{ name }] shown as bubbles
  const cameraRef = useRef(null);
  const barcodeLock = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted) {
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
        setDetected(items.map(i => i.name));
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
    if (busy || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) await analyze(photo.uri, mode === 'label' ? 'label' : 'scan');
    } catch (e) {
      setBusy(false);
      Alert.alert('Camera error', 'Could not take the picture. Try again.');
    }
  }, [busy, mode, analyze]);

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
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-8">
        <Text className="text-white text-center text-base mb-2">Camera access needed</Text>
        <Text className="text-white/70 text-center mb-6">Caly AI uses the camera to scan your meals.</Text>
        <Pressable onPress={requestPermission} className="bg-primary rounded-full px-6 py-3">
          <Text className="text-white font-bold">Grant permission</Text>
        </Pressable>
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
        ref={cameraRef}
        className="flex-1"
        facing="back"
        flash={flashOn ? 'on' : 'off'}
        barcodeScannerSettings={isBarcodeMode ? { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] } : undefined}
        onBarcodeScanned={isBarcodeMode ? handleBarcodeScanned : undefined}
      />

      {/* Scanning overlay */}
      {scanning && (
        <View className="absolute inset-0 bg-black/70 items-center justify-center z-10">
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text className="text-white mt-4 text-base">Analyzing your food…</Text>
          {previewUri && (
            <Image source={{ uri: previewUri }} className="w-40 h-40 rounded-2xl mt-6" resizeMode="cover" />
          )}
        </View>
      )}

      {/* Top bar */}
      <View pointerEvents="box-none" className="absolute top-0 left-0 right-0 pt-12 px-5 flex-row items-center justify-between z-20">
        <Pressable
          onPress={onClose}
          accessibilityLabel="Close camera"
          className="w-10 h-10 rounded-full bg-black/60 items-center justify-center"
        >
          <X size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-base font-bold">🍎 Caly AI</Text>
        <Pressable
          onPress={() => Alert.alert('How to scan', 'Scan Food: point at your meal and tap the shutter.\nBarcode: point at the product barcode.\nFood Label: capture the nutrition label.\nLibrary: choose a photo from your gallery.')}
          accessibilityLabel="Help"
          className="w-10 h-10 rounded-full bg-black/60 items-center justify-center"
        >
          <CircleQuestionMark size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Bottom controls */}
      <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 pb-10 z-20">
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
            disabled={busy}
            accessibilityLabel="Take picture"
            className="w-[72px] h-[72px] rounded-full bg-white items-center justify-center"
            style={{ opacity: busy ? 0.5 : 1 }}
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
