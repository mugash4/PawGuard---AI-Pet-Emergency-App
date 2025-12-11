import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import CryptoJS from 'crypto-js';

/**
 * AI Service - Client-side AI integration with Admin Panel API Keys
 * Reads encrypted API keys from Firestore (set via admin panel)
 * Supports DeepSeek, OpenAI, and OpenRouter APIs
 */

const ENCRYPTION_KEY = 'pawguard-super-secret-key-2024'; // Must match admin panel
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

let cachedApiKeys = null; // Cache the API keys to avoid repeated Firestore reads

/**
 * Decrypt API key from Firestore
 */
const decryptApiKey = (encryptedKey) => {
  if (!encryptedKey) return null;
  
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

/**
 * Get API keys from Firestore (set by admin panel)
 */
const getApiKeys = async () => {
  if (cachedApiKeys) {
    return cachedApiKeys;
  }

  try {
    const docRef = doc(db, 'config', 'apiKeys');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('API keys not configured. Please contact admin.');
    }

    const data = docSnap.data();
    
    // Decrypt API keys
    cachedApiKeys = {
      deepseek: data.deepseek ? decryptApiKey(data.deepseek) : null,
      openai: data.openai ? decryptApiKey(data.openai) : null,
      openrouter: data.openrouter ? decryptApiKey(data.openrouter) : null,
    };

    console.log('🔑 API Keys status:', {
      deepseek: cachedApiKeys.deepseek ? '✓ Available' : '✗ Missing',
      openai: cachedApiKeys.openai ? '✓ Available' : '✗ Missing',
      openrouter: cachedApiKeys.openrouter ? '✓ Available' : '✗ Missing'
    });

    // Validate at least one key is available
    if (!cachedApiKeys.deepseek && !cachedApiKeys.openai && !cachedApiKeys.openrouter) {
      throw new Error('No AI API keys configured. Please add API keys in admin panel.');
    }

    return cachedApiKeys;
  } catch (error) {
    console.error('Error getting API keys:', error);
    throw new Error('Failed to load AI configuration. Please try again later.');
  }
};

/**
 * Make AI request to available API
 */
const makeAIRequest = async (messages) => {
  try {
    const apiKeys = await getApiKeys();
    
    // Try LLMs in order: DeepSeek -> OpenRouter -> OpenAI
    if (apiKeys.deepseek) {
      console.log('🤖 Using DeepSeek API');
      return await callDeepSeek(messages, apiKeys.deepseek);
    } else if (apiKeys.openrouter) {
      console.log('🤖 Using OpenRouter API');
      return await callOpenRouter(messages, apiKeys.openrouter);
    } else if (apiKeys.openai) {
      console.log('🤖 Using OpenAI API');
      return await callOpenAI(messages, apiKeys.openai);
    } else {
      throw new Error('No AI API keys configured. Please add API keys in admin panel.');
    }
  } catch (error) {
    console.error('AI API Error:', error);
    throw new Error(error.message || 'Failed to get AI response. Please try again.');
  }
};

/**
 * Call DeepSeek API
 */
async function callDeepSeek(messages, apiKey) {
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek call failed:', error);
    throw error;
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(messages, apiKey) {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI call failed:', error);
    throw error;
  }
}

/**
 * Call OpenRouter API
 */
async function callOpenRouter(messages, apiKey) {
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://pawguard.app',
        'X-Title': 'PawGuard Pet Emergency App'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter call failed:', error);
    throw error;
  }
}

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
      await setDoc(usageRef, {
        date: today,
        count: 1,
        lastQuery: new Date().toISOString(),
      });
      return { allowed: true, remaining: 4 };
    }

    const usage = usageSnap.data();
    
    if (usage.date !== today) {
      await setDoc(usageRef, {
        date: today,
        count: 1,
        lastQuery: new Date().toISOString(),
      });
      return { allowed: true, remaining: 4 };
    }

    if (usage.count >= 5) {
      return { allowed: false, remaining: 0 };
    }

    await updateDoc(usageRef, {
      count: increment(1),
      lastQuery: new Date().toISOString(),
    });

    return { allowed: true, remaining: 5 - usage.count - 1 };
  } catch (error) {
    console.error('Error checking query limit:', error);
    return { allowed: true, remaining: 5 };
  }
};

/**
 * Log AI query to Firestore
 */
