import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert, Image, Modal } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@/theme/theme";
import { Card, MoneyText, StatusBadge, PrimaryButton, Divider, TextField, ErrorBanner } from "@/components/ui";
import { confirmAction } from "@/lib/confirm";
import {
  getChangeOrderFull,
  updateChangeOrderStatus,
  recordPayment,
} from "@/db/repositories/changeOrderRepo";
import { getCompanyProfile } from "@/db/repositories/companyRepo";
import { generateChangeOrderPdf } from "@/lib/pdf";
import { sharePdf } from "@/lib/share";
import { formatDate, formatDateTime, REASON_LABELS } from "@/lib/formatters";
import type { ChangeOrderFull } from "@/types";

export default function ExtraDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [full, setFull] = useState<ChangeOrderFull | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentNote, setPaymentNote] = useState("");
  const company = getCompanyProfile();

  const load = useCallback(() => {
    if (!id) return;
    try {
      setFull(getChangeOrderFull(id));
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message ?? "Couldn't load this change order.");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loadError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg }}>
        <ErrorBanner message={loadError} />
      </SafeAreaView>
    );
  }

  if (!full || !company) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg }}>
        <Text>This change order could not be found.</Text>
      </SafeAreaView>
    );
  }

  const { changeOrder: co, job, lineItems, photos, approval, payment, totals } = full;
  const currency = company.currency;

  const handleGenerateAndShare = async () => {
    setGenerating(true);
    try {
      const { uri } = await generateChangeOrderPdf(full, company);
      if (co.status === "draft") {
        updateChangeOrderStatus(co.id, "sent");
        load();
      }
      await sharePdf(uri, `${co.number} - ${job.name}`);
    } catch (e: any) {
      Alert.alert("Couldn't generate PDF", e?.message ?? "Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkSent = async () => {
    const confirmed = await confirmAction({
      title: "Mark as Sent?",
      message: `Mark ${co.number} as sent to ${job.gcName || job.customerName || "the customer"}?`,
      confirmLabel: "Mark Sent",
    });
    if (!confirmed) return;
    try {
      updateChangeOrderStatus(co.id, "sent");
      load();
    } catch (e: any) {
      Alert.alert("Couldn't update status", e?.message ?? "Please try again.");
    }
  };

  const handleMarkPaid = () => {
    try {
      recordPayment(co.id, new Date().toISOString(), paymentNote.trim() || null);
      setPaymentModalVisible(false);
      setPaymentNote("");
      load();
    } catch (e: any) {
      Alert.alert("Couldn't record payment", e?.message ?? "Please try again.");
    }
  };

  const handleEdit = async () => {
    if (co.status === "approved" || co.status === "paid") {
      const confirmed = await confirmAction({
        title: "This change order has already been approved.",
        message:
          "Changing scope or pricing may invalidate the existing approval. Create a revision instead to keep the approved record and signature intact.",
        confirmLabel: "Create Revision",
      });
      if (confirmed) {
        router.push(`/new-extra/details?editId=${co.id}&asRevision=1`);
      }
      return;
    }
    if (co.status === "sent") {
      const confirmed = await confirmAction({
        title: "Edit sent change order?",
        message: "This change order has already been sent. If you change pricing or scope, resend the updated PDF so the customer sees the latest version.",
        confirmLabel: "Continue Editing",
      });
      if (!confirmed) return;
    }
    router.push(`/new-extra/details?editId=${co.id}`);
  };

  const handleArchivePrompt = async () => {
    await confirmAction({
      title: "Nothing to archive here",
      message:
        "Individual change orders aren't archived directly — archive the job instead from the Job Detail screen if the whole job is finished.",
      confirmLabel: "OK",
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={typography.h1} numberOfLines={1}>{co.number}</Text>
            <Text style={styles.sub} numberOfLines={1}>{job.name}</Text>
          </View>
          <StatusBadge status={co.status} />
        </View>

        <Card style={{ marginTop: spacing.md, alignItems: "center" }}>
          <Text style={styles.totalLabel}>CHANGE ORDER TOTAL</Text>
          <MoneyText cents={totals.totalCents} currency={currency} size="large" />
        </Card>

        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          {(co.status === "draft" || co.status === "sent") && (
            <PrimaryButton title="Get Approval" variant="accent" onPress={() => router.push(`/new-extra/approval?id=${co.id}`)} />
          )}
          <PrimaryButton
            title={generating ? "Generating..." : "Generate & Share PDF"}
            variant={co.status === "approved" ? "accent" : "primary"}
            onPress={handleGenerateAndShare}
            loading={generating}
          />
          {co.status === "draft" && <PrimaryButton title="Mark Sent" variant="secondary" onPress={handleMarkSent} />}
          {co.status === "approved" && (
            <PrimaryButton title="Mark Paid" variant="primary" onPress={() => setPaymentModalVisible(true)} />
          )}
          <PrimaryButton title="Edit" variant="secondary" onPress={handleEdit} />
        </View>

        <Divider />

        <Text style={typography.h3}>Job & Customer</Text>
        <Card style={{ marginTop: spacing.sm }}>
          <Row label="Job" value={job.name} />
          <Row label="Customer / GC" value={`${job.customerName}${job.gcName ? " · " + job.gcName : ""}`} />
          {!!job.address && <Row label="Project address" value={job.address} />}
        </Card>

        <Text style={[typography.h3, { marginTop: spacing.lg }]}>Extra Work</Text>
        <Card style={{ marginTop: spacing.sm }}>
          <Text style={typography.bodyStrong}>{co.title}</Text>
          <Text style={styles.desc}>{co.description || "No description provided."}</Text>
          {!!co.siteNotes && <Text style={styles.siteNotes}>Notes: {co.siteNotes}</Text>}
          <Divider />
          <Row label="Requested by" value={co.requestedByName || "Not recorded"} />
          {!!co.requestedByCompany && <Row label="Requester company" value={co.requestedByCompany} />}
          <Row label="Date requested" value={formatDate(co.requestedAt)} />
          <Row label="Reason" value={REASON_LABELS[co.reason] ?? co.reason} />
        </Card>

        <Text style={[typography.h3, { marginTop: spacing.lg }]}>Pricing</Text>
        <Card style={{ marginTop: spacing.sm }}>
          {lineItems.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>No line items.</Text>
          ) : (
            lineItems.map((li) => (
              <View key={li.id} style={styles.lineRow}>
                <Text style={styles.lineDesc} numberOfLines={2}>{li.description}</Text>
                <MoneyText cents={li.amountCents} currency={currency} size="small" />
              </View>
            ))
          )}
          <Divider />
          <Row label="Subtotal" value={<MoneyText cents={totals.subtotalCents} currency={currency} size="small" />} />
          {totals.markupCents > 0 && <Row label="Markup" value={<MoneyText cents={totals.markupCents} currency={currency} size="small" />} />}
          {totals.discountCents > 0 && <Row label="Discount" value={<MoneyText cents={-totals.discountCents} currency={currency} size="small" />} />}
          {co.taxEnabled && <Row label={co.taxLabel} value={<MoneyText cents={totals.taxCents} currency={currency} size="small" />} />}
          <Divider />
          <View style={styles.lineRow}>
            <Text style={typography.h3}>TOTAL</Text>
            <MoneyText cents={totals.totalCents} currency={currency} />
          </View>
        </Card>

        <Text style={[typography.h3, { marginTop: spacing.lg }]}>Photos</Text>
        <Card style={{ marginTop: spacing.sm }}>
          {photos.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>No photos attached.</Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {photos.map((p) => (
                <Image key={p.id} source={{ uri: p.uri }} style={styles.photo} onError={() => {}} />
              ))}
            </View>
          )}
        </Card>

        <Text style={[typography.h3, { marginTop: spacing.lg }]}>Activity</Text>
        <Card style={{ marginTop: spacing.sm }}>
          <Row label="Created" value={formatDateTime(co.createdAt)} />
          <Row label="Sent" value={co.sentAt ? formatDateTime(co.sentAt) : "Not sent yet"} />
          <Row label="Approved" value={approval ? formatDateTime(approval.approvedAt) : "Not approved yet"} />
          <Row label="Paid" value={payment ? formatDateTime(payment.paidAt) : "Not paid yet"} />
        </Card>

        <Text style={[typography.h3, { marginTop: spacing.lg }]}>Approval</Text>
        <Card style={{ marginTop: spacing.sm }}>
          {approval ? (
            <>
              <Row label="Approved by" value={`${approval.approverName}${approval.approverCompany ? " · " + approval.approverCompany : ""}`} />
              {!!approval.approverTitle && <Row label="Title" value={approval.approverTitle} />}
              <Image source={{ uri: approval.signatureUri }} style={styles.signature} resizeMode="contain" onError={() => {}} />
            </>
          ) : (
            <Text style={{ color: colors.textSecondary }}>No signature captured yet — this change order shows PENDING APPROVAL on its PDF.</Text>
          )}
        </Card>

        {payment && (
          <>
            <Text style={[typography.h3, { marginTop: spacing.lg }]}>Payment</Text>
            <Card style={{ marginTop: spacing.sm }}>
              <Row label="Paid on" value={formatDate(payment.paymentDate)} />
              {!!payment.note && <Row label="Reference" value={payment.note} />}
            </Card>
          </>
        )}
      </ScrollView>

      <Modal visible={paymentModalVisible} transparent animationType="slide" onRequestClose={() => setPaymentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={typography.h2}>Mark as Paid</Text>
            <Text style={styles.sub}>{co.number} · {job.name}</Text>
            <TextField label="Payment note / reference (optional)" value={paymentNote} onChangeText={setPaymentNote} placeholder="Check #1042" />
            <PrimaryButton title="Confirm Paid" onPress={handleMarkPaid} />
            <View style={{ height: spacing.sm }} />
            <PrimaryButton title="Cancel" variant="secondary" onPress={() => setPaymentModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.lineRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      {typeof value === "string" ? (
        <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  totalLabel: { ...typography.captionStrong, color: colors.textMuted, letterSpacing: 1 },
  desc: { ...typography.body, color: colors.textSecondary, marginTop: 6 },
  siteNotes: { ...typography.caption, color: colors.textMuted, marginTop: 6, fontStyle: "italic" },
  lineRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  lineDesc: { ...typography.body, flex: 1, marginRight: spacing.sm },
  rowLabel: { ...typography.caption, color: colors.textMuted },
  rowValue: { ...typography.bodyStrong, color: colors.textPrimary, flexShrink: 1, textAlign: "right" },
  photo: { width: 96, height: 96, borderRadius: 10 },
  signature: { width: "100%", height: 80, marginTop: spacing.md, backgroundColor: "#fafafa", borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg },
});
