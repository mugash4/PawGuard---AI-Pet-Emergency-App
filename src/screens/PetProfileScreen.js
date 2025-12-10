import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { COLORS, FONTS, SPACING, SHADOWS } from '../constants/theme';

export default function PetProfileScreen() {
  const { user } = useUser();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>🐕 My Pet Profile</Text>
        
        <View style={styles.profileCard}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="paw" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.profileText}>No profile created yet</Text>
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Add Pet Profile</Text>
          </TouchableOpacity>
        </View>

        {user?.isPremium && (
          <View style={styles.premiumCard}>
            <Ionicons name="star" size={24} color={COLORS.premium} />
            <Text style={styles.premiumTitle}>Premium Member</Text>
            <Text style={styles.premiumText}>
              You have access to all premium features!
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={COLORS.info} />
          <Text style={styles.infoText}>
            Pet profile management will be fully implemented.
            You'll be able to store pet info, vaccinations, and documents.
          </Text>
        </View>
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
  profileCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.xl,
    padding: SPACING.xl,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  profileText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: FONTS.sizes.md,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  premiumCard: {
    backgroundColor: '#FFF9E5',
    marginHorizontal: SPACING.xl,
    padding: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.premium,
  },
  premiumTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  premiumText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: SPACING.xl,
    padding: SPACING.md,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    lineHeight: 20,
  },
});
