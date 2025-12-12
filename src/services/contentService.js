/**
 * Content Service - AI-Powered Dynamic Content Generation
 * Automatically creates and updates app content using LLM APIs
 * Keeps content fresh, brief, and helpful
 */

import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { callAI } from './aiService';

/**
 * Get or generate emergency scenarios
 * Auto-generates 72+ emergency scenarios with step-by-step guides
 */
export const getEmergencyScenarios = async () => {
  try {
    // Check cache first
    const cacheDoc = await getDoc(doc(db, 'content', 'emergencyScenarios'));
    
    if (cacheDoc.exists()) {
      const data = cacheDoc.data();
      // Refresh if older than 7 days
      const cacheAge = Date.now() - data.lastUpdated?.toMillis();
      if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
        return data.scenarios;
      }
    }

    // Generate fresh content
    const prompt = `Generate 72 dog emergency scenarios in JSON format. Each scenario should include:
- id: unique identifier (e.g., "poisoning_chocolate")
- category: one of [Poisoning, Breathing, Injury, Heatstroke, Seizure, Bleeding, Choking, Other]
- title: brief emergency name
- symptoms: array of 3-5 key symptoms
- severity: "critical" | "urgent" | "moderate"
- steps: array of 4-6 step-by-step instructions (each step is brief, 1-2 sentences)
- preventionTips: array of 2-3 prevention tips
- illustration: emoji that represents the emergency

Keep all text brief but complete. Make it actionable and easy to understand for non-medical users.

Return only valid JSON array without markdown formatting.`;

    const response = await callAI(prompt, 'system');
    const scenarios = JSON.parse(response);

    // Cache for 7 days
    await setDoc(doc(db, 'content', 'emergencyScenarios'), {
      scenarios,
      lastUpdated: serverTimestamp(),
      version: '1.0'
    });

    return scenarios;
  } catch (error) {
    console.error('Error getting emergency scenarios:', error);
    // Return fallback data
    return getFallbackEmergencyScenarios();
  }
};

/**
 * Get or generate food safety database
 * Auto-generates 210+ food items with safety info
 */
export const getFoodDatabase = async () => {
  try {
    const cacheDoc = await getDoc(doc(db, 'content', 'foodDatabase'));
    
    if (cacheDoc.exists()) {
      const data = cacheDoc.data();
      const cacheAge = Date.now() - data.lastUpdated?.toMillis();
      if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
        return data.foods;
      }
    }

    const prompt = `Generate 210 common foods with dog safety information in JSON format. Include:
- name: food name
- category: one of [Fruits, Vegetables, Proteins, Grains, Dairy, Sweets, Beverages, Spices, Nuts, Other]
- safetyLevel: "safe" | "caution" | "toxic"
- emoji: relevant emoji
- shortDescription: 1 sentence explanation
- symptoms: array of symptoms if harmful (empty if safe)
- alternatives: array of safe alternatives if toxic

Mix of safe, caution, and toxic foods. Keep descriptions brief but informative.

Return only valid JSON array.`;

    const response = await callAI(prompt, 'system');
    const foods = JSON.parse(response);

    await setDoc(doc(db, 'content', 'foodDatabase'), {
      foods,
      lastUpdated: serverTimestamp(),
      version: '1.0'
    });

    return foods;
  } catch (error) {
    console.error('Error getting food database:', error);
    return getFallbackFoodDatabase();
  }
};

/**
 * Get or generate knowledge articles
 * Auto-generates educational content about pet care
 */
export const getKnowledgeArticles = async () => {
  try {
    const cacheDoc = await getDoc(doc(db, 'content', 'knowledgeArticles'));
    
    if (cacheDoc.exists()) {
      const data = cacheDoc.data();
      const cacheAge = Date.now() - data.lastUpdated?.toMillis();
      if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
        return data.articles;
      }
    }

    const prompt = `Generate 50 pet care knowledge articles in JSON format. Categories:
- First Aid (10 articles)
- Nutrition (10 articles)
- Health (10 articles)
- Behavior & Training (10 articles)
- Daily Care (10 articles)

Each article:
- id: unique identifier
- category: category name
- title: engaging title
- icon: relevant emoji
- summary: 2 sentences
- content: 4-6 brief paragraphs with actionable advice
- keyTakeaways: array of 3 key points
- isPremium: boolean (50% premium, 50% free)

Keep content brief, practical, and helpful for pet owners.

Return only valid JSON array.`;

    const response = await callAI(prompt, 'system');
    const articles = JSON.parse(response);

    await setDoc(doc(db, 'content', 'knowledgeArticles'), {
      articles,
      lastUpdated: serverTimestamp(),
      version: '1.0'
    });

    return articles;
  } catch (error) {
    console.error('Error getting knowledge articles:', error);
    return getFallbackKnowledgeArticles();
  }
};

/**
 * Get or generate quiz questions
 * Auto-generates quiz questions for each category
 */
