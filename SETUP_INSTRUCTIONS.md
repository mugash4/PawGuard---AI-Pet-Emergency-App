# 🚀 PawGuard - Complete Setup Instructions

**For Non-Developers** - Follow this guide step-by-step

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:

- ✅ Computer with Windows, Mac, or Linux
- ✅ Node.js v20.18.0 installed ([Download here](https://nodejs.org/))
- ✅ Internet connection
- ✅ Firebase account (free - [Create here](https://firebase.google.com/))
- ✅ Google account for Firebase and AdMob

---

## 🎯 Step-by-Step Setup

### Step 1: Extract and Navigate to Project

1. Extract the `PawGuard.zip` file to your desired location
2. Open Terminal (Mac/Linux) or Command Prompt (Windows)
3. Navigate to the project folder:
   ```bash
   cd path/to/PawGuard
   ```

### Step 2: Install Dependencies

Run this command:
```bash
npm install
```

**Expected time:** 3-5 minutes

You should see progress indicators and eventually "added XXX packages"

### Step 3: Set Up Firebase

#### 3.1 Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click **"Add project"**
3. Project name: `PawGuard` (or your preferred name)
4. Disable Google Analytics (optional for now)
5. Click **"Create project"**
6. Wait for project creation (~1 minute)

#### 3.2 Register Web App

1. In Firebase Console, click the **Web icon** (</>)
2. App nickname: `PawGuard Web`
3. **DO NOT** check "Set up Firebase Hosting"
4. Click **"Register app"**
5. Copy the `firebaseConfig` code that appears

#### 3.3 Configure App with Firebase

1. Open the project in a code editor (VS Code, Sublime, Notepad++, etc.)
2. Navigate to: `src/services/firebase.js`
3. Find this section:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY_HERE",
     authDomain: "your-project.firebaseapp.com",
     // ... more lines
   };
   ```
4. Replace the ENTIRE `firebaseConfig` object with what you copied from Firebase
5. Save the file

#### 3.4 Enable Firestore Database

1. In Firebase Console, click **"Firestore Database"** in left menu
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development)
4. Click **"Next"**
5. Select location (choose closest to you)
6. Click **"Enable"**

#### 3.5 Enable Storage

1. In Firebase Console, click **"Storage"** in left menu
2. Click **"Get started"**
3. Click **"Next"** (keep default rules)
4. Select location (same as Firestore)
5. Click **"Done"**

### Step 4: Test the App

Run the development server:
```bash
npm start
```

You should see:
```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

#### Test on Your Phone:

**iPhone:**
1. Download **"Expo Go"** from App Store
2. Open Camera app
3. Scan the QR code
4. Tap notification to open in Expo Go

**Android:**
1. Download **"Expo Go"** from Play Store
2. Open Expo Go app
3. Tap **"Scan QR Code"**
4. Scan the QR code from terminal

#### Test on Computer:

Press **`w`** in the terminal to open in web browser

---

## 🎨 Adding App Icons and Images

### Required Images

You need to create/provide these images:

1. **App Icon** (`assets/icon.png`)
   - Size: 1024x1024 pixels
   - Format: PNG with transparent background
   - Design: Your PawGuard logo

2. **Splash Screen** (`assets/splash.png`)
   - Size: 2048x2732 pixels (portrait)
   - Background color: #FF8C61 (warm orange)
   - Design: Logo in center with tagline

3. **Adaptive Icon** (`assets/adaptive-icon.png`)
   - Size: 1024x1024 pixels
   - Android adaptive icon
   - Must have safe zone (inner 66% for icon)

### Where to Get Images:

**Option 1: Hire a Designer**
- Fiverr, Upwork, 99designs
- Budget: $50-200 for app icon set

**Option 2: Use Templates**
- Canva.com (has app icon templates)
- Icons8.com
- Flaticon.com

**Option 3: Placeholder Images**
- The app includes placeholder images for testing
- Replace before production launch

---

## 💳 Setting Up In-App Purchases (Future)

**Note:** This requires Apple Developer ($99/year) and Google Play Developer ($25 one-time) accounts.

For now, the app uses a **demo subscription flow** that grants premium without payment.

To implement real purchases, you'll need to:
1. Sign up for developer accounts
2. Create in-app products in App Store Connect / Play Console
3. Integrate payment SDK (RevenueCat recommended)
4. **Hire a developer** for this step (~$1,000-2,000)

---

## 📱 Setting Up Google AdMob

### Step 1: Create AdMob Account

1. Go to https://admob.google.com/
2. Sign in with Google account
3. Click **"Get Started"**
4. Accept terms and conditions

### Step 2: Create App in AdMob

1. Click **"Apps"** → **"Add App"**
2. Is your app on Play Store/App Store? → Select **"No"**
3. App name: `PawGuard`
4. Platform: Create for both **iOS** and **Android**
5. Click **"Add"**

### Step 3: Create Ad Units

For each platform (iOS and Android):

1. Click **"Ad units"** → **"Create ad unit"**
2. Choose **"Banner"**
3. Ad unit name: `PawGuard Banner`
4. Click **"Create ad unit"**
5. **Copy the Ad Unit ID** (looks like: `ca-app-pub-1234567890123456/1234567890`)

Repeat for **Interstitial** ads.

### Step 4: Update app.json

1. Open `app.json`
2. Find these sections:
   ```json
   "ios": {
     "config": {
       "googleMobileAdsAppId": "ca-app-pub-3940256099942544~1458002511"
     }
   },
   "android": {
     "config": {
       "googleMobileAdsAppId": "ca-app-pub-3940256099942544~3347511713"
     }
   }
   ```
3. Replace with your actual App IDs from AdMob
4. Save file

**Note:** Current IDs are Google's test ads. Replace before launch!

---

## 🚀 Building for App Stores

### Prerequisites

1. **Apple Developer Account** ($99/year) - for iOS
2. **Google Play Developer Account** ($25 one-time) - for Android
3. **EAS CLI** installed: `npm install -g eas-cli`

### Build Commands

```bash
# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production
```

**Expected time per build:** 15-30 minutes

### Submitting to Stores

```bash
# Submit to App Store
eas submit --platform ios

# Submit to Play Store
eas submit --platform android
```

**Recommendation:** Hire a developer for first-time submission ($300-500)

---

## 🔧 Common Issues & Solutions

### Issue: "Command not found: npm"
**Solution:** Install Node.js from https://nodejs.org/

### Issue: "Firebase configuration error"
**Solution:** 
1. Double-check `src/services/firebase.js`
2. Make sure you copied the entire config object
3. Restart dev server: `npm start`

### Issue: "Metro bundler failed"
**Solution:** Clear cache and restart:
```bash
expo start -c
```

### Issue: "Cannot connect to server"
**Solution:**
1. Make sure computer and phone are on same WiFi
2. Try running: `expo start --tunnel`

### Issue: App crashes on startup
**Solution:**
1. Check terminal for error messages
2. Make sure all dependencies installed: `npm install`
3. Clear Expo cache: `rm -rf node_modules && npm install`

---

## 📞 Getting Help

### For Setup Issues:
1. Check error messages in terminal
2. Google the exact error message
3. Check Expo documentation: https://docs.expo.dev/
4. Check Firebase documentation: https://firebase.google.com/docs

### For Development:
Consider hiring a React Native developer if you need:
- Custom features added
- Backend integration (AI, payments)
- Bug fixes
- App Store submission assistance

**Platforms to find developers:**
- Upwork.com
- Fiverr.com
- Toptal.com
- LocalReact Native meetup groups

---

## ✅ Launch Checklist

Before submitting to App Stores:

- [ ] Firebase properly configured with production credentials
- [ ] App icons and splash screens designed and added
- [ ] AdMob configured with real ad units (not test IDs)
- [ ] In-app purchases implemented and tested
- [ ] Privacy Policy created and linked
- [ ] Terms of Service created and linked
- [ ] App Store screenshots created (at least 5 per platform)
- [ ] App description and keywords optimized
- [ ] Content reviewed by veterinarian (optional but recommended)
- [ ] Tested on multiple devices (iOS and Android)
- [ ] All placeholder content replaced with real content

---

## 🎯 Next Steps After Setup

1. **Test the app thoroughly**
   - Try all screens
   - Test onboarding flow
   - Test subscription screen

2. **Customize content**
   - Add your branding
   - Update colors if needed (in `src/constants/theme.js`)
   - Add real emergency guides content

3. **Set up backend** (requires developer)
   - Firebase Cloud Functions for AI
   - Admin panel for managing content
   - API key management

4. **Prepare for launch**
   - Create marketing materials
   - Prepare App Store listings
   - Plan launch strategy

---

**Need help? Consider hiring a developer to complete the backend integration and launch preparation.**

**Estimated cost for full completion: $3,000 - $8,000**

**Good luck with your app! 🚀🐾**
