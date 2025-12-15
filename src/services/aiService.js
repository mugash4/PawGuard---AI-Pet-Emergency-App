/**
 * AI Service - Multi-LLM Support with SIMPLIFIED API Key Handling
 * Supports DeepSeek, OpenAI, and OpenRouter APIs
 * CRITICAL FIX: Better encryption handling with detailed logging
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, waitForAuth } from './firebase';
import CryptoJS from 'crypto-js';

// CRITICAL FIX: Decryption key for API keys stored in Firebase
// This should match the encryption key used in your admin panel
const DECRYPTION_KEY = 'pawguard-super-secret-key-2024';

/**
 * Decrypt API key from Firebase
 * @param {string} encryptedKey - Encrypted API key from Firebase
 * @returns {string} Decrypted API key
 */
function decryptApiKey(encryptedKey) {
  try {
    if (!encryptedKey || encryptedKey.trim() === '') {
      console.error('❌ Empty API key provided');
      throw new Error('Empty API key');
    }

    // Check if key is already plain text (starts with common API key prefixes)
    const plainTextPrefixes = ['sk-', 'key-', 'Bearer ', 'api-'];
    const isPlainText = plainTextPrefixes.some(prefix => encryptedKey.startsWith(prefix));
    
    if (isPlainText) {
      console.log('✅ Using plain text API key (detected prefix)');
      return encryptedKey.trim();
    }

    // Check if it looks like encrypted text (contains 'U2FsdGVk' which is base64 for 'Salted')
    if (!encryptedKey.includes('U2FsdGVk')) {
      // Might be plain text without prefix
      console.log('✅ Using plain text API key (no encryption signature)');
      return encryptedKey.trim();
    }

    // Attempt decryption
    console.log('🔓 Attempting to decrypt API key...');
    const bytes = CryptoJS.AES.decrypt(encryptedKey, DECRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted || decrypted.trim() === '') {
      console.error('❌ Decryption resulted in empty string');
      console.error('This usually means the encryption key is wrong');
      // Try returning original key as last resort
      console.log('⚠️ Using original key as fallback');
      return encryptedKey.trim();
    }

    console.log('✅ API key decrypted successfully');
    console.log(`Key length: ${decrypted.length} characters`);
    return decrypted.trim();
  } catch (error) {
    console.error('❌ API key decryption error:', error.message);
    console.error('Stack:', error.stack);
    // Return the original key if decryption fails
    console.log('⚠️ Returning original key due to error');
    return encryptedKey.trim();
  }
}

/**
 * Get and decrypt API keys from Firebase
 * @returns {Promise<Object>} Decrypted API keys
 */
