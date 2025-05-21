import { ThemeVars } from "@mysten/dapp-kit";

// Light theme copied from dapp-kit
export const oceanTheme: ThemeVars = {
  blurs: {
    modalOverlay: "blur(2px)",
  },
  backgroundColors: {
    primaryButton: "#014f75",
    primaryButtonHover: "#34818f",
    outlineButtonHover: "#34818f",
    modalOverlay: "rgba(24 36 53 / 20%)",
    modalPrimary: "#014f75",
    modalSecondary: "#34818f",
    iconButton: "transparent",
    iconButtonHover: "#34818f",
    dropdownMenu: "#014f75",
    dropdownMenuSeparator: "#34818f",
    walletItemSelected: "white",
    walletItemHover: "#3C424226",
  },
  borderColors: {
    outlineButton: "#E4E4E7",
  },
  colors: {
    primaryButton: "#f3edeb",
    outlineButton: "#f3edeb",
    iconButton: "#f3edeb",
    body: "#f3edeb",
    bodyMuted: "#f3edeb",
    bodyDanger: "#f3edeb",
  },
  radii: {
    small: "12px",
    medium: "12px",
    large: "12px",
    xlarge: "12px",
  },
  shadows: {
    primaryButton: "0px 4px 12px rgba(0, 0, 0, 0.1)",
    walletItemSelected: "0px 2px 6px rgba(0, 0, 0, 0.05)",
  },
  fontWeights: {
    normal: "400",
    medium: "500",
    bold: "600",
  },
  fontSizes: {
    small: "14px",
    medium: "16px",
    large: "18px",
    xlarge: "20px",
  },
  typography: {
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    fontStyle: "medium",
    lineHeight: "1.3",
    letterSpacing: "1",
  },
};
