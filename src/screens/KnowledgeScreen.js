import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export default function KnowledgeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>📚 Knowledge & Quiz</Text>
        <Text style={styles.description}>
          Educational content and quizzes will be implemented here.
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
  },
});
