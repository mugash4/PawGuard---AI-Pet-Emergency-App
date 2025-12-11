import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '../constants/theme';

export default function UpgradePrompt({ message, feature, navigation }) {
  const { user } = useUser();

  // Don't show for premium users
  if (user?.isPremium) {
    return null;
  }

  // Handle navigation safely
  const handleUpgradePress = () => {
    if (navigation && navigation.navigate) {
      navigation.navigate('Subscription');
    } else {
      console.warn('Navigation not available in UpgradePrompt');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={28} color={COLORS.primary} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Upgrade to Premium</Text>
          <Text style={styles.message}>
            {message || `Unlock ${feature || 'this feature'} and more with Premium`}
          </Text>
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.benefitText}>Unlimited AI Checks</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.benefitText}>No Ads</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.benefitText}>Advanced Features</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={handleUpgradePress}
        >
          <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.pricing}>
        <Text style={styles.pricingText}>
          Starting at <Text style={styles.pricingAmount}>$4.99/month</Text> or{' '}
          <Text style={styles.pricingAmount}>$39.99/year</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOWS.medium,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  content: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  message: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  benefitsContainer: {
    gap: SPACING.xs,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  benefitText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  upgradeButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    ...SHADOWS.small,
  },
  upgradeButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pricing: {
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  pricingText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  pricingAmount: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});
