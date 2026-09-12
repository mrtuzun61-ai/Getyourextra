import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@/theme/theme";
import { Card, MoneyText, StatusBadge, PrimaryButton, ErrorBanner } from "@/components/ui";
import { getCompanyProfile } from "@/db/repositories/companyRepo";
import { getDashboardTotals, listChangeOrders } from "@/db/repositories/changeOrderRepo";
import { relativeDays } from "@/lib/formatters";
import type { ChangeOrderFull, CompanyProfile } from "@/types";

export default function Home() {
  const router = useRouter();
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [totals, setTotals] = useState(() => ({
    outstandingCents: 0,
    pendingApprovalCents: 0,
    paidCents: 0,
    totalExtrasCents: 0,
    needsAttention: [] as ChangeOrderFull[],
  }));
  const [recent, setRecent] = useState<ChangeOrderFull[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    try {
      setCompany(getCompanyProfile());
      setTotals(getDashboardTotals());
      setRecent(listChangeOrders({ status: "all" }).slice(0, 6));
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message ?? "Couldn't load your dashboard. Pull down to try again.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
    setRefreshing(false);
  };

  const currency = company?.currency ?? "USD";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loadError ? <ErrorBanner message={loadError} /> : null}

        <Text style={styles.greeting} numberOfLines={2}>
          {company?.companyName ?? "GetYourExtra"}
        </Text>
        <Text style={styles.tagline}>Extra work. Document it. Approve it. Get paid.</Text>

        <View style={{ marginTop: spacing.lg, marginBottom: spacing.lg }}>
          <PrimaryButton title="+ New Extra" variant="accent" onPress={() => router.push("/new-extra")} />
        </View>

        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Outstanding</Text>
            <MoneyText cents={totals.outstandingCents} currency={currency} color={colors.statusApproved} />
            <Text style={styles.summarySub}>Approved, unpaid</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pending Approval</Text>
            <MoneyText cents={totals.pendingApprovalCents} currency={currency} color={colors.statusSent} />
            <Text style={styles.summarySub}>Sent, awaiting sign-off</Text>
          </Card>
        </View>
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Paid</Text>
            <MoneyText cents={totals.paidCents} currency={currency} color={colors.statusPaid} />
            <Text style={styles.summarySub}>All time</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Extras</Text>
            <MoneyText cents={totals.totalExtrasCents} currency={currency} />
            <Text style={styles.summarySub}>All change orders</Text>
          </Card>
        </View>

        {totals.needsAttention.length > 0 && (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={styles.sectionHeading}>Needs Attention</Text>
            {totals.needsAttention.map((c) => (
              <Pressable key={c.changeOrder.id} onPress={() => router.push(`/(tabs)/extras/${c.changeOrder.id}`)}>
                <Card style={styles.attentionCard}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Text style={styles.coNumber}>{c.changeOrder.number}</Text>
                    <Text style={styles.coSub} numberOfLines={1}>
                      {c.job.name} · {c.changeOrder.status === "sent" ? `Sent ${relativeDays(c.changeOrder.sentAt)}` : "Approved / Unpaid"}
                    </Text>
                  </View>
                  <MoneyText cents={c.totals.totalCents} currency={currency} size="small" />
                </Card>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ marginTop: spacing.lg }}>
          <Text style={styles.sectionHeading}>Recent Extras</Text>
          {recent.length === 0 ? (
            <Card>
              <Text style={{ color: colors.textSecondary }}>
                No extras yet. When work changes outside the original scope, tap + New Extra above.
              </Text>
            </Card>
          ) : (
            recent.map((c) => (
              <Pressable key={c.changeOrder.id} onPress={() => router.push(`/(tabs)/extras/${c.changeOrder.id}`)}>
                <Card style={styles.recentCard}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Text style={styles.coNumber} numberOfLines={1}>
                      {c.changeOrder.number} · {c.job.name}
                    </Text>
                    <Text style={styles.coSub} numberOfLines={1}>
                      {c.changeOrder.title}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <MoneyText cents={c.totals.totalCents} currency={currency} size="small" />
                    <View style={{ marginTop: 4 }}>
                      <StatusBadge status={c.changeOrder.status} />
                    </View>
                  </View>
                </Card>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  greeting: { ...typography.h1, color: colors.textPrimary },
  tagline: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  sectionHeading: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
  summaryRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  summaryCard: { flex: 1 },
  summaryLabel: { ...typography.captionStrong, color: colors.textMuted, marginBottom: 4 },
  summarySub: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  attentionCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm, borderColor: colors.warning },
  recentCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  coNumber: { ...typography.bodyStrong, color: colors.textPrimary },
  coSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
