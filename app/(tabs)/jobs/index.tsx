import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@/theme/theme";
import { TextField, EmptyState, Card, ErrorBanner } from "@/components/ui";
import { listJobs } from "@/db/repositories/jobRepo";
import type { Job } from "@/types";

export default function JobsList() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((q: string) => {
    try {
      setJobs(listJobs({ search: q || undefined }));
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't load jobs.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(search);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={styles.header}>
        <Text style={typography.h1}>Jobs</Text>
        <Pressable onPress={() => router.push("/(tabs)/jobs/new")} style={styles.addBtn} hitSlop={8}>
          <Text style={styles.addBtnText}>+ New Job</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        {error ? <ErrorBanner message={error} /> : null}
        <TextField
          placeholder="Search jobs, customers, GCs"
          value={search}
          onChangeText={(t) => {
            setSearch(t);
            load(t);
          }}
        />
      </View>

      {jobs.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          message="Create a job so you can document extra work."
          actionLabel="Create First Job"
          onAction={() => router.push("/(tabs)/jobs/new")}
        />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(j) => j.id}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(tabs)/jobs/${item.id}`)}>
              <Card style={{ marginBottom: spacing.sm }}>
                <Text style={typography.bodyStrong} numberOfLines={2}>
                  {item.name} {item.isSample ? "· Sample" : ""}
                </Text>
                <Text style={styles.jobSub} numberOfLines={1}>{item.customerName}</Text>
                {!!item.address && (
                  <Text style={styles.jobSub} numberOfLines={1}>
                    {item.address}
                  </Text>
                )}
              </Card>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  addBtn: { backgroundColor: colors.brand, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  jobSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
