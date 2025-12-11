/**
 * Knowledge & Quiz Screen - Full Implementation
 * Educational content with quizzes and AI chat feature
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { getKnowledgeArticles, getQuizQuestions } from '../services/contentService';
import { chatWithAI, checkQueryLimit, trackQueryUsage } from '../services/aiService';
import AdBanner from '../components/AdBanner';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '../constants/theme';
import UpgradePrompt from '../components/UpgradePrompt';

export default function KnowledgeScreen({ navigation }) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('articles'); // 'articles' | 'quiz' | 'chat'
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleModalVisible, setArticleModalVisible] = useState(false);
  
  // Quiz state
  const [quizCategory, setQuizCategory] = useState('First Aid');
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [quizActive, setQuizActive] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  
  // AI Chat state
  const [chatVisible, setChatVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    loadKnowledgeArticles();
  }, []);

  const loadKnowledgeArticles = async () => {
    try {
      setLoading(true);
      const data = await getKnowledgeArticles();
      // Filter articles based on user premium status
      const filtered = user?.isPremium 
        ? data 
        : data.filter(article => !article.isPremium);
      setArticles(filtered);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const openArticle = (article) => {
    setSelectedArticle(article);
    setArticleModalVisible(true);
  };

  const startQuiz = async () => {
    try {
      setLoading(true);
      const questions = await getQuizQuestions(quizCategory);
      setQuizQuestions(questions);
      setCurrentQuestion(0);
      setScore(0);
      setQuizActive(true);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } catch (error) {
      console.error('Error loading quiz:', error);
      alert('Failed to load quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex) => {
    if (showExplanation) return; // Already answered
    
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    
    if (answerIndex === quizQuestions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      // Quiz finished
      setQuizActive(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    // Check query limit
    const limit = await checkQueryLimit(user.userId, user.isPremium);
    if (!limit.allowed) {
      alert('Daily AI query limit reached. Upgrade to Premium for unlimited queries!');
      return;
    }

    {!user?.isPremium && chatMessages.filter(m => m.role === 'user').length >= 3 && (
      <UpgradePrompt
        message="Enjoying AI Chat? Upgrade for unlimited conversations!"
        feature="unlimited AI chat"
      />
    )}


    const userMessage = { role: 'user', content: chatInput.trim() };
    setChatMessages([...chatMessages, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await chatWithAI(userMessage.content, chatMessages);
      const aiMessage = { role: 'assistant', content: response };
      setChatMessages(prev => [...prev, aiMessage]);
      await trackQueryUsage(user.userId);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading && articles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📚 Knowledge & Quiz</Text>
        <Text style={styles.subtitle}>Learn about pet care</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'articles' && styles.tabActive]}
          onPress={() => setActiveTab('articles')}
        >
          <Ionicons 
            name="book" 
            size={20} 
            color={activeTab === 'articles' ? '#FFFFFF' : COLORS.text} 
          />
          <Text style={[styles.tabText, activeTab === 'articles' && styles.tabTextActive]}>
            Articles
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'quiz' && styles.tabActive]}
          onPress={() => setActiveTab('quiz')}
        >
          <Ionicons 
            name="help-circle" 
            size={20} 
            color={activeTab === 'quiz' ? '#FFFFFF' : COLORS.text} 
          />
          <Text style={[styles.tabText, activeTab === 'quiz' && styles.tabTextActive]}>
            Quiz
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
          onPress={() => setActiveTab('chat')}
        >
          <Ionicons 
            name="chatbubbles" 
            size={20} 
            color={activeTab === 'chat' ? '#FFFFFF' : COLORS.text} 
          />
          <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
            AI Chat
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Articles Tab */}
        {activeTab === 'articles' && (
          <View>
            {articles.map((article) => (
              <TouchableOpacity
                key={article.id}
                style={styles.articleCard}
                onPress={() => openArticle(article)}
              >
                <Text style={styles.articleIcon}>{article.icon}</Text>
                <View style={styles.articleContent}>
                  <Text style={styles.articleTitle}>{article.title}</Text>
                  <Text style={styles.articleSummary} numberOfLines={2}>
                    {article.summary}
                  </Text>
                  <View style={styles.articleFooter}>
                    <Text style={styles.articleCategory}>{article.category}</Text>
                    {article.isPremium && (
                      <View style={styles.premiumBadge}>
                        <Ionicons name="star" size={12} color={COLORS.premium} />
                        <Text style={styles.premiumText}>PRO</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && !quizActive && (
          <View style={styles.quizStart}>
            <Text style={styles.quizTitle}>Test Your Knowledge! 🎯</Text>
            <Text style={styles.quizDescription}>
              Choose a category and take a quick quiz to test your pet care knowledge.
            </Text>

            <View style={styles.categoryGrid}>
              {['First Aid', 'Nutrition', 'Health', 'Behavior & Training', 'Daily Care'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryCard,
                    quizCategory === cat && styles.categoryCardActive
                  ]}
                  onPress={() => setQuizCategory(cat)}
                >
                  <Text style={styles.categoryCardText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.startButton} onPress={startQuiz}>
              <Text style={styles.startButtonText}>Start Quiz</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quiz Active */}
        {activeTab === 'quiz' && quizActive && quizQuestions.length > 0 && (
          <View style={styles.quizActive}>
            <View style={styles.quizProgress}>
              <Text style={styles.quizProgressText}>
                Question {currentQuestion + 1}/{quizQuestions.length}
              </Text>
              <Text style={styles.quizScore}>Score: {score}</Text>
            </View>

            <Text style={styles.questionText}>
              {quizQuestions[currentQuestion].question}
            </Text>

            <View style={styles.optionsContainer}>
              {quizQuestions[currentQuestion].options.map((option, index) => {
                const isCorrect = index === quizQuestions[currentQuestion].correctAnswer;
                const isSelected = index === selectedAnswer;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionButton,
                      isSelected && showExplanation && isCorrect && styles.optionCorrect,
                      isSelected && showExplanation && !isCorrect && styles.optionWrong,
                    ]}
                    onPress={() => handleAnswerSelect(index)}
                    disabled={showExplanation}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {showExplanation && (
              <View style={styles.explanationBox}>
                <Text style={styles.explanationText}>
                  {quizQuestions[currentQuestion].explanation}
                </Text>
                <TouchableOpacity style={styles.nextButton} onPress={nextQuestion}>
                  <Text style={styles.nextButtonText}>
                    {currentQuestion < quizQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Quiz Results */}
        {activeTab === 'quiz' && !quizActive && quizQuestions.length > 0 && (
          <View style={styles.quizResults}>
            <Text style={styles.resultsEmoji}>
              {score === quizQuestions.length ? '🏆' : score >= quizQuestions.length * 0.7 ? '🎉' : '📚'}
            </Text>
            <Text style={styles.resultsTitle}>Quiz Complete!</Text>
            <Text style={styles.resultsScore}>
              Your Score: {score}/{quizQuestions.length}
            </Text>
            <Text style={styles.resultsPercentage}>
              {Math.round((score / quizQuestions.length) * 100)}% Correct
            </Text>
            <TouchableOpacity style={styles.retakeButton} onPress={startQuiz}>
              <Text style={styles.retakeButtonText}>Take Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AI Chat Tab */}
        {activeTab === 'chat' && (
          <View style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <Ionicons name="chatbubbles" size={24} color={COLORS.primary} />
              <Text style={styles.chatHeaderText}>Ask me anything about pet care!</Text>
            </View>

            {chatMessages.length === 0 && (
              <View style={styles.chatEmpty}>
                <Text style={styles.chatEmptyText}>
                  Start a conversation! I can help with pet emergencies, nutrition, health questions, and more.
                </Text>
              </View>
            )}

            <View style={styles.chatMessages}>
              {chatMessages.map((msg, index) => (
                <View
                  key={index}
                  style={[
                    styles.chatBubble,
                    msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAI
                  ]}
                >
                  <Text style={styles.chatBubbleText}>{msg.content}</Text>
                </View>
              ))}
              {chatLoading && (
                <View style={[styles.chatBubble, styles.chatBubbleAI]}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              )}
            </View>

            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatTextInput}
                placeholder="Type your question..."
                placeholderTextColor={COLORS.textSecondary}
                value={chatInput}
                onChangeText={setChatInput}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.chatSendButton, !chatInput.trim() && styles.chatSendButtonDisabled]}
                onPress={sendChatMessage}
                disabled={!chatInput.trim() || chatLoading}
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {!user?.isPremium && (
              <Text style={styles.chatLimitText}>
                {chatMessages.filter(m => m.role === 'user').length}/5 free messages today
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating AI Chat Button (when not on chat tab) */}
      {activeTab !== 'chat' && (
        <TouchableOpacity
          style={styles.floatingChatButton}
          onPress={() => setActiveTab('chat')}
        >
          <Ionicons name="chatbubbles" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* AdMob Banner */}
      <AdBanner />

      {/* Article Modal */}
      <Modal
        visible={articleModalVisible}
        animationType="slide"
        onRequestClose={() => setArticleModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {selectedArticle && (
            <>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setArticleModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.modalIcon}>{selectedArticle.icon}</Text>
                <Text style={styles.modalTitle}>{selectedArticle.title}</Text>
              </View>

              <ScrollView style={styles.modalContent}>
                <Text style={styles.articleText}>{selectedArticle.content}</Text>

                <View style={styles.keyTakeawaysSection}>
                  <Text style={styles.sectionTitle}>📌 Key Takeaways</Text>
                  {selectedArticle.keyTakeaways.map((takeaway, index) => (
                    <View key={index} style={styles.takeawayItem}>
                      <Text style={styles.takeawayBullet}>•</Text>
                      <Text style={styles.takeawayText}>{takeaway}</Text>
                    </View>
                  ))}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  articleIcon: {
    fontSize: 40,
    marginRight: SPACING.md,
  },
  articleContent: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  articleSummary: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  articleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  articleCategory: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF9E5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.premium,
  },
  quizStart: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.medium,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  quizDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  categoryCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  categoryCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  quizActive: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.medium,
  },
  quizProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quizProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  quizScore: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    lineHeight: 28,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCorrect: {
    borderColor: '#34C759',
    backgroundColor: '#34C759' + '10',
  },
  optionWrong: {
    borderColor: '#FF3B30',
    backgroundColor: '#FF3B30' + '10',
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  explanationBox: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
  },
  explanationText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  quizResults: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  resultsEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  resultsScore: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  resultsPercentage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  retakeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  chatHeaderText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  chatEmpty: {
    backgroundColor: '#E3F2FD',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  chatEmptyText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    textAlign: 'center',
  },
  chatMessages: {
    gap: 12,
    marginBottom: SPACING.md,
  },
  chatBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
  },
  chatBubbleAI: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    ...SHADOWS.small,
  },
  chatBubbleText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  chatInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    maxHeight: 100,
    ...SHADOWS.small,
  },
  chatSendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatSendButtonDisabled: {
    opacity: 0.5,
  },
  chatLimitText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  floatingChatButton: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
    elevation: 8,
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
  modalIcon: {
    fontSize: 60,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    padding: SPACING.xl,
  },
  articleText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 26,
    marginBottom: 32,
  },
  keyTakeawaysSection: {
    backgroundColor: '#E3F2FD',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  takeawayItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  takeawayBullet: {
    fontSize: 16,
    color: COLORS.primary,
    marginRight: 12,
    fontWeight: 'bold',
  },
  takeawayText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
  },
});
