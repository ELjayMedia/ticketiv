import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  Alert,
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

import {
  ACCESS_API_BASE_URL,
  ACCESS_SUPABASE_PUBLISHABLE_KEY,
  ACCESS_SUPABASE_URL,
  AccountAuthError,
  OrganizerApiError,
  clearAccountSession,
  fetchOrganizerWorkspaces,
  fetchScanEvents,
  isClaimedDeviceSetup,
  loadAccountSession,
  orderScanEvents,
  organizerHomeTiles,
  pickWorkspace,
  readApiError,
  refreshAccountSession,
  requestScannerSetup,
  saveAccountSession,
  sessionNeedsRefresh,
  signInWithPassword,
  signOutAccount,
  type AccountAuthConfig,
  type OrganizerAccountSession,
  type OrganizerApiConfig,
  type OrganizerScanEvent,
  type OrganizerWorkspace,
  applyAccessSetupDeepLink,
  bootAccessNativeAppShell,
  completeAccessAppPairing,
  createAccessAppShellState,
  endAccessScannerSession,
  failAccessPairingClaim,
  persistAccessNativeAppShell,
  startAccessPairingClaim,
  submitAccessQrScan,
  syncAccessScannerSession,
  updateAccessPairingCode,
  updateAccessPairingDeviceLabel,
  type AccessAppShellState,
} from "./src";
import { getAccessAndroidSecureStorage } from "./src/android-secure-storage";

const API_BASE_URL = ACCESS_API_BASE_URL;
const AUTH_CONFIG: AccountAuthConfig = {
  supabaseUrl: ACCESS_SUPABASE_URL,
  publishableKey: ACCESS_SUPABASE_PUBLISHABLE_KEY,
  fetch,
};
const secureStorage = getAccessAndroidSecureStorage();

type SyncStatus = "idle" | "syncing" | "ready" | "error";
type StorageError = {
  phase: "boot" | "write" | "unavailable";
  message: string;
};