async function getApiKeys() {
  try {
    console.log('');
    console.log('═══════════════════════════════════');
    console.log('🔑 FETCHING API KEYS FROM FIREBASE');
    console.log('═══════════════════════════════════');
    
    // Wait for authentication to complete
    console.log('⏳ Waiting for Firebase auth...');
    await waitForAuth();
    console.log('✅ Firebase auth ready');
    
    // Ensure db is available
    if (!db) {
      throw new Error('Firebase database not initialized. Please check your Firebase configuration in src/services/firebase.js');
    }
    
    console.log('📡 Fetching from Firestore: config/apiKeys');
    
    // Get API keys from Firebase
    const configDoc = await getDoc(doc(db, 'config', 'apiKeys'));
    
    if (!configDoc.exists()) {
      console.error('❌ Document config/apiKeys does NOT exist!');
      console.error('');
      console.error('SETUP INSTRUCTIONS:');
      console.error('1. Open Firebase Console: https://console.firebase.google.com');
      console.error('2. Select your project: pawguard-ee74c');
      console.error('3. Go to Firestore Database');
      console.error('4. Create collection: "config"');
      console.error('5. Create document with ID: "apiKeys"');
      console.error('6. Add field: "deepseek" with your DeepSeek API key');
      console.error('   (Get key from: https://platform.deepseek.com)');
      console.error('');
      throw new Error('API keys not configured in Firebase. See console for setup instructions.');
    }

    const data = configDoc.data();
    console.log('✅ Document retrieved');
    console.log('📦 Available fields:', Object.keys(data));
    
    // Log field values (first 10 chars only for security)
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (typeof value === 'string') {
        console.log(`   - ${key}: "${value.substring(0, 10)}..." (${value.length} chars)`);
      } else {
        console.log(`   - ${key}: ${typeof value}`);
      }
    });
    
    // CRITICAL FIX: Decrypt all API keys before use
    const decryptedKeys = {};
    
    if (data.deepseek) {
      try {
        console.log('🔓 Decrypting DeepSeek key...');
        decryptedKeys.deepseek = decryptApiKey(data.deepseek);
        console.log('✅ DeepSeek API key ready');
      } catch (error) {
        console.error('⚠️ DeepSeek key decryption failed:', error.message);
      }
    } else {
      console.warn('⚠️ No "deepseek" field found');
    }
    
    if (data.openai) {
      try {
        console.log('🔓 Decrypting OpenAI key...');
        decryptedKeys.openai = decryptApiKey(data.openai);
        console.log('✅ OpenAI API key ready');
      } catch (error) {
        console.warn('⚠️ OpenAI key decryption failed:', error.message);
      }
    }
    
    if (data.openrouter) {
      try {
        console.log('🔓 Decrypting OpenRouter key...');
        decryptedKeys.openrouter = decryptApiKey(data.openrouter);
        console.log('✅ OpenRouter API key ready');
      } catch (error) {
        console.warn('⚠️ OpenRouter key decryption failed:', error.message);
      }
    }
    
    // Check if at least one key is available
    if (!decryptedKeys.deepseek && !decryptedKeys.openai && !decryptedKeys.openrouter) {
      console.error('❌ No valid AI API keys found!');
      console.error('Available fields in document:', Object.keys(data).join(', '));
      console.error('Expected fields: deepseek, openai, or openrouter');
      console.error('');
      throw new Error('No AI API keys configured. Please add "deepseek", "openai", or "openrouter" field to config/apiKeys document in Firebase.');
    }
    
    console.log('═══════════════════════════════════');
    console.log('✅ API KEYS LOADED SUCCESSFULLY');
    console.log('═══════════════════════════════════');
    console.log('');
    
    return decryptedKeys;
  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════');
    console.error('❌ FAILED TO GET API KEYS');
    console.error('═══════════════════════════════════');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('═══════════════════════════════════');
    console.error('');
    throw error;
  }
}

/**
 * Call AI with automatic LLM selection
 * @param {string} message - The prompt/message
 * @param {string} context - 'user' | 'system' - determines if query counts against limit
 * @returns {Promise<string>} AI response
 */
export const callAI = async (message, context = 'user') => {
  try {
    // Get decrypted API keys
    const apiKeys = await getApiKeys();
    
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
    console.error('❌ AI call error:', error);
    throw error;
  }
};

/**
 * Call DeepSeek API
 */
