import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { COLORS, FONTS, SPACING, SHADOWS } from '../constants/theme';

const PLANS = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$4.99',
    period: '/month',
    description: 'Cancel anytime',
    priceValue: 4.99,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$39.99',
    period: '/year',
    description: 'SAVE 33% → $3.33/month',
    badge: 'Best Choice - Save 33%',
    recommended: true,
    priceValue: 39.99,
  },
];

export default function SubscriptionScreen({ navigation }) {
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const { upgradeToPremium } = useUser();

  const handleSubscribe = async () => {
    // TODO: Implement actual in-app purchase logic
    Alert.alert(
      'Demo Mode',
      'In production, this would process the payment. For now, granting premium access!',
      [
        {
          text: 'OK',
          onPress: async () => {
            await upgradeToPremium(selectedPlan);
            await completeOnboarding();
            navigation.replace('Main');
          },
        },
      ]
    );
  };

  const handleContinueFree = async () => {
    await completeOnboarding();
    navigation.replace('Main');
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
  };

  const handleClose = () => {
    handleContinueFree();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={28} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.proBadge}>
            <Text style={styles.proText}>PRO</Text>
          </View>
          <Text style={styles.title}>Unlock Your Pet's{'\n'}Full Protection 🛡️</Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          {[
            'Unlimited AI Food Checker',
            '24/7 AI Emergency Assistant',
            'Advanced First Aid (100+ guides)',
            'Smart Health Reminders',
            'Multi-Pet Profiles',
            'Offline Mode (Full Database)',
            'No Ads',
            'Priority Support',
          ].map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              {plan.recommended && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>{plan.badge}</Text>
                </View>
              )}
              
              <View style={styles.planHeader}>
                <View style={styles.radioButton}>
                  {selectedPlan === plan.id && <View style={styles.radioButtonSelected} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  {plan.recommended && (
                    <Text style={styles.planDescription}>{plan.description}</Text>
                  )}
                </View>
                <View style={styles.planPrice}>
                  <Text style={styles.priceAmount}>{plan.price}</Text>
                  <Text style={styles.pricePeriod}>{plan.period}</Text>
                </View>
              </View>
              
              {!plan.recommended && (
                <Text style={styles.planDescriptionBottom}>{plan.description}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Trial Button */}
        <TouchableOpacity style={styles.trialButton} onPress={handleSubscribe}>
          <Text style={styles.trialButtonText}>Start 7-Day Free Trial</Text>
        </TouchableOpacity>

        <Text style={styles.trialNote}>Cancel anytime • No commitment</Text>

        {/* Continue Free */}
        <TouchableOpacity style={styles.freeButton} onPress={handleContinueFree}>
          <Text style={styles.freeButtonText}>Continue with Free Plan</Text>
          <Text style={styles.freeButtonSubtext}>(5 AI searches/day, ads included)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
  },
  proBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  proText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
  },
  title: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: 'bold',
    color: COLORS.text,
    lineHeight: 38,
  },
  featuresContainer: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  featureText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    fontWeight: '500',
  },
  plansContainer: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  planCardSelected: {
    borderColor: COLORS.secondary,
    backgroundColor: '#F0F8FF',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -100 }],
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  radioButtonSelected: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.secondary,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  planDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  planPrice: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  pricePeriod: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  planDescriptionBottom: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    marginLeft: 38,
  },
  trialButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.xl,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  trialButtonText: {
    fontSize: FONTS.sizes.lg,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  trialNote: {
    textAlign: 'center',
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  freeButton: {
    marginHorizontal: SPACING.xl,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  freeButtonText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  freeButtonSubtext: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    marginTop: 4,
  },
});
