import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@ticketiv/tokens";

import {
  applyTicketivConsumerDeepLink,
  bootTicketivConsumerAppShell,
  canUseCachedTicketivTicketDelivery,
  createTicketivConsumerAppShellState,
  describeTicketivWalletTicket,
  fetchTicketivDiscoverEvents,
  fetchTicketivTicketDelivery,
  findTicketivWalletTicket,
  findTicketivWalletTicketByDeliveryToken,
  importTicketivTicketDelivery,
  isTicketivConsumerFocusedRoute,
  qrPayloadForTicketivWalletTicket,
  saveTicketivWallet,
  ticketivConsumerRouteForSection,
  ticketivConsumerSectionForRoute,
  TICKETIV_CONSUMER_NAV_ITEMS,
  TICKETIV_PUBLIC_ORIGIN,
  type TicketivConsumerAppSection,
  type TicketivConsumerAppShellState,
  type TicketivConsumerShellRoute,
  type TicketivDiscoverEvent,
  type TicketivWalletTicket,
  type TicketivWalletState,
} from "./src";
import { getTicketivAndroidSecureStorage } from "./src/android-secure-storage";

type DiscoveryStatus = "loading" | "ready" | "empty" | "error";
const secureStorage = getTicketivAndroidSecureStorage();

export default function App() {
  const [shell, setShell] = useState<TicketivConsumerAppShellState>(() =>
    createTicketivConsumerAppShellState()
  );
  const [booting, setBooting] = useState(true);

  const applyDeepLink = useCallback((url: string | null) => {
    if (!url) return;
    setShell((current) => applyTicketivConsumerDeepLink(current, url));
  }, []);

  useEffect(() => {
    let active = true;

    void Linking.getInitialURL()
      .then((initialUrl) => bootTicketivConsumerAppShell({ initialUrl, storage: secureStorage }))
      .then((nextShell) => {
        if (active) setShell(nextShell);
      })
      .finally(() => {
        if (active) setBooting(false);
      });

    const subscription = Linking.addEventListener("url", ({ url }) => applyDeepLink(url));
    return () => {
      active = false;
      subscription.remove();
    };
  }, [applyDeepLink]);

  const section = ticketivConsumerSectionForRoute(shell.activeRoute);
  const focused = isTicketivConsumerFocusedRoute(shell.activeRoute);

  const navigate = useCallback((next: TicketivConsumerAppSection) => {
    setShell((current) => ({
      ...current,
      activeRoute: ticketivConsumerRouteForSection(next),
    }));
  }, []);

  const openTicket = useCallback((ticketId: string) => {
    setShell((current) => ({ ...current, activeRoute: { route: "ticket", ticketId } }));
  }, []);

  const importDeliveredWallet = useCallback(async (wallet: TicketivWalletState, ticketId: string) => {
    if (!secureStorage) throw new Error("Secure ticket storage is unavailable on this device.");
    await saveTicketivWallet(secureStorage, wallet);
    setShell((current) => ({
      ...current,
      activeRoute: { route: "ticket", ticketId },
      wallet,
      lastError: null,
    }));
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <SafeAreaView style={styles.safeArea} edges={["top", "right", "bottom", "left"]}>
        <View style={styles.appBar}>
          <View>
            <Text style={styles.brand}>Ticketiv</Text>
            <Text style={styles.environment}>Events around you</Text>
          </View>
          <View style={styles.liveMark}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.content}>
          {booting ? (
            <CenteredStatus label="Opening Ticketiv" />
          ) : shell.activeRoute.route === "discover" ? (
            <DiscoverScreen onOpenEvent={applyDeepLink} />
          ) : shell.activeRoute.route === "tickets" ? (
            <TicketsScreen onOpenTicket={openTicket} tickets={shell.wallet.tickets} />
          ) : shell.activeRoute.route === "ticket" ? (
            <TicketScreen
              onBack={() => navigate("tickets")}
              ticket={findTicketivWalletTicket(shell.wallet, shell.activeRoute.ticketId)}
            />
          ) : shell.activeRoute.route === "ticket-token" ? (
            <TicketDeliveryScreen
              onImported={importDeliveredWallet}
              onOpenCached={openTicket}
              token={shell.activeRoute.token}
              wallet={shell.wallet}
            />
          ) : (
            <RouteScreen
              route={shell.activeRoute}
              onBack={() => navigate("discover")}
            />
          )}
        </View>

        {focused ? null : (
          <BottomNavigation active={section} onNavigate={navigate} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function DiscoverScreen({ onOpenEvent }: { onOpenEvent: (url: string) => void }) {
  const [events, setEvents] = useState<TicketivDiscoverEvent[]>([]);
  const [status, setStatus] = useState<DiscoveryStatus>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("Loading events from ticketiv.app");

  const loadEvents = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setStatus("loading");

    try {
      const nextEvents = await fetchTicketivDiscoverEvents();
      setEvents(nextEvents);
      setStatus(nextEvents.length > 0 ? "ready" : "empty");
      setMessage(nextEvents.length > 0 ? "" : "No published events are available yet.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Events are unavailable right now.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void fetchTicketivDiscoverEvents()
      .then((nextEvents) => {
        if (!active) return;
        setEvents(nextEvents);
        setStatus(nextEvents.length > 0 ? "ready" : "empty");
        setMessage(nextEvents.length > 0 ? "" : "No published events are available yet.");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Events are unavailable right now.");
      });

    return () => {
      active = false;
    };
  }, []);

  const header = (
    <View style={styles.discoverHeader}>
      <Text style={styles.eyebrow}>DISCOVER</Text>
      <Text style={styles.title}>Find your next event</Text>
      <Text style={styles.subtitle}>
        Browse upcoming experiences and continue to secure checkout on ticketiv.app.
      </Text>
    </View>
  );

  if (status === "loading") return <CenteredStatus label={message} />;

  if (status === "error" || status === "empty") {
    return (
      <ScrollView
        contentContainerStyle={styles.screen}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadEvents(true)} />}
      >
        {header}
        <StateBand
          actionLabel="Try again"
          message={message}
          onAction={() => void loadEvents()}
          title={status === "error" ? "Could not load events" : "Nothing on sale yet"}
          tone={status === "error" ? "error" : "neutral"}
        />
      </ScrollView>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={events}
      keyExtractor={(event) => event.id}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadEvents(true)} />}
      renderItem={({ item }) => (
        <EventRow
          event={item}
          onPress={() =>
            onOpenEvent(`${TICKETIV_PUBLIC_ORIGIN}/events/${encodeURIComponent(item.slug)}`)
          }
        />
      )}
    />
  );
}

function EventRow({ event, onPress }: { event: TicketivDiscoverEvent; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={`Open ${event.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.eventRow, pressed && styles.pressed]}
    >
      {event.photo ? (
        <Image
          accessibilityIgnoresInvertColors
          alt={`${event.title} event poster`}
          source={{ uri: event.photo }}
          style={styles.eventImage}
        />
      ) : (
        <View style={[styles.eventImage, styles.eventImageFallback]}>
          <Text style={styles.eventImageFallbackText}>TICKETIV</Text>
        </View>
      )}
      <View style={styles.eventCopy}>
        <View style={styles.eventMetaRow}>
          <Text numberOfLines={1} style={styles.eventCategory}>
            {event.category ?? "EVENT"}
          </Text>
          {event.stockLabel ? (
            <Text style={[styles.stockLabel, event.stockType === "sold-out" && styles.stockSoldOut]}>
              {event.stockLabel}
            </Text>
          ) : null}
        </View>
        <Text numberOfLines={2} style={styles.eventTitle}>
          {event.title}
        </Text>
        <Text numberOfLines={1} style={styles.eventDetail}>
          {event.whenLabel}
        </Text>
        <Text numberOfLines={1} style={styles.eventDetail}>
          {[event.venue, event.city].filter(Boolean).join(" | ")}
        </Text>
        <Text style={styles.eventPrice}>{event.priceLabel}</Text>
      </View>
    </Pressable>
  );
}

function TicketsScreen({
  onOpenTicket,
  tickets,
}: {
  onOpenTicket: (ticketId: string) => void;
  tickets: TicketivWalletTicket[];
}) {
  if (tickets.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.discoverHeader}>
          <Text style={styles.eyebrow}>MY TICKETS</Text>
          <Text style={styles.title}>Your tickets, ready offline</Text>
          <Text style={styles.subtitle}>
            Tickets saved to this device will remain available when the network is busy at the gate.
          </Text>
        </View>
        <StateBand
          actionLabel="Open my tickets"
          message="Open a ticket link from your Ticketiv message to save it securely on this device."
          onAction={() => void openWebPath("/tickets")}
          title="No tickets saved on this device"
          tone="neutral"
        />
      </ScrollView>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={tickets}
      keyExtractor={(ticket) => ticket.id}
      ListHeaderComponent={
        <View style={styles.discoverHeader}>
          <Text style={styles.eyebrow}>MY TICKETS</Text>
          <Text style={styles.title}>Saved on this device</Text>
          <Text style={styles.subtitle}>Entry details remain readable without a connection.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TicketRow onPress={() => onOpenTicket(item.id)} ticket={item} />
      )}
    />
  );
}

function TicketRow({ onPress, ticket }: { onPress: () => void; ticket: TicketivWalletTicket }) {
  const description = describeTicketivWalletTicket(ticket);
  return (
    <Pressable
      accessibilityLabel={`Open ticket for ${ticket.eventTitle}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.ticketRow, pressed && styles.pressed]}
    >
      <View style={styles.ticketAccent} />
      <View style={styles.ticketCopy}>
        <Text style={styles.eventCategory}>{ticket.status.replaceAll("_", " ").toUpperCase()}</Text>
        <Text style={styles.eventTitle}>{description.title}</Text>
        <Text style={styles.eventDetail}>{description.whenLabel}</Text>
        <Text style={styles.eventDetail}>{description.venueLabel}</Text>
      </View>
      <Text accessibilityElementsHidden style={styles.ticketChevron}>›</Text>
    </Pressable>
  );
}