async function callDeepSeek(message, apiKey) {
  console.log('🤖 Calling DeepSeek API...');
  console.log(`📝 Message length: ${message.length} characters`);
  
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

    console.log(`📡 DeepSeek API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DeepSeek API error response:', errorText);
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ DeepSeek response received');
    console.log(`📝 Response length: ${data.choices[0].message.content.length} characters`);
    return data.choices[0].message.content;
  } catch (error) {
    console.error('❌ DeepSeek API call failed:', error.message);
    throw error;
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(message, apiKey) {
  console.log('🤖 Calling OpenAI API...');
  
  try {
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
      console.error('❌ OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ OpenAI response received');
    return data.choices[0].message.content;
  } catch (error) {
    console.error('❌ OpenAI API call failed:', error.message);
    throw error;
  }
}

/**
 * Call OpenRouter API (supports 100+ models)
 */
async function callOpenRouter(message, apiKey) {
  console.log('🤖 Calling OpenRouter API...');
  
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
      console.error('❌ OpenRouter API error:', errorText);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ OpenRouter response received');
    return data.choices[0].message.content;
  } catch (error) {
    console.error('❌ OpenRouter API call failed:', error.message);
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
    console.log(`🍖 Checking food safety for: ${foodName}`);
    const response = await callAI(prompt, 'user');
    
    // Try to parse JSON response
    try {
      // Clean up response - remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '').trim();
      }
      
      const parsed = JSON.parse(cleanedResponse);
      console.log('✅ Food safety check successful');
      return parsed;
    } catch (parseError) {
      // If JSON parsing fails, extract structured data from text
      console.warn('⚠️ JSON parse failed, extracting from text');
      console.log('Response was:', response);
      
      // Fallback: create structured response
      return {
        safetyLevel: response.toLowerCase().includes('toxic') || response.toLowerCase().includes('dangerous') || response.toLowerCase().includes('poisonous') ? 'toxic' :
                     response.toLowerCase().includes('caution') || response.toLowerCase().includes('careful') || response.toLowerCase().includes('moderation') ? 'caution' : 'safe',
        emoji: response.toLowerCase().includes('toxic') || response.toLowerCase().includes('dangerous') ? '☠️' : 
               response.toLowerCase().includes('caution') || response.toLowerCase().includes('careful') ? '⚠️' : '✅',
        shortExplanation: response.substring(0, 200) + '...',
        symptoms: [],
        advice: 'Consult with your veterinarian for specific guidance about your pet.'
      };
    }
  } catch (error) {
    console.error('❌ Food safety check error:', error);
    throw error;
  }
};

/**
 * AI Chat for emergencies - FIXED VERSION
 * Now correctly handles conversation history
 */
export const chatWithAI = async (message, conversationHistory = []) => {
  const systemPrompt = `You are a helpful pet emergency assistant for dog owners. Provide clear, concise, actionable advice for pet emergencies and general care questions. Always prioritize pet safety and recommend veterinary consultation when necessary.

If the situation seems serious or life-threatening, immediately advise contacting a veterinarian or emergency vet clinic.

Keep responses brief (2-4 sentences) unless more detail is specifically requested.`;

  try {
    console.log('💬 Starting AI chat...');
    
    // Get decrypted API keys
    const apiKeys = await getApiKeys();

    // Build conversation context
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // FIXED: Handle both message formats (from KnowledgeScreen and AIChatScreen)
    // Add conversation history (last 10 messages to keep context manageable)
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-10);
      recentHistory.forEach(msg => {
        // Handle different message formats
        if (msg.role) {
          // Format from KnowledgeScreen: {role: 'user' | 'assistant', content: string}
          messages.push({
            role: msg.role,
            content: msg.content
          });
        } else if (msg.isBot !== undefined) {
          // Format from AIChatScreen: {isBot: boolean, text: string}
          messages.push({
            role: msg.isBot ? 'assistant' : 'user',
            content: msg.text
          });
        }
      });
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    console.log(`📨 Sending ${messages.length} messages to AI`);

    // Call appropriate API with decrypted key
    let response;
    if (apiKeys.deepseek) {
      console.log('🤖 Using DeepSeek API');
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
      console.log('🤖 Using OpenRouter API');
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
      console.log('🤖 Using OpenAI API');
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
      console.error('❌ AI API error:', errorText);
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ AI chat response received');
    return data.choices[0].message.content;
  } catch (error) {
    console.error('❌ Chat AI error:', error);
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
    console.log('🩺 Analyzing symptoms...');
    const response = await callAI(prompt, 'user');
    
    try {
      // Clean up response - remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '').trim();
      }
      
      const parsed = JSON.parse(cleanedResponse);
      console.log('✅ Symptom analysis successful');
      return parsed;
    } catch (parseError) {
      console.warn('⚠️ JSON parse failed for symptoms, using fallback');
      return {
        urgency: 'urgent',
        possibleConditions: ['Unknown condition - requires veterinary examination'],
        immediateActions: ['Contact veterinarian immediately', 'Keep pet calm and comfortable', 'Monitor symptoms closely'],
        whenToSeeVet: 'As soon as possible - within the next few hours'
      };
    }
  } catch (error) {
    console.error('❌ Symptom analysis error:', error);
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
    // Wait for authentication to complete
    await waitForAuth();
    
    // Ensure db is available
    if (!db) {
      console.warn('⚠️ Firebase not initialized, allowing query');
      return { allowed: true, remaining: 5 };
    }
    
    // Check daily limit (5 queries for free users)
    const today = new Date().toISOString().split('T')[0];
    const queryDocRef = doc(db, 'aiQueries', `${userId}_${today}`);
    const queryDoc = await getDoc(queryDocRef);
    
    const currentCount = queryDoc.exists() ? queryDoc.data().count : 0;
    
    if (currentCount >= 5) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: 5 - currentCount };
  } catch (error) {
    console.error('❌ Error checking query limit:', error);
    // On error, allow the query but return cautious remaining count
    return { allowed: true, remaining: 5 };
  }
};

/**
 * Track AI query usage
 */
export const trackQueryUsage = async (userId) => {
  try {
    // Wait for authentication to complete
    await waitForAuth();
    
    // Ensure db is available
    if (!db) {
      console.warn('⚠️ Firebase not initialized, skipping usage tracking');
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
    
    console.log(`✅ Query usage tracked: ${currentCount + 1}/5`);
  } catch (error) {
    console.error('❌ Error tracking query usage:', error);
    // Don't throw - tracking is not critical
  }
};
