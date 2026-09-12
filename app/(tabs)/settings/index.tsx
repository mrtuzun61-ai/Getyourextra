import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system";
import { colors, spacing, typography } from "@/theme/theme";
import { Card, SectionLabel } from "@/components/ui";
import { getCompanyProfile } from "@/db/repositories/companyRepo";
import { formatMoney } from "@/lib/money";

function SettingsRow({ label, onPress, value }: { label: string; onPress?: () => void; value?: string }) {
  return (
    <Pressable onPress={onPress} style={styles.row} disabled={!onPress}>
      <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
        {value ? (
          <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
        ) : null}
        {onPress ? <Text style={styles.chevron}>›</Text> : null}
      </View>
    </Pressable>
  );
}

export default function Settings() {
  const router = useRouter();
  const company = getCompanyProfile();

  const handleExportInfo = () => {
    Alert.alert(
      "Local data only",
      "GetYourExtra stores everything on this device only. There is no cloud backup or sync in V1 — if you uninstall the app or lose this device, your jobs and change orders are not recoverable elsewhere. Export/backup to a file is not available in this version."
    );
  };

  const handleStorageInfo = () => {
    const dir = FileSystem.documentDirectory ?? "app documents folder";
    Alert.alert(
      "Where your data lives",
      `Company, job, and change order records are stored in a local SQLite database on this device. Photos, signatures, and generated PDFs are stored as files in the app's private documents folder:\n\n${dir}\n\nNone of this is uploaded anywhere unless you explicitly use Share.`
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text style={typography.h1}>Settings</Text>

        <View style={{ height: spacing.lg }} />
        <SectionLabel>Company</SectionLabel>
        <Card>
          <SettingsRow label="Company profile" value={company?.companyName ?? "Not set up"} onPress={() => router.push("/company-setup?fromSettings=1")} />
          <SettingsRow label="License / contractor #" value={company?.licenseNumber ?? "Not set"} onPress={() => router.push("/company-setup?fromSettings=1")} />
        </Card>

        <View style={{ height: spacing.lg }} />
        <SectionLabel>Pricing Defaults</SectionLabel>
        <Card>
          <SettingsRow label="Currency" value={company?.currency ?? "USD"} onPress={() => router.push("/company-setup?fromSettings=1")} />
          <SettingsRow
            label="Default labour rate"
            value={company ? formatMoney(company.defaultLabourRateCents, company.currency) + "/hr" : "Not set"}
            onPress={() => router.push("/company-setup?fromSettings=1")}
          />
          <SettingsRow
            label="Default markup"
            value={
              company
                ? company.defaultMarkupType === "none"
                  ? "None"
                  : company.defaultMarkupType === "percent"
                  ? `${(company.defaultMarkupValue / 100).toFixed(2)}%`
                  : formatMoney(company.defaultMarkupValue, company.currency)
                : "Not set"
            }
            onPress={() => router.push("/company-setup?fromSettings=1")}
          />
          <SettingsRow
            label="Default tax"
            value={company ? (company.taxEnabled ? `${company.taxLabel} · ${(company.taxPercentBasisPoints / 100).toFixed(2)}%` : "Off") : "Not set"}
            onPress={() => router.push("/company-setup?fromSettings=1")}
          />
        </Card>

        <View style={{ height: spacing.lg }} />
        <SectionLabel>Documents</SectionLabel>
        <Card>
          <SettingsRow label="PDF footer note" value="Edit" onPress={() => router.push("/company-setup?fromSettings=1")} />
        </Card>

        <View style={{ height: spacing.lg }} />
        <SectionLabel>Data</SectionLabel>
        <Card>
          <SettingsRow label="Where is my data stored?" onPress={handleStorageInfo} />
          <SettingsRow label="Backup / export" value="Not available in V1" onPress={handleExportInfo} />
        </Card>

        <View style={{ height: spacing.lg }} />
        <SectionLabel>About</SectionLabel>
        <Card>
          <SettingsRow label="App" value="GetYourExtra" />
          <SettingsRow label="Version" value={Constants.expoConfig?.version ?? "1.0.0"} />
          <SettingsRow label="Privacy" value="Local-only storage" onPress={handleStorageInfo} />
        </Card>

        <Text style={styles.footerNote}>
          GetYourExtra stores your company, job, and change order data locally on this device. No customer or
          project data is sent anywhere unless you explicitly share a PDF.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowLabel: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  rowValue: { ...typography.caption, color: colors.textMuted, maxWidth: 180 },
  chevron: { fontSize: 18, color: colors.textMuted },
  footerNote: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg, textAlign: "center" },
});
