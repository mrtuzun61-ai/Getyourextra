export const colors = {
  bg: "#F5F6F8",
  surface: "#FFFFFF",
  border: "#E2E5EA",
  textPrimary: "#12161F",
  textSecondary: "#5B6472",
  textMuted: "#8A93A2",

  brand: "#0B4F6C",
  brandDark: "#08394E",
  accent: "#FF6B35",

  success: "#1E8E5A",
  successBg: "#E5F5EC",
  warning: "#B7791F",
  warningBg: "#FCF3DE",
  danger: "#C0392B",
  dangerBg: "#FBEAE8",
  info: "#2E6FBE",
  infoBg: "#E9F1FB",

  statusDraft: "#5B6472",
  statusDraftBg: "#EDEEF1",
  statusSent: "#2E6FBE",
  statusSentBg: "#E9F1FB",
  statusApproved: "#B7791F",
  statusApprovedBg: "#FCF3DE",
  statusPaid: "#1E8E5A",
  statusPaidBg: "#E5F5EC",
  statusDeclined: "#C0392B",
  statusDeclinedBg: "#FBEAE8",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const radii = { sm: 8, md: 12, lg: 16, pill: 999 };

export const typography = {
  display: { fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.5 },
  h1: { fontSize: 24, fontWeight: "700" as const },
  h2: { fontSize: 19, fontWeight: "700" as const },
  h3: { fontSize: 16, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
  captionStrong: { fontSize: 13, fontWeight: "600" as const },
  money: { fontSize: 30, fontWeight: "800" as const, letterSpacing: -0.5 },
  moneySmall: { fontSize: 20, fontWeight: "700" as const },
};

export function statusColor(status: string): { fg: string; bg: string } {
  switch (status) {
    case "draft":
      return { fg: colors.statusDraft, bg: colors.statusDraftBg };
    case "sent":
      return { fg: colors.statusSent, bg: colors.statusSentBg };
    case "approved":
      return { fg: colors.statusApproved, bg: colors.statusApprovedBg };
    case "paid":
      return { fg: colors.statusPaid, bg: colors.statusPaidBg };
    case "declined":
      return { fg: colors.statusDeclined, bg: colors.statusDeclinedBg };
    default:
      return { fg: colors.textSecondary, bg: colors.border };
  }
}
