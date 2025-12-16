/**
 * AI-Powered Support Service
 * Handles customer support queries with intelligent AI responses
 * Forwards complex queries to human support via email
 */

import { callAI } from './aiService';
import { doc, setDoc, getDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, waitForAuth } from './firebase';

const SUPPORT_EMAIL = 'augustinemwathi96@gmail.com';

/**
 * Comprehensive app knowledge base for AI
 */
const APP_KNOWLEDGE_BASE = `
# PawGuard App - Complete Functionality Guide

## App Overview
PawGuard is an AI-powered pet emergency assistance app for dog owners with the following features:

### 1. EMERGENCY FIRST AID
- 72+ emergency scenarios with step-by-step guides
- Covers: Choking, Heatstroke, Poisoning, Bleeding, Seizures, Fractures, Snake Bites, Drowning, Electric Shock, Insect Stings, etc.
- Each scenario includes:
  * Symptoms to recognize
  * Step-by-step emergency actions
  * Prevention tips
  * Severity indicators (Critical/Urgent/Moderate)

### 2. AI FOOD SAFETY CHECKER
- Analyzes if foods are safe/toxic for dogs
- Returns safety level: Safe, Caution, or Toxic
- Provides symptoms of poisoning
- Suggests alternatives for toxic foods
- FREE USERS: 5 queries per day
- PREMIUM USERS: Unlimited queries

### 3. KNOWLEDGE BASE
- 50+ detailed articles covering:
  * First Aid techniques
  * Nutrition guidelines
  * Health & wellness
  * Behavior & training
  * Daily care tips
- Interactive quizzes to test knowledge (8 questions per category)
- Daily rotating tips

### 4. PET PROFILE MANAGEMENT
- Create multiple pet profiles
- Store pet information: name, breed, age, gender, weight, fur color, microchip number
- Add pet photos
- Manage vaccination records with reminders
- Store veterinarian contact information
- Add medical notes and allergies
- Find nearby veterinary clinics using GPS
- Emergency "Call Vet" quick action button

### 5. SUBSCRIPTION PLANS
**Free Plan:**
- 5 AI Food Checker queries per day
- Basic emergency guides (limited)
- Ads included
- Single pet profile

**Premium Plans:**
- Monthly: $4.99/month
- Yearly: $39.99/year (save 33%)
- 7-day free trial available

**Premium Features:**
- Unlimited AI Food Checker
- 24/7 AI Emergency Assistant
- Advanced First Aid (100+ guides)
- Smart Health Reminders
- Multi-Pet Profiles
- Offline Mode (Full Database)
- No Ads
- Priority Support

### 6. TECHNICAL INFORMATION
- Platform: iOS & Android (React Native/Expo)
- Supports: Google/Firebase Authentication
- AI Provider: DeepSeek/OpenAI/OpenRouter
- In-App Purchases: Google Play & App Store subscriptions
- Offline Mode: Core content works without internet
- Notifications: Vaccination reminders, health alerts

### 7. COMMON TROUBLESHOOTING

**Issue: "API keys not found"**
Solution: Admin panel needs to be set up with DeepSeek API key. Contact support.

**Issue: "Cannot restore purchases"**
Solution: Go to Subscription Screen → "Restore Purchases" button. Ensure same Google/Apple account.

**Issue: "Food Checker not working"**
Solution: Check internet connection. Free users: verify daily limit (5/day). Premium: check subscription status.

**Issue: "Can't add pet photo"**
Solution: Grant camera/photo library permissions in Settings → Apps → PawGuard.

**Issue: "Notifications not received"**
Solution: Enable notifications in Settings → Apps → PawGuard → Notifications.

**Issue: "Location not working for vet finder"**
Solution: Grant location permission in Settings → Apps → PawGuard → Location.

**Issue: "Subscription not activated after purchase"**
Solution: Wait 5 minutes for processing. Close and reopen app. Use "Restore Purchases" if needed.

**Issue: "App crashes on startup"**
Solution: Update to latest version. Clear app cache. Reinstall if issue persists.

### 8. CONTACT & SUPPORT
- Support Email: augustinemwathi96@gmail.com
- Response Time: Within 24 hours
- Available: 24/7 for emergencies
`;

/**
 * Analyze support query and determine if AI can handle it
 */
async function analyzeQuery(query) {
  const systemPrompt = `You are a helpful customer support agent for PawGuard, a pet emergency app.

Your task: Analyze if you can FULLY answer this support query based on the app knowledge provided.

Respond with JSON only:
{
  "canHandle": true/false,
  "confidence": 0-100,
  "category": "technical"|"subscription"|"feature"|"general"|"emergency",
  "needsHuman": true/false,
  "reason": "brief reason if needsHuman is true"
}

Rules:
- canHandle=true only if you can give a COMPLETE, ACCURATE answer
- canHandle=false for: payment issues, account problems, bugs, refund requests, custom feature requests
- emergency category: direct users to call vet immediately
- Be conservative: if unsure, set needsHuman=true`;

  try {
    const response = await callAI(
      `${systemPrompt}\n\n===APP KNOWLEDGE===\n${APP_KNOWLEDGE_BASE}\n\n===USER QUERY===\n${query}`,
      'system'
    );

    // Parse JSON response
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '').trim();
    }

    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error analyzing query:', error);
    // Fallback to human support if analysis fails
    return {
      canHandle: false,
      confidence: 0,
      category: 'general',
      needsHuman: true,
      reason: 'Unable to analyze query automatically'
    };
  }
}

/**
 * Generate AI response to support query
 */
