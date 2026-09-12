import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@/theme/theme";
import { Card, MoneyText, StatusBadge, PrimaryButton, ErrorBanner } from "@/components/ui";
import { confirmAction } from "@/lib/confirm";
import { getJobById, archiveJob, countOpenChangeOrdersForJob } from "@/db/repositories/jobRepo";
import { listChangeOrders } from "@/db/repositories/changeOrderRepo";
import { getCompanyProfile } from "@/db/repositories/companyRepo";
import { useNewExtra } from "@/state/NewExtraContext";
import type { ChangeOrderFull, Job } from "@/types";

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { resetDraft, updateDraft } = useNewExtra();
  const [job, setJob] = useState<Job | null>(null);
  const [extras, setExtras] = useState<ChangeOrderFull[]>([]);
  const [error, setError] = useState<string | null>(null);
  const company = getCompanyProfile();

  const load = useCallback(() => {
    if (!id) return;
    try {
      setJob(getJobById(id));
      setExtras(listChangeOrders({ jobId: id }));
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't load this job.");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg }}>
        <ErrorBanner message={error} />
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg }}>
        <Text>This job could not be found. It may have been archived or deleted on another device.</Text>
      </SafeAreaView>
    );
  }

  const currency = company?.currency ?? "USD";
  const totalExtras = extras.reduce((a, c) => a + c.totals.totalCents, 0);
  const pending = extras.filter((c) => c.changeOrder.status === "sent").reduce((a, c) => a + c.totals.totalCents, 0);
  const approvedUnpaid = extras.filter((c) => c.changeOrder.status === "approved").reduce((a, c) => a + c.totals.totalCents, 0);
  const paid = extras.filter((c) => c.changeOrder.status === "paid").reduce((a, c) => a + c.totals.totalCents, 0);

  const startNewExtra = () => {
    resetDraft();
    updateDraft({ jobId: job.id });
    router.push("/new-extra/details");
  };

  const handleArchive = async () => {
    const openCount = countOpenChangeOrdersForJob(job.id);
    const message =
      openCount > 0
        ? `This job has ${openCount} change order${openCount === 1 ? "" : "s"} that ${
            openCount === 1 ? "is" : "are"
          } not yet paid. Archiving the job will not affect those change orders, but the job will move out of your active list.`
        : `Archive "${job.name}"? You can still find it later using search or filters.`;
    const confirmed = await confirmAction({
      title: "Archive job?",
      message,
      confirmLabel: "Archive",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      archiveJob(job.id);
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't archive job", e?.message ?? "Please try again.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text style={typography.h1} numberOfLines={3}>{job.name}</Text>
        <Text style={styles.sub} numberOfLines={1}>{job.customerName}</Text>
        {!!job.address && <Text style={styles.sub} numberOfLines={2}>{job.address}</Text>}
        {!!job.contactName && (
          <Text style={styles.sub} numberOfLines={1}>
            {job.contactName}{job.contactPhone ? ` · ${job.contactPhone}` : ""}
          </Text>
        )}

        <View style={{ marginTop: spacing.lg }}>
          <PrimaryButton title="+ New Extra for This Job" variant="accent" onPress={startNewExtra} />
        </View>

        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Extras</Text>
            <MoneyText cents={totalExtras} currency={currency} />
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pending Approval</Text>
            <MoneyText cents={pending} currency={currency} color={colors.statusSent} />
          </Card>
        </View>
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Approved Unpaid</Text>
            <MoneyText cents={approvedUnpaid} currency={currency} color={colors.statusApproved} />
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Paid</Text>
            <MoneyText cents={paid} currency={currency} color={colors.statusPaid} />
          </Card>
        </View>

        <Text style={[typography.h3, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>Change Orders</Text>
        {extras.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textSecondary }}>No change orders for this job yet.</Text>
          </Card>
        ) : (
          extras.map((c) => (
            <Pressable key={c.changeOrder.id} onPress={() => router.push(`/(tabs)/extras/${c.changeOrder.id}`)}>
              <Card style={{ marginBottom: spacing.sm, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={typography.bodyStrong}>{c.changeOrder.number}</Text>
                  <Text style={styles.sub} numberOfLines={1}>{c.changeOrder.title}</Text>
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

        <View style={{ marginTop: spacing.xl }}>
          <PrimaryButton title="Archive Job" variant="secondary" onPress={handleArchive} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  summaryRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  summaryCard: { flex: 1 },
  summaryLabel: { ...typography.captionStrong, color: colors.textMuted, marginBottom: 4 },
});
