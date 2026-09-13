import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { colors, spacing, typography, radii } from "@/theme/theme";
import { TextField, PrimaryButton, SectionLabel, Card } from "@/components/ui";
import { getCompanyProfile, saveCompanyProfile } from "@/db/repositories/companyRepo";
import type { Currency, MarkupType } from "@/types";
import { TRADE_OPTIONS } from "@/lib/trades";
import {
  percentStringToBasisPoints,
  basisPointsToPercentString,
  dollarsToCents,
  centsToDollars,
} from "@/lib/money";

const DEFAULT_FOOTER_NOTE =
  "This change order documents work outside the original agreed scope. Approval confirms authorization of the work and associated amount shown above.";

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.brand : colors.surface,
                borderColor: active ? colors.brand : colors.border,
              },
            ]}
          >
            <Text style={{ color: active ? "#fff" : colors.textPrimary, fontWeight: "600" }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TradePicker({ value, onChange }: { value: string; onChange: (trade: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [...TRADE_OPTIONS];
    return TRADE_OPTIONS.filter((trade) => trade.toLowerCase().includes(normalized));
  }, [query]);

  const exactMatch = TRADE_OPTIONS.some((trade) => trade.toLowerCase() === query.trim().toLowerCase());
  const customValue = query.trim();

  const choose = (trade: string) => {
    onChange(trade);
    setQuery("");
    setVisible(false);
  };

  return (
    <>
      <Text style={styles.fieldLabel}>Trade / specialty</Text>
      <Pressable style={styles.selectField} onPress={() => setVisible(true)}>
        <Text style={[styles.selectText, !value && { color: colors.textMuted }]} numberOfLines={1}>
          {value || "Select your trade or specialty"}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>
      <Text style={styles.helpText}>Search the list or add your own specialty.</Text>

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <SafeAreaView style={styles.modalPage}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={typography.h2}>Choose trade</Text>
              <Text style={styles.modalSub}>Search or enter a custom specialty</Text>
            </View>
            <Pressable onPress={() => setVisible(false)} hitSlop={12}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search electrical, HVAC, concrete..."
            placeholderTextColor={colors.textMuted}
            autoFocus
            style={styles.searchInput}
          />

          {!!customValue && !exactMatch && (
            <Pressable style={styles.customTradeButton} onPress={() => choose(customValue)}>
              <Text style={styles.customTradeText}>Use “{customValue}”</Text>
              <Text style={styles.customTradeSub}>Add as a custom trade</Text>
            </Pressable>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: spacing.xxl }}
            renderItem={({ item }) => (
              <Pressable style={styles.tradeRow} onPress={() => choose(item)}>
                <Text style={styles.tradeRowText}>{item}</Text>
                {item === value ? <Text style={styles.selectedMark}>✓</Text> : null}
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No matching trade. Use the custom option above.</Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

export default function CompanySetup() {
  const router = useRouter();
  const params = useLocalSearchParams<{ fromSettings?: string }>();
  const existing = getCompanyProfile();

  const [companyName, setCompanyName] = useState(existing?.companyName ?? "");
  const [logoUri, setLogoUri] = useState<string | null>(existing?.logoUri ?? null);
  const [ownerName, setOwnerName] = useState(existing?.ownerName ?? "");
  const [userRole, setUserRole] = useState(existing?.userRole ?? "");
  const [trade, setTrade] = useState(existing?.trade ?? "General Contracting");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [city, setCity] = useState(existing?.city ?? "");
  const [region, setRegion] = useState(existing?.region ?? "");
  const [postalCode, setPostalCode] = useState(existing?.postalCode ?? "");
  const [country, setCountry] = useState(existing?.country ?? "United States");
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? "USD");
  const [taxEnabled, setTaxEnabled] = useState(existing?.taxEnabled ?? false);
  const [taxLabel, setTaxLabel] = useState(existing?.taxLabel ?? "Sales Tax");
  const [taxPercent, setTaxPercent] = useState(
    existing ? basisPointsToPercentString(existing.taxPercentBasisPoints) : "0"
  );
  const [labourRate, setLabourRate] = useState(
    existing ? centsToDollars(existing.defaultLabourRateCents).toString() : "75"
  );
  const [markupType, setMarkupType] = useState<MarkupType>(existing?.defaultMarkupType ?? "percent");
  const [markupValue, setMarkupValue] = useState(
    existing
      ? existing.defaultMarkupType === "percent"
        ? basisPointsToPercentString(existing.defaultMarkupValue)
        : centsToDollars(existing.defaultMarkupValue).toString()
      : "15"
  );
  const [licenseNumber, setLicenseNumber] = useState(existing?.licenseNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    companyName?: string;
    ownerName?: string;
    email?: string;
    labourRate?: string;
    markupValue?: string;
    taxPercent?: string;
  }>({});

  const pickLogo = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Allow photo access in your device settings to add a company logo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        try {
          const normalized = await ImageManipulator.manipulateAsync(
            result.assets[0].uri,
            [{ resize: { width: 900 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );
          setLogoUri(normalized.uri);
        } catch {
          setLogoUri(result.assets[0].uri);
        }
      }
    } catch (e: any) {
      Alert.alert("Couldn't open photo library", e?.message ?? "Please try again.");
    }
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!companyName.trim()) next.companyName = "Company name is required.";
    if (!ownerName.trim()) next.ownerName = "Your name is required.";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Enter a valid email address.";
    }

    const labour = Number(labourRate);
    if (!Number.isFinite(labour) || labour < 0 || labour > 100000) {
      next.labourRate = "Enter a valid non-negative labour rate.";
    }

    const markup = Number(markupValue);
    if (markupType !== "none" && (!Number.isFinite(markup) || markup < 0)) {
      next.markupValue = "Markup cannot be negative.";
    }
    if (markupType === "percent" && markup > 1000) {
      next.markupValue = "Markup percentage must be 1000% or less.";
    }

    const tax = Number(taxPercent);
    if (taxEnabled && (!Number.isFinite(tax) || tax < 0 || tax > 100)) {
      next.taxPercent = "Tax percentage must be between 0% and 100%.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    setSaving(true);
    try {
      saveCompanyProfile({
        companyName: companyName.trim(),
        logoUri,
        ownerName: ownerName.trim(),
        userRole: userRole.trim(),
        trade: trade.trim() || "General Contracting",
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        region: region.trim(),
        postalCode: postalCode.trim(),
        country: country.trim(),
        currency,
        taxEnabled,
        taxLabel: taxLabel.trim() || "Tax",
        taxPercentBasisPoints: percentStringToBasisPoints(taxPercent || "0"),
        defaultLabourRateCents: dollarsToCents(labourRate || "0"),
        defaultMarkupType: markupType,
        defaultMarkupValue:
          markupType === "percent"
            ? percentStringToBasisPoints(markupValue || "0")
            : dollarsToCents(markupValue || "0"),
        pdfFooterNote: existing?.pdfFooterNote?.trim() || DEFAULT_FOOTER_NOTE,
        licenseNumber: licenseNumber.trim() || null,
      });

      if (params.fromSettings === "1") {
        router.back();
      } else {
        router.replace("/(tabs)/home");
      }
    } catch (e: any) {
      Alert.alert("Couldn't save company profile", e?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={typography.h1}>{params.fromSettings === "1" ? "Business profile" : "Set up your profile"}</Text>
          <Text style={styles.intro}>These details appear on the change orders you create.</Text>

          <Card style={styles.card}>
            <SectionLabel>Company</SectionLabel>
            <Pressable onPress={pickLogo} style={styles.logoPicker}>
              <Text style={styles.logoPickerText}>
                {logoUri ? "Logo selected — tap to change" : "+ Add company logo (optional)"}
              </Text>
            </Pressable>

            <TextField
              label="Company name"
              required
              value={companyName}
              onChangeText={(t) => {
                setCompanyName(t);
                if (errors.companyName) setErrors((e) => ({ ...e, companyName: undefined }));
              }}
              placeholder="Smith Electrical LLC"
              error={errors.companyName}
            />

            <TradePicker value={trade} onChange={setTrade} />

            <TextField
              label="License / contractor number"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="Optional"
            />
          </Card>

          <Card style={styles.card}>
            <SectionLabel>Your details</SectionLabel>
            <TextField
              label="Your name"
              required
              value={ownerName}
              onChangeText={(t) => {
                setOwnerName(t);
                if (errors.ownerName) setErrors((e) => ({ ...e, ownerName: undefined }));
              }}
              placeholder="John Smith"
              error={errors.ownerName}
            />
            <TextField
              label="Role / position"
              value={userRole}
              onChangeText={setUserRole}
              placeholder="Electrician, Project Manager, Owner..."
            />
          </Card>

          <Card style={styles.card}>
            <SectionLabel>Contact</SectionLabel>
            <TextField
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="(555) 555-0100"
            />
            <TextField
              label="Email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="john@company.com"
              error={errors.email}
            />
            <TextField label="Address" value={address} onChangeText={setAddress} placeholder="123 Main St" />
            <View style={styles.locationRow}>
              <View style={{ flex: 1 }}>
                <TextField label="City" value={city} onChangeText={setCity} />
              </View>
              <View style={{ width: 94 }}>
                <TextField label="State / Prov." value={region} onChangeText={setRegion} />
              </View>
              <View style={{ width: 108 }}>
                <TextField label="ZIP / Postal" value={postalCode} onChangeText={setPostalCode} />
              </View>
            </View>
            <TextField label="Country" value={country} onChangeText={setCountry} />
          </Card>

          <Card style={styles.card}>
            <SectionLabel>Currency</SectionLabel>
            <ChipRow
              options={[
                { label: "USD ($)", value: "USD" as Currency },
                { label: "CAD ($)", value: "CAD" as Currency },
              ]}
              value={currency}
              onChange={setCurrency}
            />
          </Card>

          <Card style={styles.card}>
            <SectionLabel>Pricing defaults</SectionLabel>
            <TextField
              label="Default labour rate (per hour)"
              value={labourRate}
              onChangeText={(t) => {
                setLabourRate(t);
                if (errors.labourRate) setErrors((e) => ({ ...e, labourRate: undefined }));
              }}
              keyboardType="decimal-pad"
              error={errors.labourRate}
            />
            <Text style={styles.fieldLabel}>Default markup</Text>
            <ChipRow
              options={[
                { label: "None", value: "none" as MarkupType },
                { label: "Percent", value: "percent" as MarkupType },
                { label: "Fixed", value: "fixed" as MarkupType },
              ]}
              value={markupType}
              onChange={(v) => {
                setMarkupType(v);
                setMarkupValue(v === "percent" ? "15" : "0");
              }}
            />
            {markupType !== "none" && (
              <TextField
                label={markupType === "percent" ? "Markup %" : "Markup amount"}
                value={markupValue}
                onChangeText={(t) => {
                  setMarkupValue(t);
                  if (errors.markupValue) setErrors((e) => ({ ...e, markupValue: undefined }));
                }}
                keyboardType="decimal-pad"
                error={errors.markupValue}
              />
            )}
          </Card>

          <Card style={styles.card}>
            <SectionLabel>Tax</SectionLabel>
            <ChipRow
              options={[
                { label: "Off by default", value: "off" },
                { label: "On by default", value: "on" },
              ]}
              value={taxEnabled ? "on" : "off"}
              onChange={(v) => setTaxEnabled(v === "on")}
            />
            {taxEnabled && (
              <>
                <TextField
                  label="Tax label"
                  value={taxLabel}
                  onChangeText={setTaxLabel}
                  placeholder="HST, GST, Sales Tax, VAT"
                />
                <TextField
                  label="Tax percent"
                  value={taxPercent}
                  onChangeText={(t) => {
                    setTaxPercent(t);
                    if (errors.taxPercent) setErrors((e) => ({ ...e, taxPercent: undefined }));
                  }}
                  keyboardType="decimal-pad"
                  error={errors.taxPercent}
                />
              </>
            )}
          </Card>

          <PrimaryButton
            title={saving ? "Saving..." : params.fromSettings === "1" ? "Save Changes" : "Save & Continue"}
            onPress={handleSave}
            loading={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  intro: { color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },
  card: { marginBottom: spacing.lg },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md, flexWrap: "wrap" },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.pill, borderWidth: 1.5 },
  fieldLabel: { ...typography.captionStrong, color: colors.textSecondary, marginBottom: spacing.xs },
  helpText: { ...typography.caption, color: colors.textMuted, marginTop: 6, marginBottom: spacing.md },
  logoPicker: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  logoPickerText: { color: colors.brand, fontWeight: "700" },
  selectField: {
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  selectText: { flex: 1, ...typography.body, color: colors.textPrimary },
  chevron: { fontSize: 22, color: colors.textMuted, marginLeft: spacing.sm },
  locationRow: { flexDirection: "row", gap: 8 },
  modalPage: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.md },
  modalSub: { color: colors.textSecondary, marginTop: 3 },
  closeText: { color: colors.brand, fontWeight: "700", padding: spacing.xs },
  searchInput: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  customTradeButton: {
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.brand,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  customTradeText: { fontWeight: "700", color: colors.brand },
  customTradeSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  tradeRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tradeRowText: { flex: 1, ...typography.body, color: colors.textPrimary },
  selectedMark: { color: colors.success, fontSize: 18, fontWeight: "800" },
  emptyText: { color: colors.textMuted, textAlign: "center", paddingVertical: spacing.xl },
});
