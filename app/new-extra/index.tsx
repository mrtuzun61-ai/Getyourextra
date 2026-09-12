import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography, radii } from "@/theme/theme";
import { TextField, EmptyState } from "@/components/ui";
import { listJobs, listRecentJobs } from "@/db/repositories/jobRepo";
import { useNewExtra } from "@/state/NewExtraContext";
import type { Job } from "@/types";

export default function ChooseJob() {
  const router = useRouter();
  const { resetDraft, updateDraft } = useNewExtra();
  const [recent, setRecent] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Job[]>([]);

  useEffect(() => {
    resetDraft();
    setRecent(listRecentJobs(5));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setResults(search.trim() ? listJobs({ search: search.trim() }) : []);
  }, [search]);

  const selectJob = (job: Job) => {
    updateDraft({ jobId: job.id });
    router.push("/new-extra/details");
  };

  const jobsToShow = search.trim() ? results : recent;
  const hasAnyJobs = recent.length > 0 || search.trim().length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: spacing.lg }}>
        <Text style={typography.h1}>New Extra</Text>
        <Text style={styles.stepLabel}>Step 1 of 5 · Choose Job</Text>

        <View style={{ marginTop: spacing.md }}>
          <TextField placeholder="Search jobs" value={search} onChangeText={setSearch} />
        </View>

        <Pressable style={styles.newJobRow} onPress={() => router.push("/(tabs)/jobs/new?returnToNewExtra=1")}>
          <Text style={styles.newJobText}>+ Create New Job</Text>
        </Pressable>
      </View>

      {!hasAnyJobs ? (
        <EmptyState
          title="No jobs yet"
          message="Create a job first, then document the extra work."
          actionLabel="Create First Job"
          onAction={() => router.push("/(tabs)/jobs/new?returnToNewExtra=1")}
        />
      ) : jobsToShow.length === 0 ? (
        <EmptyState title="No matching results" message="Try a different search, or create a new job." />
      ) : (
        <FlatList
          data={jobsToShow}
          keyExtractor={(j) => j.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          ListHeaderComponent={!search.trim() ? <Text style={styles.sectionLabel}>Recently used</Text> : null}
          renderItem={({ item }) => (
            <Pressable onPress={() => selectJob(item)} style={styles.jobCard}>
              <Text style={typography.bodyStrong} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.jobSub} numberOfLines={1}>{item.customerName}</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stepLabel: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  newJobRow: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderStyle: "dashed",
    alignItems: "center",
  },
  newJobText: { color: colors.brand, fontWeight: "700" },
  sectionLabel: { ...typography.captionStrong, color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.sm },
  jobCard: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  jobSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
