import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import NetInfo from "@react-native-community/netinfo";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  CircleQuestionMark,
  Zap,
  ZapOff,
  ScanLine,
  ScanBarcode,
  FileText,
  Images,
} from "../../../shared/components/ui/icons";
import { scanImage, lookupBarcode } from "../../../shared/lib/scanApi";
import { classifyApiError, isRetryableCode } from "../../../shared/lib/api";

const MODES = [
  { key: "scan", label: "Scan Food", icon: ScanLine },
  { key: "barcode", label: "Barcode", icon: ScanBarcode },
  { key: "label", label: "Food Label", icon: FileText },
  { key: "library", label: "Library", icon: Images },
];

/**
 * Picture upload — "Just snap a pic" camera screen.
 * - Scan Food: shutter captures a photo, backend AI identifies foods, result page opens.
 * - Barcode: live barcode scanning via the camera, product lookup on detect.
 * - Food Label: capture a nutrition label photo (same AI pipeline).
 * - Library: pick an existing photo from the gallery.
 */
export default function PictureUploadScreen({
  onClose,
  onCancel,
  onResult,
  cameraPermission: cameraPermissionProp,
}) {
  const [hookPermission, requestPermission] = useCameraPermissions();
  // Parent may pass an already-loaded permission (tabs layout pre-asks on
  // mount); otherwise fall back to this screen's own hook. Either way
  // requestPermission is always the REAL expo-camera requester — never a no-op.
  const permission = hookPermission ?? cameraPermissionProp ?? null;
  const close = onClose ?? onCancel ?? (() => {});
  const insets = useSafeAreaInsets();
  const [flashOn, setFlashOn] = useState(false);
  const [mode, setMode] = useState("scan");
  const [busy, setBusy] = useState(false); // shutter / upload in progress
  const [scanning, setScanning] = useState(false); // AI analyzing
  const [previewUri, setPreviewUri] = useState(null);
  const cameraRef = useRef(null);
  const barcodeLock = useRef(false);
  const scanCtrl = useRef(null);
  // Last attempt (uri + kind) so a transient failure can offer Retry
  // without forcing the user to retake the photo.
  const lastAttempt = useRef(null);
  // Ref mirror of analyze (below) so the Retry button can call the latest
  // version without closing over the callback during its own definition.
  const analyzeRef = useRef(null);
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

  // Leaving the camera mid-scan cancels the upload so a late result never
  // pops up over a screen the user already left.
  useEffect(() => () => scanCtrl.current?.abort(), []);

  const analyze = useCallback(
    async (uri, kind = "scan") => {
      // Offline now means a 60 s timeout + retries later — fail fast instead.
      // isInternetReachable (not just isConnected) catches half-dead links
      // that report "connected" but can't reach anything; null means NetInfo
      // couldn't tell, so let the request itself decide.
      const net = await NetInfo.fetch().catch(() => null);
      if (
        net &&
        (net.isConnected === false || net.isInternetReachable === false)
      ) {
        // Early return sits before the try/finally below: callers set busy
        // before calling analyze, so reset it or the shutter stays disabled.
        setBusy(false);
        Alert.alert(
          "You're offline",
          "Reconnect to Wi-Fi or mobile data, then try again.",
        );
        return;
      }
      lastAttempt.current = { uri, kind };
      // A new scan supersedes any in-flight one.
      scanCtrl.current?.abort();
      const ctrl = new AbortController();
      scanCtrl.current = ctrl;
      // Web gallery URIs are transient blob: URLs that the browser can revoke
      // mid-session (dead preview on re-render). Convert once to a data: URL
      // so preview + upload use a stable reference. Native file:// URIs skip this.
      let stableUri = uri;
      if (
        kind !== "barcode" &&
        typeof uri === "string" &&
        uri.startsWith("blob:")
      ) {
        try {
          const blob = await (await fetch(uri)).blob();
          stableUri = await new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = () => reject(fr.error);
            fr.readAsDataURL(blob);
          });
        } catch {
          stableUri = uri;
        }
      }
      setScanning(true);
      try {
        if (kind === "barcode") {
          const { item } = await lookupBarcode(uri, { signal: ctrl.signal }); // uri is the barcode digits here
          onResult({ kind: "barcode", item });
        } else {
          // Shrink camera/gallery photos before upload: multi-MB originals
          // stall on some mobile networks (and burn AI bytes) while 1280px
          // is plenty for food recognition. Falls back to the original.
          let uploadUri = stableUri;
          try {
            const shrunk = await manipulateAsync(
              stableUri,
              [{ resize: { width: 1280 } }],
              { compress: 0.7, format: SaveFormat.JPEG },
            );
            if (shrunk?.uri) uploadUri = shrunk.uri;
          } catch {
            // keep the original
          }
          const { items, placeholder } = await scanImage(uploadUri, {
            signal: ctrl.signal,
          });
          setPreviewUri(stableUri);
          // imageUri stays the stable preview reference; uploadUri is the
          // converted (shrunk JPEG) copy the result screen persists.
          onResult({ kind: "scan", imageUri: stableUri, uploadUri, items, placeholder });
        }
      } catch (_e) {
        // User-cancelled: stay silent, the overlay is already gone.
        if (ctrl.signal.aborted) return;
        const retry = lastAttempt.current;
        const code = classifyApiError(_e);
        // A 401 already cleared the session (the reroute follows) — explain
        // it instead of offering a retry loop that can never succeed.
        if (code === "UNAUTHORIZED") {
          Alert.alert(
            "Session expired",
            "Please sign in again, then retry your scan.",
          );
          return;
        }
        // Provider quota (Groq 429 -> backend 429): shared daily budget is
        // spent. Retrying today can never succeed — say so, no Retry button.
        if (code === "RATE_LIMITED" || _e?.status === 429) {
          Alert.alert(
            "Daily scan limit reached",
            _e.message || "We've hit today's scan limit — please try again tomorrow.",
            [{ text: "Cancel", style: "cancel" }],
          );
          return;
        }
        // Verified-only endpoints (scan) return 403 + needsVerification
        // for skip-verification accounts. Retrying can never succeed —
        // route the user to verify instead.
        if (_e?.status === 403 && _e?.data?.needsVerification) {
          Alert.alert(
            "Verify your email",
            "Scanning unlocks after email verification. Check your inbox for the code, then verify and scan again.",
          );
          return;
        }
        // A timeout against an idle free-tier server is usually a cold
        // start, not a dead backend — say so and invite a retry instead of
        // the generic connection-failure dead end.
        const waking = code === "TIMEOUT_WAKE" || _e?.timeout === true;
        const canRetry = retry && isRetryableCode(code);
        Alert.alert(
          waking ? "Server is waking up" : "Scan failed",
          waking
            ? "The server takes about 30 seconds to wake when idle. Wait a moment, then retry."
            : _e.message || "Could not analyze this photo.",
          [
            ...(canRetry
              ? [
                  {
                    text: "Retry",
                    onPress: () => analyzeRef.current?.(retry.uri, retry.kind),
                  },
                ]
              : []),
            { text: "Cancel", style: "cancel" },
          ],
        );
      } finally {
        setScanning(false);
        setBusy(false);
        if (scanCtrl.current === ctrl) scanCtrl.current = null;
      }
    },
    [onResult],
  );
  useEffect(() => {
    analyzeRef.current = analyze;
  });

  const pickFromLibrary = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setBusy(true);
        await analyze(result.assets[0].uri, "scan");
      }
    } catch {
      Alert.alert("Gallery unavailable", "Could not open your photo library.");
    }
  }, [analyze]);

  // In-flight capture guard (ref, not state): setBusy lands on the next
  // render, so a double-tap enters takePicture twice and the second
  // takePictureAsync throws on the busy native session.
  const capturing = useRef(false);
  const takePicture = useCallback(async () => {
    if (busy || capturing.current || !cameraRef.current || !cameraReady) return;
    // Stale/mismatched build: the ref resolved but the capture method is
    // missing behind it (the on-device "undefined is not a function").
    // Name it and offer the gallery instead of throwing into the void.
    if (typeof cameraRef.current.takePictureAsync !== "function") {
      console.warn(
        `[scan] cameraUnavailable (ref=${cameraRef.current?.constructor?.name || typeof cameraRef.current} mode=${mode}):`,
        "takePictureAsync missing on this build",
      );
      Alert.alert(
        "Camera unavailable",
        "This app build cannot access the camera. Use your gallery instead, or reinstall the latest build.",
        [
          { text: "Use gallery", onPress: () => pickFromLibrary() },
          { text: "Cancel", style: "cancel" },
        ],
      );
      return;
    }
    capturing.current = true;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });

      // A null native ref resolves undefined instead of throwing — reset
      // busy so the shutter never sticks disabled.
      if (!photo?.uri) {
        setBusy(false);
        Alert.alert(
          "Camera error",
          "Could not take the picture. Try again or use your gallery.",
          [
            { text: "Use gallery", onPress: () => pickFromLibrary() },
            { text: "Cancel", style: "cancel" },
          ],
        );
        return;
      }

      // 'label' mode uses the same AI pipeline as 'scan' — no separate kind.
      if (photo?.uri) await analyze(photo.uri, "scan");
    } catch (_e) {
      setBusy(false);
      // Surface the native reason (session race, write failure, …) with the
      // camera state that names the cause — never a generic dead end.
      console.warn(
        `[scan] shutter failed (mode=${mode} flash=${flashOn ? "on" : "off"} ready=${cameraReady}):`,
        _e?.message || _e,
      );
      Alert.alert(
        "Camera error",
        _e?.message || "Could not take the picture. Try again.",
      );
    } finally {
      capturing.current = false;
    }
  }, [busy, cameraReady, analyze, mode, flashOn, pickFromLibrary]);

  function handleMode(key) {
    setMode(key);
    if (key === "library") pickFromLibrary();
  }

  function handleBarcodeScanned({ data }) {
    if (busy || barcodeLock.current) return;
    barcodeLock.current = true;
    setBusy(true);
    analyze(data, "barcode").finally(() => {
      setTimeout(() => {
        barcodeLock.current = false;
      }, 1500);
    });
  }

  if (!permission) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-8">
        <ActivityIndicator color="#FFFFFF" />
        <Text className="text-white/70 text-center mt-4">
          Requesting camera access…
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    // canAskAgain === false means the OS will NEVER show the dialog again
    // (permanently denied) — re-calling requestPermission silently no-ops,
    // so the only way out is the system Settings screen.
    const permanentlyDenied =
      permission.status === "denied" && permission.canAskAgain === false;
    return (
      <View className="flex-1 bg-black items-center justify-center px-8">
        <Pressable
          onPress={close}
          accessibilityLabel="Close camera"
          className="absolute left-5 w-10 h-10 rounded-full bg-black/60 items-center justify-center"
          style={{ top: Math.max(insets.top, 16) }}
        >
          <X size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-center text-base mb-2">
          {permanentlyDenied ? "Camera is blocked" : "Camera access needed"}
        </Text>
        <Text className="text-white/70 text-center mb-6">
          {permanentlyDenied
            ? "You denied camera access permanently, so the preview stays black. Enable it in Settings to scan meals."
            : "Caly AI uses the camera to scan your meals."}
        </Text>
        {permanentlyDenied ? (
          <>
            <Pressable
              onPress={() => Linking.openSettings()}
              className="bg-primary rounded-full px-6 py-3"
            >
              <Text className="text-white font-bold">Open Settings</Text>
            </Pressable>
            <Pressable onPress={requestPermission} className="mt-4 px-4 py-2">
              <Text className="text-white/70">
                I&apos;ve enabled it — check again
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={requestPermission}
            className="bg-primary rounded-full px-6 py-3"
          >
            <Text className="text-white font-bold">Grant permission</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const isBarcodeMode = mode === "barcode";

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
        flash={flashOn ? "on" : "off"}
        barcodeScannerSettings={
          isBarcodeMode
            ? { barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"] }
            : undefined
        }
        onBarcodeScanned={isBarcodeMode ? handleBarcodeScanned : undefined}
        onCameraReady={() => {
          setCameraReady(true);
          setMountError(null);
        }}
        onMountError={(e) => {
          console.warn("[scan] camera mount error:", e?.message);
          setMountError(e?.message || "Camera preview failed to start.");
        }}
      />

      {/* Mount failure — replaces an eternal black preview with actions. */}
      {mountError && (
        <View className="absolute inset-0 bg-black items-center justify-center px-8 z-30">
          <Text className="text-white text-center text-base mb-2">
            Camera couldn&apos;t start
          </Text>
          <Text className="text-white/70 text-center text-sm mb-6">
            {mountError}
          </Text>
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
            <Text className="text-white/70">
              Use a photo from the gallery instead
            </Text>
          </Pressable>
          <Pressable
            onPress={close}
            accessibilityLabel="Close camera"
            className="absolute left-5 w-10 h-10 rounded-full bg-black/60 items-center justify-center"
            style={{ top: Math.max(insets.top, 16) }}
          >
            <X size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      {/* Scanning overlay */}
      {scanning && (
        <View className="absolute inset-0 bg-black/70 items-center justify-center z-10">
          <ActivityIndicator size="large" color="#f2470c" />
          <Text className="text-white mt-4 text-base">
            Analyzing your food…
          </Text>
          {previewUri && (
            <Image
              source={{ uri: previewUri }}
              className="w-40 h-40 rounded-2xl mt-6"
              resizeMode="cover"
            />
          )}
          <Pressable
            onPress={() => scanCtrl.current?.abort()}
            className="mt-6 px-6 py-2.5 rounded-full bg-white/15"
          >
            <Text className="text-white font-bold">Cancel</Text>
          </Pressable>
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
          onPress={close}
          accessibilityLabel="Close camera"
          className="w-10 h-10 rounded-full bg-black/60 items-center justify-center"
        >
          <X size={20} color="#FFFFFF" />
        </Pressable>
        <Pressable
          onPress={() =>
            Alert.alert(
              "How to scan",
              "Scan Food: point at your meal and tap the shutter.\nBarcode: point at the product barcode.\nFood Label: capture the nutrition label.\nLibrary: choose a photo from your gallery.",
            )
          }
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
              <Text className="text-white text-xs">
                Point at a product barcode
              </Text>
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
                className={`w-[70px] rounded-2xl py-2.5 items-center ${active ? "bg-white" : "bg-black/60"}`}
                accessibilityLabel={label}
              >
                <Icon size={20} color={active ? "#111111" : "#FFFFFF"} />
                <Text
                  className={`text-[10px] mt-1 ${active ? "text-[#111111]" : "text-white"}`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Flash + shutter row */}
        <View
          className="flex-row items-center justify-center"
          style={{ gap: 48 }}
        >
          <Pressable
            onPress={() => setFlashOn((v) => !v)}
            accessibilityLabel={flashOn ? "Turn flash off" : "Turn flash on"}
            className="w-11 h-11 rounded-full bg-black/60 items-center justify-center"
          >
            {flashOn ? (
              <Zap size={18} color="#FFFFFF" fill="#FFFFFF" />
            ) : (
              <ZapOff size={18} color="#FFFFFF" />
            )}
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