export const getQuizQuestions = async (category) => {
  try {
    const cacheDoc = await getDoc(doc(db, 'quizzes', category));
    
    if (cacheDoc.exists()) {
      const data = cacheDoc.data();
      const cacheAge = Date.now() - data.lastUpdated?.toMillis();
      if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
        return data.questions;
      }
    }

    const prompt = `Generate 8 quiz questions about dog ${category} in JSON format. Each question:
- question: clear question text
- options: array of 4 answer options
- correctAnswer: index of correct option (0-3)
- explanation: brief explanation of why this is correct

Mix difficulty levels. Keep questions practical and educational.

Return only valid JSON array.`;

    const response = await callAI(prompt, 'system');
    const questions = JSON.parse(response);

    await setDoc(doc(db, 'quizzes', category), {
      questions,
      lastUpdated: serverTimestamp(),
      version: '1.0'
    });

    return questions;
  } catch (error) {
    console.error('Error getting quiz questions:', error);
    return getFallbackQuizQuestions();
  }
};

/**
 * Get daily tip
 * Provides a new helpful tip each day
 */
export const getDailyTip = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const cacheDoc = await getDoc(doc(db, 'dailyTips', today));
    
    if (cacheDoc.exists()) {
      return cacheDoc.data().tip;
    }

    const prompt = `Generate a helpful dog care tip for today. Format:
{
  "title": "Brief catchy title",
  "content": "2-3 sentences with practical advice",
  "category": "one of: Health, Safety, Nutrition, Training, Fun",
  "emoji": "relevant emoji"
}

Keep it fresh, actionable, and encouraging.

Return only valid JSON.`;

    const response = await callAI(prompt, 'system');
    const tip = JSON.parse(response);

    await setDoc(doc(db, 'dailyTips', today), {
      tip,
      date: today,
      createdAt: serverTimestamp()
    });

    return tip;
  } catch (error) {
    console.error('Error getting daily tip:', error);
    return getFallbackDailyTip();
  }
};

// Fallback data functions (compact inline data for offline use)
function getFallbackEmergencyScenarios() {
  return [
    {
      id: 'choking',
      category: 'Choking',
      title: 'Choking/Airway Obstruction',
      symptoms: ['Difficulty breathing', 'Pawing at mouth', 'Blue gums', 'Panic'],
      severity: 'critical',
      steps: [
        'Stay calm. Check if dog is conscious.',
        'Open mouth gently and look for visible object.',
        'If you can see it, carefully remove with fingers.',
        'If not visible, perform Heimlich: Stand behind dog, place fist below ribcage, thrust upward 5 times.',
        'Check if object is dislodged. If not, repeat.',
        'Rush to emergency vet immediately, even if object is removed.'
      ],
      preventionTips: [
        'Avoid small toys that can be swallowed',
        'Supervise when eating bones',
        'Keep small objects out of reach'
      ],
      illustration: '🫁'
    },
    {
      id: 'heatstroke',
      category: 'Heatstroke',
      title: 'Heatstroke',
      symptoms: ['Heavy panting', 'Drooling', 'Red gums', 'Weakness', 'Collapse'],
      severity: 'critical',
      steps: [
        'Move dog to cool, shaded area immediately.',
        'Apply cool (not cold) water to body, especially armpits, groin, paws.',
        'Offer small amounts of cool water to drink.',
        'Use fan to help cooling.',
        'Monitor temperature if possible. Stop cooling at 103°F.',
        'Get to vet immediately, even if dog seems recovered.'
      ],
      preventionTips: [
        'Never leave dog in car',
        'Avoid exercise in hot weather',
        'Provide shade and water always'
      ],
      illustration: '🌡️'
    },
    {
      id: 'poisoning_chocolate',
      category: 'Poisoning',
      title: 'Chocolate Poisoning',
      symptoms: ['Vomiting', 'Diarrhea', 'Restlessness', 'Rapid heartbeat', 'Seizures'],
      severity: 'critical',
      steps: [
        'Note the type and amount of chocolate consumed.',
        'Call poison control or emergency vet immediately.',
        'Do NOT induce vomiting unless told to by vet.',
        'Keep dog calm and monitor vital signs.',
        'Bring chocolate wrapper to vet for reference.',
        'Transport to emergency vet immediately.'
      ],
      preventionTips: [
        'Store chocolate out of reach',
        'Educate family about dangers',
        'Be extra cautious during holidays'
      ],
      illustration: '🍫'
    }
  ];
}

