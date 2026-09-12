import React, { useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system";
import SignatureScreen, { SignatureViewRef } from "react-native-signature-canvas";
import { colors, spacing, typography } from "@/theme/theme";
import { TextField, PrimaryButton, Card, MoneyText } from "@/components/ui";
import { confirmAction } from "@/lib/confirm";
import { getChangeOrderFull, recordApproval } from "@/db/repositories/changeOrderRepo";
import { getCompanyProfile } from "@/db/repositories/companyRepo";
import { generateChangeOrderPdf } from "@/lib/pdf";
import { sharePdf } from "@/lib/share";

export default function ApprovalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const sigRef = useRef<SignatureViewRef>(null);

  const full = id ? getChangeOrderFull(id) : null;
  const company = getCompanyProfile();

  const [approverName, setApproverName] = useState("");
  const [approverCompany, setApproverCompany] = useState(full?.changeOrder.requestedByCompany ?? "");
  const [approverTitle, setApproverTitle] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [approved, setApproved] = useState(!!full?.approval);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  if (!full || !company) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg }}>
        <Text>Change order not found.</Text>
      </SafeAreaView>
    );
  }

  const { changeOrder: co, job, totals } = full;
  const currency = company.currency;

  const handleClear = () => sigRef.current?.clearSignature();

  const saveApproval = async (b64: string) => {
    setSaving(true);
    try {
      const base64Data = b64.replace(/^data:image\/\w+;base64,/, "");
      const filename = `signature-${co.id}-${Date.now()}.png`;
      const dest = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(dest, base64Data, { encoding: FileSystem.EncodingType.Base64 });

      recordApproval(co.id, {
        approverName: approverName.trim(),
        approverCompany: approverCompany.trim(),
        approverTitle: approverTitle.trim() || null,
        signatureUri: dest,
        approvedAt: new Date().toISOString(),
      });
      setApproved(true);
    } catch (e: any) {
      Alert.alert("Couldn't save approval", e?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignatureCaptured = (b64: string) => {
    saveApproval(b64);
  };

  const handleApprovePress = async () => {
    if (!approverName.trim()) {
      setNameError("Approver name is required.");
      return;
    }
    if (full.approval) {
      const confirmed = await confirmAction({
        title: "Replace existing approval?",
        message: `${co.number} already has a signed approval from ${full.approval.approverName}. Signing again will replace that record. This cannot be undone.`,
        confirmLabel: "Replace Approval",
        destructive: true,
      });
      if (!confirmed) return;
    }
    // Triggers the signature pad to render current strokes to a base64 PNG via onOK.
    sigRef.current?.readSignature();
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const refreshed = getChangeOrderFull(co.id);
      if (!refreshed) throw new Error("Change order not found.");
      const { uri } = await generateChangeOrderPdf(refreshed, company);
      await sharePdf(uri, `${co.number} - ${job.name}`);
    } catch (e: any) {
      Alert.alert("Couldn't generate PDF", e?.message ?? "Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (approved) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: spacing.lg }}>
        <Text style={styles.successCheck}>APPROVED ✓</Text>
        <Text style={styles.successCo}>{co.number}</Text>
        <MoneyText cents={totals.totalCents} currency={currency} size="large" />
        <Text style={styles.successSub}>Approval captured successfully</Text>
        <View style={{ marginTop: spacing.xl, width: "100%", gap: spacing.sm }}>
          <PrimaryButton title={generating ? "Generating..." : "Generate & Share PDF"} variant="accent" onPress={handleGeneratePdf} loading={generating} />
          <PrimaryButton title="Done" variant="secondary" onPress={() => router.replace(`/(tabs)/extras/${co.id}`)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Text style={typography.h1}>Approval</Text>
        <Text style={styles.stepLabel}>Hand the phone to {co.requestedByName || "the approver"}</Text>

        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.brandLine}>GetYourExtra change-order summary</Text>
          <Text style={styles.coNumberLine}>{co.number}</Text>
          <Text style={styles.jobLine} numberOfLines={2}>{job.name}</Text>
          <Text style={styles.extraLine} numberOfLines={2}>{co.title}</Text>
          <View style={{ marginTop: spacing.sm, alignItems: "center" }}>
            <MoneyText cents={totals.totalCents} currency={currency} size="large" />
          </View>
        </Card>

        <Text style={styles.statement}>I acknowledge and approve the additional work and amount shown above.</Text>

        <Card style={{ marginTop: spacing.md }}>
          <TextField
            label="Approver name"
            required
            value={approverName}
            onChangeText={(t) => {
              setApproverName(t);
              if (nameError) setNameError(undefined);
            }}
            placeholder="Full name"
            error={nameError}
          />
          <TextField label="Approver company" value={approverCompany} onChangeText={setApproverCompany} />
          <TextField label="Title (optional)" value={approverTitle} onChangeText={setApproverTitle} placeholder="Site Superintendent" />
        </Card>

        <Text style={[typography.h3, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>Signature</Text>
        <View style={styles.sigWrap}>
          <SignatureScreen
            ref={sigRef}
            onOK={handleSignatureCaptured}
            onEmpty={() => Alert.alert("Signature required", "Please sign to approve this change order.")}
            autoClear={false}
            webStyle={sigWebStyle}
            descriptionText=""
          />
        </View>

        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <PrimaryButton title="Clear Signature" variant="secondary" onPress={handleClear} />
          <PrimaryButton title={saving ? "Saving..." : "Approve Change Order"} variant="accent" onPress={handleApprovePress} loading={saving} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const sigWebStyle = `.m-signature-pad--footer { display: none; margin: 0; }
  .m-signature-pad { box-shadow: none; border: none; margin: 0; }
  body,html { background-color: #F5F6F8; }`;

const styles = StyleSheet.create({
  stepLabel: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  brandLine: { ...typography.captionStrong, color: colors.brand, textAlign: "center" },
  coNumberLine: { ...typography.caption, color: colors.textMuted, textAlign: "center", marginTop: 2 },
  jobLine: { ...typography.bodyStrong, textAlign: "center", marginTop: 6 },
  extraLine: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: 2 },
  statement: { ...typography.body, color: colors.textPrimary, marginTop: spacing.lg, fontStyle: "italic", textAlign: "center" },
  sigWrap: { height: 220, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, overflow: "hidden" },
  successCheck: { fontSize: 26, fontWeight: "800", color: colors.success, marginBottom: spacing.xs },
  successCo: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  successSub: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
});
