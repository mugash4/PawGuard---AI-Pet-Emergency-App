import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * AI Service - Handles all AI-related operations
 * Uses Firebase Cloud Functions to securely interact with DeepSeek/OpenAI APIs
 */

/**
 * Check food safety using AI
 * @param {string} foodName - Name of the food to check
 * @param {string} userId - User ID for query tracking
 * @returns {Promise<Object>} Food safety information
 */
export const checkFoodSafety = async (foodName, userId) => {
  try {
    const checkFood = httpsCallable(functions, 'checkFoodSafety');
    const result = await checkFood({ foodName, userId });
    return result.data;
  } catch (error) {
    console.error('Error checking food safety:', error);
    throw error;
  }
};

/**
 * Send message to AI chat assistant
 * @param {string} message - User's message
 * @param {Array} conversationHistory - Previous messages for context
 * @param {string} userId - User ID
 * @returns {Promise<Object>} AI response
 */
export const sendChatMessage = async (message, conversationHistory, userId) => {
  try {
    const chat = httpsCallable(functions, 'aiChat');
    const result = await chat({
      message,
      conversationHistory,
      userId,
    });
    return result.data;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
};

/**
 * Analyze symptoms and provide emergency guidance
 * @param {Array<string>} symptoms - List of observed symptoms
 * @param {Object} petInfo - Pet information (breed, age, weight)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Emergency guidance
 */
export const analyzeSymptoms = async (symptoms, petInfo, userId) => {
  try {
    const analyze = httpsCallable(functions, 'analyzeSymptoms');
    const result = await analyze({
      symptoms,
      petInfo,
      userId,
    });
    return result.data;
  } catch (error) {
    console.error('Error analyzing symptoms:', error);
    throw error;
  }
};

/**
 * Get remaining AI queries for free users
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of remaining queries
 */
export const getRemainingQueries = async (userId) => {
  try {
    const getQueries = httpsCallable(functions, 'getRemainingAIQueries');
    const result = await getQueries({ userId });
    return result.data.remaining;
  } catch (error) {
    console.error('Error getting remaining queries:', error);
    return 0;
  }
};
