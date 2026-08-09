import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Camera, CameraType } from "react-native-camera-kit";
import { colors } from "@ticketiv/tokens";
import type { ClaimedDeviceSetup } from "@ticketiv/shared";

import {
  applyAccessSetupDeepLink,
  completeAccessAppPairing,
  createAccessAppShellState,
  endAccessScannerSession,
  failAccessPairingClaim,
  startAccessPairingClaim,
  submitAccessQrScan,
  syncAccessScannerSession,
  updateAccessPairingCode,
  updateAccessPairingDeviceLabel,
  type AccessAppShellState,
} from "./src";

const API_BASE_URL = "https://ticketiv.app";

type SyncStatus = "idle" | "syncing" | "ready" | "error";

export default function App() {
  const [shell, setShell] = useState<AccessAppShellState>(() => createAccessAppShellState());

  const applyDeepLink = useCallback((url: string | null) => {
    if (!url) return;
    setShell((current) => applyAccessSetupDeepLink(current, url));
  }, []);

  useEffect(() => {
    void Linking.getInitialURL().then(applyDeepLink);
    const subscription = Linking.addEventListener("url", ({ url }) => applyDeepLink(url));
    return () => subscription.remove();
  }, [applyDeepLink]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <SafeAreaView style={styles.safeArea} edges={["top", "right", "bottom", "left"]}>
        <View style={styles.appBar}>
          <View>
            <Text style={styles.brand}>Ticketiv Access</Text>
            <Text style={styles.environment}>ticketiv.app</Text>
          </View>
          <StatusMark paired={Boolean(shell.scanner)} />
        </View>

        {shell.scanner ? (
          <ScannerScreen shell={shell} onShellChange={setShell} />
        ) : (
          <PairingScreen shell={shell} onShellChange={setShell} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function PairingScreen({
  shell,
  onShellChange,
}: {
  shell: AccessAppShellState;
  onShellChange: React.Dispatch<React.SetStateAction<AccessAppShellState>>;
}) {
  const pairing = shell.pairing;
  const claiming = pairing.status === "claiming";

  function updateCode(value: string) {
    onShellChange((current) => ({
      ...current,
      pairing: updateAccessPairingCode(current.pairing, value),
    }));
  }

  function updateLabel(value: string) {
    onShellChange((current) => ({
      ...current,
      pairing: updateAccessPairingDeviceLabel(current.pairing, value),
    }));
  }

  async function claimDevice() {
    const draft = startAccessPairingClaim(pairing);
    onShellChange((current) => ({ ...current, pairing: draft.state }));
    if (!draft.payload) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/scanner/provision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft.payload),
      });
      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readApiError(body, "Unable to pair this scanner."));
      }
      if (!isClaimedDeviceSetup(body)) {
        throw new Error("The pairing response was invalid.");
      }

      onShellChange((current) =>
        completeAccessAppPairing({ ...current, pairing: draft.state }, body)
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to pair this scanner.";
      onShellChange((current) => ({
        ...current,
        pairing: failAccessPairingClaim(current.pairing, message),
      }));
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headingBlock}>
        <Text style={styles.eyebrow}>DEVICE SETUP</Text>
        <Text style={styles.title}>Pair this scanner</Text>
        <Text style={styles.subtitle}>
          Use the short code created by an organizer for the event gate.
        </Text>
      </View>

      <View style={styles.formSection}>
        <FieldLabel>Device name</FieldLabel>
        <TextInput
          accessibilityLabel="Device name"
          autoComplete="off"
          editable={!claiming}
          onChangeText={updateLabel}
          placeholder="Front gate scanner"
          placeholderTextColor={colors.ink4}
          style={styles.textInput}
          value={pairing.deviceLabel ?? ""}
        />

        <FieldLabel>Setup code</FieldLabel>
        <TextInput
          accessibilityLabel="Setup code"
          autoCapitalize="characters"
          autoComplete="one-time-code"
          autoCorrect={false}
          editable={!claiming}
          maxLength={7}
          onChangeText={updateCode}
          placeholder="ABC-123"
          placeholderTextColor={colors.ink4}
          style={[styles.textInput, styles.codeInput]}
          value={pairing.formattedCode}
        />

        {pairing.error ? (
          <View accessibilityLiveRegion="polite" style={styles.errorBand}>
            <Text style={styles.errorText}>{pairing.error}</Text>
          </View>
        ) : null}

        <ActionButton
          disabled={claiming || pairing.status !== "ready"}
          label={claiming ? "Pairing scanner" : "Pair scanner"}
          loading={claiming}
          onPress={() => void claimDevice()}
        />
      </View>

      <View style={styles.infoBand}>
        <Text style={styles.infoTitle}>Secure setup</Text>
        <Text style={styles.infoText}>
          Event access is granted only after the one-time code is accepted by ticketiv.app.
        </Text>
      </View>
    </ScrollView>
  );
}

