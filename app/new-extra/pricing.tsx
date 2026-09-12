import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography, radii } from "@/theme/theme";
import { TextField, PrimaryButton, Card, SectionLabel, MoneyText, Divider } from "@/components/ui";
import { useNewExtra, DraftLineItem } from "@/state/NewExtraContext";
import { getCompanyProfile } from "@/db/repositories/companyRepo";
import { calculateChangeOrderTotals } from "@/lib/calc";
import {
  dollarsToCents,
  centsToDollars,
  multiplyQuantityByRateCents,
  percentStringToBasisPoints,
  basisPointsToPercentString,
} from "@/lib/money";
import type { LineItemCategory, MarkupType } from "@/types";

const CATEGORY_META: { key: LineItemCategory; label: string; unitLabel: string }[] = [
  { key: "labour", label: "Labour", unitLabel: "hrs" },
  { key: "material", label: "Materials", unitLabel: "qty" },
  { key: "equipment", label: "Equipment / Other", unitLabel: "qty" },
  { key: "subcontractor", label: "Subcontractor", unitLabel: "qty" },
];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function PricingStep() {
  const router = useRouter();
  const { draft, updateDraft } = useNewExtra();
  const company = getCompanyProfile();
  const [modalCategory, setModalCategory] = useState<LineItemCategory | null>(null);
  const [editingItem, setEditingItem] = useState<DraftLineItem | null>(null);

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
    [draft.lineItems, draft.markupType, draft.markupValue, draft.taxEnabled, draft.taxPercentBasisPoints, draft.discountCents]
  );

  const currency = company?.currency ?? "USD";

  const removeItem = (localId: string) => updateDraft({ lineItems: draft.lineItems.filter((li) => li.localId !== localId) });

  const saveItem = (item: DraftLineItem) => {
    const exists = draft.lineItems.some((li) => li.localId === item.localId);
    updateDraft({
      lineItems: exists
        ? draft.lineItems.map((li) => (li.localId === item.localId ? item : li))
        : [...draft.lineItems, item],
    });
    setModalCategory(null);
    setEditingItem(null);
  };

  const pricingError =
    draft.markupType === "percent" && (draft.markupValue < 0 || draft.markupValue > 100000)
      ? "Markup percentage must be between 0% and 1000%."
      : draft.markupType === "fixed" && draft.markupValue < 0
        ? "Markup amount cannot be negative."
        : draft.taxEnabled && (draft.taxPercentBasisPoints < 0 || draft.taxPercentBasisPoints > 10000)
          ? "Tax percentage must be between 0% and 100%."
          : draft.discountCents < 0
            ? "Discount cannot be negative."
            : null;

  const canContinue = draft.lineItems.length > 0 && !pricingError;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text style={typography.h1}>Price the Extra</Text>
        <Text style={styles.stepLabel}>Step 3 of 5</Text>

        {CATEGORY_META.map((cat) => {
          const items = draft.lineItems.filter((li) => li.category === cat.key);
          return (
            <Card key={cat.key} style={{ marginTop: spacing.lg }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
                <SectionLabel>{cat.label}</SectionLabel>
                <Pressable onPress={() => { setEditingItem(null); setModalCategory(cat.key); }} hitSlop={8}>
                  <Text style={styles.addLink}>+ Add</Text>
                </Pressable>
              </View>
              {items.length === 0 ? (
                <Text style={styles.emptyItems}>No {cat.label.toLowerCase()} added</Text>
              ) : (
                items.map((li) => (
                  <Pressable key={li.localId} onPress={() => { setEditingItem(li); setModalCategory(li.category); }} style={styles.itemRow}>
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Text style={typography.body} numberOfLines={2}>{li.description}</Text>
                      <Text style={styles.itemSub}>
                        {li.quantity} {cat.unitLabel} × {(li.unitRateCents / 100).toFixed(2)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <MoneyText cents={li.amountCents} currency={currency} size="small" />
                      <Pressable onPress={() => removeItem(li.localId)} hitSlop={10}>
                        <Text style={{ color: colors.danger, fontSize: 18 }}>×</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                ))
              )}
            </Card>
          );
        })}

        <Card style={{ marginTop: spacing.lg }}>
          <SectionLabel>Markup</SectionLabel>
          <View style={styles.chipRow}>
            {(["none", "percent", "fixed"] as MarkupType[]).map((t) => (
              <Pressable key={t} onPress={() => updateDraft({ markupType: t, markupValue: 0 })} style={[styles.chip, draft.markupType === t && styles.chipActive]}>
                <Text style={[styles.chipText, draft.markupType === t && styles.chipTextActive]}>
                  {t === "none" ? "None" : t === "percent" ? "Percent" : "Fixed"}
                </Text>
              </Pressable>
            ))}
          </View>
          {draft.markupType !== "none" && (
            <TextField
              label={draft.markupType === "percent" ? "Markup %" : "Markup amount"}
              keyboardType="decimal-pad"
              value={draft.markupType === "percent" ? basisPointsToPercentString(draft.markupValue) : centsToDollars(draft.markupValue).toString()}
              onChangeText={(t) =>
                updateDraft({ markupValue: draft.markupType === "percent" ? percentStringToBasisPoints(t) : dollarsToCents(t) })
              }
            />
          )}
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <SectionLabel>Tax</SectionLabel>
            <Pressable onPress={() => updateDraft({ taxEnabled: !draft.taxEnabled })}>
              <Text style={[styles.toggle, draft.taxEnabled && styles.toggleOn]}>{draft.taxEnabled ? "ON" : "OFF"}</Text>
            </Pressable>
          </View>
          {draft.taxEnabled && (
            <>
              <TextField label="Tax label" value={draft.taxLabel} onChangeText={(t) => updateDraft({ taxLabel: t })} placeholder="HST, GST, Sales Tax, VAT" />
              <TextField
                label="Tax percent"
                keyboardType="decimal-pad"
                value={basisPointsToPercentString(draft.taxPercentBasisPoints)}
                onChangeText={(t) => updateDraft({ taxPercentBasisPoints: percentStringToBasisPoints(t) })}
              />
            </>
          )}
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <SectionLabel>Discount / Adjustment (optional)</SectionLabel>
          <TextField
            keyboardType="decimal-pad"
            value={centsToDollars(draft.discountCents).toString()}
            onChangeText={(t) => updateDraft({ discountCents: Math.max(0, dollarsToCents(t)) })}
            placeholder="0.00"
            hint="A fixed dollar amount subtracted after markup, before tax."
          />
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <Row label="Labour subtotal" cents={totals.labourSubtotalCents} currency={currency} />
          <Row label="Materials subtotal" cents={totals.materialsSubtotalCents} currency={currency} />
          <Row label="Equipment/Other subtotal" cents={totals.equipmentSubtotalCents} currency={currency} />
          <Row label="Subcontractor subtotal" cents={totals.subcontractorSubtotalCents} currency={currency} />
          <Divider />
          <Row label="Subtotal" cents={totals.subtotalCents} currency={currency} bold />
          {totals.markupCents > 0 && <Row label="Markup" cents={totals.markupCents} currency={currency} />}
          {totals.discountCents > 0 && <Row label="Discount" cents={-totals.discountCents} currency={currency} />}
          {draft.taxEnabled && <Row label={draft.taxLabel} cents={totals.taxCents} currency={currency} />}
          <Divider />
          <View style={styles.totalRow}>
            <Text style={styles.changeOrderTotalLabel}>CHANGE ORDER TOTAL</Text>
            <MoneyText cents={totals.totalCents} currency={currency} size="large" />
          </View>
        </Card>

        <View style={{ marginTop: spacing.lg }}>
          {pricingError ? <Text style={styles.errorText}>{pricingError}</Text> : null}
          <PrimaryButton title="Continue" onPress={() => router.push("/new-extra/proof")} disabled={!canContinue} />
          {draft.lineItems.length === 0 && <Text style={styles.hint}>Add at least one line item to continue.</Text>}
        </View>
      </ScrollView>

      <LineItemModal
        visible={modalCategory !== null}
        category={modalCategory}
        unitLabel={CATEGORY_META.find((c) => c.key === modalCategory)?.unitLabel ?? "qty"}
        initial={editingItem}
        defaultRateCents={modalCategory === "labour" ? company?.defaultLabourRateCents ?? 0 : 0}
        onCancel={() => { setModalCategory(null); setEditingItem(null); }}
        onSave={saveItem}
      />
    </SafeAreaView>
  );
}

