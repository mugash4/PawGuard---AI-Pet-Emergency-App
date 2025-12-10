# Admin Setup Guide for PawGuard

This guide will help you set up your first admin user and configure the admin panel.

## Prerequisites

- Firebase project created
- Firebase Authentication enabled
- Firestore database created

## Step-by-Step Admin Setup

### Step 1: Create Your Admin Account

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your PawGuard project**
3. **Navigate to Authentication** (left sidebar)
4. **Click on "Users" tab**
5. **Click "Add User" button**
6. **Enter your admin credentials**:
   - Email: `youremail@example.com`
   - Password: Create a strong password (min 6 characters)
7. **Click "Add User"**
8. **Copy the User UID** (you'll need this in the next step)

### Step 2: Grant Admin Role

1. **Go to Firestore Database** (left sidebar in Firebase Console)
2. **Click "Start collection"** (if no collections exist)
3. **Collection ID**: `users`
4. **Document ID**: Paste the User UID you copied from Step 1
5. **Add fields**:
   ```
   Field: email
   Type: string
   Value: youremail@example.com
   
   Field: role
   Type: string
   Value: admin
   
   Field: isPremium
   Type: boolean
   Value: true
   
   Field: createdAt
   Type: timestamp
   Value: (click "Use Current Date/Time")
   ```
6. **Click "Save"**

### Step 3: Configure API Keys (in Admin Panel)

After logging into the admin panel for the first time:

1. **Navigate to "API Keys" tab**
2. **Add DeepSeek API Key**:
   - Get your key from: https://platform.deepseek.com/api_keys
   - Paste in the "DeepSeek API Key" field
   - Click "Save API Keys"
3. **Add AdMob App ID** (optional):
   - Get from: https://apps.admob.com/
   - Paste in the "AdMob App ID" field
   - Click "Save API Keys"

## Setting Up Firestore Security Rules

### Important: Secure Your Database

Go to **Firestore Database** → **Rules** tab and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Helper function to check if user is premium
    function isPremium() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isPremium == true;
    }
    
    // Config collection (API keys) - NO CLIENT ACCESS
    match /config/{document=**} {
      allow read, write: if false; // Only Cloud Functions can access
    }
    
    // Users collection
    match /users/{userId} {
      // Anyone authenticated can read their own profile
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Users can update their own profile (except role and isPremium)
      allow update: if request.auth != null && 
                      request.auth.uid == userId &&
                      !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'isPremium']);
      
      // Admins can read and write any user
      allow read, write: if isAdmin();
    }
    
    // AI Queries - users can only read their own
    match /aiQueries/{queryId} {
      allow read: if request.auth != null && 
                    queryId.matches(request.auth.uid + '.*');
      allow write: if false; // Only Cloud Functions can write
    }
    
    // Food Cache - anyone authenticated can read
    match /foodCache/{foodName} {
      allow read: if request.auth != null;
      allow write: if false; // Only Cloud Functions can write
    }
    
    // Pet Profiles
    match /petProfiles/{profileId} {
      allow read, write: if request.auth != null && 
                           resource.data.userId == request.auth.uid;
    }
    
    // Subscriptions (for future in-app purchase validation)
    match /subscriptions/{subscriptionId} {
      allow read: if request.auth != null && 
                    resource.data.userId == request.auth.uid;
      allow write: if false; // Only Cloud Functions can write
    }
  }
}
```

**Click "Publish" to apply the rules.**

## Verifying Admin Setup

### Test 1: Login to Admin Panel

1. Run the admin panel: `cd admin-panel && npm run dev`
2. Open: http://localhost:3001
3. Login with your admin credentials
4. You should see the Analytics Dashboard

### Test 2: Check Admin Features

1. Click on "API Keys" tab - you should see the configuration page
2. Click on "Users" tab - you should see your admin user
3. Your user should have:
   - Role: `admin` badge
   - Premium: `Premium` badge

### Test 3: API Keys Encryption

1. Go to Firebase Console → Firestore
2. Open `config` → `apiKeys` document
3. You should see encrypted strings (not plain text)
4. Example: `U2FsdGVkX1...` (encrypted with AES-256)

## Common Issues & Solutions

### Issue: "Access denied" when logging in

**Solution**:
- Verify the user has `role: "admin"` in Firestore `users` collection
- Check that the document ID matches the Authentication UID
- Ensure Firebase Authentication Email/Password is enabled

### Issue: Can't save API keys

**Solution**:
- Check Firestore security rules are published
- Verify you're logged in as admin
- Check browser console for errors

### Issue: Admin features not showing in mobile app

**Solution**:
- Admins need to log into the mobile app (not just admin panel)
- The mobile app checks user.role === 'admin' from Firestore
- Admins automatically get `isPremium: true` features

## Creating Additional Admin Users

To create more admins, repeat Steps 1 and 2 for each new admin user.

**Best Practice**: Limit the number of admin accounts for security.

## Next Steps

1. ✅ Admin account created
2. ✅ Admin panel accessible
3. ✅ API keys configured
4. ✅ Security rules applied
5. 🔜 Deploy Firebase Functions (see FIREBASE_FUNCTIONS_GUIDE.md)
6. 🔜 Test mobile app with AI features
7. 🔜 Set up in-app purchases (see SETUP_INSTRUCTIONS.md)

## Security Reminders

- **Never share admin credentials**
- **Use strong, unique passwords**
- **Enable 2FA on your Firebase account**
- **Regularly review user list for unauthorized access**
- **Monitor Firestore usage for unusual activity**
- **Keep API keys private and rotate periodically**

## Admin Panel URLs

- **Development**: http://localhost:3001
- **Production**: Deploy to Vercel or Firebase Hosting (see admin-panel/README.md)

---

**Need Help?** Check the admin-panel/README.md or SETUP_INSTRUCTIONS.md for more details.