function ScannerScreen({
  shell,
  onShellChange,
}: {
  shell: AccessAppShellState;
  onShellChange: React.Dispatch<React.SetStateAction<AccessAppShellState>>;
}) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState("Manifest not synced on this launch.");
  const [cameraPermission, setCameraPermission] = useState<
    "checking" | "granted" | "denied" | "error"
  >("checking");
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [lastScanValid, setLastScanValid] = useState<boolean | null>(null);
  const scanner = shell.scanner;
  const setup = shell.pairing.claimedSetup;
  const scannerRef = useRef(scanner);
  const scanInFlightRef = useRef(false);
  const lastCodeRef = useRef<{ value: string; readAt: number } | null>(null);

  useEffect(() => {
    scannerRef.current = scanner;
  }, [scanner]);

  const requestCameraPermission = useCallback(async () => {
    setCameraPermission("checking");
    try {
      if (Platform.OS !== "android") {
        setCameraPermission("granted");
        return;
      }

      const current = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (current) {
        setCameraPermission("granted");
        return;
      }

      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
        title: "Allow Ticketiv Access to scan tickets",
        message: "Camera access is required to read attendee QR codes at the gate.",
        buttonPositive: "Allow camera",
        buttonNegative: "Not now",
      });
      setCameraPermission(
        result === PermissionsAndroid.RESULTS.GRANTED ? "granted" : "denied"
      );
    } catch {
      setCameraPermission("error");
    }
  }, []);

  useEffect(() => {
    void requestCameraPermission();
  }, [requestCameraPermission]);

  const handleQrCode = useCallback(
    async (event: { nativeEvent: { codeStringValue: string } }) => {
      const value = event.nativeEvent.codeStringValue?.trim();
      const activeScanner = scannerRef.current;
      if (!value || !activeScanner || scanInFlightRef.current) return;

      const readAt = Date.now();
      if (
        lastCodeRef.current?.value === value &&
        readAt - lastCodeRef.current.readAt < 1_500
      ) {
        return;
      }

      scanInFlightRef.current = true;
      lastCodeRef.current = { value, readAt };
      setScanMessage("Checking ticket...");
      setLastScanValid(null);

      try {
        const result = await submitAccessQrScan(
          { baseUrl: API_BASE_URL, fetch },
          activeScanner,
          {
            ticketCode: value,
            gate: activeScanner.gate,
            queueOnNetworkError: true,
          }
        );

        scannerRef.current = result.state;
        onShellChange((current) => ({
          ...current,
          activeRoute: "scanner",
          scanner: result.state,
        }));
        setLastScanValid(result.result.valid);
        setScanMessage(result.result.message);
      } catch (error) {
        setLastScanValid(false);
        setScanMessage(
          error instanceof Error ? error.message : "Unable to validate this QR code."
        );
      } finally {
        scanInFlightRef.current = false;
      }
    },
    [onShellChange]
  );

  async function syncNow() {
    const activeScanner = scannerRef.current;
    if (!activeScanner || syncStatus === "syncing") return;
    setSyncStatus("syncing");
    setSyncMessage("Refreshing event access...");

    const result = await syncAccessScannerSession(
      { baseUrl: API_BASE_URL, fetch },
      activeScanner
    );
    scannerRef.current = result.state;
    onShellChange((current) => ({
      ...current,
      activeRoute: "scanner",
      scanner: result.state,
    }));

    const error = !result.manifest.ok
      ? result.manifest.error
      : !result.queue.ok
        ? result.queue.error
        : null;

    if (error) {
      setSyncStatus("error");
      setSyncMessage(error.message);
      return;
    }

    setSyncStatus("ready");
    setSyncMessage(
      `Manifest ready. ${result.state.manifest?.items.length ?? 0} tickets available offline.`
    );
  }

  function endSession() {
    onShellChange((current) => endAccessScannerSession(current));
  }

  if (!scanner) return null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.screen}>
      <View style={styles.headingBlock}>
        <Text style={styles.eyebrow}>GATE OPERATIONS</Text>
        <Text style={styles.title}>{setup?.event.title ?? "Assigned event"}</Text>
        <Text style={styles.subtitle}>
          {[setup?.event.venue_name, scanner.gate].filter(Boolean).join(" | ") || "Scanner paired"}
        </Text>
      </View>

      <View style={styles.scanSurface}>
        {cameraPermission === "granted" ? (
          <Camera
            allowedBarcodeTypes={["qr"]}
            cameraType={CameraType.Back}
            onError={({ nativeEvent }) => {
              setCameraPermission("error");
              setScanMessage(nativeEvent.errorMessage || "Unable to start the camera.");
            }}
            onReadCode={(event) => void handleQrCode(event)}
            scanBarcode
            scanThrottleDelay={700}
            style={styles.cameraPreview}
          />
        ) : null}
        <View pointerEvents="none" style={styles.cameraFrame}>
          <View style={styles.frameCornerTopLeft} />
          <View style={styles.frameCornerTopRight} />
          <View style={styles.frameCornerBottomLeft} />
          <View style={styles.frameCornerBottomRight} />
          {cameraPermission !== "granted" ? (
            <Text style={styles.cameraState}>
              {cameraPermission === "checking"
                ? "Requesting camera access..."
                : cameraPermission === "denied"
                  ? "Camera permission is required"
                  : "Camera could not be started"}
            </Text>
          ) : null}
        </View>
      </View>

      {cameraPermission === "denied" || cameraPermission === "error" ? (
        <SecondaryButton label="Try camera again" onPress={() => void requestCameraPermission()} />
      ) : null}

      {scanMessage ? (
        <View
          accessibilityLiveRegion="assertive"
          style={[
            styles.scanResultBand,
            lastScanValid === true && styles.scanResultSuccess,
            lastScanValid === false && styles.scanResultError,
          ]}
        >
          <Text style={styles.scanResultTitle}>
            {lastScanValid === null ? "Reading ticket" : lastScanValid ? "Entry approved" : "Entry declined"}
          </Text>
          <Text style={styles.syncText}>{scanMessage}</Text>
        </View>
      ) : null}

      <View style={styles.metricsRow}>
        <Metric label="Offline tickets" value={String(scanner.manifest?.items.length ?? 0)} />
        <Metric label="Queued scans" value={String(scanner.offlineQueue.length)} />
        <Metric label="Local entries" value={String(scanner.localUsedTicketCodes.length)} />
      </View>

      <View
        accessibilityLiveRegion="polite"
        style={[styles.syncBand, syncStatus === "error" && styles.syncBandError]}
      >
        <View style={styles.syncCopy}>
          <Text style={styles.syncTitle}>{syncStatus === "error" ? "Sync failed" : "Event data"}</Text>
          <Text style={styles.syncText}>{syncMessage}</Text>
        </View>
        {syncStatus === "syncing" ? <ActivityIndicator color={colors.accent} /> : null}
      </View>

      <View style={styles.actionRow}>
        <SecondaryButton
          disabled={syncStatus === "syncing"}
          label="End session"
          onPress={endSession}
        />
        <ActionButton
          compact
          disabled={syncStatus === "syncing"}
          label="Sync now"
          onPress={() => void syncNow()}
        />
      </View>

      <Text numberOfLines={1} style={styles.deviceId}>
        Device {scanner.deviceId}
      </Text>
    </ScrollView>
  );
}

