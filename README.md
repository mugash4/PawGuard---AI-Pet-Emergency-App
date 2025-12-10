# 🐾 PawGuard - AI-Powered Pet Emergency App

**Version:** 1.0.0  
**Framework:** Expo SDK 52 / React Native 0.76.5  
**Target:** iOS & Android

---

## 📱 What is PawGuard?

PawGuard is a comprehensive pet emergency assistance app that provides:

- **🚨 Emergency First Aid**: Step-by-step guidance for pet emergencies
- **🍎 AI Food Safety Checker**: AI-powered analysis of food safety for pets (Free: 5/day, Premium: Unlimited)
- **📚 Knowledge Base & Quizzes**: Educational content about pet care
- **🐕 Pet Profile Management**: Store pet information, vaccinations, and documents
- **💎 Premium Features**: Unlimited AI queries, no ads, advanced features

---

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js**: v20.18.0 (installed)
- **npm** or **yarn**
- **Expo CLI**: Will be installed automatically
- **iOS**: Mac with Xcode (for iOS development)
- **Android**: Android Studio (for Android development)

### Installation Steps

1. **Extract the package** (if you received as ZIP)
   ```bash
   unzip PawGuard.zip
   cd PawGuard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase** (IMPORTANT!)
   - Open `src/services/firebase.js`
   - Replace the placeholder Firebase config with your actual Firebase project credentials:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_ACTUAL_API_KEY",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef123456"
   };
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on device/simulator**
   - **iOS**: Press `i` in the terminal or scan QR code with Expo Go app
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go app
   - **Web**: Press `w` to open in browser

---

## 🔧 Project Structure

```
PawGuard/
├── App.js                          # Main app entry point
├── app.json                        # Expo configuration
├── package.json                    # Dependencies
├── assets/                         # Images, fonts, icons
│   ├── icon.png                   # App icon (1024x1024)
│   ├── splash.png                 # Splash screen
│   └── adaptive-icon.png          # Android adaptive icon
├── src/
│   ├── screens/                   # All app screens
│   │   ├── OnboardingScreen.js    # 3-slide animated onboarding
│   │   ├── SubscriptionScreen.js  # Premium subscription flow
│   │   ├── HomeScreen.js          # Main dashboard
│   │   ├── EmergencyScreen.js     # Emergency guides
│   │   ├── FoodCheckerScreen.js   # AI food safety checker
│   │   ├── KnowledgeScreen.js     # Educational content
│   │   └── PetProfileScreen.js    # Pet management
│   ├── navigation/                # Navigation setup
│   │   ├── AppNavigator.js        # Root navigator
│   │   └── MainTabNavigator.js    # Bottom tab navigation
│   ├── context/                   # State management
│   │   └── UserContext.js         # User state (premium status, AI usage)
│   ├── services/                  # External services
│   │   └── firebase.js            # Firebase configuration
│   ├── constants/                 # App constants
│   │   └── theme.js               # Colors, fonts, spacing
│   ├── components/                # Reusable components (empty for now)
│   ├── utils/                     # Utility functions (empty for now)
│   └── hooks/                     # Custom hooks (empty for now)
└── functions/                      # Firebase Cloud Functions (to be added)
```

---

## 🎨 Features Implemented

### ✅ Completed Features

1. **Onboarding Flow**
   - 3-slide animated introduction
   - Smooth transitions with React Native Reanimated
   - Skip button for quick access

2. **Subscription Screen**
   - 3 pricing tiers (Monthly, Yearly, Lifetime)
   - 7-day free trial option
   - Skip to free plan option
   - Visual "Best Choice" indicator

3. **Bottom Tab Navigation**
   - 5 tabs: Home, Emergency, Food Checker, Knowledge, Pet Profile
   - Custom icons and colors
   - Badge for premium users

4. **User Context**
   - Anonymous user tracking via device ID
   - Free/Premium tier management
   - Daily AI usage tracking (5 free queries/day)
   - Local storage with AsyncStorage

5. **Theme System**
   - Warm, friendly color palette (orange + blue)
   - Consistent spacing, shadows, border radius
   - Typography system

6. **AdMob Integration**
   - Google Mobile Ads SDK configured
   - Test ad units included
   - Ready for production ad units

### 🚧 To Be Implemented

1. **Firebase Backend**
   - Cloud Functions for AI API calls
   - Firestore database setup
   - Admin panel for API key management

2. **AI Integration**
   - DeepSeek API connection
   - Food safety checker logic
   - Emergency chat assistant

3. **Full Screens**
   - Complete emergency guides with step-by-step UI
   - Quiz system
   - Pet profile forms with image picker
   - Document storage

4. **In-App Purchases**
   - Real subscription processing (RevenueCat recommended)
   - Receipt validation

5. **Push Notifications**
   - Vaccination reminders
   - Health check alerts

---

## 🔑 Firebase Setup Guide

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `PawGuard`
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Register Your App

#### For iOS:
1. Click "iOS" icon in Firebase console
2. Bundle ID: `com.pawguard.app` (matches app.json)
3. Download `GoogleService-Info.plist`
4. **DON'T add to project** - we use JS SDK

#### For Android:
1. Click "Android" icon
2. Package name: `com.pawguard.app`
3. Download `google-services.json`
4. **DON'T add to project** - we use JS SDK

### Step 3: Get Web Config

1. Click "Web" icon (</>) in Firebase console
2. Copy the `firebaseConfig` object
3. Paste into `src/services/firebase.js`

Example:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "pawguard-12345.firebaseapp.com",
  projectId: "pawguard-12345",
  storageBucket: "pawguard-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

### Step 4: Enable Services

In Firebase Console:

1. **Firestore Database**
   - Go to "Firestore Database"
   - Click "Create database"
   - Start in **test mode** (for development)
   - Choose location closest to your users

2. **Cloud Functions**
   - Go to "Functions"
   - Click "Get started"
   - Follow setup instructions

3. **Storage** (for pet photos/documents)
   - Go to "Storage"
   - Click "Get started"
   - Use default security rules

---

## 🔐 Admin Panel Setup (Future)

The admin panel will allow you to:

- Set API keys (DeepSeek, OpenAI, Google Maps)
- View analytics (users, revenue, AI usage)
- Manage users (grant/revoke premium)
- Edit content (food database, emergency guides)
- Configure app settings (free tier limits, prices)

**Admin panel will be a separate web app** that you deploy to Firebase Hosting.

---

## 📱 Google AdMob Configuration

### Current Status
The app uses **test ad units** (Google's sample ads that don't generate real revenue).

### For Production

1. **Create AdMob Account**
   - Go to [AdMob](https://admob.google.com/)
   - Sign up with your Google account

2. **Create Ad Units**
   - App Home → "Create Ad Unit"
   - Create:
     - Banner Ad (for bottom of screens)
     - Interstitial Ad (full-screen between actions)
     - Rewarded Ad (optional: watch ad for premium feature)

3. **Update app.json**
   ```json
   "ios": {
     "config": {
       "googleMobileAdsAppId": "ca-app-pub-YOUR_ID~YOUR_IOS_APP_ID"
     }
   },
   "android": {
     "config": {
       "googleMobileAdsAppId": "ca-app-pub-YOUR_ID~YOUR_ANDROID_APP_ID"
     }
   }
   ```

4. **Update Ad Components** (when implemented)
   - Replace test ad unit IDs with your production IDs

---

## 🚀 Building for Production

### iOS Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

### Android Build

```bash
# Build for Android
eas build --platform android

