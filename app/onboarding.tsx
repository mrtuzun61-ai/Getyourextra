import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@/theme/theme";
import { PrimaryButton } from "@/components/ui";

const { width } = Dimensions.get("window");

const SLIDES = [
  { title: "Extra work shouldn't\nbecome free work.", emoji: "🧾" },
  { title: "Document it.\nPrice it.\nGet approval.", emoji: "✅" },
  { title: "Get paid for\nevery extra.", emoji: "💰" },
];

export default function Onboarding() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const isLast = index === SLIDES.length - 1;

  const goNext = () => {
    if (isLast) {
      router.replace("/company-setup");
      return;
    }

    const nextIndex = Math.min(index + 1, SLIDES.length - 1);
    setIndex(nextIndex);
    listRef.current?.scrollToOffset({ offset: nextIndex * width, animated: true });
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(Math.max(0, Math.min(newIndex, SLIDES.length - 1)));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.replace("/company-setup")} hitSlop={12}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.slideTitle}>{item.title}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title={isLast ? "Set Up My Company" : "Next"}
          onPress={goNext}
          variant="primary"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brandDark },
  topBar: { alignItems: "flex-end", paddingHorizontal: spacing.lg },
  skip: { color: "#C7D4DC", fontSize: 15, fontWeight: "600", padding: spacing.sm },
  slide: { alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  emoji: { fontSize: 64, marginBottom: spacing.lg },
  slideTitle: { ...typography.display, color: "#FFFFFF", textAlign: "center", lineHeight: 40 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.3)" },
  dotActive: { backgroundColor: "#FFFFFF", width: 20 },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
