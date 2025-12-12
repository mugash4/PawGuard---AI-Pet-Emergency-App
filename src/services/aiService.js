/**
 * AI Service - Multi-LLM Support
 * Supports DeepSeek, OpenAI, and OpenRouter APIs
 * Secure API key management via Firebase
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, waitForAuth } from './firebase';

/**
 * Call AI with automatic LLM selection
 * @param {string} message - The prompt/message
 * @param {string} context - 'user' | 'system' - determines if query counts against limit
 * @returns {Promise<string>} AI response
 */
export const callAI = async (message, context = 'user') => {
  try {
    // ✅ WAIT for authentication to complete
    await waitForAuth();
    
    // Get API keys from Firebase (set by admin)
    const configDoc = await getDoc(doc(db, 'config', 'apiKeys'));
    
    if (!configDoc.exists()) {
      throw new Error('API keys not configured. Please contact admin.');
    }

    const apiKeys = configDoc.data();
    
    // Try LLMs in order: DeepSeek -> OpenRouter -> OpenAI
    if (apiKeys.deepseek) {
      return await callDeepSeek(message, apiKeys.deepseek);
    } else if (apiKeys.openrouter) {
      return await callOpenRouter(message, apiKeys.openrouter);
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
          content: 'You are a helpful pet care assistant specialized in dog health and emergencies. Provide brief, accurate, actionable advice. Always prioritize pet safety and recommend veterinary consultation when necessary.'
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
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
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
          content: 'You are a helpful pet care assistant specialized in dog health and emergencies. Provide brief, accurate, actionable advice. Always prioritize pet safety and recommend veterinary consultation when necessary.'
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
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
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
          content: 'You are a helpful pet care assistant specialized in dog health and emergencies. Provide brief, accurate, actionable advice. Always prioritize pet safety and recommend veterinary consultation when necessary.'
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
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
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

  try {
    const response = await callAI(prompt, 'user');
    
    // Try to parse JSON response
    try {
      return JSON.parse(response);
    } catch (parseError) {
      // If JSON parsing fails, extract structured data from text
      console.warn('JSON parse failed, extracting from text:', response);
      
      // Fallback: create structured response
      return {
        safetyLevel: response.toLowerCase().includes('toxic') || response.toLowerCase().includes('dangerous') ? 'toxic' :
                     response.toLowerCase().includes('caution') || response.toLowerCase().includes('careful') ? 'caution' : 'safe',
        emoji: response.toLowerCase().includes('toxic') ? '☠️' : 
               response.toLowerCase().includes('caution') ? '⚠️' : '✅',
        shortExplanation: response.substring(0, 200),
        symptoms: [],
        advice: 'Consult with your veterinarian for specific guidance.'
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
  const systemPrompt = `You are a helpful pet emergency assistant for dog owners. Provide clear, concise, actionable advice for pet emergencies and general care questions. Always prioritize pet safety and recommend veterinary consultation when necessary.

If the situation seems serious or life-threatening, immediately advise contacting a veterinarian or emergency vet clinic.

Keep responses brief (2-4 sentences) unless more detail is specifically requested.`;

  try {
    // ✅ WAIT for authentication to complete
    await waitForAuth();
    
    // Build conversation context
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history (last 5 messages to keep context manageable)
    const recentHistory = conversationHistory.slice(-5);
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.isBot ? 'assistant' : 'user',
        content: msg.text
      });
    });

    // Add current message
    messages.push({ role: 'user', content: message });

    // Get API keys from Firebase
    const configDoc = await getDoc(doc(db, 'config', 'apiKeys'));
    
    if (!configDoc.exists()) {
      throw new Error('API keys not configured. Please contact admin.');
    }

    const apiKeys = configDoc.data();

    // Call appropriate API
    let response;
    if (apiKeys.deepseek) {
      response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys.deepseek}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000
        })
      });
    } else if (apiKeys.openrouter) {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys.openrouter}`,
          'HTTP-Referer': 'https://pawguard.app',
          'X-Title': 'PawGuard Pet Emergency App'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku',
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000
        })
      });
    } else if (apiKeys.openai) {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys.openai}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000
        })
      });
    } else {
      throw new Error('No AI API keys configured');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Chat AI error:', error);
    throw error;
  }
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
      console.warn('JSON parse failed for symptoms, using fallback');
      return {
        urgency: 'urgent',
        possibleConditions: ['Unknown condition - requires veterinary examination'],
        immediateActions: ['Contact veterinarian immediately', 'Keep pet calm and comfortable'],
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
  if (isPremium) {
    return { allowed: true, remaining: 999 };
  }

  try {
    // ✅ WAIT for authentication to complete
    await waitForAuth();
    
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
    // On error, allow the query but return cautious remaining count
    return { allowed: true, remaining: 5 };
  }
};

/**
 * Track AI query usage
 */
export const trackQueryUsage = async (userId) => {
  try {
    // ✅ WAIT for authentication to complete
    await waitForAuth();
    
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
    // Don't throw - tracking is not critical
  }
};
