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
    'pawguard_monthly_subscription',  // Replace with your actual monthly subscription ID
    'pawguard_yearly_subscription',   // Replace with your actual yearly subscription ID
  ],
  ios: [
    'pawguard_monthly_subscription',  // Replace with your actual monthly subscription ID
    'pawguard_yearly_subscription',   // Replace with your actual yearly subscription ID
  ],
  default: [],
});

// ✅ FIX: Default plan structure (will be updated with real prices from store)
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

// ✅ FIX: Helper function to extract price from subscription object
const getSubscriptionPrice = (subscription) => {
  console.log('📊 Extracting price for:', subscription.productId);
  
  if (Platform.OS === 'ios') {
    // iOS: Use localizedPrice directly
    const price = subscription.localizedPrice || subscription.price;
    console.log('   iOS price:', price);
    return price;
  } else {
    // Android: Extract from subscriptionOfferDetails
    try {
      if (subscription.subscriptionOfferDetails && 
          subscription.subscriptionOfferDetails.length > 0) {
        const offerDetails = subscription.subscriptionOfferDetails[0];
        
        if (offerDetails.pricingPhases && 
            offerDetails.pricingPhases.pricingPhaseList && 
            offerDetails.pricingPhases.pricingPhaseList.length > 0) {
          const formattedPrice = offerDetails.pricingPhases.pricingPhaseList[0].formattedPrice;
          console.log('   Android price:', formattedPrice);
          return formattedPrice;
        }
      }
      
      // Fallback to other possible price fields
      if (subscription.localizedPrice) {
        console.log('   Android fallback price (localizedPrice):', subscription.localizedPrice);
        return subscription.localizedPrice;
      }
      
      if (subscription.price) {
        console.log('   Android fallback price (price):', subscription.price);
        return subscription.price;
      }
      
      console.warn('   ⚠️ No price found for Android subscription');
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
  // ✅ FIX: Add state for plans so component re-renders when prices update
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const { upgradeToPremium } = useUser();

  // CRITICAL FIX: Get both callback and fromOnboarding flag
  const onComplete = route?.params?.onComplete;
  const fromOnboarding = route?.params?.fromOnboarding;

  useEffect(() => {
    console.log('📱 SubscriptionScreen mounted');
    console.log('   - Has onComplete callback:', !!onComplete);
    console.log('   - From onboarding:', fromOnboarding);
    
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
      console.log('✅ IAP Connection initialized');

      // Get available subscriptions from Google Play / App Store
      const availableSubscriptions = await RNIap.getSubscriptions({ skus: SUBSCRIPTION_SKUS });
      console.log('📦 Available Subscriptions:', JSON.stringify(availableSubscriptions, null, 2));
      
      if (availableSubscriptions && availableSubscriptions.length > 0) {
        setSubscriptions(availableSubscriptions);
        
        // ✅ FIX: Update plans state with actual prices from store
        const updatedPlans = DEFAULT_PLANS.map(plan => {
          const subscription = availableSubscriptions.find(sub => sub.productId === plan.id);
          
          if (subscription) {
            // ✅ FIX: Use the helper function to extract price correctly
            const storePrice = getSubscriptionPrice(subscription);
            
            if (storePrice) {
              console.log(`✅ Updated ${plan.id}: ${storePrice}`);
              return {
                ...plan,
                price: storePrice,
                // Try to extract numeric value for calculations
                priceValue: parseFloat(storePrice.replace(/[^0-9.]/g, '')) || plan.priceValue,
              };
            } else {
              console.log(`⚠️ No price found for ${plan.id}, keeping default: ${plan.price}`);
            }
          } else {
            console.log(`⚠️ Subscription not found in store for ${plan.id}`);
          }
          
          return plan;
        });
        
        console.log('📋 Final plans:', JSON.stringify(updatedPlans, null, 2));
        
        // ✅ FIX: Set updated plans to trigger re-render
        setPlans(updatedPlans);
      } else {
        console.log('⚠️ No subscriptions found from store, using default prices');
        // Keep default prices if store doesn't return anything
      }

      setLoading(false);
    } catch (error) {
      console.error('❌ Error initializing IAP:', error);
      setLoading(false);
      
      // ✅ FIX: Even if store connection fails, show default prices
      console.log('⚠️ Using default prices due to store connection error');
      
      // If initialization fails, show alert but allow continuing
      Alert.alert(
        'Connection Issue',
        'Could not connect to store. Showing default prices. You can still explore the app features.',
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
          
          setPurchasing(false);

          Alert.alert(
            '🎉 Welcome to Premium!',
            'You now have unlimited access to all PawGuard features!',
            [
              {
                text: 'Get Started',
                onPress: () => navigateToMain(true),
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

  // CRITICAL FIX: Simplified navigation that always works
  const navigateToMain = async (completedPurchase = false) => {
    console.log('🚀 navigateToMain called');
    console.log('   - From onboarding:', fromOnboarding);
    console.log('   - Has callback:', !!onComplete);
    console.log('   - Completed purchase:', completedPurchase);

    try {
      // CRITICAL FIX: If from onboarding, ALWAYS use the callback
      if (fromOnboarding && onComplete) {
        console.log('✅ Using onComplete callback (onboarding flow)');
        // The callback will handle AsyncStorage and navigation
        await onComplete(navigation);
      } else {
        // If opened as modal from Main, just go back
        console.log('✅ Going back (modal mode)');
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          // Fallback: reset to Main (shouldn't happen but safe)
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            })
          );
        }
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
      // Last resort: force reset
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        })
      );
    }
  };

  const handleContinueFree = async () => {
    console.log('🆓 Continue with free plan pressed');
    await navigateToMain(false);
  };

  const handleClose = () => {
    console.log('❌ Close button pressed');
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

        Alert.alert(
          '✅ Purchases Restored',
          'Your premium subscription has been restored!',
          [
            {
              text: 'Continue',
              onPress: () => navigateToMain(true),
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
        {/* CRITICAL FIX: Close Button with better touch handling */}
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={handleClose}
          activeOpacity={0.7}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="close" size={32} color={COLORS.text} />
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
            'Priority Support (24/7 AI + Human)',
          ].map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* ✅ FIX: Plans - now using state variable that updates */}
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
                  {/* ✅ FIX: Display price with proper formatting */}
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
          activeOpacity={0.8}
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
          activeOpacity={0.7}
        >
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* CRITICAL FIX: Continue Free Button with better touch handling */}
        <TouchableOpacity 
          style={styles.freeButton} 
          onPress={handleContinueFree}
          activeOpacity={0.7}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
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
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    ...SHADOWS.small,
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
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  freeButtonText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '700',
  },
  freeButtonSubtext: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 6,
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
