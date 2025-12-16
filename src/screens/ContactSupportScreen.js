/**
 * Contact Support Screen
 * AI-powered support system with automatic email forwarding
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { handleSupportQuery, getUserSupportHistory } from '../services/supportService';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import AdBanner from '../components/AdBanner';

export default function ContactSupportScreen({ navigation }) {
  const { user } = useUser();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [response, setResponse] = useState(null);
  const [ticketHistory, setTicketHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadTicketHistory();
  }, []);

  const loadTicketHistory = async () => {
    try {
      const history = await getUserSupportHistory(user.userId, 5);
      setTicketHistory(history);
    } catch (error) {
      console.error('Error loading ticket history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!query.trim()) {
      Alert.alert('Required Field', 'Please describe your issue or question.');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter your name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address so we can respond to you.');
      return;
    }

    setLoading(true);
    setShowResponse(false);

    try {
      const result = await handleSupportQuery(
        user.userId,
        name.trim(),
        email.trim(),
        query.trim()
      );

      if (result.success) {
        setResponse(result);
        setShowResponse(true);
        
        // Clear form if forwarded to human
        if (result.needsHuman) {
          setQuery('');
        }

        // Reload history
        await loadTicketHistory();
      } else {
        Alert.alert(
          'Error',
          result.error || 'Unable to process your request. Please try again or email us directly at augustinemwathi96@gmail.com'
        );
      }
    } catch (error) {
      console.error('Error submitting support query:', error);
      Alert.alert(
        'Connection Error',
        'Unable to submit your query. Please check your internet connection or email us directly at augustinemwathi96@gmail.com'
      );
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = () => {
    const subject = 'PawGuard Support Request';
    const body = query.trim() || 'Please describe your issue here...';
    const url = `mailto:augustinemwathi96@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open email app. Please email us at: augustinemwathi96@gmail.com');
    });
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsSection}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      
      <TouchableOpacity style={styles.quickActionCard} onPress={sendEmail}>
        <View style={styles.quickActionIcon}>
          <Ionicons name="mail-outline" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.quickActionContent}>
          <Text style={styles.quickActionTitle}>Email Support</Text>
          <Text style={styles.quickActionSubtitle}>augustinemwathi96@gmail.com</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.quickActionCard}
        onPress={() => navigation.navigate('Emergency')}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: '#FFEBEE' }]}>
          <Ionicons name="medical" size={24} color="#FF3B30" />
        </View>
        <View style={styles.quickActionContent}>
          <Text style={styles.quickActionTitle}>Pet Emergency?</Text>
          <Text style={styles.quickActionSubtitle}>Access emergency guides</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const renderTicketHistory = () => {
    if (loadingHistory) {
      return (
        <View style={styles.historyLoading}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.historyLoadingText}>Loading history...</Text>
        </View>
      );
    }

    if (ticketHistory.length === 0) {
      return null;
    }

    return (
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Recent Tickets</Text>
        
        {ticketHistory.map((ticket) => (
          <View key={ticket.id} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTicketId}>#{ticket.ticketId?.substring(7, 17) || 'N/A'}</Text>
              <View style={[
                styles.historyStatus,
                { backgroundColor: ticket.status === 'resolved_ai' ? '#E8F5E9' : '#FFF3E0' }
              ]}>
                <Text style={[
                  styles.historyStatusText,
                  { color: ticket.status === 'resolved_ai' ? '#2E7D32' : '#F57C00' }
                ]}>
                  {ticket.status === 'resolved_ai' ? 'Resolved' : 'Pending'}
                </Text>
              </View>
            </View>
            <Text style={styles.historyQuery} numberOfLines={2}>
              {ticket.query}
            </Text>
            <Text style={styles.historyDate}>
              {new Date(ticket.createdAt).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.title}>📞 Contact Support</Text>
              <Text style={styles.subtitle}>We're here to help 24/7</Text>
            </View>
          </View>

          {/* AI Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="sparkles" size={20} color={COLORS.primary} />
            <Text style={styles.infoBannerText}>
              AI-powered support will try to answer instantly. Complex issues are forwarded to our team.
            </Text>
          </View>

          {/* Quick Actions */}
          {renderQuickActions()}

          {/* Contact Form */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Submit Your Question</Text>

            <Text style={styles.inputLabel}>Your Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />

            <Text style={styles.inputLabel}>Your Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="your.email@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <Text style={styles.inputLabel}>Your Question or Issue *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your issue or ask a question about PawGuard app..."
              value={query}
              onChangeText={setQuery}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Processing...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Submit Query</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* AI Response */}
          {showResponse && response && (
            <View style={styles.responseSection}>
              <View style={styles.responseHeader}>
                <Ionicons 
                  name={response.needsHuman ? "mail-outline" : "checkmark-circle"} 
                  size={24} 
                  color={response.needsHuman ? COLORS.primary : "#4CAF50"} 
                />
                <Text style={styles.responseTitle}>
                  {response.needsHuman ? 'Ticket Created' : 'AI Response'}
                </Text>
              </View>
              
              <View style={styles.responseContent}>
                <Text style={styles.responseText}>{response.message}</Text>
                
                {response.ticketId && (
                  <View style={styles.ticketIdContainer}>
                    <Text style={styles.ticketIdLabel}>Ticket ID:</Text>
                    <Text style={styles.ticketId}>#{response.ticketId.substring(7, 17)}</Text>
                  </View>
                )}

                {!response.needsHuman && (
                  <View style={styles.helpfulSection}>
                    <Text style={styles.helpfulText}>Was this helpful?</Text>
                    <View style={styles.helpfulButtons}>
                      <TouchableOpacity style={styles.helpfulButton}>
                        <Ionicons name="thumbs-up-outline" size={20} color={COLORS.primary} />
                        <Text style={styles.helpfulButtonText}>Yes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.helpfulButton}>
                        <Ionicons name="thumbs-down-outline" size={20} color={COLORS.textSecondary} />
                        <Text style={styles.helpfulButtonText}>No</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Ticket History */}
          {renderTicketHistory()}

          {/* FAQ Section */}
          <View style={styles.faqSection}>
            <Text style={styles.sectionTitle}>Common Questions</Text>
            
            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>How do I upgrade to Premium?</Text>
              <Text style={styles.faqAnswer}>
                Go to Pet Profile → Settings (if available) or tap the subscription banner on any screen.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>How many AI queries do I get for free?</Text>
              <Text style={styles.faqAnswer}>
                Free users get 5 AI Food Checker queries per day. Premium users get unlimited queries.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>How do I find nearby vets?</Text>
              <Text style={styles.faqAnswer}>
                Go to Pet Profile screen → Emergency Help section → "Find Nearby Vets" button. Make sure location permission is enabled.
              </Text>
            </View>
          </View>

          {/* Contact Info */}
          <View style={styles.contactInfo}>
            <Text style={styles.contactInfoTitle}>Direct Contact</Text>
            <Text style={styles.contactInfoText}>
              📧 augustinemwathi96@gmail.com
            </Text>
            <Text style={styles.contactInfoSubtext}>
              We respond within 24 hours
            </Text>
          </View>
        </ScrollView>

        {/* AdMob Banner */}
        {!user.isPremium && <AdBanner />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: SPACING.md,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  quickActionsSection: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  formSection: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
    gap: 8,
    ...SHADOWS.medium,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  responseSection: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: '#F5F5F5',
    gap: 8,
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  responseContent: {
    padding: SPACING.md,
  },
  responseText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  ticketIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: '#F5F5F5',
    borderRadius: BORDER_RADIUS.sm,
    gap: 8,
  },
  ticketIdLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  ticketId: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  helpfulSection: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  helpfulText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  helpfulButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: BORDER_RADIUS.md,
    gap: 6,
  },
  helpfulButtonText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  historySection: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  historyLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    gap: 8,
  },
  historyLoadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTicketId: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyQuery: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  faqSection: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  contactInfo: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: '#E8F5E9',
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  contactInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  contactInfoText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactInfoSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