function getFallbackFoodDatabase() {
  return [
    { name: 'Chocolate', category: 'Sweets', safetyLevel: 'toxic', emoji: '🍫', shortDescription: 'Contains theobromine which is toxic to dogs.', symptoms: ['Vomiting', 'Diarrhea', 'Seizures'], alternatives: ['Carob treats', 'Dog-safe biscuits'] },
    { name: 'Apple', category: 'Fruits', safetyLevel: 'safe', emoji: '🍎', shortDescription: 'Safe and healthy, but remove seeds and core.', symptoms: [], alternatives: [] },
    { name: 'Grapes', category: 'Fruits', safetyLevel: 'toxic', emoji: '🍇', shortDescription: 'Can cause kidney failure even in small amounts.', symptoms: ['Vomiting', 'Lethargy', 'Kidney failure'], alternatives: ['Blueberries', 'Strawberries'] },
    { name: 'Carrot', category: 'Vegetables', safetyLevel: 'safe', emoji: '🥕', shortDescription: 'Excellent healthy snack, good for teeth.', symptoms: [], alternatives: [] },
    { name: 'Onion', category: 'Vegetables', safetyLevel: 'toxic', emoji: '🧅', shortDescription: 'Damages red blood cells, can cause anemia.', symptoms: ['Weakness', 'Vomiting', 'Pale gums'], alternatives: [] }
  ];
}

function getFallbackKnowledgeArticles() {
  return [
    {
      id: 'first_aid_basics',
      category: 'First Aid',
      title: 'Essential First Aid Every Dog Owner Should Know',
      icon: '🏥',
      summary: 'Learn the critical first aid skills that could save your dog\'s life in an emergency.',
      content: 'Every dog owner should be prepared for emergencies. First, always keep your vet\'s emergency number handy. Learn to check vital signs: normal heart rate is 60-140 beats per minute, breathing 10-30 breaths per minute. Know how to perform CPR if needed. Keep a first aid kit with bandages, antiseptic, and emergency supplies. Stay calm in emergencies - your dog can sense your stress.',
      keyTakeaways: [
        'Know vital signs and how to check them',
        'Keep emergency vet number accessible',
        'Maintain a well-stocked first aid kit'
      ],
      isPremium: false
    }
  ];
}

function getFallbackQuizQuestions() {
  return [
    {
      question: 'What should you do first when your dog is choking?',
      options: [
        'Pull their tongue out',
        'Hit them on the back',
        'Check if they can still breathe and look in their mouth',
        'Give them water'
      ],
      correctAnswer: 2,
      explanation: 'First, stay calm and check if your dog can still breathe. Look in their mouth for any visible objects before attempting removal.'
    },
    {
      question: 'What is the normal heart rate range for adult dogs?',
      options: ['30-50 bpm', '60-140 bpm', '150-200 bpm', '200-250 bpm'],
      correctAnswer: 1,
      explanation: 'A normal resting heart rate for adult dogs is 60-140 beats per minute. Puppies have higher rates up to 180 bpm.'
    },
    {
      question: 'Which food is TOXIC to dogs?',
      options: ['Carrots', 'Apples', 'Grapes', 'Blueberries'],
      correctAnswer: 2,
      explanation: 'Grapes and raisins are toxic to dogs and can cause kidney failure, even in small amounts.'
    },
    {
      question: 'What should you do if your dog has heatstroke?',
      options: [
        'Put them in ice-cold water',
        'Give them cold water to drink immediately',
        'Move to shade and cool with room-temperature water',
        'Let them rest and they will recover'
      ],
      correctAnswer: 2,
      explanation: 'Move to shade and apply cool (not ice-cold) water to their body. Offer small amounts of water and get to a vet immediately.'
    },
    {
      question: 'How often should you check your dog for ticks?',
      options: ['Once a month', 'Once a week', 'After every outdoor activity', 'Only if they scratch'],
      correctAnswer: 2,
      explanation: 'Check for ticks after every outdoor activity, especially in wooded or grassy areas. Early detection prevents disease transmission.'
    },
    {
      question: 'What is the correct way to give CPR to a dog?',
      options: [
        'Same as humans - 30 compressions, 2 breaths',
        '15 compressions, 1 breath',
        'Only chest compressions, no breaths',
        'Compressions are not needed'
      ],
      correctAnswer: 0,
      explanation: 'Dog CPR follows similar principles to human CPR: 30 chest compressions followed by 2 rescue breaths.'
    },
    {
      question: 'What should you do if your dog eats chocolate?',
      options: [
        'Wait and see if symptoms appear',
        'Call vet/poison control immediately',
        'Give them milk to neutralize it',
        'Make them vomit at home'
      ],
      correctAnswer: 1,
      explanation: 'Call your vet or poison control immediately. Do NOT induce vomiting unless instructed by a professional.'
    },
    {
      question: 'How long can a dog safely stay in a hot car?',
      options: ['10 minutes', '20 minutes with windows cracked', '30 minutes in shade', 'Never leave them in a hot car'],
      correctAnswer: 3,
      explanation: 'Never leave a dog in a hot car, even for a few minutes. Temperatures can rise to dangerous levels within 10 minutes.'
    }
  ];
}


function getFallbackDailyTip() {
  return {
    title: 'Hydration Check',
    content: 'Make sure your dog has access to fresh water throughout the day. Check the water bowl twice daily.',
    category: 'Health',
    emoji: '💧'
  };
}