function TicketDeliveryScreen({
  onImported,
  onOpenCached,
  token,
  wallet,
}: {
  onImported: (wallet: TicketivWalletState, ticketId: string) => Promise<void>;
  onOpenCached: (ticketId: string) => void;
  token: string;
  wallet: TicketivWalletState;
}) {
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const cached = findTicketivWalletTicketByDeliveryToken(wallet, token);

    async function deliverTicket() {
      let delivery;
      try {
        delivery = await fetchTicketivTicketDelivery(token);
      } catch (reason) {
        if (!active) return;
        if (cached && canUseCachedTicketivTicketDelivery(reason)) {
          onOpenCached(cached.id);
          return;
        }
        setError(reason instanceof Error ? reason.message : "Ticket delivery is unavailable right now.");
        return;
      }

      if (!active) return;
      const nextWallet = importTicketivTicketDelivery(wallet, delivery);
      try {
        await onImported(nextWallet, delivery.ticket.id);
      } catch {
        if (active) setError("This ticket could not be saved securely on this device.");
      }
    }

    void deliverTicket();

    return () => {
      active = false;
    };
  }, [attempt, onImported, onOpenCached, token, wallet]);

  if (error) {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <StateBand
          actionLabel="Try again"
          message={error}
          onAction={() => {
            setError(null);
            setAttempt((value) => value + 1);
          }}
          title="Could not save this ticket"
          tone="error"
        />
      </ScrollView>
    );
  }

  return <CenteredStatus label="Saving your ticket securely" />;
}

