import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import { COLORS, FONTS, SPACING, SHADOWS } from '../constants/theme';

export default function FoodCheckerScreen() {
  const [query, setQuery] = useState('');
  const { user, getRemainingAIQueries } = useUser();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>🍎 Food Safety Checker</Text>
        
        <TextInput
          style={styles.searchInput}
          placeholder="Enter food name (e.g., chocolate, grapes...)"
          value={query}
          onChangeText={setQuery}
          placeholderTextColor={COLORS.textLight}
        />
        
        <TouchableOpacity style={styles.searchButton}>
          <Text style={styles.buttonText}>Check Safety</Text>
        </TouchableOpacity>

        {!user?.isPremium && (
          <View style={styles.usageCard}>
            <Text style={styles.usageText}>
              AI Searches Remaining Today: {getRemainingAIQueries()}/5
            </Text>
          </View>
        )}

        <Text style={styles.note}>
          Note: AI integration will be completed with Firebase Functions.
          This is the frontend UI.
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
  searchInput: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: 16,
    borderRadius: 12,
    fontSize: FONTS.sizes.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.xl,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  buttonText: {
    fontSize: FONTS.sizes.lg,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  usageCard: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: SPACING.xl,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  usageText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  note: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
    paddingHorizontal: SPACING.xl,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
