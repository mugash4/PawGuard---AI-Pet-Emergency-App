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
import { CommonActions } from '@react-navigation/native';

// Product IDs from Google Play Console - REPLACE WITH YOUR ACTUAL PRODUCT IDs
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

// ✅ FIX: Default plan structure (fallback if store fails)
const DEFAULT_PLANS = [
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

// ✅ CRITICAL FIX: Extract the REGULAR PRICE (after trial), not the trial price
const getSubscriptionPrice = (subscription) => {
  console.log('📊 Extracting REGULAR price (not trial price) for:', subscription.productId);
  console.log('📦 Full subscription object:', JSON.stringify(subscription, null, 2));
  
  if (Platform.OS === 'ios') {
    // iOS: Get price from the subscription object
    // For trials, we need to get the price AFTER the trial period
    const price = subscription.localizedPrice || subscription.price;
    console.log('   iOS regular price:', price);
    return price;
  } else {
    // Android: Extract REGULAR price from subscriptionOfferDetails
    try {
      if (subscription.subscriptionOfferDetails && 
          subscription.subscriptionOfferDetails.length > 0) {
        const offerDetails = subscription.subscriptionOfferDetails[0];
        
        if (offerDetails.pricingPhases && 
            offerDetails.pricingPhases.pricingPhaseList) {
          
          const pricingPhases = offerDetails.pricingPhases.pricingPhaseList;
          console.log(`   📋 Found ${pricingPhases.length} pricing phases`);
          
          // CRITICAL: Find the REGULAR recurring price (not the trial/intro price)
          // Pricing phases are ordered: [trial/intro phase, regular phase]
          // We want the LAST phase which is the regular recurring price
          let regularPrice = null;
          
          // Loop through phases to find the regular (non-free) recurring price
          for (let i = 0; i < pricingPhases.length; i++) {
            const phase = pricingPhases[i];
            console.log(`   Phase ${i}:`, {
              formattedPrice: phase.formattedPrice,
              priceAmountMicros: phase.priceAmountMicros,
              billingCycleCount: phase.billingCycleCount,
              recurrenceMode: phase.recurrenceMode
            });
            
            // If this is a recurring phase (billingCycleCount = 0 means infinite)
            // AND it's not free (priceAmountMicros > 0)
            // This is the regular price we want to display
            if (phase.billingCycleCount === 0 && phase.priceAmountMicros > 0) {
              regularPrice = phase.formattedPrice;
              console.log(`   ✅ Found REGULAR recurring price: ${regularPrice}`);
              break;
            }
          }
          
          // If we didn't find infinite recurring, get the last non-zero price
          if (!regularPrice) {
            for (let i = pricingPhases.length - 1; i >= 0; i--) {
              const phase = pricingPhases[i];
              if (phase.priceAmountMicros > 0) {
                regularPrice = phase.formattedPrice;
                console.log(`   ✅ Using last non-zero price: ${regularPrice}`);
                break;
              }
            }
          }
          
          if (regularPrice) {
            return regularPrice;
          }
        }
      }
      
      // Fallback 1: Try oneTimePurchaseOfferDetails (shouldn't exist for subscriptions)
      if (subscription.oneTimePurchaseOfferDetails?.formattedPrice) {
        console.log('   Android fallback price (oneTimePurchase):', subscription.oneTimePurchaseOfferDetails.formattedPrice);
        return subscription.oneTimePurchaseOfferDetails.formattedPrice;
      }
      
      // Fallback 2: localizedPrice
      if (subscription.localizedPrice) {
        console.log('   Android fallback price (localizedPrice):', subscription.localizedPrice);
        return subscription.localizedPrice;
      }
      
      // Fallback 3: price field
      if (subscription.price) {
        console.log('   Android fallback price (price):', subscription.price);
        return subscription.price;
      }
      
      console.warn('   ⚠️ No regular price found for Android subscription');
      return null;
    } catch (error) {
      console.error('   ❌ Error extracting Android price:', error);
      return null;
    }
  }
};

export default function SubscriptionScreen({ navigation, route }) {
  const [selectedPlan, setSelectedPlan] = useState('pawguard_yearly_subscription');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const { upgradeToPremium } = useUser();

  const onComplete = route?.params?.onComplete;
  const fromOnboarding = route?.params?.fromOnboarding;

  useEffect(() => {
    console.log('📱 SubscriptionScreen mounted');
    console.log('   - Has onComplete callback:', !!onComplete);
    console.log('   - From onboarding:', fromOnboarding);
    
    initializeIAP();
    return () => {
      RNIap.endConnection();
    };
  }, []);

  const initializeIAP = async () => {
    try {
      console.log('🔌 Initializing IAP connection...');
      await RNIap.initConnection();
      console.log('✅ IAP Connection initialized');

      console.log('🔍 Fetching subscriptions for SKUs:', SUBSCRIPTION_SKUS);
      const availableSubscriptions = await RNIap.getSubscriptions({ skus: SUBSCRIPTION_SKUS });
      console.log('📦 Available Subscriptions:', JSON.stringify(availableSubscriptions, null, 2));
      
      if (availableSubscriptions && availableSubscriptions.length > 0) {
        setSubscriptions(availableSubscriptions);
        
        // ✅ CRITICAL FIX: Update plans with REGULAR prices (not trial prices)
        const updatedPlans = DEFAULT_PLANS.map(plan => {
          const subscription = availableSubscriptions.find(sub => sub.productId === plan.id);
          
          if (subscription) {
            const storePrice = getSubscriptionPrice(subscription);
            
            if (storePrice) {
              console.log(`✅ Updated ${plan.id} with REGULAR price: ${storePrice}`);
              
              // Extract numeric value for calculations (remove currency symbols)
              const numericValue = parseFloat(storePrice.replace(/[^0-9.]/g, ''));
              
              return {
                ...plan,
                price: storePrice,
                priceValue: numericValue || plan.priceValue,
              };
            } else {
              console.log(`⚠️ No price found for ${plan.id}, using default: ${plan.price}`);
            }
          } else {
            console.log(`⚠️ Subscription not found in store for ${plan.id}`);
          }
          
          return plan;
        });
        
        console.log('📋 Final plans with REGULAR prices:', JSON.stringify(updatedPlans, null, 2));
        setPlans(updatedPlans);
      } else {
        console.log('⚠️ No subscriptions found from store, using default prices');
      }

      setLoading(false);
    } catch (error) {
      console.error('❌ Error initializing IAP:', error);
      setLoading(false);
      
      console.log('⚠️ Using default prices due to store connection error');
      
      Alert.alert(
        'Connection Issue',
        'Could not connect to store. Showing default prices. You can still subscribe.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSubscribe = async () => {
    if (purchasing) return;

    try {
      setPurchasing(true);
      console.log('💳 Requesting subscription:', selectedPlan);

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

      console.log('✅ Purchase request sent');

    } catch (error) {
      setPurchasing(false);
      console.error('❌ Purchase error:', error);

      if (error.code === 'E_USER_CANCELLED') {
        return;
      }

      Alert.alert(
        'Purchase Failed',
        'There was an issue processing your subscription. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  useEffect(() => {
    const purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase) => {
      console.log('✅ Purchase update:', purchase);
      const receipt = purchase.transactionReceipt || purchase.purchaseToken;

      if (receipt) {
        try {
          if (Platform.OS === 'android') {
            await RNIap.acknowledgePurchaseAndroid({ token: purchase.purchaseToken });
            console.log('✅ Purchase acknowledged (Android)');
          }

          await RNIap.finishTransaction({ purchase, isConsumable: false });
          console.log('✅ Transaction finished');

          const subscriptionType = purchase.productId.includes('yearly') ? 'yearly' : 'monthly';
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
          Alert.alert('Error', 'Purchase completed but could not verify. Please contact support.');
        }
      }
    });

    const purchaseErrorSubscription = RNIap.purchaseErrorListener((error) => {
      console.error('❌ Purchase error:', error);
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

  // ✅ FIXED: Simplified close function
  const closeSubscriptionScreen = () => {
    console.log('🚪 Closing subscription screen');
    
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback: reset to Main if can't go back
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        })
      );
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setLoading(true);
      console.log('🔄 Restoring purchases...');
      
      const availablePurchases = await RNIap.getAvailablePurchases();
      console.log('📦 Available purchases:', availablePurchases);

      if (availablePurchases && availablePurchases.length > 0) {
        const latestPurchase = availablePurchases[0];
        const subscriptionType = latestPurchase.productId.includes('yearly') ? 'yearly' : 'monthly';
        
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
        Alert.alert('No Purchases Found', 'You have no active subscriptions to restore.');
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
      {/* ✅ Close Button (X) in top right corner */}
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={closeSubscriptionScreen}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={28} color={COLORS.text} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
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
            'Priority Support (24/7 AI + Human)',
          ].map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
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

        {/* Subscribe Button */}
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
          Try free for 7 days, then {plans.find(p => p.id === selectedPlan)?.price}{plans.find(p => p.id === selectedPlan)?.period}
        </Text>

        {/* Restore Purchases */}
        <TouchableOpacity 
          style={styles.restoreButton} 
          onPress={handleRestorePurchases}
          disabled={purchasing || loading}
          activeOpacity={0.7}
        >
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* ✅ Continue with Free Plan Button */}
        <TouchableOpacity 
          style={styles.freePlanButton} 
          onPress={closeSubscriptionScreen}
          disabled={purchasing || loading}
          activeOpacity={0.7}
        >
          <Text style={styles.freePlanButtonText}>Continue with Free Plan</Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.termsText}>
          By subscribing, you agree to our Terms of Service and Privacy Policy. 
          Free trial for 7 days, then automatically renews unless cancelled at least 24 hours before the trial ends.
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