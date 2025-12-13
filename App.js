import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { UserProvider } from './src/context/UserContext';
import AppNavigator from './src/navigation/AppNavigator';

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('🚀 Starting app initialization...');

        // CRITICAL FIX: Longer delay for native modules to be fully ready
        // This fixes the React Native 0.76.5 + Expo 52 timing issues
        await new Promise(resolve => setTimeout(resolve, 1000));

        // STEP 1: Initialize Firebase (non-blocking, with timeout)
        try {
          const firebasePromise = import('./src/services/firebase').then(module => module.initializeFirebase());
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Firebase timeout')), 8000)
          );
          
          await Promise.race([firebasePromise, timeoutPromise]);
          console.log('✅ Firebase initialized successfully');
        } catch (firebaseError) {
          console.warn('⚠️ Firebase initialization error (non-critical):', firebaseError.message);
          // Continue anyway - app can work without Firebase
        }

        // STEP 2: Initialize AdMob (with strict timeout and error handling)
        try {
          const adMobPromise = import('./src/services/adMobService').then(module => module.default.initialize());
          const adTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AdMob timeout')), 8000)
          );
          
          await Promise.race([adMobPromise, adTimeoutPromise]);
          console.log('✅ AdMob service initialized successfully');
        } catch (adError) {
          console.warn('⚠️ AdMob initialization error (non-critical):', adError.message);
          // Continue - ads just won't work
        }

        // STEP 3: Request notification permissions (optional, non-blocking)
        try {
          const notifPromise = import('./src/services/notificationService').then(module => 
            module.requestNotificationPermissions()
          );
          const notifTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Notification timeout')), 5000)
          );
          
          await Promise.race([notifPromise, notifTimeoutPromise]);
          console.log('✅ Notification permissions handled');
        } catch (notifError) {
          console.warn('⚠️ Notification permission error (non-critical):', notifError.message);
          // Continue - notifications just won't work
        }

        // STEP 4: Small delay for splash screen animation
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('✅ App initialization complete!');
      } catch (e) {
        console.error('❌ Critical initialization error:', e);
        setInitError(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync().catch(console.warn);
    }
  }, [appIsReady]);

  // Show error screen if critical failure
  if (initError) {
    return (
      <SafeAreaProvider>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Initialization Error</Text>
          <Text style={styles.errorText}>
            The app encountered an error during startup.{'\n\n'}
            Please try restarting the app.
          </Text>
          <Text style={styles.errorDetails}>
            {initError.message || 'Unknown error'}
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  // Wait until app is ready
  if (!appIsReady) {
    return null; // Splash screen is still showing
  }

  return (
    <SafeAreaProvider>
      <UserProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </UserProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  errorDetails: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});
