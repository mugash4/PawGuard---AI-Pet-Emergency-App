import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export default function EmergencyScreen({ navigation }) {
  // Track navigation for interstitial ads
  useInterstitialAd(navigation);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>🚨 Emergency Help</Text>
        <Text style={styles.description}>
          Step-by-step emergency guides will be here.
          This is a placeholder screen.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: 'bold',
    color: COLORS.text,
    padding: SPACING.xl,
  },
  description: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.xl,
    lineHeight: 24,
  },
});