function TicketScreen({
  onBack,
  ticket,
}: {
  onBack: () => void;
  ticket: TicketivWalletTicket | null;
}) {
  if (!ticket) {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <StateBand
          actionLabel="Back to tickets"
          message="This ticket is not saved on this device."
          onAction={onBack}
          title="Ticket unavailable"
          tone="error"
        />
      </ScrollView>
    );
  }

  const description = describeTicketivWalletTicket(ticket);
  const qrPayload = qrPayloadForTicketivWalletTicket(ticket);
  const statusLabel = ticket.status.replaceAll("_", " ").toUpperCase();

  return (
    <ScrollView contentContainerStyle={styles.ticketScreen}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>‹</Text>
        <Text style={styles.backButtonLabel}>Tickets</Text>
      </Pressable>

      <View style={styles.ticketHeading}>
        <Text style={styles.eyebrow}>SAVED ON THIS DEVICE</Text>
        <Text style={styles.ticketScreenTitle}>{ticket.eventTitle}</Text>
        <Text style={styles.ticketScreenDetail}>{description.whenLabel}</Text>
        <Text style={styles.ticketScreenDetail}>{description.venueLabel}</Text>
      </View>

      {qrPayload ? (
        <View accessibilityLabel="Ticket entry QR code" style={styles.qrPanel}>
          <QRCode
            backgroundColor="#ffffff"
            color="#000000"
            ecl="M"
            quietZone={18}
            size={236}
            value={qrPayload}
          />
          <Text selectable style={styles.ticketCode}>{ticket.ticketCode}</Text>
          <Text style={styles.offlineReady}>READY OFFLINE</Text>
        </View>
      ) : (
        <View style={styles.invalidTicketBand}>
          <Text style={styles.invalidTicketTitle}>QR unavailable</Text>
          <Text style={styles.invalidTicketMessage}>
            This ticket is {statusLabel.toLowerCase()} and cannot be used for entry.
          </Text>
        </View>
      )}

      <View style={styles.ticketMeta}>
        <View>
          <Text style={styles.ticketMetaLabel}>STATUS</Text>
          <Text style={styles.ticketMetaValue}>{statusLabel}</Text>
        </View>
        <View>
          <Text style={styles.ticketMetaLabel}>TICKET TYPE</Text>
          <Text style={styles.ticketMetaValue}>{ticket.ticketTypeName ?? "General"}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function RouteScreen({
  route,
  onBack,
}: {
  route: TicketivConsumerShellRoute;
  onBack: () => void;
}) {
  const destination = routeDestination(route);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.discoverHeader}>
        <Text style={styles.eyebrow}>{destination.eyebrow}</Text>
        <Text style={styles.title}>{destination.title}</Text>
        <Text style={styles.subtitle}>{destination.message}</Text>
      </View>
      <View style={styles.routeActions}>
        {destination.path ? (
          <PrimaryButton label={destination.actionLabel} onPress={() => void openWebPath(destination.path!)} />
        ) : null}
        <SecondaryButton label="Back to events" onPress={onBack} />
      </View>
    </ScrollView>
  );
}

