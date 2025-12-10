import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import CryptoJS from 'crypto-js';

/**
 * AI Service - Client-side AI integration with Admin Panel API Keys
 * Reads encrypted API keys from Firestore (set via admin panel)
 */

const ENCRYPTION_KEY = 'pawguard-super-secret-key-2024'; // Must match admin panel
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

let cachedApiKey = null; // Cache the API key to avoid repeated Firestore reads

/**
 * Get DeepSeek API key from Firestore (set by admin panel)
 */
const getApiKey = async () => {
  if (cachedApiKey) {
    return cachedApiKey;
  }

  try {
    const docRef = doc(db, 'config', 'apiKeys');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('API keys not configured. Please contact admin.');
    }

    const encryptedKey = docSnap.data().deepseek;
    if (!encryptedKey) {
      throw new Error('DeepSeek API key not set. Please contact admin.');
    }

    // Decrypt the API key
    const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
    const decryptedKey = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedKey) {
      throw new Error('Failed to decrypt API key. Please contact admin.');
    }

    cachedApiKey = decryptedKey;
    return decryptedKey;
  } catch (error) {
    console.error('Error getting API key:', error);
    throw new Error('Failed to load AI configuration. Please try again later.');
  }
};

/**
 * Make AI request to DeepSeek API
 */
const makeAIRequest = async (messages) => {
  try {
    const apiKey = await getApiKey();
    
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI API Error:', error);
    throw new Error(error.message || 'Failed to get AI response. Please try again.');
  }
};

/**
 * Check and update query limit in Firestore
 */
const checkAndIncrementQuery = async (userId, isPremium) => {
  if (isPremium) {
    return { allowed: true, remaining: 999 };
  }

  const today = new Date().toISOString().split('T')[0];
  const usageRef = doc(db, 'aiUsage', userId);
  
  try {
    const usageSnap = await getDoc(usageRef);
    
    if (!usageSnap.exists()) {
      // First query today
      await setDoc(usageRef, {
        date: today,
        count: 1,
        lastQuery: new Date().toISOString(),
      });
      return { allowed: true, remaining: 4 };
    }

    const usage = usageSnap.data();
    
    // Check if it's a new day
    if (usage.date !== today) {
      // Reset counter for new day
      await setDoc(usageRef, {
        date: today,
        count: 1,
        lastQuery: new Date().toISOString(),
      });
      return { allowed: true, remaining: 4 };
    }

    // Check if limit reached
    if (usage.count >= 5) {
      return { allowed: false, remaining: 0 };
    }

    // Increment counter
    await updateDoc(usageRef, {
      count: increment(1),
      lastQuery: new Date().toISOString(),
    });

    return { allowed: true, remaining: 5 - usage.count - 1 };
  } catch (error) {
    console.error('Error checking query limit:', error);
    // Allow query on error to avoid blocking users
    return { allowed: true, remaining: 5 };
  }
};

/**
 * Log AI query to Firestore (for admin analytics)
 */
