import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography, radii } from "@/theme/theme";
import { TextField, PrimaryButton, Card, SectionLabel } from "@/components/ui";
import { useNewExtra } from "@/state/NewExtraContext";
import { getChangeOrderFull } from "@/db/repositories/changeOrderRepo";
import { REASON_LABELS } from "@/lib/formatters";
import type { ExtraReason } from "@/types";

const REASONS: ExtraReason[] = [
  "owner_request",
  "gc_instruction",
  "field_condition",
  "design_change",
  "additional_quantity",
  "rework_not_included",
  "other",
];

export default function ExtraDetailsStep() {
  const router = useRouter();
  const params = useLocalSearchParams<{ editId?: string; asRevision?: string }>();
  const { draft, updateDraft } = useNewExtra();
  const [loadedEditId, setLoadedEditId] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | undefined>();

  useEffect(() => {
    if (params.editId && params.editId !== loadedEditId) {
      const full = getChangeOrderFull(params.editId);
      if (!full) {
        Alert.alert("Couldn't load change order", "It may have been removed.");
        router.back();
        return;
      }
      updateDraft({
        editId: full.changeOrder.id,
        asRevision: params.asRevision === "1",
        jobId: full.changeOrder.jobId,
        title: full.changeOrder.title,
        description: full.changeOrder.description,
        requestedByName: full.changeOrder.requestedByName,
        requestedByCompany: full.changeOrder.requestedByCompany,
        requestedByRole: full.changeOrder.requestedByRole ?? "",
        requestedAt: full.changeOrder.requestedAt,
        reason: full.changeOrder.reason,
        siteNotes: full.changeOrder.siteNotes ?? "",
        markupType: full.changeOrder.markupType,
        markupValue: full.changeOrder.markupValue,
        taxEnabled: full.changeOrder.taxEnabled,
        taxLabel: full.changeOrder.taxLabel,
        taxPercentBasisPoints: full.changeOrder.taxPercentBasisPoints,
        discountCents: full.changeOrder.discountCents,
        lineItems: full.lineItems.map((li) => ({
          localId: li.id,
          category: li.category,
          description: li.description,
          quantity: li.quantity,
          unitRateCents: li.unitRateCents,
          amountCents: li.amountCents,
        })),
        photos: full.photos.map((p) => ({ localId: p.id, uri: p.uri, caption: p.caption ?? "", takenAt: p.takenAt })),
      });
      setLoadedEditId(full.changeOrder.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.editId]);

  const handleContinue = () => {
    if (!draft.jobId) {
      Alert.alert("Choose a job first");
      router.replace("/new-extra");
      return;
    }
    if (!draft.title.trim()) {
      setTitleError("Give the extra work a short title.");
      return;
    }
    router.push("/new-extra/pricing");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
          <Text style={typography.h1}>What Changed?</Text>
          <Text style={styles.stepLabel}>Step 2 of 5{draft.editId ? (draft.asRevision ? " · Creating Revision" : " · Editing") : ""}</Text>

          <Card style={{ marginTop: spacing.lg }}>
            <TextField
              label="Extra work title"
              required
              value={draft.title}
              onChangeText={(t) => {
                updateDraft({ title: t });
                if (titleError) setTitleError(undefined);
              }}
              placeholder="Add 6 additional outlets"
              error={titleError}
            />
            <TextField
              label="Description"
              value={draft.description}
              onChangeText={(t) => updateDraft({ description: t })}
              placeholder="GC requested six additional receptacles in the basement family room outside original electrical scope."
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: "top" }}
              hint="Strongly recommended — this appears on the change order PDF."
            />
          </Card>

          <Card style={{ marginTop: spacing.lg }}>
            <SectionLabel>Requested By</SectionLabel>
            <TextField label="Name" value={draft.requestedByName} onChangeText={(t) => updateDraft({ requestedByName: t })} placeholder="John Miller" />
            <TextField label="Company" value={draft.requestedByCompany} onChangeText={(t) => updateDraft({ requestedByCompany: t })} placeholder="ABC General Contracting" />
            <TextField label="Role (optional)" value={draft.requestedByRole} onChangeText={(t) => updateDraft({ requestedByRole: t })} placeholder="Site Superintendent" />
          </Card>

          <Card style={{ marginTop: spacing.lg }}>
            <SectionLabel>Reason</SectionLabel>
            <View style={styles.chipWrap}>
              {REASONS.map((r) => {
                const active = draft.reason === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => updateDraft({ reason: r })}
                    style={[styles.chip, { backgroundColor: active ? colors.brand : colors.surface, borderColor: active ? colors.brand : colors.border }]}
                  >
                    <Text style={{ color: active ? "#fff" : colors.textPrimary, fontWeight: "600", fontSize: 13 }}>{REASON_LABELS[r]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <PrimaryButton title="Continue" onPress={handleContinue} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stepLabel: { ...typography.caption, color: colors.textMuted, marginTop: 4, marginBottom: spacing.sm },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill, borderWidth: 1.5 },
});
