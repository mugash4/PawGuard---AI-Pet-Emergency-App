import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useUser } from '../context/UserContext';
import AdBanner from '../components/AdBanner';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import { getDailyTip } from '../services/contentService'; // ✅ ADDED: Import getDailyTip
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '../constants/theme';

export default function HomeScreen({ navigation }) {
  const { user } = useUser();
  const tabBarHeight = useBottomTabBarHeight();
  
  // ✅ ADDED: State for daily tip
  const [dailyTip, setDailyTip] = useState(null);

  // Track navigation for interstitial ads (free users only)
  useInterstitialAd(navigation);

  // ✅ ADDED: Load daily tip on mount
  useEffect(() => {
    loadDailyTip();
  }, []);

  // ✅ ADDED: Function to load daily tip
  const loadDailyTip = async () => {
    try {
      const tip = await getDailyTip();
      setDailyTip(tip);
    } catch (error) {
      console.error('Error loading daily tip:', error);
      // Fallback tip if loading fails
      setDailyTip({
        title: 'Stay Alert 👀',
        content: 'Keep emergency vet numbers saved in your phone and posted at home.',
        emoji: '👀'
      });
    }
  };

  // Navigate to specific emergency scenarios
  const navigateToEmergency = (scenarioType) => {
    navigation.navigate('Emergency', { filter: scenarioType });
  };

  // ✅ FIXED: Handle upgrade button press with connectivity check
  const handleUpgradePress = async () => {
    try {
      const { navigateToSubscription } = await import('../utils/navigationHelper');
      await navigateToSubscription(navigation);
    } catch (error) {
      console.error('Error importing navigation helper:', error);
      Alert.alert(
        'Error',
        'Unable to open subscription screen. Please try restarting the app.',
        [{ text: 'OK' }]
      );
    }
  };


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingBottom: tabBarHeight + SPACING.md 
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi! 👋</Text>
            <Text style={styles.subtitle}>Ready for your daily pet check?</Text>
          </View>
          {user?.isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>✨ PRO</Text>
            </View>
          )}
        </View>

        {/* ✅ FIXED: Tip of the Day Card - Now uses dynamic content */}
        {dailyTip && (
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Ionicons name="bulb" size={24} color={COLORS.warning} />
              <Text style={styles.tipLabel}>Tip of the Day</Text>
            </View>
            <Text style={styles.tipTitle}>{dailyTip.title}</Text>
            <Text style={styles.tipText}>{dailyTip.content}</Text>
          </View>
        )}

        {/* AdMob Banner - Integrated in content */}
        {!user?.isPremium && <AdBanner />}

        {/* Quick Actions - FIXED: 2 per row */}
        <Text style={styles.sectionTitle}>Emergency First Aid</Text>
        <View style={styles.quickActions}>
          <QuickActionCard
            icon="heart"
            title="Breath & Heart"
            color="#FF6B6B"
            onPress={() => navigateToEmergency('Breathing')}
          />
          <QuickActionCard
            icon="medkit"
            title="Reanimation"
            color="#4ECDC4"
            onPress={() => navigateToEmergency('Other')}
          />
        </View>
        <View style={styles.quickActions}>
          <QuickActionCard
            icon="fitness"
            title="Choking"
            color="#FFD93D"
            onPress={() => navigateToEmergency('Choking')}
          />
          <QuickActionCard
            icon="water"
            title="Bleeding"
            color="#95E1D3"
            onPress={() => navigateToEmergency('Bleeding')}
          />
        </View>

        {/* Features Section */}
        <Text style={styles.sectionTitle}>Tools & Resources</Text>
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('Emergency')}
        >
          <View style={[styles.featureIcon, { backgroundColor: '#FFE5E5' }]}>
            <Ionicons name="medical" size={32} color="#FF6B6B" />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Emergency Help</Text>
            <Text style={styles.featureDescription}>
              Step-by-step guidance for 80+ emergencies
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('AIChat')}
        >
          <View style={[styles.featureIcon, { backgroundColor: '#F3E5FF' }]}>
            <Ionicons name="sparkles" size={32} color="#9C27B0" />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>AI Emergency Assistant</Text>
            <Text style={styles.featureDescription}>
              Chat with AI for instant pet advice
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
        </TouchableOpacity>

        {/* AdMob Banner - Between content */}
        {!user?.isPremium && <AdBanner />}

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('FoodChecker')}
        >
          <View style={[styles.featureIcon, { backgroundColor: '#E5F5E5' }]}>
            <Ionicons name="restaurant" size={32} color="#4CAF50" />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Food Safety Checker</Text>
            <Text style={styles.featureDescription}>
              AI-powered checker for 200+ foods
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('Knowledge')}
        >
          <View style={[styles.featureIcon, { backgroundColor: '#E5F0FF' }]}>
            <Ionicons name="book" size={32} color="#2196F3" />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Knowledge & Quiz</Text>
            <Text style={styles.featureDescription}>
              Learn and test your pet care knowledge
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={[styles.featureIcon, { backgroundColor: '#FFF5E5' }]}>
            <Ionicons name="paw" size={32} color={COLORS.primary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Pet Profile</Text>
            <Text style={styles.featureDescription}>
              Store all your pet's important information
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
        </TouchableOpacity>

        {/* AdMob Banner - At bottom of content */}
        {!user?.isPremium && <AdBanner />}

        {/* Upgrade CTA for free users */}
        {!user?.isPremium && (
          <View style={styles.upgradeCTA}>
            <Text style={styles.upgradeTitle}>Want Unlimited Checks?</Text>
            <Text style={styles.upgradeText}>
              Upgrade to Premium for unlimited AI Assistant, food safety checks, no ads, and more features!
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgradePress}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickActionCard({ icon, title, color, onPress }) {
  return (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  greeting: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  premiumBadge: {
    backgroundColor: COLORS.premium,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  premiumText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
  },
  tipCard: {
    backgroundColor: '#FFF8E5',
    marginHorizontal: SPACING.xl,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: '#FFE5A0',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tipLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.warning,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  tipTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  tipText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  quickActionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.xl,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  upgradeCTA: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.xl,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOWS.medium,
  },
  upgradeTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  upgradeText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  upgradeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  upgradeButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
