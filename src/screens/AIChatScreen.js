import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { UserContext } from '../context/UserContext';
import { chatWithAI, checkQueryLimit, trackQueryUsage } from '../services/aiService';

/**
 * AI Chat Screen - FULLY IMPLEMENTED
 * Provides conversational emergency assistance and pet advice
 * 
 * Features:
 * - Real-time chat with AI assistant (DeepSeek/OpenAI/OpenRouter)
 * - Emergency scenario handling
 * - Personalized pet advice
 * - Query limit tracking for free users
 * - Conversation history context
 */
export default function AIChatScreen({ navigation }) {
  const context = useContext(UserContext);
  
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: '👋 Hi! I\'m your AI pet emergency assistant. How can I help your pet today?\n\nYou can ask me about:\n• Emergency symptoms\n• First aid guidance\n• Food safety questions\n• General pet care advice',
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const flatListRef = useRef(null);

  // Safety check for context
  if (!context) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: User context not available</Text>
          <Text style={styles.errorSubtext}>Please restart the app</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { user } = context;

  useEffect(() => {
    if (user) {
      loadRemainingQueries();
    }
  }, [user]);

  const loadRemainingQueries = async () => {
    try {
      if (!user?.id) {
        console.warn('No user ID available');
        return;
      }
      const limit = await checkQueryLimit(user.id, user.isPremium);
      setRemaining(limit.remaining);
    } catch (error) {
      console.error('Error loading remaining queries:', error);
      setRemaining(5); // Default to 5 on error
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    if (!user?.id) {
      Alert.alert('Error', 'User session not available. Please restart the app.');
      return;
    }

    // Check query limit for free users
    if (!user.isPremium) {
      try {
        const limit = await checkQueryLimit(user.id, user.isPremium);
        
        if (!limit.allowed) {
          Alert.alert(
            'Daily Limit Reached',
            'You\'ve used all 5 free AI queries today. Upgrade to Premium for unlimited queries!',
            [
              { text: 'Maybe Later', style: 'cancel' },
              { 
                text: 'Upgrade Now', 
                onPress: () => {
                  // Navigate to subscription screen
                  // Find the root navigator and navigate
                  navigation.getParent()?.navigate('Subscription');
                }
              }
            ]
          );
          return;
        }
      } catch (error) {
        console.error('Error checking limit:', error);
        // Allow the query to proceed if limit check fails
      }
    }

    const userMessage = {
      id: Date.now().toString(),
      text: inputText,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Call AI with conversation history for context
      const aiResponse = await chatWithAI(inputText, messages);

      // Track query usage
      if (!user.isPremium) {
        await trackQueryUsage(user.id);
        loadRemainingQueries(); // Refresh remaining count
      }

      const botResponse = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isBot: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error('AI Chat error:', error);
      
      let errorMessage = '⚠️ Unable to connect to AI assistant. ';
      
      if (error.message.includes('API keys not configured')) {
        errorMessage += 'The AI service is not configured yet. Please contact support.';
      } else if (error.message.includes('network')) {
        errorMessage += 'Please check your internet connection and try again.';
      } else {
        errorMessage += 'Please try again in a moment.';
      }

      const errorResponse = {
        id: (Date.now() + 1).toString(),
        text: errorMessage,
        isBot: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorResponse]);
      
      Alert.alert(
        'Connection Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.isBot ? styles.botBubble : styles.userBubble,
      ]}
    >
      <Text style={[styles.messageText, item.isBot ? styles.botText : styles.userText]}>
        {item.text}
      </Text>
      <Text style={styles.timestamp}>
        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  // Show loading state while user is being initialized
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="sparkles" size={24} color={COLORS.primary} />
          <Text style={styles.headerTitle}>AI Assistant</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Query Counter for Free Users */}
      {!user.isPremium && remaining !== null && (
        <View style={styles.queryCounterBanner}>
          <Text style={styles.queryCounterText}>
            {remaining} free AI {remaining === 1 ? 'query' : 'queries'} remaining today
          </Text>
          {remaining <= 1 && (
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate('Subscription')}
              style={styles.upgradeLink}
            >
              <Text style={styles.upgradeLinkText}>Upgrade</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>AI is thinking...</Text>
        </View>
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about your pet's emergency..."
            placeholderTextColor={COLORS.textLight}
            multiline
            maxLength={500}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons name="send" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ⚠️ AI-generated advice. Always consult your veterinarian for serious concerns.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  placeholder: {
    width: 40,
  },
  queryCounterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF3CD',
  },
  queryCounterText: {
    fontSize: 13,
    color: '#856404',
    fontWeight: '600',
  },
  upgradeLink: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  upgradeLinkText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  messagesList: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  botText: {
    color: COLORS.text,
  },
  userText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  disclaimer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  disclaimerText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
