import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as RNIap from 'react-native-iap';
import { useUser } from '../context/UserContext';
import { COLORS, FONTS, SPACING, SHADOWS } from '../constants/theme';

// Product IDs from Google Play Console - REPLACE WITH YOUR ACTUAL PRODUCT IDs
const SUBSCRIPTION_SKUS = Platform.select({
  android: [
    'pawguard_monthly_subscription',  // Replace with your actual monthly subscription ID
    'pawguard_yearly_subscription',   // Replace with your actual yearly subscription ID
  ],
  ios: [
    'pawguard_monthly_subscription',  // Replace with your actual monthly subscription ID
    'pawguard_yearly_subscription',   // Replace with your actual yearly subscription ID
  ],
  default: [],
});

const PLANS = [
  {
    id: 'pawguard_monthly_subscription',
    name: 'Monthly',
    price: '$4.99',
    period: '/month',
    description: 'Cancel anytime',
    priceValue: 4.99,
  },
  {
    id: 'pawguard_yearly_subscription',
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
  const [selectedPlan, setSelectedPlan] = useState('pawguard_yearly_subscription');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const { upgradeToPremium } = useUser();

  useEffect(() => {
    initializeIAP();
    return () => {
      // Cleanup on unmount
      RNIap.endConnection();
    };
  }, []);

  const initializeIAP = async () => {
    try {
      // Initialize connection to app stores
      await RNIap.initConnection();
      console.log('IAP Connection initialized');

      // Get available subscriptions from Google Play / App Store
      const availableSubscriptions = await RNIap.getSubscriptions({ skus: SUBSCRIPTION_SKUS });
      console.log('Available Subscriptions:', availableSubscriptions);
      
      if (availableSubscriptions && availableSubscriptions.length > 0) {
        setSubscriptions(availableSubscriptions);
        
        // Update PLANS with actual prices from store
        availableSubscriptions.forEach(sub => {
          const planIndex = PLANS.findIndex(p => p.id === sub.productId);
          if (planIndex !== -1) {
            PLANS[planIndex].price = sub.localizedPrice;
            PLANS[planIndex].priceValue = sub.price;
          }
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error initializing IAP:', error);
      setLoading(false);
      
      // If initialization fails, show alert but allow continuing
      Alert.alert(
        'Connection Issue',
        'Could not connect to store. You can still explore the app features.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSubscribe = async () => {
    if (purchasing) return;

    try {
      setPurchasing(true);

      // Request purchase from Google Play
      await RNIap.requestSubscription({
        sku: selectedPlan,
        ...(Platform.OS === 'android' && {
          subscriptionOffers: [
            {
              sku: selectedPlan,
              offerToken: subscriptions.find(s => s.productId === selectedPlan)?.subscriptionOfferDetails?.[0]?.offerToken,
            },
          ],
        }),
      });

      console.log('Purchase request sent');

      // Purchase listener will handle the rest
      // See purchaseUpdateSubscription and purchaseErrorSubscription

    } catch (error) {
      setPurchasing(false);
      console.error('Purchase error:', error);

      if (error.code === 'E_USER_CANCELLED') {
        // User cancelled, do nothing
        return;
      }

      Alert.alert(
        'Purchase Failed',
        'There was an issue processing your subscription. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Purchase Update Listener
  useEffect(() => {
    const purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase) => {
      console.log('Purchase update:', purchase);
      const receipt = purchase.transactionReceipt || purchase.purchaseToken;

      if (receipt) {
        try {
          // Verify purchase on your backend (recommended for production)
          // For now, we'll grant access directly
          
          // Acknowledge purchase (REQUIRED for Google Play)
          if (Platform.OS === 'android') {
            await RNIap.acknowledgePurchaseAndroid({ token: purchase.purchaseToken });
            console.log('Purchase acknowledged');
          }

          // Finish transaction (for iOS)
          await RNIap.finishTransaction({ purchase, isConsumable: false });
          console.log('Transaction finished');

          // Grant premium access
          const subscriptionType = purchase.productId.includes('yearly') ? 'yearly' : 'monthly';
          await upgradeToPremium(subscriptionType);
          await completeOnboarding();

          setPurchasing(false);

          Alert.alert(
            '🎉 Welcome to Premium!',
            'You now have unlimited access to all PawGuard features!',
            [
              {
                text: 'Get Started',
                onPress: () => navigation.replace('Main'),
              },
            ]
          );
        } catch (error) {
          console.error('Error finishing purchase:', error);
          setPurchasing(false);
          Alert.alert('Error', 'Purchase completed but could not verify. Please contact support.');
        }
      }
    });

    const purchaseErrorSubscription = RNIap.purchaseErrorListener((error) => {
      console.error('Purchase error:', error);
      setPurchasing(false);

      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase Error', error.message || 'An error occurred during purchase.');
      }
    });

    return () => {
      purchaseUpdateSubscription.remove();
      purchaseErrorSubscription.remove();
    };
  }, []);

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

  // Restore purchases for users who already subscribed
  const handleRestorePurchases = async () => {
    try {
      setLoading(true);
      
      // Get purchase history
      const availablePurchases = await RNIap.getAvailablePurchases();
      console.log('Available purchases:', availablePurchases);

      if (availablePurchases && availablePurchases.length > 0) {
        // User has active subscription
        const latestPurchase = availablePurchases[0];
        const subscriptionType = latestPurchase.productId.includes('yearly') ? 'yearly' : 'monthly';
        
        await upgradeToPremium(subscriptionType);
        await completeOnboarding();

        Alert.alert(
          '✅ Purchases Restored',
          'Your premium subscription has been restored!',
          [
            {
              text: 'Continue',
              onPress: () => navigation.replace('Main'),
            },
          ]
        );
      } else {
        Alert.alert('No Purchases Found', 'You have no active subscriptions to restore.');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error restoring purchases:', error);
      setLoading(false);
      Alert.alert('Error', 'Could not restore purchases. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading subscriptions...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
              disabled={purchasing}
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
        <TouchableOpacity 
          style={[styles.trialButton, purchasing && styles.trialButtonDisabled]} 
          onPress={handleSubscribe}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.trialButtonText}>Start 7-Day Free Trial</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.trialNote}>Cancel anytime • No commitment</Text>

        {/* Restore Purchases Button */}
        <TouchableOpacity 
          style={styles.restoreButton} 
          onPress={handleRestorePurchases}
          disabled={purchasing || loading}
        >
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* Continue Free */}
        <TouchableOpacity style={styles.freeButton} onPress={handleContinueFree}>
          <Text style={styles.freeButtonText}>Continue with Free Plan</Text>
          <Text style={styles.freeButtonSubtext}>(5 AI searches/day, ads included)</Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.termsText}>
          By subscribing, you agree to our Terms of Service and Privacy Policy. 
          Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
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
  trialButtonDisabled: {
    opacity: 0.6,
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
    marginBottom: SPACING.md,
  },
  restoreButton: {
    marginHorizontal: SPACING.xl,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  restoreButtonText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  freeButton: {
    marginHorizontal: SPACING.xl,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: SPACING.md,
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
  termsText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    lineHeight: 16,
  },
});