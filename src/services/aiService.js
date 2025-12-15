/**
 * AI Service - Multi-LLM Support with Mock Fallback
 * Supports DeepSeek, OpenAI, and OpenRouter APIs
 * Falls back to mock responses if no API keys configured
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, waitForAuth } from './firebase';

// ✅ ADDED: Mock responses for testing without API keys
const MOCK_MODE = false; // Set to false when you have real API keys

/**
 * Mock AI responses for testing
 */
const getMockResponse = (message) => {
  const lowerMessage = message.toLowerCase();
  
  // Food safety mock responses
  if (lowerMessage.includes('chocolate')) {
    return {
      safetyLevel: 'toxic',
      emoji: '☠️',
      shortExplanation: 'Chocolate is highly toxic to dogs and can cause serious health issues or death.',
      symptoms: ['Vomiting', 'Diarrhea', 'Rapid heart rate', 'Seizures', 'Tremors'],
      advice: 'If your dog ate chocolate, contact your veterinarian or pet poison control immediately. Do not wait for symptoms to appear.'
    };
  } else if (lowerMessage.includes('grape') || lowerMessage.includes('raisin')) {
    return {
      safetyLevel: 'toxic',
      emoji: '🍇',
      shortExplanation: 'Grapes and raisins can cause sudden kidney failure in dogs, even in small amounts.',
      symptoms: ['Vomiting', 'Lethargy', 'Loss of appetite', 'Decreased urination', 'Abdominal pain'],
      advice: 'Contact your vet immediately if your dog consumed grapes or raisins. Kidney failure can develop within 24-72 hours.'
    };
  } else if (lowerMessage.includes('apple')) {
    return {
      safetyLevel: 'safe',
      emoji: '🍎',
      shortExplanation: 'Apples are safe and healthy for dogs in moderation. Remove seeds and core first.',
      symptoms: [],
      advice: 'Cut apples into bite-sized pieces and remove seeds (which contain cyanide). Great source of vitamins A and C!'
    };
  } else if (lowerMessage.includes('carrot')) {
    return {
      safetyLevel: 'safe',
      emoji: '🥕',
      shortExplanation: 'Carrots are excellent for dogs - low calorie and great for dental health.',
      symptoms: [],
      advice: 'Can be served raw or cooked. Raw carrots are great for cleaning teeth. Cut into appropriate sizes to prevent choking.'
    };
  } else if (lowerMessage.includes('onion') || lowerMessage.includes('garlic')) {
    return {
      safetyLevel: 'toxic',
      emoji: '🧅',
      shortExplanation: 'Onions and garlic are toxic to dogs and can damage red blood cells, causing anemia.',
      symptoms: ['Weakness', 'Pale gums', 'Rapid breathing', 'Orange or dark red urine', 'Vomiting'],
      advice: 'Contact your veterinarian if your dog consumed onions or garlic. Toxicity can be cumulative over time.'
    };
  }
  
  // Chat mock responses
  return 'I\'m a mock AI assistant. To use real AI, please configure API keys in Firebase. For now, I can provide basic information about pet emergencies. Try asking about specific foods like chocolate, grapes, apples, carrots, or onions!';
};

/**
 * Call AI with automatic LLM selection or mock fallback
 */
export const callAI = async (message, context = 'user') => {
  try {
    // ✅ If mock mode, return mock response immediately
    if (MOCK_MODE) {
      console.log('🧪 Using MOCK AI response');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      return getMockResponse(message);
    }

    // Real API mode
    await waitForAuth();
    
    if (!db) {
      throw new Error('Firebase not initialized properly');
    }
    
    // Get API keys from Firebase
    const configDoc = await getDoc(doc(db, 'config', 'apiKeys'));
    
    if (!configDoc.exists()) {
      console.warn('⚠️ No API keys configured, using mock responses');
      return getMockResponse(message);
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
      console.warn('⚠️ No API keys found, using mock responses');
      return getMockResponse(message);
    }
  } catch (error) {
    console.error('AI call error:', error);
    // ✅ Fallback to mock on error
    console.warn('⚠️ AI error, using mock response as fallback');
    return getMockResponse(message);
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
      model: 'gpt-4o-mini',
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
 * Call OpenRouter API
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
      model: 'anthropic/claude-3-haiku',
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
    
    // If response is already an object (mock mode), return it
    if (typeof response === 'object') {
      return response;
    }
    
    // Try to parse JSON response (real API mode)
    try {
      return JSON.parse(response);
    } catch (parseError) {
      console.warn('JSON parse failed, extracting from text:', response);
      
      // Fallback: create structured response from text
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
    // ✅ If mock mode, return mock response
    if (MOCK_MODE) {
      console.log('🧪 Using MOCK AI chat response');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      return getMockResponse(message);
    }

    // Real API mode
    await waitForAuth();
    
    if (!db) {
      throw new Error('Firebase not initialized properly');
    }
    
    // Build conversation context
    const messages = [{ role: 'system', content: systemPrompt }];

    // Add conversation history (last 5 messages)
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
      console.warn('⚠️ No API keys, using mock response');
      return getMockResponse(message);
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
      console.warn('⚠️ No API keys, using mock response');
      return getMockResponse(message);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Chat AI error:', error);
    // ✅ Fallback to mock on error
    return getMockResponse(message);
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
    await waitForAuth();
    
    if (!db) {
      console.warn('Firebase not initialized, allowing query');
      return { allowed: true, remaining: 5 };
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
    return { allowed: true, remaining: 5 };
  }
};

/**
 * Track AI query usage
 */
export const trackQueryUsage = async (userId) => {
  try {
    await waitForAuth();
    
    if (!db) {
      console.warn('Firebase not initialized, skipping usage tracking');
      return;
    }
    
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
  }
};