async function generateAIResponse(query) {
  const systemPrompt = `You are a helpful, friendly customer support agent for PawGuard pet emergency app.

CRITICAL RULES:
1. Be concise but complete (2-4 paragraphs maximum)
2. Use clear, simple language
3. For emergencies: ALWAYS tell user to contact veterinarian immediately
4. Include step-by-step instructions when relevant
5. Be empathetic and professional
6. If the answer is in the knowledge base, provide it accurately
7. End with "Need more help? Contact support at ${SUPPORT_EMAIL}"

Knowledge Base:
${APP_KNOWLEDGE_BASE}`;

  try {
    const response = await callAI(
      `${systemPrompt}\n\n===USER QUESTION===\n${query}\n\nProvide a helpful, complete answer:`,
      'system'
    );

    return response;
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error('Unable to generate support response. Please try again.');
  }
}

/**
 * Send email to human support for complex queries
 */
async function forwardToHumanSupport(ticketData) {
  try {
    await waitForAuth();

    if (!db) {
      console.warn('Firebase not initialized, cannot forward to human support');
      return false;
    }

    // Save to Firestore for admin to process
    const ticketRef = doc(collection(db, 'supportTickets'), ticketData.ticketId);
    
    await setDoc(ticketRef, {
      ...ticketData,
      status: 'pending_human',
      forwardedAt: serverTimestamp(),
      supportEmail: SUPPORT_EMAIL
    });

    console.log('✅ Ticket forwarded to human support');
    return true;
  } catch (error) {
    console.error('❌ Error forwarding to human support:', error);
    return false;
  }
}

/**
 * Main function to handle support query
 */
export async function handleSupportQuery(userId, userName, userEmail, query) {
  try {
    const ticketId = `TICKET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🎫 Processing support ticket:', ticketId);

    // Analyze if AI can handle this
    const analysis = await analyzeQuery(query);
    
    console.log('📊 Query analysis:', analysis);

    let aiResponse = null;
    let needsHuman = analysis.needsHuman;

    // If AI can handle it, generate response
    if (analysis.canHandle && !analysis.needsHuman) {
      try {
        aiResponse = await generateAIResponse(query);
        console.log('✅ AI response generated successfully');
      } catch (error) {
        console.error('❌ Failed to generate AI response:', error);
        needsHuman = true;
      }
    }

    // Prepare ticket data
    const ticketData = {
      ticketId,
      userId,
      userName: userName || 'Anonymous User',
      userEmail: userEmail || 'Not provided',
      query,
      category: analysis.category,
      confidence: analysis.confidence,
      aiResponse,
      needsHuman,
      status: needsHuman ? 'pending_human' : 'resolved_ai',
      createdAt: new Date().toISOString(),
      resolvedByAI: !needsHuman
    };

    // Save ticket to Firestore
    try {
      await waitForAuth();
      if (db) {
        const ticketRef = doc(collection(db, 'supportTickets'), ticketId);
        await setDoc(ticketRef, {
          ...ticketData,
          createdAt: serverTimestamp()
        });
        console.log('✅ Ticket saved to Firestore');
      }
    } catch (error) {
      console.error('⚠️ Could not save ticket to Firestore:', error);
    }

    // Forward to human support if needed
    if (needsHuman) {
      console.log('📧 Forwarding to human support...');
      await forwardToHumanSupport(ticketData);
      
      return {
        success: true,
        ticketId,
        message: `Your support ticket #${ticketId} has been forwarded to our team. We'll respond to ${userEmail || 'your email'} within 24 hours.`,
        needsHuman: true,
        category: analysis.category
      };
    }

    // Return AI response
    return {
      success: true,
      ticketId,
      message: aiResponse,
      aiResponse,
      needsHuman: false,
      category: analysis.category,
      confidence: analysis.confidence
    };

  } catch (error) {
    console.error('❌ Error handling support query:', error);
    
    // Fallback: create ticket for human support
    const fallbackTicketId = `TICKET_${Date.now()}_FALLBACK`;
    
    try {
      await forwardToHumanSupport({
        ticketId: fallbackTicketId,
        userId,
        userName: userName || 'Anonymous User',
        userEmail: userEmail || 'Not provided',
        query,
        category: 'general',
        error: error.message,
        status: 'pending_human',
        createdAt: new Date().toISOString()
      });
    } catch (forwardError) {
      console.error('❌ Failed to create fallback ticket:', forwardError);
    }

    return {
      success: false,
      error: 'Unable to process your query automatically. Please email us directly at ' + SUPPORT_EMAIL,
      ticketId: fallbackTicketId
    };
  }
}

/**
 * Get support ticket status
 */
export async function getTicketStatus(ticketId) {
  try {
    await waitForAuth();
    
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    const ticketDoc = await getDoc(doc(db, 'supportTickets', ticketId));
    
    if (!ticketDoc.exists()) {
      return null;
    }

    return ticketDoc.data();
  } catch (error) {
    console.error('Error getting ticket status:', error);
    return null;
  }
}

/**
 * Get user's support history
 */
export async function getUserSupportHistory(userId, limit = 10) {
  try {
    await waitForAuth();
    
    if (!db) {
      return [];
    }

    const { query, where, orderBy, limit: queryLimit, getDocs } = require('firebase/firestore');
    
    const q = query(
      collection(db, 'supportTickets'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      queryLimit(limit)
    );

    const querySnapshot = await getDocs(q);
    const tickets = [];
    
    querySnapshot.forEach((doc) => {
      tickets.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return tickets;
  } catch (error) {
    console.error('Error getting support history:', error);
    return [];
  }
}