function StatusMark({ paired }: { paired: boolean }) {
  return (
    <View style={styles.statusMark}>
      <View style={[styles.statusDot, paired && styles.statusDotReady]} />
      <Text style={styles.statusText}>{paired ? "PAIRED" : "UNPAIRED"}</Text>
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({
  compact = false,
  disabled,
  label,
  loading = false,
  onPress,
}: {
  compact?: boolean;
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        compact && styles.compactButton,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.accentInk} size="small" /> : null}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  disabled,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function readApiError(value: unknown, fallback: string): string {
  if (value && typeof value === "object" && "error" in value) {
    const error = (value as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error.trim();
  }
  return fallback;
}

function isClaimedDeviceSetup(value: unknown): value is ClaimedDeviceSetup {
  if (!value || typeof value !== "object") return false;
  const setup = value as Partial<ClaimedDeviceSetup>;
  return Boolean(
    setup.device &&
      typeof setup.device.id === "string" &&
      setup.session &&
      typeof setup.session.id === "string" &&
      setup.event &&
      typeof setup.event.id === "string" &&
      typeof setup.event.title === "string"
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  appBar: {
    minHeight: 68,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line2,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
  },
  environment: {
    marginTop: 2,
    color: colors.ink3,
    fontSize: 11,
  },
  statusMark: {
    minWidth: 92,
    height: 30,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  statusDotReady: {
    backgroundColor: colors.success,
  },
  statusText: {
    color: colors.ink2,
    fontSize: 10,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  screen: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 36,
    gap: 22,
  },
  headingBlock: {
    gap: 6,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    maxWidth: 480,
    color: colors.ink3,
    fontSize: 14,
    lineHeight: 20,
  },
  formSection: {
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 10,
  },
  fieldLabel: {
    marginTop: 4,
    color: colors.ink2,
    fontSize: 12,
    fontWeight: "700",
  },
  textInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 6,
    backgroundColor: colors.bg,
    paddingHorizontal: 13,
    color: colors.ink,
    fontSize: 16,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: "700",
  },
  errorBand: {
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 48,
    marginTop: 6,
    borderRadius: 6,
    paddingHorizontal: 18,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  compactButton: {
    flex: 1,
    marginTop: 0,
  },
  primaryButtonText: {
    color: colors.accentInk,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 48,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 6,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.ink2,
    fontSize: 15,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  infoBand: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 3,
  },
  infoTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  infoText: {
    color: colors.ink3,
    fontSize: 12,
    lineHeight: 18,
  },
  scanSurface: {
    aspectRatio: 1.35,
    minHeight: 250,
    maxHeight: 380,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.ink,
    padding: 28,
  },
  cameraPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraFrame: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraState: {
    color: colors.ink4,
    fontSize: 13,
    fontWeight: "600",
  },
  frameCornerTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.surface,
  },
  frameCornerTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.surface,
  },
  frameCornerBottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.surface,
  },
  frameCornerBottomRight: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 40,
    height: 40,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: colors.surface,
  },
  scanResultBand: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    backgroundColor: colors.surface2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 3,
  },
  scanResultSuccess: {
    borderLeftColor: colors.success,
  },
  scanResultError: {
    borderLeftColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  scanResultTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  metricsRow: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 8,
    backgroundColor: colors.surface,
    flexDirection: "row",
  },
  metric: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 12,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "700",
  },
  metricLabel: {
    marginTop: 4,
    color: colors.ink3,
    fontSize: 10,
    textAlign: "center",
  },
  syncBand: {
    minHeight: 70,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    backgroundColor: colors.surface2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  syncBandError: {
    borderLeftColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  syncCopy: {
    flex: 1,
    gap: 3,
  },
  syncTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  syncText: {
    color: colors.ink3,
    fontSize: 12,
    lineHeight: 17,
  },
  actionRow: {
    minHeight: 48,
    flexDirection: "row",
    gap: 10,
  },
  deviceId: {
    color: colors.ink4,
    fontSize: 10,
    textAlign: "center",
  },
});
