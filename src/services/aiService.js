/**
 * AI Service - Multi-LLM Support
 * Supports DeepSeek, OpenAI, and OpenRouter APIs
 * Secure API key management via Firebase
 */

import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

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
    
    // Try LLMs in order: OpenRouter -> DeepSeek -> OpenAI
    if (apiKeys.openrouter) {
      return await callOpenRouter(message, apiKeys.openrouter);
    } else if (apiKeys.deepseek) {
      return await callDeepSeek(message, apiKeys.deepseek);
    } else if (apiKeys.openai) {
      return await callOpenAI(message, apiKeys.openai);
    } else {
      throw new Error('No AI API keys configured');
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
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(message, apiKey) {
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
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Call OpenRouter API (supports 100+ models)
 */
async function callOpenRouter(message, apiKey) {
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
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
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

  const response = await callAI(prompt, 'user');
  return JSON.parse(response);
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

  const response = await callAI(prompt, 'user');
  return JSON.parse(response);
};

/**
 * Check and decrement AI query limit for free users
 */
export const checkQueryLimit = async (userId, isPremium) => {
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
};

/**
 * Track AI query usage
 */
export const trackQueryUsage = async (userId) => {
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
};
