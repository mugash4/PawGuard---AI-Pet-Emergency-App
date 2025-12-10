# PawGuard Admin Panel

Web-based admin dashboard for managing PawGuard app configuration.

## Features

- **Analytics Dashboard**: View app statistics (users, premium subscribers, AI queries, revenue)
- **API Key Management**: Securely configure DeepSeek and AdMob API keys
- **User Management**: View users, grant/revoke premium access
- **Role-Based Access**: Only users with `role: "admin"` can access

## Setup Instructions

### 1. Install Dependencies

```bash
cd admin-panel
npm install
```

### 2. Configure Firebase

Edit `lib/firebase.js` and replace with your Firebase project credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Create Admin User

In Firebase Console:

1. Go to **Authentication** → **Users** → **Add User**
2. Create user with email/password
3. Go to **Firestore Database** → **users** collection
4. Find the user document (ID = UID from Authentication)
5. Add field: `role` (string) = `"admin"`
6. Add field: `isPremium` (boolean) = `true`

### 4. Run Development Server

```bash
npm run dev
```

Admin panel will be available at: `http://localhost:3001`

### 5. Login

Use the admin email and password you created in Step 3.

## Security Features

### API Key Encryption
- API keys are encrypted using AES-256 before storage in Firestore
- Encryption key should be stored in environment variable in production
- Keys are only accessible via backend Cloud Functions
- Mobile app never has direct access to API keys

### Role-Based Access Control
- Only users with `role: "admin"` can access the panel
- Non-admin users are automatically logged out
- Admin role is verified on every page load

### Firestore Security Rules
Add these rules to your Firebase project:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Config collection (API keys) - only accessible by Cloud Functions
    match /config/{document=**} {
      allow read, write: if false; // No client access
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId || 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // AI Queries - users can read their own
    match /aiQueries/{queryId} {
      allow read: if request.auth != null && queryId.matches(request.auth.uid + '.*');
      allow write: if false; // Only Cloud Functions can write
    }
  }
}
```

## Deployment

### Option 1: Vercel (Recommended)

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel`
3. Set environment variable: `ENCRYPTION_KEY` (for production)

### Option 2: Firebase Hosting

```bash
npm run build
firebase deploy --only hosting:admin
```

## Admin Panel Architecture

```
admin-panel/
├── pages/
│   └── index.js          # Main entry point with auth check
├── components/
│   ├── Login.js          # Admin login form
│   ├── Dashboard.js      # Main dashboard layout
│   ├── Analytics.js      # Stats and metrics
│   ├── APIKeyManager.js  # Secure API key configuration
│   └── UserManager.js    # User management table
├── lib/
│   └── firebase.js       # Firebase initialization
└── package.json
```

## Important Notes

1. **API Keys Security**: 
   - In production, use environment variables for encryption key
   - Never commit encryption keys to Git
   - API keys are stored encrypted in Firestore

2. **Admin Access**:
   - Grant admin role carefully
   - Admins have full access to all features
   - Admins automatically get premium features

3. **Production Deployment**:
   - Use HTTPS only
   - Set up proper CORS policies
   - Enable Firebase App Check
   - Monitor admin activity logs

## Troubleshooting

### "Access denied" error
- Verify user has `role: "admin"` in Firestore
- Check Firebase Authentication is enabled
- Ensure email/password sign-in is enabled

### API keys not saving
- Check Firestore security rules
- Verify admin user is authenticated
- Check browser console for errors

### Can't access after deployment
- Verify Firebase config is correct
- Check deployment logs
- Ensure environment variables are set

## Cost Estimates

Running the admin panel:
- **Hosting**: Free on Vercel or Firebase Hosting (small traffic)
- **Firestore**: Minimal reads/writes (<$1/month)
- **Cloud Functions**: Only triggered by mobile app

Total estimated cost: **< $5/month** for typical usage
