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
import { Ionicons } from '@expo/vector-icons';
import {
  useIAP,
  getAvailablePurchases as getAvailablePurchasesDirect,
} from 'expo-iap';
import { useUser } from '../context/UserContext';
import { COLORS, FONTS, SPACING, SHADOWS } from '../constants/theme';
import { CommonActions } from '@react-navigation/native';

const SUBSCRIPTION_SKUS = Platform.select({
  android: [
    'pawguard_monthly_subscription',
    'pawguard_yearly_subscription',
  ],
  ios: [
    'pawguard_monthly_subscription',
    'pawguard_yearly_subscription',
  ],
  default: [],
});

const DEFAULT_PLANS = [
  {
    id: 'pawguard_monthly_subscription',
    name: 'Monthly',
    price: '$1.99',
    period: '/month',
    description: 'Cancel anytime',
    priceValue: 1.99,
  },
  {
    id: 'pawguard_yearly_subscription',
    name: 'Yearly',
    price: '$15.99',
    period: '/year',
    description: 'SAVE 33% → $1.33/month',
    badge: 'Best Choice - Save 33%',
    recommended: true,
    priceValue: 15.99,
  },
];

const getSubscriptionPrice = (subscription) => {
  if (!subscription) return null;
  return subscription.displayPrice || null;
};

