import { Platform } from "react-native";

export const colours = {
  ink: "#151515",
  muted: "#66645f",
  subtle: "#8a8882",
  canvas: "#f5f5f2",
  card: "#ffffff",
  line: "#e4e3de",
  brand: "#c8102e",
  brandSoft: "#f9e9ec",
  success: "#087a2a",
  successSoft: "#e6f4ea",
  warning: "#9a5b00",
  warningSoft: "#fff2d6",
  danger: "#b42318",
  dangerSoft: "#feeceb",
} as const;

export const cardShadow = Platform.select({
  ios: {
    shadowColor: "#111111",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
  },
  android: { elevation: 2 },
  default: { boxShadow: "0 8px 24px rgba(17,17,17,0.06)" },
});

export const screen = {
  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 96,
} as const;
