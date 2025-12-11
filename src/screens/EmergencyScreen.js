/**
 * Emergency Screen - Complete Implementation
 * Displays emergency scenarios with AI-generated content
 * Includes search, filter, and step-by-step guides
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { getEmergencyScenarios } from '../services/contentService';
import AdBanner from '../components/AdBanner';

export default function EmergencyScreen({ navigation, route }) {
  const [scenarios, setScenarios] = useState([]);
  const [filteredScenarios, setFilteredScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const categories = ['All', 'Poisoning', 'Breathing', 'Injury', 'Heatstroke', 'Seizure', 'Bleeding', 'Choking', 'Other'];

  useEffect(() => {
    loadEmergencyScenarios();
  }, []);

  // Handle filter from navigation params (when coming from Home screen)
  useEffect(() => {
    if (route.params?.filter) {
      setSelectedCategory(route.params.filter);
    }
  }, [route.params?.filter]);

  useEffect(() => {
    filterScenarios();
  }, [searchQuery, selectedCategory, scenarios]);

  const loadEmergencyScenarios = async () => {
    try {
      setLoading(true);
      const data = await getEmergencyScenarios();
      setScenarios(data);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterScenarios = () => {
    let filtered = scenarios;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(s => s.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(query) ||
        s.symptoms.some(symptom => symptom.toLowerCase().includes(query))
      );
    }

    setFilteredScenarios(filtered);
  };

  const openScenarioModal = (scenario) => {
    setSelectedScenario(scenario);
    setModalVisible(true);
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#FF3B30';
      case 'urgent': return '#FF9500';
      case 'moderate': return '#FF8C61';
      default: return COLORS.text;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading emergency guides...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🚨 Emergency Help</Text>
        <Text style={styles.subtitle}>{filteredScenarios.length} scenarios available</Text>
      </View>

      {/* Search Bar - FIXED */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search emergency or symptom..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter - FIXED: Better spacing */}
      <View style={styles.categoryWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Emergency Scenarios List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 120 }} // Space for tab bar + ad banner
      >
        {filteredScenarios.map((scenario) => (
          <TouchableOpacity
            key={scenario.id}
            style={styles.scenarioCard}
            onPress={() => openScenarioModal(scenario)}
            activeOpacity={0.7}
          >
            <View style={styles.scenarioHeader}>
              <Text style={styles.scenarioEmoji}>{scenario.illustration || '🚨'}</Text>
              <View style={styles.scenarioInfo}>
                <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                <View style={[
                  styles.severityBadge,
                  { backgroundColor: getSeverityColor(scenario.severity) + '20' }
                ]}>
                  <Text style={[
                    styles.severityText,
                    { color: getSeverityColor(scenario.severity) }
                  ]}>
                    {scenario.severity?.toUpperCase() || 'MODERATE'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.symptomsContainer}>
              {scenario.symptoms.slice(0, 3).map((symptom, index) => (
                <View key={index} style={styles.symptomPill}>
                  <Text style={styles.symptomText}>{symptom}</Text>
                </View>
              ))}
              {scenario.symptoms.length > 3 && (
                <Text style={styles.moreSymptoms}>+{scenario.symptoms.length - 3} more</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {filteredScenarios.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>No emergencies found</Text>
            <Text style={styles.emptySubtext}>Try different search terms or category</Text>
          </View>
        )}
      </ScrollView>

      {/* AdMob Banner */}
      <AdBanner />

      {/* Scenario Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {selectedScenario && (
            <>
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.modalEmoji}>{selectedScenario.illustration || '🚨'}</Text>
                <Text style={styles.modalTitle}>{selectedScenario.title}</Text>
                <View style={[
                  styles.modalSeverityBadge,
                  { backgroundColor: getSeverityColor(selectedScenario.severity) }
                ]}>
                  <Text style={styles.modalSeverityText}>
                    {selectedScenario.severity?.toUpperCase() || 'MODERATE'}
                  </Text>
                </View>
              </View>

              <ScrollView style={styles.modalContent}>
                {/* Symptoms */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>🔍 Symptoms</Text>
                  {selectedScenario.symptoms.map((symptom, index) => (
                    <View key={index} style={styles.listItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.listText}>{symptom}</Text>
                    </View>
                  ))}
                </View>

                {/* Emergency Steps */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>⚡ What To Do RIGHT NOW</Text>
                  {selectedScenario.steps.map((step, index) => (
                    <View key={index} style={styles.stepCard}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>

                {/* Prevention Tips */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>🛡️ Prevention Tips</Text>
                  {selectedScenario.preventionTips.map((tip, index) => (
                    <View key={index} style={styles.listItem}>
                      <Text style={styles.bullet}>✓</Text>
                      <Text style={styles.listText}>{tip}</Text>
                    </View>
                  ))}
                </View>

                {/* Emergency Disclaimer */}
                <View style={styles.disclaimer}>
                  <Text style={styles.disclaimerText}>
                    ⚠️ This is emergency guidance only. Always contact your veterinarian or emergency vet clinic immediately for any serious condition.
                  </Text>
                </View>
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    padding: SPACING.xl,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#FFFFFF',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
  },
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: SPACING.md,
  },
  categoryContent: {
    paddingHorizontal: SPACING.lg,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    padding: SPACING.lg,
  },
  scenarioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  scenarioHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  scenarioEmoji: {
    fontSize: 40,
    marginRight: 12,
  },
  scenarioInfo: {
    flex: 1,
  },
  scenarioTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  severityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  symptomsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomPill: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  symptomText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  moreSymptoms: {
    fontSize: 13,
    color: COLORS.primary,
    paddingVertical: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalSeverityBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalSeverityText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    padding: SPACING.xl,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 12,
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
  stepCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  disclaimer: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
    categoryWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: SPACING.sm,
  },
  categoryContent: {
    paddingHorizontal: SPACING.lg,
    gap: 8,
  },
});