const logQuery = async (userId, type, query, response) => {
  try {
    const queryRef = doc(db, 'aiQueries', `${userId}_${Date.now()}`);
    await setDoc(queryRef, {
      userId,
      type,
      query: query.substring(0, 500),
      responseLength: response.length,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('Error logging query:', error);
  }
};

/**
 * Check food safety using AI
 */
export const checkFoodSafety = async (foodName, userId, isPremium) => {
  try {
    const { allowed, remaining } = await checkAndIncrementQuery(userId, isPremium);
    if (!allowed) {
      throw new Error('Daily free queries limit reached (5/day). Upgrade to Premium for unlimited queries!');
    }

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

    const messages = [
      {
        role: 'system',
        content: 'You are a veterinary expert. Provide food safety information for pets (dogs/cats) in JSON format: {"safetyLevel": "safe|caution|toxic", "emoji": "relevant emoji", "shortExplanation": "2-3 sentences", "symptoms": ["symptom1", "symptom2"], "advice": "what to do"}'
      },
      {
        role: 'user',
        content: `Is "${foodName}" safe for dogs and cats to eat?`
      }
    ];

    const aiResponse = await makeAIRequest(messages);

    let result;
    try {
      result = JSON.parse(aiResponse);
    } catch (parseError) {
      console.warn('AI response not in JSON format, parsing manually');
      
      const isSafe = aiResponse.toLowerCase().includes('safe') && 
                     !aiResponse.toLowerCase().includes('not safe') &&
                     !aiResponse.toLowerCase().includes('toxic');
      const isToxic = aiResponse.toLowerCase().includes('toxic') || 
                      aiResponse.toLowerCase().includes('dangerous') ||
                      aiResponse.toLowerCase().includes('poisonous');
      
      result = {
        safetyLevel: isToxic ? 'toxic' : (isSafe ? 'safe' : 'caution'),
        emoji: isToxic ? '☠️' : (isSafe ? '✅' : '⚠️'),
        shortExplanation: aiResponse.substring(0, 200),
        symptoms: [],
        advice: isToxic ? 'Contact your veterinarian immediately.' : 'Monitor your pet and consult vet if concerned.'
      };
    }

    const cacheData = {
      foodName,
      ...result,
      timestamp: new Date().toISOString(),
      cachedDate: new Date().toISOString().split('T')[0],
    };

    await setDoc(cacheRef, cacheData);
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
 */
export const sendChatMessage = async (message, conversationHistory, userId, isPremium) => {
  try {
    const { allowed, remaining } = await checkAndIncrementQuery(userId, isPremium);
    if (!allowed) {
      throw new Error('Daily free queries limit reached (5/day). Upgrade to Premium for unlimited queries!');
    }

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
 */
export const analyzeSymptoms = async (symptoms, petInfo, userId, isPremium) => {
  try {
    const { allowed, remaining } = await checkAndIncrementQuery(userId, isPremium);
    if (!allowed) {
      throw new Error('Daily free queries limit reached (5/day). Upgrade to Premium for unlimited queries!');
    }

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

    let severity = 'MODERATE';
    if (aiResponse.toUpperCase().includes('SEVERE') || aiResponse.toUpperCase().includes('EMERGENCY')) {
      severity = 'SEVERE';
    } else if (aiResponse.toUpperCase().includes('MILD')) {
      severity = 'MILD';
    }

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
 */
export const getRemainingQueries = async (userId, isPremium) => {
  if (isPremium) {
    return 999;
  }

  const today = new Date().toISOString().split('T')[0];
  const usageRef = doc(db, 'aiUsage', userId);
  
  try {
    const usageSnap = await getDoc(usageRef);
    
    if (!usageSnap.exists()) {
      return 5;
    }

    const usage = usageSnap.data();
    
    if (usage.date !== today) {
      return 5;
    }

    return Math.max(0, 5 - usage.count);
  } catch (error) {
    console.error('Error getting remaining queries:', error);
    return 5;
  }
};

/**
 * Check query limit without incrementing
 */
export const checkQueryLimit = async (userId, isPremium) => {
  if (isPremium) {
    return { allowed: true, remaining: 999 };
  }

  const today = new Date().toISOString().split('T')[0];
  const usageRef = doc(db, 'aiUsage', userId);
  
  try {
    const usageSnap = await getDoc(usageRef);
    
    if (!usageSnap.exists()) {
      return { allowed: true, remaining: 5 };
    }

    const usage = usageSnap.data();
    
    if (usage.date !== today) {
      return { allowed: true, remaining: 5 };
    }

    const remaining = Math.max(0, 5 - usage.count);
    return { 
      allowed: usage.count < 5, 
      remaining: remaining 
    };
  } catch (error) {
    console.error('Error checking query limit:', error);
    return { allowed: true, remaining: 5 };
  }
};

/**
 * Track AI query usage
 */
export const trackQueryUsage = async (userId) => {
  const today = new Date().toISOString().split('T')[0];
  const usageRef = doc(db, 'aiUsage', userId);
  
  try {
    const usageSnap = await getDoc(usageRef);
    
    if (!usageSnap.exists()) {
      await setDoc(usageRef, {
        date: today,
        count: 1,
        lastQuery: new Date().toISOString(),
      });
    } else {
      const usage = usageSnap.data();
      
      if (usage.date !== today) {
        await setDoc(usageRef, {
          date: today,
          count: 1,
          lastQuery: new Date().toISOString(),
        });
      } else {
        await updateDoc(usageRef, {
          count: increment(1),
          lastQuery: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error('Error tracking query usage:', error);
  }
};
