import React from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "@/theme/theme";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{label}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { height: 62, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ focused }) => <TabIcon label="🏠" focused={focused} /> }} />
      <Tabs.Screen name="jobs/index" options={{ title: "Jobs", tabBarIcon: ({ focused }) => <TabIcon label="📁" focused={focused} /> }} />
      <Tabs.Screen name="extras/index" options={{ title: "Extras", tabBarIcon: ({ focused }) => <TabIcon label="🧾" focused={focused} /> }} />
      <Tabs.Screen name="settings/index" options={{ title: "Settings", tabBarIcon: ({ focused }) => <TabIcon label="⚙️" focused={focused} /> }} />
      <Tabs.Screen name="jobs/[id]" options={{ href: null }} />
      <Tabs.Screen name="jobs/new" options={{ href: null }} />
      <Tabs.Screen name="extras/[id]" options={{ href: null }} />
    </Tabs>
  );
}
