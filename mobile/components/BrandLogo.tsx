import { Image, type ImageStyle, StyleSheet, useWindowDimensions } from "react-native";

const darkLogo = require("@/assets/haccora-wordmark.png");
const lightLogo = require("@/assets/haccora-wordmark-light.png");
const ASPECT_RATIO = 720 / 168;

type BrandLogoProps = {
  maxWidth?: number;
  minWidth?: number;
  light?: boolean;
  style?: ImageStyle;
};

/** Canonical native Haccora wordmark, clamped to the phone or tablet viewport. */
export function BrandLogo({
  maxWidth = 220,
  minWidth = 112,
  light = false,
  style,
}: BrandLogoProps) {
  const { width } = useWindowDimensions();
  const logoWidth = Math.max(minWidth, Math.min(maxWidth, width - 48));

  return (
    <Image
      accessibilityLabel="Haccora — Safe. Clean. Traceable."
      resizeMode="contain"
      source={light ? lightLogo : darkLogo}
      style={[styles.image, { width: logoWidth, height: logoWidth / ASPECT_RATIO }, style]}
    />
  );
}

const styles = StyleSheet.create({ image: { flexShrink: 1 } });
