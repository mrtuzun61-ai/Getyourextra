import "react-native-get-random-values";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initDatabase } from "@/db/client";
import { hasCompletedCompanySetup } from "@/db/repositories/companyRepo";
import { NewExtraProvider } from "@/state/NewExtraContext";
import { colors, spacing, typography } from "@/theme/theme";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initDatabase();
        if (cancelled) return;
        setNeedsSetup(!hasCompletedCompanySetup());
      } catch (e: any) {
        if (!cancelled) {
          setInitError(
            e?.message ??
              "GetYourExtra couldn't open its local database. Try restarting the app; if this keeps happening, your device may be low on storage."
          );
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || initError) return;
    const inOnboardingFlow = segments[0] === "onboarding" || segments[0] === "company-setup";
    if (needsSetup && !inOnboardingFlow) {
      router.replace("/onboarding");
    }
  }, [ready, initError, needsSetup, segments]);

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (initError) {
    return (
      <View style={[styles.centered, { padding: spacing.lg }]}>
        <Text style={[typography.h2, { textAlign: "center", marginBottom: spacing.sm }]}>
          GetYourExtra couldn't start
        </Text>
        <Text style={{ color: colors.textSecondary, textAlign: "center" }}>{initError}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NewExtraProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </NewExtraProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
});
