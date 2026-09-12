import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography, radii } from "@/theme/theme";
import { TextField, EmptyState, Card, MoneyText, StatusBadge, ErrorBanner } from "@/components/ui";
import { listChangeOrders, ChangeOrderListFilters } from "@/db/repositories/changeOrderRepo";
import { getCompanyProfile } from "@/db/repositories/companyRepo";
import type { ChangeOrderFull } from "@/types";

const FILTERS: { label: string; value: ChangeOrderListFilters["status"] }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Approved", value: "approved" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Paid", value: "paid" },
];

const SORTS: { label: string; value: NonNullable<ChangeOrderListFilters["sort"]> }[] = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Highest $", value: "highest" },
  { label: "Lowest $", value: "lowest" },
];

export default function ExtrasList() {
  const router = useRouter();
  const [items, setItems] = useState<ChangeOrderFull[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ChangeOrderListFilters["status"]>("all");
  const [sort, setSort] = useState<NonNullable<ChangeOrderListFilters["sort"]>>("newest");
  const [error, setError] = useState<string | null>(null);
  const company = getCompanyProfile();

  const load = useCallback((s: string, st: typeof status, so: typeof sort) => {
    try {
      setItems(listChangeOrders({ search: s || undefined, status: st, sort: so }));
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't load extras.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(search, status, sort);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, sort])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Text style={typography.h1}>Extras</Text>
        {error ? <ErrorBanner message={error} /> : null}
        <TextField
          placeholder="Search job, customer, CO#"
          value={search}
          onChangeText={(t) => {
            setSearch(t);
            load(t, status, sort);
          }}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable key={f.label} onPress={() => setStatus(f.value)} style={[styles.chip, status === f.value && styles.chipActive]}>
            <Text style={[styles.chipText, status === f.value && styles.chipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {SORTS.map((s) => (
          <Pressable key={s.value} onPress={() => setSort(s.value)} style={[styles.sortChip, sort === s.value && styles.sortChipActive]}>
            <Text style={[styles.sortChipText, sort === s.value && styles.sortChipTextActive]}>{s.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {items.length === 0 ? (
        <EmptyState
          title="No extras yet"
          message="When work changes outside the original scope, document it here before doing the work."
          actionLabel="+ New Extra"
          onAction={() => router.push("/new-extra")}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.changeOrder.id}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm }}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(tabs)/extras/${item.changeOrder.id}`)}>
              <Card style={styles.card}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={typography.bodyStrong} numberOfLines={1}>{item.changeOrder.number}</Text>
                  <Text style={styles.jobName} numberOfLines={1}>{item.job.name}</Text>
                  <Text style={styles.desc} numberOfLines={1}>{item.changeOrder.title}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <MoneyText cents={item.totals.totalCents} currency={company?.currency ?? "USD"} size="small" />
                  <View style={{ marginTop: 6 }}>
                    <StatusBadge status={item.changeOrder.status} />
                  </View>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  filterRow: { paddingHorizontal: spacing.lg, gap: 8, paddingBottom: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textPrimary, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: "transparent" },
  sortChipActive: { backgroundColor: colors.infoBg },
  sortChipText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  sortChipTextActive: { color: colors.info },
  card: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  jobName: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  desc: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
});
