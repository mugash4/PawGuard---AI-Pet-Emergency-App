import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import AdBanner from '../components/AdBanner';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '../constants/theme';

export default function HomeScreen({ navigation }) {
  const { user } = useUser();

  // Track navigation for interstitial ads (free users only)
  useInterstitialAd(navigation);

  // Navigate to specific emergency scenarios
  const navigateToEmergency = (scenarioType) => {
    navigation.navigate('Emergency', { filter: scenarioType });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }} // Space for tab bar
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

        {/* Tip of the Day Card */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb" size={24} color={COLORS.warning} />
            <Text style={styles.tipLabel}>Tip of the Day</Text>
          </View>
          <Text style={styles.tipTitle}>Avoid Grapes 🍇</Text>
          <Text style={styles.tipText}>
            Grapes can cause kidney failure - even small amounts are dangerous for dogs.
          </Text>
        </View>

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

        <View style={{ height: SPACING.xl }} />
      </ScrollView>

      {/* AdMob Banner at Bottom (only for free users) */}
      <AdBanner />
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
  // FIXED: 2 items per row layout
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  quickActionCard: {
    width: '48%', // Exactly 2 per row
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
});