function BottomNavigation({
  active,
  onNavigate,
}: {
  active: TicketivConsumerAppSection;
  onNavigate: (section: TicketivConsumerAppSection) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.bottomNavigation}>
      {TICKETIV_CONSUMER_NAV_ITEMS.map((item) => {
        const selected = active === item.key;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={item.key}
            onPress={() => onNavigate(item.key)}
            style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}
          >
            <View style={[styles.navMarker, selected && styles.navMarkerActive]} />
            <Text style={[styles.navLabel, selected && styles.navLabelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CenteredStatus({ label }: { label: string }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.centeredStatus}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={styles.centeredStatusText}>{label}</Text>
    </View>
  );
}

function StateBand({
  actionLabel,
  message,
  onAction,
  title,
  tone,
}: {
  actionLabel: string;
  message: string;
  onAction: () => void;
  title: string;
  tone: "error" | "neutral";
}) {
  return (
    <View style={[styles.stateBand, tone === "error" && styles.stateBandError]}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      <PrimaryButton label={actionLabel} onPress={onAction} />
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function routeDestination(route: TicketivConsumerShellRoute): {
  actionLabel: string;
  eyebrow: string;
  message: string;
  path: string | null;
  title: string;
} {
  const section = ticketivConsumerSectionForRoute(route);

  if (section === "friends") {
    return {
      actionLabel: "Open Friends",
      eyebrow: "FRIENDS",
      message:
        "Connect with friends, manage invitations and discover events together on ticketiv.app.",
      path: route.route === "unknown" ? route.path : "/friends",
      title: "Friends on Ticketiv",
    };
  }

  if (section === "you" && route.route === "unknown") {
    return {
      actionLabel: "Open your profile",
      eyebrow: "YOU",
      message:
        "Manage your profile, notifications, orders and security on ticketiv.app.",
      path: route.path,
      title: "Your Ticketiv",
    };
  }

  if (route.route === "event") {
    return {
      actionLabel: "View tickets",
      eyebrow: "EVENT",
      message: "Review event details, ticket availability and secure checkout.",
      path: `/events/${encodeURIComponent(route.slugOrId)}`,
      title: "Continue to event",
    };
  }
  if (route.route === "ticket-token") {
    return {
      actionLabel: "Open ticket",
      eyebrow: "TICKET DELIVERY",
      message: "Claim this delivery securely before it is stored for offline entry.",
      path: `/t/${encodeURIComponent(route.token)}`,
      title: "A ticket is waiting",
    };
  }
  if (route.route === "account-settings") {
    return {
      actionLabel: "Open settings",
      eyebrow: "YOU",
      message: "Manage your personal information, security and account preferences on ticketiv.app.",
      path: "/account/settings",
      title: "Account settings",
    };
  }
  if (route.route === "order-confirmation") {
    return {
      actionLabel: "View order",
      eyebrow: "ORDER",
      message: "Check payment status and retrieve issued tickets.",
      path: `/orders/${encodeURIComponent(route.orderId)}/confirmation`,
      title: "Order confirmation",
    };
  }
  if (route.route === "checkout" || route.route === "checkout-return") {
    const orderId = route.orderId;
    return {
      actionLabel: "Resume checkout",
      eyebrow: "CHECKOUT",
      message: "Return to the secure hosted checkout and payment confirmation flow.",
      path: orderId ? `/orders/${encodeURIComponent(orderId)}/confirmation` : "/tickets",
      title: "Finish your purchase",
    };
  }
  if (route.route === "auth-callback") {
    return {
      actionLabel: "Continue",
      eyebrow: "SIGNED IN",
      message: "Continue to your Ticketiv account after authentication.",
      path: route.nextPath ?? "/tickets",
      title: "Welcome back",
    };
  }
  return {
    actionLabel: "Open Ticketiv",
    eyebrow: "TICKETIV",
    message: "Continue safely on ticketiv.app.",
    path: route.route === "unknown" ? route.path : "/",
    title: "Continue in Ticketiv",
  };
}

async function openWebPath(path: string): Promise<void> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  await Linking.openURL(`${TICKETIV_PUBLIC_ORIGIN}${normalized}`);
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
  appBar: {
    minHeight: 66,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line2,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { color: colors.ink, fontSize: 21, fontWeight: "800" },
  environment: { marginTop: 1, color: colors.ink3, fontSize: 11 },
  liveMark: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  liveText: { color: colors.ink3, fontSize: 10, fontWeight: "700" },
  screen: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 26,
    paddingBottom: 36,
    gap: 22,
  },
  listContent: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 26,
    paddingBottom: 36,
    gap: 12,
  },
  discoverHeader: { marginBottom: 10, gap: 6 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: "700" },
  title: { color: colors.ink, fontSize: 28, fontWeight: "700" },
  subtitle: { maxWidth: 560, color: colors.ink3, fontSize: 14, lineHeight: 20 },
  eventRow: {
    minHeight: 134,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 8,
    backgroundColor: colors.surface,
    overflow: "hidden",
    flexDirection: "row",
  },
  eventImage: { width: 116, minHeight: 132, backgroundColor: colors.surface2 },
  eventImageFallback: { alignItems: "center", justifyContent: "center" },
  eventImageFallbackText: { color: colors.ink4, fontSize: 10, fontWeight: "800" },
  eventCopy: { flex: 1, minWidth: 0, paddingHorizontal: 13, paddingVertical: 11, gap: 4 },
  eventMetaRow: { minHeight: 18, flexDirection: "row", alignItems: "center", gap: 8 },
  eventCategory: { flex: 1, color: colors.accent, fontSize: 10, fontWeight: "700" },
  stockLabel: { color: colors.warning, fontSize: 10, fontWeight: "700" },
  stockSoldOut: { color: colors.danger },
  eventTitle: { color: colors.ink, fontSize: 17, lineHeight: 21, fontWeight: "700" },
  eventDetail: { color: colors.ink3, fontSize: 12, lineHeight: 16 },
  eventPrice: { marginTop: 2, color: colors.ink2, fontSize: 12, fontWeight: "700" },
  ticketRow: {
    minHeight: 112,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 8,
    backgroundColor: colors.surface,
    overflow: "hidden",
    flexDirection: "row",
  },
  ticketAccent: { width: 6, backgroundColor: colors.accent },
  ticketCopy: { flex: 1, padding: 14, gap: 5 },
  ticketChevron: {
    alignSelf: "center",
    paddingRight: 16,
    color: colors.ink4,
    fontSize: 28,
    lineHeight: 32,
  },
  ticketScreen: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 42,
    gap: 22,
  },
  backButton: {
    minHeight: 42,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingRight: 12,
  },
  backButtonText: { color: colors.accent, fontSize: 30, lineHeight: 32 },
  backButtonLabel: { color: colors.accent, fontSize: 14, fontWeight: "700" },
  ticketHeading: { gap: 6 },
  ticketScreenTitle: { color: colors.ink, fontSize: 25, lineHeight: 31, fontWeight: "700" },
  ticketScreenDetail: { color: colors.ink3, fontSize: 13, lineHeight: 18 },
  qrPanel: {
    width: "100%",
    minHeight: 344,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    gap: 10,
  },
  ticketCode: {
    maxWidth: "100%",
    color: colors.ink2,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  offlineReady: { color: colors.success, fontSize: 10, fontWeight: "800" },
  invalidTicketBand: {
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    padding: 20,
    gap: 7,
  },
  invalidTicketTitle: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  invalidTicketMessage: { color: colors.ink3, fontSize: 13, lineHeight: 19 },
  ticketMeta: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line2,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
    paddingTop: 16,
  },
  ticketMetaLabel: { color: colors.ink4, fontSize: 10, fontWeight: "700" },
  ticketMetaValue: { marginTop: 4, color: colors.ink2, fontSize: 13, fontWeight: "700" },
  stateBand: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 8,
  },
  stateBandError: { borderLeftColor: colors.danger, backgroundColor: colors.dangerSoft },
  stateTitle: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  stateMessage: { color: colors.ink3, fontSize: 13, lineHeight: 19 },
  routeActions: { gap: 10 },
  primaryButton: {
    minHeight: 48,
    borderRadius: 6,
    paddingHorizontal: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: colors.accentInk, fontSize: 15, fontWeight: "700" },
  secondaryButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 6,
    paddingHorizontal: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { color: colors.ink2, fontSize: 15, fontWeight: "700" },
  centeredStatus: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  centeredStatusText: { color: colors.ink3, fontSize: 13, textAlign: "center" },
  bottomNavigation: {
    minHeight: 62,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line2,
    backgroundColor: colors.surface,
    flexDirection: "row",
  },
  navItem: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", gap: 7 },
  navMarker: { width: 22, height: 3, borderRadius: 2, backgroundColor: "transparent" },
  navMarkerActive: { backgroundColor: colors.accent },
  navLabel: { color: colors.ink3, fontSize: 11, fontWeight: "600" },
  navLabelActive: { color: colors.ink, fontWeight: "700" },
  pressed: { opacity: 0.72 },
});
