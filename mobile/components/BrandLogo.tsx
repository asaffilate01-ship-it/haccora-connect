import { Image, type ImageStyle, StyleSheet, useWindowDimensions } from "react-native";

const darkLogo = require("@/assets/haccora-wordmark.png");
const lightLogo = require("@/assets/haccora-wordmark-light.png");
const ASPECT_RATIO = 720 / 208;

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
  const logoWidth = Math.min(Math.max(1, width - 48), Math.max(minWidth, maxWidth));

  return (
    <Image
      accessibilityLabel="Haccora — Safe. Clean. Compliant."
      resizeMode="contain"
      source={light ? lightLogo : darkLogo}
      style={[styles.image, { width: logoWidth, height: logoWidth / ASPECT_RATIO }, style]}
    />
  );
}

const styles = StyleSheet.create({ image: { flexShrink: 1 } });