function Row({ label, cents, currency, bold }: { label: string; cents: number; currency: any; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={bold ? typography.bodyStrong : styles.summaryLabel}>{label}</Text>
      <MoneyText cents={cents} currency={currency} size="small" />
    </View>
  );
}

function LineItemModal({
  visible,
  category,
  unitLabel,
  initial,
  defaultRateCents,
  onCancel,
  onSave,
}: {
  visible: boolean;
  category: LineItemCategory | null;
  unitLabel: string;
  initial: DraftLineItem | null;
  defaultRateCents: number;
  onCancel: () => void;
  onSave: (item: DraftLineItem) => void;
}) {
  const [description, setDescription] = useState(initial?.description ?? "");
  const [quantity, setQuantity] = useState(initial ? String(initial.quantity) : "1");
  const [rate, setRate] = useState(
    initial ? centsToDollars(initial.unitRateCents).toString() : defaultRateCents ? centsToDollars(defaultRateCents).toString() : ""
  );
  const [error, setError] = useState<string | undefined>();

  React.useEffect(() => {
    if (visible) {
      setDescription(initial?.description ?? "");
      setQuantity(initial ? String(initial.quantity) : "1");
      setRate(initial ? centsToDollars(initial.unitRateCents).toString() : defaultRateCents ? centsToDollars(defaultRateCents).toString() : "");
      setError(undefined);
    }
  }, [visible, initial, defaultRateCents]);

  if (!category) return null;

  const qtyNum = parseFloat(quantity);
  const rateCents = dollarsToCents(rate || "0");
  const validQty = Number.isFinite(qtyNum) && qtyNum > 0;
  const amountCents = validQty ? multiplyQuantityByRateCents(qtyNum, rateCents) : 0;

  const handleSave = () => {
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    if (!validQty) {
      setError(unitLabel === "hrs" ? "Enter a valid number of hours greater than zero." : "Enter a valid quantity greater than zero.");
      return;
    }
    if (rateCents < 0) {
      setError("Rate cannot be negative.");
      return;
    }
    onSave({
      localId: initial?.localId ?? uid(),
      category,
      description: description.trim(),
      quantity: qtyNum,
      unitRateCents: rateCents,
      amountCents,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={typography.h2}>{initial ? "Edit Item" : "Add Item"}</Text>
          <TextField label="Description" required value={description} onChangeText={setDescription} placeholder="Journeyman Electrician" />
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField label={unitLabel === "hrs" ? "Hours" : "Quantity"} keyboardType="decimal-pad" value={quantity} onChangeText={setQuantity} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Rate ($)" keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
            </View>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Text style={styles.previewAmount}>Amount: {(amountCents / 100).toFixed(2)}</Text>
          <PrimaryButton title="Save Item" onPress={handleSave} />
          <View style={{ height: spacing.sm }} />
          <PrimaryButton title="Cancel" variant="secondary" onPress={onCancel} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  stepLabel: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  addLink: { color: colors.brand, fontWeight: "700" },
  emptyItems: { ...typography.caption, color: colors.textMuted },
  itemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  itemSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textPrimary, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  toggle: { fontWeight: "800", color: colors.textMuted, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  toggleOn: { color: "#fff", backgroundColor: colors.brand, borderColor: colors.brand },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  summaryLabel: { ...typography.caption, color: colors.textSecondary },
  totalRow: { alignItems: "center", paddingTop: spacing.sm },
  changeOrderTotalLabel: { ...typography.captionStrong, color: colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg },
  previewAmount: { ...typography.bodyStrong, marginBottom: spacing.md, color: colors.brand },
  errorText: { ...typography.caption, color: colors.danger, marginBottom: spacing.sm },
});
