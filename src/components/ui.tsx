import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TextInputProps,
  ViewStyle,
} from "react-native";
import { colors, radii, spacing, typography, statusColor } from "@/theme/theme";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@/types";

export function ScreenContainer({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  icon,
  testID,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "accent";
  icon?: React.ReactNode;
  testID?: string;
}) {
  const bg =
    variant === "primary"
      ? colors.brand
      : variant === "accent"
      ? colors.accent
      : variant === "danger"
      ? colors.danger
      : colors.surface;
  const textColor = variant === "secondary" ? colors.brand : "#FFFFFF";
  const borderColor = variant === "secondary" ? colors.brand : "transparent";
  const isDisabled = !!disabled || !!loading;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor, opacity: isDisabled && !loading ? 0.45 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon}
          <Text style={[styles.buttonText, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  required,
  error,
  hint,
  style,
  ...props
}: TextInputProps & { label?: string; required?: boolean; error?: string; hint?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? (
        <Text style={styles.fieldLabel}>
          {label}
          {required ? <Text style={{ color: colors.accent }}> *</Text> : null}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? { borderColor: colors.danger } : null, style]}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : hint ? <Text style={styles.hintText}>{hint}</Text> : null}
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const c = statusColor(status);
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]} numberOfLines={1}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

export function MoneyText({
  cents,
  currency = "USD",
  size = "normal",
  color,
}: {
  cents: number;
  currency?: Currency;
  size?: "normal" | "large" | "small";
  color?: string;
}) {
  const style = size === "large" ? typography.money : size === "small" ? typography.caption : typography.moneySmall;
  return (
    <Text
      style={[style, { color: color ?? colors.textPrimary }]}
      numberOfLines={1}
      adjustsFontSizeToFit={size === "large"}
      minimumFontScale={0.6}
    >
      {formatMoney(cents, currency)}
    </Text>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.md, width: "100%" }}>
          <PrimaryButton title={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

export function InlineLoading({ label }: { label?: string }) {
  return (
    <View style={styles.inlineLoading}>
      <ActivityIndicator color={colors.brand} />
      {label ? <Text style={styles.inlineLoadingText}>{label}</Text> : null}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionLabel: {
    ...typography.captionStrong,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  button: {
    minHeight: 52,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
  },
  buttonText: { ...typography.bodyStrong, fontSize: 16 },
  fieldLabel: { ...typography.captionStrong, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 52,
  },
  errorText: { ...typography.caption, color: colors.danger, marginTop: 4 },
  hintText: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  emptyState: { alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs, textAlign: "center" },
  emptyMessage: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  errorBanner: {
    backgroundColor: colors.dangerBg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorBannerText: { ...typography.body, color: colors.danger },
  inlineLoading: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md },
  inlineLoadingText: { ...typography.body, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
});
