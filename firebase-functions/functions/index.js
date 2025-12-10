const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

/**
 * Get API Keys from Firestore (Admin-managed)
 */
async function getAPIKey(keyName) {
  try {
    const doc = await db.collection('config').doc('apiKeys').get();
    if (!doc.exists) {
      throw new Error('API keys not configured');
    }
    const keys = doc.data();
    return keys[keyName];
  } catch (error) {
    console.error('Error fetching API key:', error);
    throw new Error('Configuration error');
  }
}

/**
 * Check if user is premium
 */
async function isPremiumUser(userId) {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return false;
  const userData = userDoc.data();
  return userData.isPremium === true;
}

/**
 * Check and decrement AI query limit for free users
 */
async function checkAndDecrementQuery(userId) {
  const isPremium = await isPremiumUser(userId);
  if (isPremium) return true; // Premium users have unlimited queries

  const today = new Date().toISOString().split('T')[0];
  const queryRef = db.collection('aiQueries').doc(`${userId}_${today}`);
  
  return db.runTransaction(async (transaction) => {
    const queryDoc = await transaction.get(queryRef);
    const currentCount = queryDoc.exists ? queryDoc.data().count : 0;
    
    if (currentCount >= 5) {
      throw new Error('Daily query limit reached. Upgrade to Premium for unlimited access.');
    }
    
    transaction.set(queryRef, {
      count: currentCount + 1,
      date: today,
      userId: userId,
    }, { merge: true });
    
    return true;
  });
}

/**
 * Get remaining AI queries for the day
 */
exports.getRemainingAIQueries = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const isPremium = await isPremiumUser(userId);
  
  if (isPremium) {
    return { remaining: 999, isPremium: true };
  }

  const today = new Date().toISOString().split('T')[0];
  const queryDoc = await db.collection('aiQueries').doc(`${userId}_${today}`).get();
  const currentCount = queryDoc.exists ? queryDoc.data().count : 0;
  
  return {
    remaining: Math.max(0, 5 - currentCount),
    isPremium: false,
    limit: 5,
  };
});

/**
 * AI Food Safety Checker
 * Uses DeepSeek API to check if food is safe for dogs
 */
exports.checkFoodSafety = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { foodName, userId } = data;
  
  if (!foodName) {
    throw new functions.https.HttpsError('invalid-argument', 'Food name is required');
  }

  try {
    // Check query limit
    await checkAndDecrementQuery(userId);

    // Check cache first
    const cacheRef = db.collection('foodCache').doc(foodName.toLowerCase());
    const cacheDoc = await cacheRef.get();
    
    if (cacheDoc.exists) {
      console.log('Returning cached result for:', foodName);
      return cacheDoc.data();
    }

    // Get API key from Firestore
    const apiKey = await getAPIKey('deepseek');

    // Call DeepSeek API
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a veterinary nutrition expert. Analyze food safety for dogs. Respond in JSON format: {"safetyLevel": "safe/caution/toxic", "reasoning": "brief explanation", "symptoms": ["symptom1", "symptom2"], "advice": "what to do"}',
          },
          {
            role: 'user',
            content: `Is "${foodName}" safe for dogs to eat?`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    const result = JSON.parse(aiResponse);
    
    // Cache the result
    await cacheRef.set({
      ...result,
      foodName: foodName,
      cachedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return result;
  } catch (error) {
    console.error('Error in checkFoodSafety:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * AI Chat Assistant
 * Provides conversational emergency guidance
 */
exports.aiChat = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { message, conversationHistory, userId } = data;
  
  if (!message) {
    throw new functions.https.HttpsError('invalid-argument', 'Message is required');
  }

  try {
    // Check query limit
    await checkAndDecrementQuery(userId);

    // Get API key
    const apiKey = await getAPIKey('deepseek');

    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: `You are an emergency pet care assistant. Provide clear, concise advice for dog emergencies. 
        Always prioritize veterinary care for serious situations. Be empathetic but direct. 
        If unsure, recommend immediate veterinary consultation.`,
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message,
      },
    ];

    // Call DeepSeek API
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 800,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiReply = response.data.choices[0].message.content;

    return {
      reply: aiReply,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error in aiChat:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Analyze Symptoms
 * Provides emergency guidance based on symptoms
 */
exports.analyzeSymptoms = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { symptoms, petInfo, userId } = data;
  
  if (!symptoms || symptoms.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Symptoms are required');
  }

  try {
    await checkAndDecrementQuery(userId);

    const apiKey = await getAPIKey('deepseek');

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are a veterinary triage assistant. Analyze symptoms and provide emergency guidance in JSON format: 
            {"urgency": "immediate/urgent/moderate", "possibleConditions": ["condition1"], "immediateActions": ["action1"], "veterinaryAdvice": "advice"}`,
          },
          {
            role: 'user',
            content: `Dog symptoms: ${symptoms.join(', ')}. Pet info: ${JSON.stringify(petInfo)}. What should the owner do?`,
          },
        ],
        temperature: 0.3,
        max_tokens: 600,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    const result = JSON.parse(aiResponse);

    return result;
  } catch (error) {
    console.error('Error in analyzeSymptoms:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