const logQuery = async (userId, type, query, response) => {
  try {
    const queryRef = doc(db, 'aiQueries', `${userId}_${Date.now()}`);
    await setDoc(queryRef, {
      userId,
      type,
      query: query.substring(0, 500), // Limit query length
      responseLength: response.length,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('Error logging query:', error);
    // Don't throw error - logging is optional
  }
};

/**
 * Check food safety using AI
 * @param {string} foodName - Name of the food to check
 * @param {string} userId - User ID for query tracking
 * @param {boolean} isPremium - Whether user is premium
 * @returns {Promise<Object>} Food safety information
 */
export const checkFoodSafety = async (foodName, userId, isPremium) => {
  try {
    // Check query limit
    const { allowed, remaining } = await checkAndIncrementQuery(userId, isPremium);
    if (!allowed) {
      throw new Error('Daily free queries limit reached (5/day). Upgrade to Premium for unlimited queries!');
    }

    // Check cache first
    const cacheRef = doc(db, 'foodCache', foodName.toLowerCase().trim());
    const cacheSnap = await getDoc(cacheRef);
    
    if (cacheSnap.exists()) {
      const cached = cacheSnap.data();
      console.log('✅ Returning cached result for:', foodName);
      return {
        ...cached,
        queriesRemaining: remaining,
        fromCache: true,
      };
    }

    // Make AI request
    const messages = [
      {
        role: 'system',
        content: 'You are a veterinary expert. Provide concise, accurate food safety information for pets (dogs/cats). Format: Safe/Unsafe/Caution, brief explanation (2-3 sentences), and key warnings if any.'
      },
      {
        role: 'user',
        content: `Is "${foodName}" safe for dogs and cats to eat? Provide a brief safety assessment.`
      }
    ];

    const aiResponse = await makeAIRequest(messages);

    // Save to cache
    const result = {
      foodName,
      response: aiResponse,
      timestamp: new Date().toISOString(),
      cachedDate: new Date().toISOString().split('T')[0],
    };

    await setDoc(cacheRef, result);

    // Log query
    await logQuery(userId, 'food_safety', foodName, aiResponse);

    return {
      ...result,
      queriesRemaining: remaining,
      fromCache: false,
    };
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
 * @param {boolean} isPremium - Whether user is premium
 * @returns {Promise<Object>} AI response
 */
export const sendChatMessage = async (message, conversationHistory, userId, isPremium) => {
  try {
    // Check query limit
    const { allowed, remaining } = await checkAndIncrementQuery(userId, isPremium);
    if (!allowed) {
      throw new Error('Daily free queries limit reached (5/day). Upgrade to Premium for unlimited queries!');
    }

    // Prepare messages (limit history to last 5 messages to save tokens)
    const recentHistory = conversationHistory.slice(-5);
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful pet emergency assistant. Provide clear, concise advice for pet emergencies and care questions. Always remind users to consult a veterinarian for serious issues. Keep responses brief (3-4 sentences).'
      },
      ...recentHistory,
      {
        role: 'user',
        content: message
      }
    ];

    const aiResponse = await makeAIRequest(messages);

    // Log query
    await logQuery(userId, 'chat', message, aiResponse);

    return {
      response: aiResponse,
      timestamp: new Date().toISOString(),
      queriesRemaining: remaining,
    };
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
 * @param {boolean} isPremium - Whether user is premium
 * @returns {Promise<Object>} Emergency guidance
 */
export const analyzeSymptoms = async (symptoms, petInfo, userId, isPremium) => {
  try {
    // Check query limit
    const { allowed, remaining } = await checkAndIncrementQuery(userId, isPremium);
    if (!allowed) {
      throw new Error('Daily free queries limit reached (5/day). Upgrade to Premium for unlimited queries!');
    }

    // Prepare message
    const petDetails = `${petInfo.breed || 'Unknown breed'}, ${petInfo.age || 'Unknown age'}, ${petInfo.weight || 'Unknown weight'}`;
    const symptomList = symptoms.join(', ');
    
    const messages = [
      {
        role: 'system',
        content: 'You are a veterinary emergency assistant. Analyze symptoms and provide immediate guidance. Format: 1) Severity (MILD/MODERATE/SEVERE), 2) Immediate actions (2-3 steps), 3) When to see vet. Keep response under 150 words.'
      },
      {
        role: 'user',
        content: `Pet: ${petDetails}. Symptoms: ${symptomList}. What should I do?`
      }
    ];

    const aiResponse = await makeAIRequest(messages);

    // Determine severity from response
    let severity = 'MODERATE';
    if (aiResponse.toUpperCase().includes('SEVERE') || aiResponse.toUpperCase().includes('EMERGENCY')) {
      severity = 'SEVERE';
    } else if (aiResponse.toUpperCase().includes('MILD')) {
      severity = 'MILD';
    }

    // Log query
    await logQuery(userId, 'symptom_analysis', symptomList, aiResponse);

    return {
      guidance: aiResponse,
      severity: severity,
      timestamp: new Date().toISOString(),
      queriesRemaining: remaining,
    };
  } catch (error) {
    console.error('Error analyzing symptoms:', error);
    throw error;
  }
};

/**
 * Get remaining AI queries for user
 * @param {string} userId - User ID
 * @param {boolean} isPremium - Whether user is premium
 * @returns {Promise<number>} Number of remaining queries
 */
export const getRemainingQueries = async (userId, isPremium) => {
  if (isPremium) {
    return 999; // Unlimited for premium
  }

  const today = new Date().toISOString().split('T')[0];
  const usageRef = doc(db, 'aiUsage', userId);
  
  try {
    const usageSnap = await getDoc(usageRef);
    
    if (!usageSnap.exists()) {
      return 5;
    }

    const usage = usageSnap.data();
    
    // Check if it's a new day
    if (usage.date !== today) {
      return 5;
    }

    return Math.max(0, 5 - usage.count);
  } catch (error) {
    console.error('Error getting remaining queries:', error);
    return 5;
  }
};
