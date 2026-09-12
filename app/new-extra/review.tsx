import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Image, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@/theme/theme";
import { Card, PrimaryButton, MoneyText, Divider, StatusBadge } from "@/components/ui";
import { useNewExtra } from "@/state/NewExtraContext";
import { getCompanyProfile } from "@/db/repositories/companyRepo";
import { getJobById } from "@/db/repositories/jobRepo";
import { calculateChangeOrderTotals } from "@/lib/calc";
import {
  createChangeOrder,
  updateChangeOrder,
  createRevision,
  wouldChangeApprovedPricing,
  getChangeOrderFull,
  updateChangeOrderStatus,
} from "@/db/repositories/changeOrderRepo";
import { generateChangeOrderPdf } from "@/lib/pdf";
import { sharePdf } from "@/lib/share";
import { REASON_LABELS } from "@/lib/formatters";
import type { ChangeOrderStatus } from "@/types";

export default function ReviewStep() {
  const router = useRouter();
  const { draft, resetDraft } = useNewExtra();
  const company = getCompanyProfile();
  const job = draft.jobId ? getJobById(draft.jobId) : null;
  const [saving, setSaving] = useState(false);

  const totals = useMemo(
    () =>
      calculateChangeOrderTotals(
        {
          markupType: draft.markupType,
          markupValue: draft.markupValue,
          taxEnabled: draft.taxEnabled,
          taxPercentBasisPoints: draft.taxPercentBasisPoints,
          discountCents: draft.discountCents,
        },
        draft.lineItems.map((li) => ({
          id: li.localId,
          changeOrderId: "",
          category: li.category,
          description: li.description,
          quantity: li.quantity,
          unitRateCents: li.unitRateCents,
          amountCents: li.amountCents,
          sortOrder: 0,
        }))
      ),
    [draft]
  );

  if (!job || !company) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg }}>
        <Text>Missing job or company info. Please restart the New Extra flow from the Jobs or Home tab.</Text>
      </SafeAreaView>
    );
  }

  const currency = company.currency;

  const buildInput = () => ({
    jobId: job.id,
    title: draft.title.trim(),
    description: draft.description.trim(),
    requestedByName: draft.requestedByName.trim(),
    requestedByCompany: draft.requestedByCompany.trim(),
    requestedByRole: draft.requestedByRole.trim() || null,
    requestedAt: draft.requestedAt,
    reason: draft.reason,
    siteNotes: draft.siteNotes.trim() || null,
    markupType: draft.markupType,
    markupValue: draft.markupValue,
    taxEnabled: draft.taxEnabled,
    taxLabel: draft.taxLabel.trim() || "Tax",
    taxPercentBasisPoints: draft.taxPercentBasisPoints,
    discountCents: draft.discountCents,
    lineItems: draft.lineItems.map((li) => ({
      category: li.category,
      description: li.description,
      quantity: li.quantity,
      unitRateCents: li.unitRateCents,
      amountCents: li.amountCents,
    })),
    photos: draft.photos.map((p) => ({ uri: p.uri, caption: p.caption.trim() || null, takenAt: p.takenAt })),
  });

  /** Persists the draft (create, in-place update, or revision) and returns the resulting change order id. */
  const persist = (status: ChangeOrderStatus): string | null => {
    const input = buildInput();

    if (draft.editId) {
      const existingFull = getChangeOrderFull(draft.editId);
      if (!existingFull) {
        Alert.alert("Couldn't find the original change order");
        return null;
      }

      if (draft.asRevision) {
        const revision = createRevision(draft.editId, input);
        if (status !== "draft") updateChangeOrderStatus(revision.id, status);
        return revision.id;
      }

      const wouldChange = wouldChangeApprovedPricing(existingFull, input);
      if (wouldChange && (existingFull.changeOrder.status === "approved" || existingFull.changeOrder.status === "paid")) {
        const revision = createRevision(draft.editId, input);
        if (status !== "draft") updateChangeOrderStatus(revision.id, status);
        return revision.id;
      }

      updateChangeOrder(draft.editId, input);
      if (status !== existingFull.changeOrder.status) updateChangeOrderStatus(draft.editId, status);
      return draft.editId;
    }

    const created = createChangeOrder(input, { status });
    return created.id;
  };

  const handleSaveDraft = () => {
    setSaving(true);
    try {
      const id = persist("draft");
      if (!id) return;
      resetDraft();
      router.replace(`/(tabs)/extras/${id}`);
    } catch (e: any) {
      Alert.alert("Couldn't save draft", e?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAndShare = async () => {
    setSaving(true);
    try {
      const id = persist("sent");
      if (!id) return;
      const full = getChangeOrderFull(id);
      if (!full) throw new Error("The change order was not saved correctly.");
      const { uri } = await generateChangeOrderPdf(full, company);
      resetDraft();
      router.replace(`/(tabs)/extras/${id}`);
      await sharePdf(uri, `${full.changeOrder.number} - ${job.name}`);
    } catch (e: any) {
      Alert.alert(
        "Couldn't generate PDF",
        e?.message ?? "The change order was saved as a draft — you can try generating the PDF again from its detail screen."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleGetApprovalNow = () => {
    setSaving(true);
    try {
      const id = persist("draft");
      if (!id) return;
      resetDraft();
      router.replace(`/new-extra/approval?id=${id}`);
    } catch (e: any) {
      Alert.alert("Couldn't continue to approval", e?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text style={typography.h1}>Review</Text>
        <Text style={styles.stepLabel}>Step 5 of 5</Text>

        <Card style={{ marginTop: spacing.lg }}>
          <Row label="Job" value={job.name} />
          <Row label="Customer / GC" value={`${job.customerName}${job.gcName ? " · " + job.gcName : ""}`} />
          <Row label="Requested by" value={draft.requestedByName || "Not recorded"} />
          <Row label="Reason" value={REASON_LABELS[draft.reason] ?? draft.reason} />
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={typography.bodyStrong}>{draft.title}</Text>
          <Text style={styles.desc}>{draft.description || "No description provided."}</Text>
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          {draft.lineItems.map((li) => (
            <View key={li.localId} style={styles.lineRow}>
              <Text style={styles.lineDesc} numberOfLines={1}>{li.description}</Text>
              <MoneyText cents={li.amountCents} currency={currency} size="small" />
            </View>
          ))}
          <Divider />
          <Row label="Subtotal" value={<MoneyText cents={totals.subtotalCents} currency={currency} size="small" />} />
          {totals.markupCents > 0 && <Row label="Markup" value={<MoneyText cents={totals.markupCents} currency={currency} size="small" />} />}
          {totals.discountCents > 0 && <Row label="Discount" value={<MoneyText cents={-totals.discountCents} currency={currency} size="small" />} />}
          {draft.taxEnabled && <Row label={draft.taxLabel} value={<MoneyText cents={totals.taxCents} currency={currency} size="small" />} />}
        </Card>

        {draft.photos.length > 0 && (
          <Card style={{ marginTop: spacing.md, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {draft.photos.map((p) => (
              <Image key={p.localId} source={{ uri: p.uri }} style={styles.photo} onError={() => {}} />
            ))}
          </Card>
        )}

        <Card style={{ marginTop: spacing.md, alignItems: "center" }}>
          <Text style={styles.totalLabel}>CHANGE ORDER TOTAL</Text>
          <MoneyText cents={totals.totalCents} currency={currency} size="large" />
          <View style={{ marginTop: 6 }}>
            <StatusBadge status="draft" />
          </View>
        </Card>

        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <PrimaryButton title="Get Approval Now" variant="accent" onPress={handleGetApprovalNow} loading={saving} />
          <PrimaryButton title="Generate & Share" variant="primary" onPress={handleGenerateAndShare} loading={saving} />
          <PrimaryButton title="Save Draft" variant="secondary" onPress={handleSaveDraft} loading={saving} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.lineRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      {typeof value === "string" ? <Text style={styles.rowValue} numberOfLines={2}>{value}</Text> : value}
    </View>
  );
}

const styles = StyleSheet.create({
  stepLabel: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  desc: { ...typography.body, color: colors.textSecondary, marginTop: 6 },
  lineRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  lineDesc: { ...typography.body, flex: 1, marginRight: spacing.sm },
  rowLabel: { ...typography.caption, color: colors.textMuted },
  rowValue: { ...typography.bodyStrong, color: colors.textPrimary, textAlign: "right", flexShrink: 1 },
  photo: { width: 72, height: 72, borderRadius: 10 },
  totalLabel: { ...typography.captionStrong, color: colors.textMuted, letterSpacing: 1 },
});
