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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { UserContext } from '../context/UserContext';
import { chatWithAI, checkQueryLimit, trackQueryUsage } from '../services/aiService';

export default function AIChatScreen({ navigation }) {
  const context = useContext(UserContext);
  const insets = useSafeAreaInsets();

  // Match tab bar height defined in MainTabNavigator to prevent overlap
  const tabBarHeight = Platform.select({
    ios: 50 + insets.bottom,
    android: 60 + Math.max(insets.bottom, 8),
  });

  const [messages, setMessages] = useState([
    {
      id: '1',
      text: "👑 Hi! I'm your AI pet emergency assistant. How can I help your pet today?\n\nYou can ask me about:\n• Emergency symptoms\n• First aid guidance\n• Food safety questions\n• General pet care advice",
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
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
      setRemaining(5);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    if (!user?.id) {
      Alert.alert('Error', 'User session not available. Please restart the app.');
      return;
    }

    if (!user.isPremium) {
      try {
        const limit = await checkQueryLimit(user.id, user.isPremium);
        if (!limit.allowed) {
          Alert.alert(
            'Daily Limit Reached',
            "You've used all 5 free AI queries today. Upgrade to Premium for unlimited queries!",
            [
              { text: 'Maybe Later', style: 'cancel' },
              {
                text: 'Upgrade Now',
                onPress: async () => {
                  const { navigateToSubscription } = await import('../utils/navigationHelper');
                  await navigateToSubscription(navigation);
                },
              },
            ]
          );
          return;
        }
      } catch (error) {
        console.error('Error checking limit:', error);
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
      const aiResponse = await chatWithAI(inputText, messages);

      if (!user.isPremium) {
        await trackQueryUsage(user.id);
        loadRemainingQueries();
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
      Alert.alert('Connection Error', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[styles.messageBubble, item.isBot ? styles.botBubble : styles.userBubble]}>
      <Text style={[styles.messageText, item.isBot ? styles.botText : styles.userText]}>
        {item.text}
      </Text>
      <Text style={[styles.timestamp, item.isBot ? styles.botTimestamp : styles.userTimestamp]}>
        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
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
          style={styles.messageListStyle}
          contentContainerStyle={styles.messagesList}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.aiLoadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>AI is thinking...</Text>
          </View>
        )}

        {/* Bottom Section: Input + Disclaimer */}
        <View style={[styles.bottomSection, { paddingBottom: tabBarHeight }]}>
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
              returnKeyType="default"
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              ⚠️ AI-generated advice. Always consult your veterinarian for serious concerns.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  keyboardAvoidingView: { flex: 1 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 18, fontWeight: 'bold', color: '#FF3B30', marginBottom: 8, textAlign: 'center' },
  errorSubtext: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  loadingContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary, marginLeft: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { padding: 8 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 8, color: COLORS.text },
  placeholder: { width: 40 },
  queryCounterBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF3CD' },
  queryCounterText: { fontSize: 13, color: '#856404', fontWeight: '600' },
  upgradeLink: { marginLeft: 12, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: COLORS.primary, borderRadius: 12 },
  upgradeLinkText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  messageListStyle: { flex: 1 },
  messagesList: { padding: 16, paddingBottom: 8 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 12 },
  botBubble: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border },
  userBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  messageText: { fontSize: 15, lineHeight: 22 },
  botText: { color: COLORS.text },
  userText: { color: '#FFFFFF' },
  timestamp: { fontSize: 10, marginTop: 4, opacity: 0.6 },
  botTimestamp: { color: COLORS.textSecondary },
  userTimestamp: { color: '#FFFFFF' },
  aiLoadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, backgroundColor: COLORS.background },
  bottomSection: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: COLORS.border },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  input: { flex: 1, fontSize: 15, backgroundColor: COLORS.background, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 10 : 8, paddingBottom: Platform.OS === 'ios' ? 10 : 8, marginRight: 8, maxHeight: 100, color: COLORS.text },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { opacity: 0.4 },
  disclaimer: { paddingHorizontal: 16, paddingBottom: 10 },
  disclaimerText: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
});
