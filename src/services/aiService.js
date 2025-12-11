/**
 * AI Service - Multi-LLM Support
 * Supports DeepSeek, OpenAI, and OpenRouter APIs
 * Secure API key management via Firebase
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import CryptoJS from 'crypto-js';

// Encryption key for API keys (stored securely in your admin panel)
const ENCRYPTION_KEY = 'pawguard-super-secret-key-2024';

/**
 * Decrypt API key from Firebase
 */
const decryptApiKey = (encryptedKey) => {
  try {
    if (!encryptedKey) return null;
    
    // If already decrypted (for backward compatibility)
    if (!encryptedKey.includes('U2F')) {
      return encryptedKey;
    }
    
    const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedKey; // Return as-is if decryption fails
  }
};

/**
 * Call AI with automatic LLM selection
 * @param {string} message - The prompt/message
 * @param {string} context - 'user' | 'system' - determines if query counts against limit
 * @returns {Promise<string>} AI response
 */
export const callAI = async (message, context = 'user') => {
  try {
    // Get API keys from Firebase (set by admin)
    const configDoc = await getDoc(doc(db, 'config', 'apiKeys'));
    
    if (!configDoc.exists()) {
      throw new Error('API keys not configured. Please contact admin.');
    }

    const apiKeys = configDoc.data();
    
    // Decrypt API keys
    const deepseekKey = apiKeys.deepseek ? decryptApiKey(apiKeys.deepseek) : null;
    const openaiKey = apiKeys.openai ? decryptApiKey(apiKeys.openai) : null;
    const openrouterKey = apiKeys.openrouter ? decryptApiKey(apiKeys.openrouter) : null;
    
    console.log('🔑 API Keys status:', {
      deepseek: deepseekKey ? '✓ Available' : '✗ Missing',
      openai: openaiKey ? '✓ Available' : '✗ Missing',
      openrouter: openrouterKey ? '✓ Available' : '✗ Missing'
    });
    
    // Try LLMs in order: DeepSeek -> OpenRouter -> OpenAI
    if (deepseekKey) {
      console.log('🤖 Using DeepSeek API');
      return await callDeepSeek(message, deepseekKey);
    } else if (openrouterKey) {
      console.log('🤖 Using OpenRouter API');
      return await callOpenRouter(message, openrouterKey);
    } else if (openaiKey) {
      console.log('🤖 Using OpenAI API');
      return await callOpenAI(message, openaiKey);
    } else {
      throw new Error('No AI API keys configured. Please add API keys in admin panel.');
    }
  } catch (error) {
    console.error('AI call error:', error);
    throw error;
  }
};

/**
 * Call DeepSeek API
 */
async function callDeepSeek(message, apiKey) {
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful pet care assistant. Provide brief, accurate, actionable advice.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      throw new Error(`DeepSeek API error: ${response.status}`);
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
async function callOpenAI(message, apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cost-effective model
        messages: [
          {
            role: 'system',
            content: 'You are a helpful pet care assistant. Provide brief, accurate, actionable advice.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI call failed:', error);
    throw error;
  }
}

/**
 * Call OpenRouter API (supports 100+ models)
 */
async function callOpenRouter(message, apiKey) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://pawguard.app',
        'X-Title': 'PawGuard Pet Emergency App'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku', // Fast and cost-effective
        messages: [
          {
            role: 'system',
            content: 'You are a helpful pet care assistant. Provide brief, accurate, actionable advice.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter call failed:', error);
    throw error;
  }
}

/**
 * Check food safety using AI
 */
export const checkFoodSafety = async (foodName) => {
  const prompt = `Is "${foodName}" safe for dogs to eat? Respond in JSON format:
{
  "safetyLevel": "safe" | "caution" | "toxic",
  "emoji": "relevant emoji",
  "shortExplanation": "1-2 sentences",
  "symptoms": ["symptom1", "symptom2"],
  "advice": "what to do"
}

Keep it brief and actionable.`;

  try {
    const response = await callAI(prompt, 'user');
    
    // Try to parse JSON response
    try {
      return JSON.parse(response);
    } catch (parseError) {
      // If AI didn't return valid JSON, extract info manually
      console.warn('AI response not in JSON format, parsing manually');
      
      // Create a structured response from the text
      const isSafe = response.toLowerCase().includes('safe') && 
                     !response.toLowerCase().includes('not safe') &&
                     !response.toLowerCase().includes('toxic');
      const isToxic = response.toLowerCase().includes('toxic') || 
                      response.toLowerCase().includes('dangerous') ||
                      response.toLowerCase().includes('poisonous');
      
      return {
        safetyLevel: isToxic ? 'toxic' : (isSafe ? 'safe' : 'caution'),
        emoji: isToxic ? '☠️' : (isSafe ? '✅' : '⚠️'),
        shortExplanation: response.substring(0, 200),
        symptoms: [],
        advice: isToxic ? 'Contact your veterinarian immediately.' : 'Monitor your dog and consult vet if concerned.'
      };
    }
  } catch (error) {
    console.error('Food safety check error:', error);
    throw error;
  }
};

/**
 * AI Chat for emergencies
 */
export const chatWithAI = async (message, conversationHistory = []) => {
  const context = conversationHistory
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');
  
  const fullPrompt = context 
    ? `Previous conversation:\n${context}\n\nUser: ${message}`
    : message;

  return await callAI(fullPrompt, 'user');
};

/**
 * Analyze symptoms
 */
export const analyzeSymptoms = async (symptoms) => {
  const prompt = `Dog is showing these symptoms: ${symptoms.join(', ')}. 
Provide emergency guidance in JSON format:
{
  "urgency": "critical" | "urgent" | "moderate",
  "possibleConditions": ["condition1", "condition2"],
  "immediateActions": ["action1", "action2"],
  "whenToSeeVet": "guidance on vet visit timing"
}

Be concise and prioritize safety.`;

  try {
    const response = await callAI(prompt, 'user');
    try {
      return JSON.parse(response);
    } catch (parseError) {
      // Fallback structured response
      return {
        urgency: 'urgent',
        possibleConditions: ['Unknown condition'],
        immediateActions: ['Monitor closely', 'Contact veterinarian'],
        whenToSeeVet: 'As soon as possible'
      };
    }
  } catch (error) {
    console.error('Symptom analysis error:', error);
    throw error;
  }
};

/**
 * Check and decrement AI query limit for free users
 */
export const checkQueryLimit = async (userId, isPremium) => {
  try {
    if (isPremium) {
      return { allowed: true, remaining: 999 };
    }

    // Check daily limit (5 queries for free users)
    const today = new Date().toISOString().split('T')[0];
    const queryDoc = await getDoc(doc(db, 'aiQueries', `${userId}_${today}`));
    
    const currentCount = queryDoc.exists() ? queryDoc.data().count : 0;
    
    if (currentCount >= 5) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: 5 - currentCount };
  } catch (error) {
    console.error('Error checking query limit:', error);
    // On error, allow the query but log the issue
    return { allowed: true, remaining: 5 };
  }
};

/**
 * Track AI query usage
 */
export const trackQueryUsage = async (userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const queryRef = doc(db, 'aiQueries', `${userId}_${today}`);
    const queryDoc = await getDoc(queryRef);
    
    const currentCount = queryDoc.exists() ? queryDoc.data().count : 0;
    
    await setDoc(queryRef, {
      count: currentCount + 1,
      date: today,
      userId: userId,
      lastQuery: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error tracking query usage:', error);
    // Don't throw error - usage tracking failure shouldn't break the app
  }
};
