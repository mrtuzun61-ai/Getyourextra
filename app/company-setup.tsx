import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing, typography, radii } from "@/theme/theme";
import { TextField, PrimaryButton, SectionLabel, Card } from "@/components/ui";
import { getCompanyProfile, saveCompanyProfile } from "@/db/repositories/companyRepo";
import type { Currency, MarkupType } from "@/types";
import { percentStringToBasisPoints, basisPointsToPercentString, dollarsToCents, centsToDollars } from "@/lib/money";

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
    <View style={{ flexDirection: "row", gap: 8, marginBottom: spacing.md, flexWrap: "wrap" }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.chip,
              { backgroundColor: active ? colors.brand : colors.surface, borderColor: active ? colors.brand : colors.border },
            ]}
          >
            <Text style={{ color: active ? "#fff" : colors.textPrimary, fontWeight: "600" }}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function CompanySetup() {
  const router = useRouter();
  const params = useLocalSearchParams<{ fromSettings?: string }>();
  const existing = getCompanyProfile();

  const [companyName, setCompanyName] = useState(existing?.companyName ?? "");
  const [logoUri, setLogoUri] = useState<string | null>(existing?.logoUri ?? null);
  const [ownerName, setOwnerName] = useState(existing?.ownerName ?? "");
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
  const [taxPercent, setTaxPercent] = useState(existing ? basisPointsToPercentString(existing.taxPercentBasisPoints) : "0");
  const [labourRate, setLabourRate] = useState(existing ? centsToDollars(existing.defaultLabourRateCents).toString() : "75");
  const [markupType, setMarkupType] = useState<MarkupType>(existing?.defaultMarkupType ?? "percent");
  const [markupValue, setMarkupValue] = useState(
    existing
      ? existing.defaultMarkupType === "percent"
        ? basisPointsToPercentString(existing.defaultMarkupValue)
        : centsToDollars(existing.defaultMarkupValue).toString()
      : "15"
  );
  const [footerNote, setFooterNote] = useState(
    existing?.pdfFooterNote ??
      "This change order documents work outside the original agreed scope. Approval confirms authorization of the work and associated amount shown above."
  );
  const [licenseNumber, setLicenseNumber] = useState(existing?.licenseNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ companyName?: string; ownerName?: string; email?: string; labourRate?: string; markupValue?: string; taxPercent?: string }>({});

  const pickLogo = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Allow photo access in your device settings to add a company logo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        setLogoUri(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert("Couldn't open photo library", e?.message ?? "Please try again.");
    }
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!companyName.trim()) next.companyName = "Company name is required.";
    if (!ownerName.trim()) next.ownerName = "Owner / contact name is required.";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email address.";

    const labour = Number(labourRate);
    if (!Number.isFinite(labour) || labour < 0 || labour > 100000) next.labourRate = "Enter a valid non-negative labour rate.";

    const markup = Number(markupValue);
    if (markupType !== "none" && (!Number.isFinite(markup) || markup < 0)) next.markupValue = "Markup cannot be negative.";
    if (markupType === "percent" && markup > 1000) next.markupValue = "Markup percentage must be 1000% or less.";

    const tax = Number(taxPercent);
    if (taxEnabled && (!Number.isFinite(tax) || tax < 0 || tax > 100)) next.taxPercent = "Tax percentage must be between 0% and 100%.";

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
          markupType === "percent" ? percentStringToBasisPoints(markupValue || "0") : dollarsToCents(markupValue || "0"),
        pdfFooterNote: footerNote.trim(),
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
          <Text style={typography.h1}>Set up your company</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg }}>
            This appears on every change order you generate.
          </Text>

          <Card style={{ marginBottom: spacing.lg }}>
            <SectionLabel>Company</SectionLabel>
            <Pressable onPress={pickLogo} style={styles.logoPicker}>
              <Text style={{ color: colors.brand, fontWeight: "700" }}>
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
            <TextField
              label="Owner / contact name"
              required
              value={ownerName}
              onChangeText={(t) => {
                setOwnerName(t);
                if (errors.ownerName) setErrors((e) => ({ ...e, ownerName: undefined }));
              }}
              placeholder="John Smith"
              error={errors.ownerName}
            />
            <TextField label="Trade / category" value={trade} onChangeText={setTrade} placeholder="Electrical" />
            <TextField label="License / contractor number" value={licenseNumber} onChangeText={setLicenseNumber} placeholder="Optional" />
          </Card>

          <Card style={{ marginBottom: spacing.lg }}>
            <SectionLabel>Contact</SectionLabel>
            <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="(555) 555-0100" />
            <TextField label="Email" value={email} onChangeText={(t) => { setEmail(t); if (errors.email) setErrors((e) => ({ ...e, email: undefined })); }} keyboardType="email-address" autoCapitalize="none" placeholder="john@smithelectrical.com" error={errors.email} />
            <TextField label="Address" value={address} onChangeText={setAddress} placeholder="123 Main St" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <TextField label="City" value={city} onChangeText={setCity} />
              </View>
              <View style={{ width: 90 }}>
                <TextField label="State" value={region} onChangeText={setRegion} />
              </View>
              <View style={{ width: 100 }}>
                <TextField label="ZIP" value={postalCode} onChangeText={setPostalCode} />
              </View>
            </View>
            <TextField label="Country" value={country} onChangeText={setCountry} />
          </Card>

          <Card style={{ marginBottom: spacing.lg }}>
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

          <Card style={{ marginBottom: spacing.lg }}>
            <SectionLabel>Pricing defaults</SectionLabel>
            <TextField label="Default labour rate (per hour)" value={labourRate} onChangeText={(t) => { setLabourRate(t); if (errors.labourRate) setErrors((e) => ({ ...e, labourRate: undefined })); }} keyboardType="decimal-pad" error={errors.labourRate} />
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
                onChangeText={(t) => { setMarkupValue(t); if (errors.markupValue) setErrors((e) => ({ ...e, markupValue: undefined })); }}
                keyboardType="decimal-pad"
                error={errors.markupValue}
              />
            )}
          </Card>

          <Card style={{ marginBottom: spacing.lg }}>
            <SectionLabel>Tax</SectionLabel>
            <ChipRow
              options={[
                { label: "Tax off by default", value: "off" },
                { label: "Tax on by default", value: "on" },
              ]}
              value={taxEnabled ? "on" : "off"}
              onChange={(v) => setTaxEnabled(v === "on")}
            />
            {taxEnabled && (
              <>
                <TextField label="Tax label" value={taxLabel} onChangeText={setTaxLabel} placeholder="HST, GST, Sales Tax, VAT" />
                <TextField label="Tax percent" value={taxPercent} onChangeText={(t) => { setTaxPercent(t); if (errors.taxPercent) setErrors((e) => ({ ...e, taxPercent: undefined })); }} keyboardType="decimal-pad" error={errors.taxPercent} />
              </>
            )}
          </Card>

          <Card style={{ marginBottom: spacing.lg }}>
            <SectionLabel>PDF footer note</SectionLabel>
            <TextField value={footerNote} onChangeText={setFooterNote} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: "top" }} />
          </Card>

          <PrimaryButton title={saving ? "Saving..." : "Save & Continue"} onPress={handleSave} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.pill, borderWidth: 1.5 },
  fieldLabel: { ...typography.captionStrong, color: colors.textSecondary, marginBottom: spacing.xs },
  logoPicker: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
    marginBottom: spacing.md,
  },
});
