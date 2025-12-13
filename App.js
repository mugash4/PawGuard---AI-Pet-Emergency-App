import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { UserProvider } from './src/context/UserContext';
import { initializeFirebase } from './src/services/firebase';
import AppNavigator from './src/navigation/AppNavigator';
import adMobService from './src/services/adMobService';
import { requestNotificationPermissions } from './src/services/notificationService';

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('🚀 Starting app initialization...');

        // STEP 1: Initialize Firebase FIRST (most critical)
        try {
          await initializeFirebase();
          console.log('✅ Firebase initialized successfully');
        } catch (firebaseError) {
          console.error('⚠️ Firebase initialization error:', firebaseError);
          // Continue anyway - app can work without Firebase
        }

        // STEP 2: Wait a bit for native modules to be ready
        await new Promise(resolve => setTimeout(resolve, 500));

        // STEP 3: Initialize AdMob (with proper error handling)
        try {
          await adMobService.initialize();
          console.log('✅ AdMob service initialized successfully');
        } catch (adError) {
          console.warn('⚠️ AdMob initialization error (non-critical):', adError);
          // Continue - ads just won't work
        }

        // STEP 4: Request notification permissions (optional, non-blocking)
        try {
          await requestNotificationPermissions();
          console.log('✅ Notification permissions handled');
        } catch (notifError) {
          console.warn('⚠️ Notification permission error (non-critical):', notifError);
          // Continue - notifications just won't work
        }

        // STEP 5: Small delay for splash screen animation
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
