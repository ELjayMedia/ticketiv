import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { colors } from "@ticketiv/tokens";
import type { CompanionMemory } from "@ticketiv/shared";

import { setTicketivOrgFollow, submitTicketivFeedback } from "./src/ticket-memory";

/**
 * Event memory on the native ticket, after the event: a private rating, the
 * organiser's highlights, "hear about their next event" and what's next.
 * Writes need signal; everything shown is kept with the ticket.
 */
export function TicketMemory({
  token,
  memory,
  orgName,
  attended,
  onOpenPath,
}: {
  token: string | null;
  memory: CompanionMemory;
  orgName: string | null;
  attended: boolean;
  onOpenPath: (path: string) => void;
}) {
  const [rating, setRating] = useState(memory.myRating ?? 0);
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(memory.myRating !== null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [following, setFollowing] = useState(memory.following);
  const [followMessage, setFollowMessage] = useState<string | null>(null);
  const who = orgName ?? "the organiser";

  async function sendRating() {
    if (!token || rating < 1) return;
    setBusy(true);
    const result = await submitTicketivFeedback(token, rating, comment);
    setBusy(false);
    if (result.ok) {
      setSaved(true);
      setMessage(`Thanks. Only ${who} sees this, without your name.`);
    } else {
      setMessage(result.message);
    }
  }

  async function toggleFollow(next: boolean) {
    if (!token) return;
    setFollowing(next);
    const result = await setTicketivOrgFollow(token, next);
    if (!result.ok) {
      setFollowing(!next);
      setFollowMessage(result.message);
    } else {
      setFollowMessage(next ? "You'll hear when they announce their next event." : "You won't get their announcements.");
    }
  }

  return (
    <View style={styles.memory}>
      {attended && token ? (
        <View style={styles.card}>
          <Text style={styles.title}>{saved ? "Your rating" : "How was it?"}</Text>
          <Text style={styles.meta}>Only {who} sees this, without your name.</Text>
          <View accessibilityRole="radiogroup" style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                accessibilityRole="radio"
                accessibilityState={{ checked: rating === n }}
                accessibilityLabel={`${n} star${n === 1 ? "" : "s"}`}
                onPress={() => setRating(n)}
                style={styles.star}
              >
                <Text style={[styles.starGlyph, n <= rating && styles.starOn]}>{n <= rating ? "★" : "☆"}</Text>
              </Pressable>
            ))}
          </View>
          {rating > 0 ? (
            <>
              <TextInput
                accessibilityLabel="Anything to add? (optional)"
                placeholder="Anything to add? (optional)"
                placeholderTextColor={colors.ink4}
                value={comment}
                onChangeText={setComment}
                maxLength={1000}
                multiline
                style={styles.input}
              />
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void sendRating()} style={[styles.button, busy && styles.buttonBusy]}>
                <Text style={styles.buttonText}>{busy ? "Saving…" : saved ? "Update rating" : "Send rating"}</Text>
              </Pressable>
            </>
          ) : null}
          {message ? <Text style={styles.status}>{message}</Text> : null}
        </View>
      ) : null}

      {memory.highlights.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Highlights</Text>
          <View style={styles.grid}>
            {memory.highlights.map((h) => (
              <Image key={h.id} source={{ uri: h.imageUrl }} accessibilityLabel={h.caption ?? "Event photo"} style={styles.photo} />
            ))}
          </View>
          <Text style={styles.meta}>CHOSEN BY {who.toUpperCase()}</Text>
        </View>
      ) : null}

      {memory.orgId && token ? (
        <View style={[styles.card, styles.row]}>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Hear about their next event</Text>
            <Text style={styles.meta}>{followMessage ?? `From ${who} only.`}</Text>
          </View>
          <Switch
            accessibilityLabel={`Hear about ${who}'s next event`}
            value={following}
            onValueChange={(next) => void toggleFollow(next)}
            trackColor={{ true: colors.accent, false: colors.line2 }}
          />
        </View>
      ) : null}

      {memory.suggestions.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Because you went</Text>
          {memory.suggestions.map((s) => (
            <Pressable key={s.slug} accessibilityRole="link" onPress={() => onOpenPath(`/events/${s.slug}`)} style={styles.suggestion}>
              <Text style={styles.rowTitle}>{s.title}</Text>
              <Text style={styles.meta}>{s.whenLabel}</Text>
              <Text style={styles.reason}>{s.reason}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  memory: { gap: 18 },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.surface, padding: 14, gap: 6 },
  title: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  meta: { color: colors.ink3, fontSize: 11 },
  stars: { flexDirection: "row", gap: 2 },
  star: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  starGlyph: { fontSize: 28, color: colors.ink4 },
  starOn: { color: colors.accent },
  input: { minHeight: 64, borderWidth: 1, borderColor: colors.line2, borderRadius: 8, padding: 10, color: colors.ink, fontSize: 14, textAlignVertical: "top" },
  button: { alignSelf: "flex-start", backgroundColor: colors.ink, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  buttonBusy: { opacity: 0.6 },
  buttonText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  status: { color: colors.ink2, fontSize: 13, fontWeight: "600" },
  section: { gap: 8 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  photo: { width: "31.5%", aspectRatio: 1, borderRadius: 8, backgroundColor: colors.surface2 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  suggestion: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.surface, padding: 12, gap: 3 },
  reason: { color: colors.accent, fontSize: 11 },
});