export default function SubscriptionScreen({ navigation, route }) {
  const [selectedPlan, setSelectedPlan] = useState('pawguard_yearly_subscription');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [plans, setPlans] = useState(DEFAULT_PLANS);

  const { upgradeToPremium } = useUser();

  const {
    connected,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    restorePurchases,
    reconnect,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        if (!purchase || purchase.purchaseState !== 'purchased') {
          setPurchasing(false);
          return;
        }

        await finishTransaction({
          purchase,
          isConsumable: false,
        });

        const subscriptionType = purchase.productId.includes('yearly')
          ? 'yearly'
          : 'monthly';

        await upgradeToPremium(subscriptionType);
        setPurchasing(false);

        Alert.alert(
          '🎉 Welcome to Premium!',
          'You now have unlimited access to all PawGuard features!',
          [
            {
              text: 'Get Started',
              onPress: () => closeSubscriptionScreen(),
            },
          ]
        );
      } catch (error) {
        console.error('❌ Error finishing purchase:', error);
        setPurchasing(false);
        Alert.alert(
          'Error',
          'Purchase completed but could not be finalized. Please contact support.'
        );
      }
    },
    onPurchaseError: (error) => {
      console.error('❌ Purchase error:', error);
      setPurchasing(false);

      if (error?.code !== 'E_USER_CANCELLED') {
        Alert.alert(
          'Purchase Error',
          error?.message || 'An error occurred during purchase.'
        );
      }
    },
    onError: (error) => {
      console.error('❌ IAP general error:', error);
    },
  });

  const onComplete = route?.params?.onComplete;
  const fromOnboarding = route?.params?.fromOnboarding;

  useEffect(() => {
    console.log('📱 SubscriptionScreen mounted');
    console.log('   - Has onComplete callback:', !!onComplete);
    console.log('   - From onboarding:', fromOnboarding);
  }, [onComplete, fromOnboarding]);

  useEffect(() => {
    let cancelled = false;

    const connectStore = async () => {
      try {
        await reconnect();
      } catch (error) {
        console.error('❌ Error connecting to store:', error);
        if (!cancelled) {
          setLoading(false);
          Alert.alert(
            'Connection Issue',
            'Could not connect to store. Showing default prices. You can still subscribe.',
            [{ text: 'OK' }]
          );
        }
      }
    };

    connectStore();

    return () => {
      cancelled = true;
    };
  }, [reconnect]);

  useEffect(() => {
    let cancelled = false;

    const loadSubscriptions = async () => {
      if (!connected) return;

      try {
        setLoading(true);
        console.log('🔍 Fetching subscriptions for SKUs:', SUBSCRIPTION_SKUS);

        await fetchProducts({
          skus: SUBSCRIPTION_SKUS,
          type: 'subs',
        });

        if (!cancelled) {
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Error fetching subscriptions:', error);

        if (!cancelled) {
          setLoading(false);
          Alert.alert(
            'Connection Issue',
            'Could not load store prices. Showing fallback prices.',
            [{ text: 'OK' }]
          );
        }
      }
    };

    loadSubscriptions();

    return () => {
      cancelled = true;
    };
  }, [connected, fetchProducts]);

  useEffect(() => {
    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const updatedPlans = DEFAULT_PLANS.map((plan) => {
      const subscription = subscriptions.find((sub) => sub.id === plan.id);

      if (!subscription) {
        return plan;
      }

      const storePrice = getSubscriptionPrice(subscription);

      if (!storePrice) {
        return plan;
      }

      const numericValue = parseFloat(storePrice.replace(/[^0-9.]/g, ''));

      return {
        ...plan,
        price: storePrice,
        priceValue: Number.isFinite(numericValue) ? numericValue : plan.priceValue,
      };
    });

    setPlans(updatedPlans);
  }, [subscriptions]);

  const closeSubscriptionScreen = () => {
    console.log('🚪 Closing subscription screen');

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        })
      );
    }
  };

  const handleSubscribe = async () => {
    if (purchasing) return;

    try {
      setPurchasing(true);
      console.log('💳 Requesting subscription:', selectedPlan);

      const selectedSubscription = subscriptions.find(
        (sub) => sub.id === selectedPlan
      );

      const firstOfferToken =
        Platform.OS === 'android'
          ? selectedSubscription?.subscriptionOffers?.[0]?.offerToken
          : undefined;

      const request = {
        type: 'subs',
        request: {
          apple: {
            sku: selectedPlan,
          },
          google: {
            skus: [selectedPlan],
            ...(firstOfferToken
              ? {
                  subscriptionOffers: [
                    {
                      sku: selectedPlan,
                      offerToken: firstOfferToken,
                    },
                  ],
                }
              : {}),
          },
        },
      };

      await requestPurchase(request);
      console.log('✅ Purchase request sent');
    } catch (error) {
      console.error('❌ Purchase request error:', error);
      setPurchasing(false);

      if (error?.code === 'E_USER_CANCELLED') {
        return;
      }

      Alert.alert(
        'Purchase Failed',
        error?.message || 'There was an issue processing your subscription. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setLoading(true);
      console.log('🔄 Restoring purchases...');

      await restorePurchases();

      const purchases = await getAvailablePurchasesDirect({
        includeSuspendedAndroid: false,
      });

      console.log('📦 Available purchases:', purchases);

      if (purchases && purchases.length > 0) {
        const latestPurchase = [...purchases].sort(
          (a, b) => (b.transactionDate || 0) - (a.transactionDate || 0)
        )[0];

        const subscriptionType = latestPurchase.productId.includes('yearly')
          ? 'yearly'
          : 'monthly';

        await upgradeToPremium(subscriptionType);

        Alert.alert(
          '✅ Purchases Restored',
          'Your premium subscription has been restored!',
          [
            {
              text: 'Continue',
              onPress: () => closeSubscriptionScreen(),
            },
          ]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'You have no active subscriptions to restore.'
        );
      }

      setLoading(false);
    } catch (error) {
      console.error('❌ Error restoring purchases:', error);
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
      <TouchableOpacity
        style={styles.closeButton}
        onPress={closeSubscriptionScreen}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={28} color={COLORS.text} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.proBadge}>
            <Text style={styles.proText}>PRO</Text>
          </View>
          <Text style={styles.title}>Unlock Your Pet's{'\n'}Full Protection 🛡️</Text>
        </View>

        <View style={styles.featuresContainer}>
          {[
            'Unlimited AI Food Checker',
            '24/7 AI Emergency Assistant',
            'Advanced First Aid (100+ guides)',
            'Smart Health Reminders',
            'Multi-Pet Profiles',
            'Offline Mode (Full Database)',
            'No Ads',
            'Priority Support (24/7 AI + Human)',
          ].map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan(plan.id)}
              disabled={purchasing}
              activeOpacity={0.8}
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

        <TouchableOpacity
          style={[styles.trialButton, purchasing && styles.trialButtonDisabled]}
          onPress={handleSubscribe}
          disabled={purchasing}
          activeOpacity={0.8}
        >
          {purchasing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.trialButtonText}>Start 7-Day Free Trial</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.trialNote}>
          Try free for 7 days, then{' '}
          {plans.find((p) => p.id === selectedPlan)?.price}
          {plans.find((p) => p.id === selectedPlan)?.period}
        </Text>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          disabled={purchasing || loading}
          activeOpacity={0.7}
        >
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.freePlanButton}
          onPress={closeSubscriptionScreen}
          disabled={purchasing || loading}
          activeOpacity={0.7}
        >
          <Text style={styles.freePlanButtonText}>Continue with Free Plan</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          Free trial for 7 days, then automatically renews unless cancelled at least
          24 hours before the trial ends.
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
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 10,
    right: 20,
    zIndex: 999,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: SPACING.xl,
  },
  restoreButton: {
    marginHorizontal: SPACING.xl,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  restoreButtonText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  freePlanButton: {
    marginHorizontal: SPACING.xl,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  freePlanButtonText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    fontWeight: '600',
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