# Submit to Play Store
eas submit --platform android
```

---

## 🛠️ Troubleshooting

### Common Issues

**1. "Firebase not initialized"**
- Make sure you've added your Firebase config to `src/services/firebase.js`

**2. "Network request failed"**
- Check your internet connection
- Verify Firebase config is correct

**3. "Module not found"**
- Run `npm install` again
- Clear cache: `expo start -c`

**4. "Android build failed"**
- Check Kotlin version in `android/build.gradle` matches `kotlinVersion` in package.json

**5. "Cannot find module 'expo'"**
- Make sure you're in the PawGuard directory
- Run `npm install`

---

## 📄 License

Proprietary - All rights reserved

---

## 👨‍💻 Developer Notes

### For Non-Developers

This app is ready to run in development mode. To deploy to production:

1. **Hire a developer** to:
   - Set up Firebase Cloud Functions
   - Implement AI integration
   - Complete remaining screens
   - Set up in-app purchases
   - Configure production AdMob

2. **Estimated timeline**: 4-8 weeks for full completion

3. **Budget**: $3,000 - $8,000 (depending on scope)

### For Developers

**Tech Stack:**
- React Native 0.76.5 / Expo 52
- Firebase (Firestore, Functions, Storage)
- DeepSeek API for AI features
- React Navigation v6
- AsyncStorage for local state
- Google Mobile Ads (AdMob)

**Next Steps:**
1. Set up Firebase Cloud Functions
2. Implement `/functions/index.js` with AI API logic
3. Create Firestore security rules
4. Build out emergency guides UI
5. Implement in-app purchases with RevenueCat
6. Create admin panel (Next.js recommended)

---

## 📞 Support

For questions or issues:
- Check this README first
- Review code comments
- Consult Firebase/Expo documentation

---

**Built with ❤️ for pet parents everywhere 🐾**
