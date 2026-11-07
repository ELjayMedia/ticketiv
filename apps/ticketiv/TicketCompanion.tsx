import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@ticketiv/tokens";

import { describeTicketivCompanion } from "./src/ticket-companion";
import type { TicketivWalletTicket } from "./src/ticket-wallet";
import { TicketMemory } from "./TicketMemory";

/**
 * Event Companion on the native ticket: the organiser's guide and updates,
 * saved with the ticket so it works with no signal at the gate.
 */
export function TicketCompanion({ ticket, onOpenPath = () => {} }: { ticket: TicketivWalletTicket; onOpenPath?: (path: string) => void }) {
  const view = describeTicketivCompanion(ticket);
  if (!view) return null;
  const inside = view.stage === "in";

  return (
    <View style={styles.companion}>
      <View style={[styles.companionBand, inside && styles.companionBandIn]}>
        <Text style={[styles.companionBandLabel, inside && styles.companionBandLabelIn]}>
          {view.countdown ?? (inside ? "CHECKED IN" : "EVENT GUIDE")}
        </Text>
        <Text style={styles.companionHeadline}>{view.headline}</Text>
      </View>

      {view.memory ? (
        <TicketMemory
          token={ticket.deliveryToken}
          memory={view.memory}
          orgName={view.orgName}
          attended={Boolean(ticket.checkedInAt)}
          onOpenPath={onOpenPath}
        />
      ) : null}

      {view.facts.length ? (
        <View style={styles.companionGrid}>
          {view.facts.map((fact) => (
            <View key={fact.label} style={styles.companionFact}>
              <Text style={styles.ticketMetaLabel}>{fact.label}</Text>
              <Text style={styles.companionFactValue}>{fact.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {view.updates.length ? (
        <CompanionSection title={`Updates${view.orgName ? ` from ${view.orgName}` : ""}`}>
          {view.updates.map((update) => (
            <View key={update.id} style={styles.companionRow}>
              <Text style={styles.companionRowTitle}>{update.title}</Text>
              {update.body ? <Text style={styles.companionRowBody}>{update.body}</Text> : null}
              <Text style={styles.companionRowMeta}>{update.whenLabel}</Text>
            </View>
          ))}
        </CompanionSection>
      ) : null}

      {view.programme.length ? (
        <CompanionSection title={view.programmeTitle}>
          {view.programme.map((item) => (
            <View key={`${item.time}-${item.title}`} style={styles.companionProgrammeRow}>
              <Text style={[styles.companionTime, item.current && styles.companionTimeNow]}>{item.time}</Text>
              <View style={styles.companionProgrammeCopy}>
                <Text style={styles.companionRowTitle}>{item.title}{item.current ? "  · NOW" : ""}</Text>
                {item.where ? <Text style={styles.companionRowMeta}>{item.where}</Text> : null}
              </View>
            </View>
          ))}
        </CompanionSection>
      ) : null}

      {view.gettingThere.length ? (
        <CompanionSection title="Getting there">
          {view.gettingThere.map((row) => (
            <View key={row.label} style={styles.companionRow}>
              <Text style={styles.ticketMetaLabel}>{row.label}</Text>
              <Text style={styles.companionRowBody}>{row.value}</Text>
            </View>
          ))}
        </CompanionSection>
      ) : null}

      {view.notes.length ? (
        <CompanionSection title={view.notesTitle}>
          {view.notes.map((row) => (
            <View key={row.label} style={styles.companionRow}>
              <Text style={styles.ticketMetaLabel}>{row.label}</Text>
              <Text style={styles.companionRowBody}>{row.value}</Text>
            </View>
          ))}
        </CompanionSection>
      ) : null}

      {view.help ? (
        <View style={styles.companionHelp}>
          <Text style={styles.companionRowTitle}>Need help?</Text>
          <Text selectable style={styles.companionRowMeta}>{view.help}</Text>
        </View>
      ) : null}
    </View>
  );
}

function CompanionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.companionSection}>
      <Text style={styles.companionSectionTitle}>{title}</Text>
      <View style={styles.companionCard}>{children}</View>
    </View>
  );
}


const styles = StyleSheet.create({
  ticketMetaLabel: { color: colors.ink4, fontSize: 10, fontWeight: "700" },
  companion: { gap: 18 },
  companionBand: { borderRadius: 8, backgroundColor: colors.accentSoft, padding: 14, gap: 4 },
  companionBandIn: { backgroundColor: colors.successSoft },
  companionBandLabel: { color: colors.accent, fontSize: 11, fontWeight: "800" },
  companionBandLabelIn: { color: colors.success },
  companionHeadline: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  companionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  companionFact: {
    flexBasis: "47%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 4,
  },
  companionFactValue: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  companionSection: { gap: 8 },
  companionSectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  companionCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.surface, paddingHorizontal: 14 },
  companionRow: { paddingVertical: 11, gap: 3, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  companionRowTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  companionRowBody: { color: colors.ink2, fontSize: 13, lineHeight: 19 },
  companionRowMeta: { color: colors.ink3, fontSize: 11 },
  companionProgrammeRow: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  companionTime: { width: 46, color: colors.ink3, fontSize: 13, fontWeight: "700" },
  companionTimeNow: { color: colors.accent },
  companionProgrammeCopy: { flex: 1, gap: 2 },
  companionHelp: { borderWidth: 1, borderStyle: "dashed", borderColor: colors.line2, borderRadius: 8, padding: 14, gap: 3 },
});