export default function App() {
  const [shell, setShell] = useState<AccessAppShellState>(() => createAccessAppShellState());
  const [booting, setBooting] = useState(Boolean(secureStorage));
  const [storageError, setStorageError] = useState<StorageError | null>(
    secureStorage
      ? null
      : {
          phase: "unavailable",
          message: "Encrypted scanner storage is unavailable in this build.",
        }
  );
  const [storageRetry, setStorageRetry] = useState(0);
  const [account, setAccount] = useState<OrganizerAccountSession | null>(null);
  const [authMode, setAuthMode] = useState<"sign-in" | "pair">("sign-in");
  const accountRef = useRef<OrganizerAccountSession | null>(null);
  const hydratedRef = useRef(false);
  const persistedScannerRef = useRef(false);
  const persistenceQueueRef = useRef<Promise<void>>(Promise.resolve());

  const applyDeepLink = useCallback((url: string | null) => {
    if (!url) return;
    setShell((current) => applyAccessSetupDeepLink(current, url));
  }, []);

  useEffect(() => {
    let active = true;
    hydratedRef.current = false;

    if (!secureStorage) return;

    void Linking.getInitialURL()
      .then((initialUrl) =>
        Promise.all([
          bootAccessNativeAppShell(secureStorage, initialUrl),
          loadAccountSession(secureStorage).catch(() => null),
        ])
      )
      .then(([restored, savedAccount]) => {
        if (!active) return;
        accountRef.current = savedAccount;
        setAccount(savedAccount);
        setShell(restored);
        persistedScannerRef.current = Boolean(restored.scanner);
        hydratedRef.current = true;
      })
      .catch(() => {
        if (active) {
          setStorageError({
            phase: "boot",
            message: "Ticketiv Organizer could not unlock scanner data on this device.",
          });
        }
      })
      .finally(() => {
        if (active) setBooting(false);
      });

    const subscription = Linking.addEventListener("url", ({ url }) => applyDeepLink(url));
    return () => {
      active = false;
      subscription.remove();
    };
  }, [applyDeepLink, storageRetry]);

  useEffect(() => {
    if (!secureStorage || !hydratedRef.current) return;
    if (!shell.scanner && !persistedScannerRef.current) return;

    persistedScannerRef.current = Boolean(shell.scanner);

    persistenceQueueRef.current = persistenceQueueRef.current
      .then(() => persistAccessNativeAppShell(secureStorage, shell))
      .catch(() => {
        setStorageError({
          phase: "write",
          message: "Ticketiv Organizer could not protect scanner data on this device.",
        });
      });
  }, [shell]);

  const retrySecureStorage = useCallback(() => {
    if (!secureStorage || !storageError) return;

    if (storageError.phase === "boot") {
      setBooting(true);
      setStorageError(null);
      setStorageRetry((value) => value + 1);
      return;
    }
    if (storageError.phase === "unavailable") return;

    setBooting(true);
    setStorageError(null);
    persistenceQueueRef.current = persistenceQueueRef.current
      .then(() => persistAccessNativeAppShell(secureStorage, shell))
      .catch(() => {
        setStorageError({
          phase: "write",
          message: "Ticketiv Organizer still cannot protect scanner data on this device.",
        });
      })
      .finally(() => setBooting(false));
  }, [shell, storageError]);

  const resetSecureStorage = useCallback(() => {
    if (!secureStorage || storageError?.phase !== "boot") return;

    Alert.alert(
      "Reset scanner data?",
      "This removes the saved pairing, offline manifest, and queued scans from this device. Pair it again before gate use.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset and re-pair",
          style: "destructive",
          onPress: () => {
            setBooting(true);
            setStorageError(null);
            void secureStorage
              .reset()
              .then(() => {
                persistedScannerRef.current = false;
                setShell(createAccessAppShellState());
                setStorageRetry((value) => value + 1);
              })
              .catch(() => {
                setStorageError({
                  phase: "boot",
                  message: "Ticketiv Organizer could not reset secure scanner data.",
                });
                setBooting(false);
              });
          },
        },
      ]
    );
  }, [storageError]);

  const updateAccount = useCallback((next: OrganizerAccountSession | null) => {
    accountRef.current = next;
    setAccount(next);
    if (!secureStorage) return;
    void (next ? saveAccountSession(secureStorage, next) : clearAccountSession(secureStorage)).catch(() => {
      // Signed in for this run either way; the next launch asks to sign in again.
    });
  }, []);

  const getAccessToken = useCallback(async () => {
    const current = accountRef.current;
    if (!current) throw new OrganizerApiError("Sign in again to continue.", 401);
    if (!sessionNeedsRefresh(current, Date.now())) return current.accessToken;
    try {
      const next = await refreshAccountSession(AUTH_CONFIG, current);
      updateAccount(next);
      return next.accessToken;
    } catch (error) {
      if (error instanceof AccountAuthError && error.kind === "session_expired") {
        updateAccount(null);
        throw new OrganizerApiError(error.message, 401);
      }
      throw new OrganizerApiError(error instanceof Error ? error.message : "Can't reach Ticketiv.", 0);
    }
  }, [updateAccount]);

  const organizerApi = useMemo<OrganizerApiConfig>(
    () => ({ baseUrl: API_BASE_URL, fetch, getAccessToken }),
    [getAccessToken]
  );

  const signOut = useCallback(() => {
    const current = accountRef.current;
    updateAccount(null);
    setAuthMode("sign-in");
    if (current) void signOutAccount(AUTH_CONFIG, current);
  }, [updateAccount]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <SafeAreaView style={styles.safeArea} edges={["top", "right", "bottom", "left"]}>
        <View style={styles.appBar}>
          <View>
            <Text style={styles.brand}>Ticketiv Organizer</Text>
            <Text style={styles.environment}>ticketiv.app</Text>
          </View>
          <StatusMark paired={Boolean(shell.scanner)} signedIn={Boolean(account)} />
        </View>

        {booting ? (
          <CenteredStatus label="Opening secure scanner" />
        ) : storageError ? (
          <StorageErrorScreen
            message={storageError.message}
            onRetry={storageError.phase === "unavailable" ? null : retrySecureStorage}
            onReset={storageError.phase === "boot" ? resetSecureStorage : null}
          />
        ) : shell.scanner ? (
          <ScannerScreen shell={shell} onShellChange={setShell} />
        ) : account ? (
          <OrganizerHomeScreen
            account={account}
            api={organizerApi}
            shell={shell}
            onShellChange={setShell}
            onSignOut={signOut}
            onSessionEnded={() => updateAccount(null)}
          />
        ) : authMode === "pair" || shell.pairing.formattedCode ? (
          <PairingScreen
            shell={shell}
            onShellChange={setShell}
            onUseAccount={() => {
              setAuthMode("sign-in");
              setShell((current) => ({ ...current, pairing: updateAccessPairingCode(current.pairing, "") }));
            }}
          />
        ) : (
          <SignInScreen onSignedIn={updateAccount} onUsePairing={() => setAuthMode("pair")} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function CenteredStatus({ label }: { label: string }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.centeredStatus}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.centeredStatusText}>{label}</Text>
    </View>
  );
}

