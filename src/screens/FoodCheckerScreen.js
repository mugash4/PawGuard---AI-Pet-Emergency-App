/**
 * Food Checker Screen - Complete Implementation with AI
 * Multi-LLM support, query limits, visual results
 */

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../context/UserContext';
import { checkFoodSafety, checkQueryLimit, trackQueryUsage } from '../services/aiService';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import AdBanner from '../components/AdBanner';
import UpgradePrompt from '../components/UpgradePrompt';

export default function FoodCheckerScreen({ navigation }) {
  const { user } = useContext(UserContext);
  const [foodName, setFoodName] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(null);

  React.useEffect(() => {
    loadRemainingQueries();
  }, []);

  const loadRemainingQueries = async () => {
    try {
      const limit = await checkQueryLimit(user.userId, user.isPremium);
      setRemaining(limit.remaining);
    } catch (error) {
      console.error('Error loading remaining queries:', error);
    }
  };

  const handleCheckFood = async () => {
    if (!foodName.trim()) {
      return;
    }

    try {
      // Check query limit
      const limit = await checkQueryLimit(user.userId, user.isPremium);
      
      if (!limit.allowed) {
        alert('Daily AI query limit reached (5/day for free users). Upgrade to Premium for unlimited queries!');
        return;
      }

      setLoading(true);
      setResult(null);

      // Call AI to check food safety
      const response = await checkFoodSafety(foodName);
      
      // Track usage
      await trackQueryUsage(user.userId);
      
      setResult(response);
      loadRemainingQueries(); // Refresh remaining count
    } catch (error) {
      console.error('Error checking food:', error);
      alert('Error checking food safety. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSafetyColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'safe': return '#34C759';
      case 'caution': return '#FF9500';
      case 'toxic': return '#FF3B30';
      default: return COLORS.text;
    }
  };

  const getSafetyIcon = (level) => {
    switch (level?.toLowerCase()) {
      case 'safe': return '✅';
      case 'caution': return '⚠️';
      case 'toxic': return '☠️';
      default: return '❓';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🍖 Food Safety Checker</Text>
          <Text style={styles.subtitle}>
            Check if food is safe for your dog using AI
          </Text>
          {!user.isPremium && remaining !== null && (
            <View style={styles.queryCounter}>
              <Text style={styles.queryText}>
                {remaining} free AI {remaining === 1 ? 'query' : 'queries'} remaining today
              </Text>
            </View>
          )}
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Text style={styles.label}>Enter food name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="e.g., chocolate, apple, grapes..."
              placeholderTextColor={COLORS.textSecondary}
              value={foodName}
              onChangeText={setFoodName}
              onSubmitEditing={handleCheckFood}
              returnKeyType="search"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[
                styles.checkButton,
                (!foodName.trim() || loading) && styles.checkButtonDisabled
              ]}
              onPress={handleCheckFood}
              disabled={!foodName.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.checkButtonText}>Check</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Result Card */}
        {result && (
          <View style={styles.resultContainer}>
            <View style={[
              styles.resultCard,
              { borderLeftColor: getSafetyColor(result.safetyLevel), borderLeftWidth: 6 }
            ]}>
              {/* Safety Level Header */}
              <View style={styles.resultHeader}>
                <Text style={styles.resultEmoji}>
                  {result.emoji || getSafetyIcon(result.safetyLevel)}
                </Text>
                <View style={styles.resultTitleContainer}>
                  <Text style={styles.resultFoodName}>{foodName}</Text>
                  <View style={[
                    styles.safetyBadge,
                    { backgroundColor: getSafetyColor(result.safetyLevel) }
                  ]}>
                    <Text style={styles.safetyBadgeText}>
                      {result.safetyLevel?.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Explanation */}
              {result.shortExplanation && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📝 Explanation</Text>
                  <Text style={styles.explanationText}>
                    {result.shortExplanation}
                  </Text>
                </View>
              )}

              {/* Symptoms */}
              {result.symptoms && result.symptoms.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>⚠️ Potential Symptoms</Text>
                  {result.symptoms.map((symptom, index) => (
                    <View key={index} style={styles.listItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.listText}>{symptom}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Advice */}
              {result.advice && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>💡 What To Do</Text>
                  <Text style={styles.adviceText}>{result.advice}</Text>
                </View>
              )}

              {/* Disclaimer */}
              <View style={styles.disclaimer}>
                <Text style={styles.disclaimerText}>
                  ⚠️ AI-generated information. Always consult your veterinarian for serious concerns.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Upgrade Prompt for Free Users */}
        {!user.isPremium && (
          <UpgradePrompt
            message="You've used your daily free AI food checks. Upgrade for unlimited access!"
            feature="unlimited food safety checks"
          />
        )}


        {/* Common Foods Quick Reference */}
        {!result && (
          <View style={styles.quickRefContainer}>
            <Text style={styles.quickRefTitle}>Common Foods Quick Reference</Text>
            <View style={styles.quickRefGrid}>
              {[
                { name: 'Chocolate', safe: false, emoji: '🍫' },
                { name: 'Grapes', safe: false, emoji: '🍇' },
                { name: 'Apples', safe: true, emoji: '🍎' },
                { name: 'Carrots', safe: true, emoji: '🥕' },
                { name: 'Onions', safe: false, emoji: '🧅' },
                { name: 'Blueberries', safe: true, emoji: '🫐' },
              ].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickRefItem}
                  onPress={() => {
                    setFoodName(item.name);
                    handleCheckFood();
                  }}
                >
                  <Text style={styles.quickRefEmoji}>{item.emoji}</Text>
                  <Text style={styles.quickRefName}>{item.name}</Text>
                  <Text style={[
                    styles.quickRefStatus,
                    { color: item.safe ? '#34C759' : '#FF3B30' }
                  ]}>
                    {item.safe ? '✓' : '✗'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Upgrade CTA for free users */}
        {!user.isPremium && (
          <View style={styles.upgradeCTA}>
            <Text style={styles.upgradeTitle}>Want Unlimited Checks?</Text>
            <Text style={styles.upgradeText}>
              Upgrade to Premium for unlimited AI food safety checks, no ads, and more features!
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => navigation.navigate('Subscription')}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* AdMob Banner */}
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.xl,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  queryCounter: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
  },
  queryText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
    textAlign: 'center',
  },
  searchContainer: {
    padding: SPACING.xl,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  checkButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  checkButtonDisabled: {
    opacity: 0.5,
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    padding: SPACING.xl,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  resultEmoji: {
    fontSize: 50,
    marginRight: 16,
  },
  resultTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  resultFoodName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  safetyBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  safetyBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    color: COLORS.primary,
    marginRight: 12,
    fontWeight: 'bold',
  },
  listText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  adviceText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
  },
  disclaimer: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  disclaimerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  quickRefContainer: {
    padding: SPACING.xl,
  },
  quickRefTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  quickRefGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickRefItem: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickRefEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickRefName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  quickRefStatus: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  upgradeCTA: {
    margin: SPACING.xl,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  upgradeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
