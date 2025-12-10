# 🔥 Firebase Cloud Functions Setup Guide

This guide explains how to set up the backend Firebase Cloud Functions for PawGuard's AI features.

---

## 📋 What Cloud Functions Do

Cloud Functions provide the secure backend for:

1. **AI Food Safety Checker** - Calls DeepSeek API securely
2. **AI Emergency Chat** - Handles conversational AI
3. **API Key Management** - Admin-only API key storage/retrieval
4. **User Management** - Track usage limits, premium status

---

## 🚀 Initial Setup

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
firebase login
```

### Step 3: Initialize Functions

In your PawGuard project directory:

```bash
firebase init functions
```

**Choose:**
- Use an existing project → Select your PawGuard project
- Language: **JavaScript**
- ESLint: **No** (or Yes if you prefer)
- Install dependencies: **Yes**

This creates a `functions/` folder.

---

## 📁 Functions Structure

Your `functions/` folder will contain:

```
functions/
├── index.js           # Main Cloud Functions file
├── package.json       # Dependencies
├── .gitignore
└── node_modules/
```

---

## 🔑 Setting Environment Variables

Cloud Functions need API keys but should NEVER have them in code.

### Method 1: Firebase Config (Recommended for now)

```bash
firebase functions:config:set deepseek.key="YOUR_DEEPSEEK_API_KEY"
firebase functions:config:set encryption.key="GENERATE_32_CHAR_KEY"
```

### Method 2: Admin Panel (Future)

The admin panel will allow you to set API keys through a web interface, stored encrypted in Firestore.

---

## 💻 Sample Functions Code

### Basic Structure (`functions/index.js`)

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();

// Check Food Safety with AI
exports.queryFoodSafety = functions.https.onCall(async (data, context) => {
  const { foodName, userId, isPremium } = data;

  try {
    // Check cache first
    const cacheRef = admin.firestore()
      .collection('foodCache')
      .doc(foodName.toLowerCase());
    
    const cached = await cacheRef.get();
    if (cached.exists) {
      return {
        ...cached.data().result,
        source: 'cache'
      };
    }

    // Check usage limit for free users
    if (!isPremium) {
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(userId)
        .get();
      
      const today = new Date().toISOString().split('T')[0];
      const usedToday = userDoc.data()?.dailyAIUsage?.[today] || 0;
      
      if (usedToday >= 5) {
        return {
          error: 'limit_reached',
          message: 'Daily limit of 5 free searches reached. Upgrade to Premium for unlimited!'
        };
      }
    }

    // Call DeepSeek API
    const apiKey = functions.config().deepseek.key;
    
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a veterinary expert. Analyze food safety for dogs. Respond in JSON: {"toxicity": "safe"|"caution"|"toxic", "symptoms": [], "notes": "", "portionGuidance": ""}'
          },
          {
            role: 'user',
            content: `Is "${foodName}" safe for dogs?`
          }
        ],
        temperature: 0.2,
        max_tokens: 300
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiResult = JSON.parse(response.data.choices[0].message.content);

    // Cache result
    await cacheRef.set({
      query: foodName,
      result: aiResult,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Increment user usage
    if (!isPremium) {
      const today = new Date().toISOString().split('T')[0];
      await admin.firestore()
        .collection('users')
        .doc(userId)
        .set({
          [`dailyAIUsage.${today}`]: admin.firestore.FieldValue.increment(1)
        }, { merge: true });
    }

    return {
      ...aiResult,
      source: 'ai',
      queriesRemaining: isPremium ? 999 : (5 - (usedToday + 1))
    };

  } catch (error) {
    console.error('Error querying food safety:', error);
    return {
      error: 'query_failed',
      message: 'Unable to check food safety. Please try again.'
    };
  }
});

// Emergency AI Chat
exports.emergencyChat = functions.https.onCall(async (data, context) => {
  const { message, conversationHistory } = data;

  try {
    const apiKey = functions.config().deepseek.key;
    
    const messages = [
      {
        role: 'system',
        content: 'You are a calm veterinary emergency assistant. Provide clear guidance. Always recommend contacting a vet for serious issues.'
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ];

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages,
        temperature: 0.3,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      reply: response.data.choices[0].message.content
    };

  } catch (error) {
    console.error('Error in emergency chat:', error);
    throw new functions.https.HttpsError('internal', 'Chat failed');
  }
});
```

### Dependencies (`functions/package.json`)

Add to dependencies:
```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0",
    "axios": "^1.6.0"
  }
}
```

Install:
```bash
cd functions
npm install
cd ..
```

---

## 🚀 Deploy Functions

```bash
firebase deploy --only functions
```

**First deployment takes 5-10 minutes**

---

## 🔗 Connecting App to Functions

In your mobile app (`src/services/aiService.js` - create this file):

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export async function checkFoodWithAI(foodName, userId, isPremium) {
  const queryFood = httpsCallable(functions, 'queryFoodSafety');
  
  try {
    const result = await queryFood({ foodName, userId, isPremium });
    return result.data;
  } catch (error) {
    console.error('AI query error:', error);
    return {
      error: 'query_failed',
      message: 'Unable to check food safety'
    };
  }
}

export async function chatWithEmergencyAI(message, conversationHistory = []) {
  const chat = httpsCallable(functions, 'emergencyChat');
  
  try {
    const result = await chat({ message, conversationHistory });
    return result.data;
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
}
```

---

## 💰 Cost Estimation

### Firebase (Spark Plan - Free Tier)
- Firestore: 50K reads/day, 20K writes/day
- Functions: 2M invocations/month, 400K GB-seconds
- **Monthly cost for 5,000 users: $0** (within free tier)

### Firebase (Blaze Plan - Pay-as-you-go)
When you exceed free tier:
- Firestore: $0.06 per 100K reads
- Functions: $0.40 per million invocations
- **Estimated for 20,000 users: $20-50/month**

### DeepSeek API
- Input: $0.14 per 1M tokens
- Output: $0.28 per 1M tokens
- Average query: 500 tokens
- **10,000 queries/month: ~$5-10**

**Total estimated monthly cost for 20,000 users: $25-60**

---

## 🔒 Security Rules

Create `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // API Keys - Admin only
    match /config/{document} {
      allow read, write: if false; // Only Cloud Functions can access
    }
    
    // Food cache - Read-only for users
    match /foodCache/{foodId} {
      allow read: if true;
      allow write: if false; // Only Cloud Functions
    }
    
    // Users
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy:
```bash
firebase deploy --only firestore:rules
```

---

## 🧪 Testing Functions Locally

```bash
# Start emulator
firebase emulators:start

# In another terminal, run your app pointing to emulator
# (See Expo docs for connecting to emulators)
```

---

## 📊 Monitoring

View function logs:
```bash
firebase functions:log
```

Or in Firebase Console:
1. Go to "Functions"
2. Click on function name
3. View "Logs" tab

---

## ⚠️ Important Notes

1. **Never commit API keys to git**
2. **Always use environment variables**
3. **Monitor costs in Firebase Console**
4. **Set up billing alerts** (Firebase Console → Billing)
5. **Test with small quotas first**

---

## 🎯 Next Steps

1. Set up Firebase project
2. Deploy basic functions
3. Test with mobile app
4. Monitor usage and costs
5. Implement admin panel for API key management

---

**This requires developer knowledge. Budget: $1,500-3,000 for complete implementation.**