function StorageErrorScreen({
  message,
  onRetry,
  onReset,
}: {
  message: string;
  onRetry: (() => void) | null;
  onReset: (() => void) | null;
}) {
  return (
    <View style={styles.centeredStatus}>
      <View accessibilityLiveRegion="assertive" style={styles.storageErrorBand}>
        <Text style={styles.storageErrorTitle}>Secure storage required</Text>
        <Text style={styles.centeredStatusText}>{message}</Text>
      </View>
      <View style={styles.storageRecoveryActions}>
        {onRetry ? <ActionButton compact label="Retry" onPress={onRetry} /> : null}
        {onReset ? <SecondaryButton label="Reset data" onPress={onReset} /> : null}
      </View>
    </View>
  );
}

function PairingScreen({
  shell,
  onShellChange,
  onUseAccount,
}: {
  shell: AccessAppShellState;
  onShellChange: React.Dispatch<React.SetStateAction<AccessAppShellState>>;
  onUseAccount: () => void;
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

      <TextLink label="Sign in with your Ticketiv account instead" onPress={onUseAccount} />
    </ScrollView>
  );
}

function SignInScreen({
  onSignedIn,
  onUsePairing,
}: {
  onSignedIn: (session: OrganizerAccountSession) => void;
  onUsePairing: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      onSignedIn(await signInWithPassword(AUTH_CONFIG, email, password));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Sign-in failed. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <View style={styles.headingBlock}>
        <Text style={styles.eyebrow}>TICKETIV ORGANIZER</Text>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>
          Use the email and password of your Ticketiv account. You'll see what your role in each organisation lets you do.
        </Text>
      </View>

      <View style={styles.formSection}>
        <FieldLabel>Email</FieldLabel>
        <TextInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          editable={!submitting}
          inputMode="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.ink4}
          style={styles.textInput}
          textContentType="username"
          value={email}
        />

        <FieldLabel>Password</FieldLabel>
        <TextInput
          accessibilityLabel="Password"
          autoCapitalize="none"
          autoComplete="password"
          autoCorrect={false}
          editable={!submitting}
          onChangeText={setPassword}
          onSubmitEditing={() => void submit()}
          placeholder="Password"
          placeholderTextColor={colors.ink4}
          returnKeyType="go"
          secureTextEntry
          style={styles.textInput}
          textContentType="password"
          value={password}
        />

        {error ? (
          <View accessibilityLiveRegion="polite" style={styles.errorBand}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <ActionButton
          disabled={submitting || !email.trim() || !password}
          label={submitting ? "Signing in" : "Sign in"}
          loading={submitting}
          onPress={() => void submit()}
        />
        <TextLink label="Forgot password?" onPress={() => void Linking.openURL(`${API_BASE_URL}/forgot-password`)} />
      </View>

      <View style={styles.infoBand}>
        <Text style={styles.infoTitle}>Shared gate device?</Text>
        <Text style={styles.infoText}>Pair it with a setup code from your organizer instead of signing in.</Text>
      </View>
      <TextLink label="Pair with a setup code" onPress={onUsePairing} />
    </ScrollView>
  );
}

function OrganizerHomeScreen({
  account,
  api,
  shell,
  onShellChange,
  onSignOut,
  onSessionEnded,
}: {
  account: OrganizerAccountSession;
  api: OrganizerApiConfig;
  shell: AccessAppShellState;
  onShellChange: React.Dispatch<React.SetStateAction<AccessAppShellState>>;
  onSignOut: () => void;
  onSessionEnded: () => void;
}) {
  const [workspaces, setWorkspaces] = useState<OrganizerWorkspace[] | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"home" | "scan-events">("home");
  const [events, setEvents] = useState<OrganizerScanEvent[] | null>(null);
  const [pairingEventId, setPairingEventId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const handleFailure = useCallback(
    (failure: unknown, fallback: string) => {
      if (failure instanceof OrganizerApiError && failure.unauthorized) {
        onSessionEnded();
        return;
      }
      setError(failure instanceof Error ? failure.message : fallback);
    },
    [onSessionEnded]
  );

  useEffect(() => {
    let active = true;
    setError(null);
    fetchOrganizerWorkspaces(api)
      .then((list) => {
        if (!active) return;
        setWorkspaces(list);
        setOrgId((current) => pickWorkspace(list, current)?.orgId ?? null);
      })
      .catch((failure) => active && handleFailure(failure, "Unable to load your organisations."));
    return () => {
      active = false;
    };
  }, [api, handleFailure, reload]);

  const workspace = workspaces?.find((w) => w.orgId === orgId) ?? null;

  function openScanEvents() {
    if (!workspace) return;
    setView("scan-events");
    setEvents(null);
    setError(null);
    fetchScanEvents(api, workspace.orgId)
      .then((list) => setEvents(orderScanEvents(list, Date.now())))
      .catch((failure) => handleFailure(failure, "Unable to load events."));
  }

  async function startScanning(event: OrganizerScanEvent) {
    if (!workspace) return;
    setPairingEventId(event.id);
    setError(null);
    try {
      const setup = await requestScannerSetup(api, {
        orgId: workspace.orgId,
        eventId: event.id,
        deviceId: shell.pairing.deviceId,
        label: shell.pairing.deviceLabel || `${account.email ?? "Organizer"} phone`,
      });
      onShellChange((current) => completeAccessAppPairing(current, setup));
    } catch (failure) {
      handleFailure(failure, "Unable to start the scanner for this event.");
      setPairingEventId(null);
    }
  }

  if (!workspaces && !error) return <CenteredStatus label="Loading your organisations" />;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.screen}>
      <View style={styles.headingBlock}>
        <Text style={styles.eyebrow}>{workspace ? workspace.roleLabel.toUpperCase() : "SIGNED IN"}</Text>
        <Text style={styles.title}>{view === "scan-events" ? "Choose an event" : workspace?.orgName ?? "Ticketiv Organizer"}</Text>
        <Text style={styles.subtitle}>
          {view === "scan-events"
            ? "Pick the event you're scanning. This phone stays paired to it until you end the session."
            : account.email ?? ""}
        </Text>
      </View>

      {error ? (
        <View accessibilityLiveRegion="polite" style={styles.errorBand}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {view === "scan-events" ? (
        <>
          {events === null && !error ? <CenteredStatus label="Loading events" /> : null}
          {events?.length === 0 ? (
            <View style={styles.infoBand}>
              <Text style={styles.infoTitle}>No events to scan</Text>
              <Text style={styles.infoText}>When an organizer adds you to an event, it shows up here.</Text>
            </View>
          ) : null}
          {events?.map((event) => (
            <Pressable
              accessibilityRole="button"
              disabled={Boolean(pairingEventId)}
              key={event.id}
              onPress={() => void startScanning(event)}
              style={({ pressed }) => [styles.tile, pressed && styles.buttonPressed]}
            >
              <View style={styles.tileBody}>
                <Text style={styles.tileTitle}>{event.title}</Text>
                <Text style={styles.tileText}>{formatEventTime(event.startsAt)}</Text>
              </View>
              {pairingEventId === event.id ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.tileChevron}>›</Text>}
            </Pressable>
          ))}
          <SecondaryButton label="Back" onPress={() => setView("home")} />
        </>
      ) : workspaces && workspaces.length === 0 ? (
        <View style={styles.infoBand}>
          <Text style={styles.infoTitle}>No organisation yet</Text>
          <Text style={styles.infoText}>
            This account isn't part of an organisation on Ticketiv. Ask an organizer to invite you, or create one on ticketiv.app.
          </Text>
        </View>
      ) : (
        <>
          {workspaces && workspaces.length > 1 ? (
            <View style={styles.chipRow}>
              {workspaces.map((w) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: w.orgId === orgId }}
                  key={w.orgId}
                  onPress={() => setOrgId(w.orgId)}
                  style={[styles.chip, w.orgId === orgId && styles.chipActive]}
                >
                  <Text style={[styles.chipText, w.orgId === orgId && styles.chipTextActive]}>{w.orgName}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {workspace
            ? organizerHomeTiles(workspace, API_BASE_URL).map((tile) => (
                <Pressable
                  accessibilityRole="button"
                  key={tile.key}
                  onPress={() =>
                    tile.action.kind === "scan" ? openScanEvents() : void Linking.openURL(tile.action.url)
                  }
                  style={({ pressed }) => [styles.tile, pressed && styles.buttonPressed]}
                >
                  <View style={styles.tileBody}>
                    <Text style={styles.tileTitle}>{tile.label}</Text>
                    <Text style={styles.tileText}>{tile.description}</Text>
                  </View>
                  <Text style={styles.tileChevron}>{tile.action.kind === "web" ? "↗" : "›"}</Text>
                </Pressable>
              ))
            : null}
        </>
      )}

      <View style={styles.actionRow}>
        {error && view === "home" ? <SecondaryButton label="Try again" onPress={() => setReload((n) => n + 1)} /> : null}
        <SecondaryButton
          label="Sign out"
          onPress={() =>
            Alert.alert("Sign out?", "You'll need your email and password to sign in again.", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign out", style: "destructive", onPress: onSignOut },
            ])
          }
        />
      </View>
    </ScrollView>
  );
}

function formatEventTime(iso: string | null): string {
  if (!iso) return "Date to be announced";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "Date to be announced"
    : date.toLocaleString("en-SZ", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.textLink, pressed && styles.buttonPressed]}>
      <Text style={styles.textLinkText}>{label}</Text>
    </Pressable>
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
        title: "Allow Ticketiv Organizer to scan tickets",
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

function StatusMark({ paired, signedIn }: { paired: boolean; signedIn: boolean }) {
  return (
    <View style={styles.statusMark}>
      <View style={[styles.statusDot, (paired || signedIn) && styles.statusDotReady]} />
      <Text style={styles.statusText}>{paired ? "PAIRED" : signedIn ? "SIGNED IN" : "UNPAIRED"}</Text>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centeredStatus: {
    flex: 1,
    minHeight: 260,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  centeredStatusText: {
    color: colors.ink3,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  storageErrorBand: {
    width: "100%",
    maxWidth: 440,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 5,
  },
  storageErrorTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  storageRecoveryActions: {
    width: "100%",
    maxWidth: 320,
    minHeight: 48,
    flexDirection: "row",
    gap: 10,
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
  textLink: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  textLinkText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  tile: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tileBody: {
    flex: 1,
    gap: 3,
  },
  tileTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  tileText: {
    color: colors.ink3,
    fontSize: 13,
    lineHeight: 18,
  },
  tileChevron: {
    color: colors.ink3,
    fontSize: 20,
    fontWeight: "700",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  chipText: {
    color: colors.ink2,
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: colors.surface,
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
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
