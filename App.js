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

        // OPTIMIZED: Minimal initial delay (200ms instead of 1500ms)
        await new Promise(resolve => setTimeout(resolve, 200));

        // OPTIMIZED: Initialize ALL services in PARALLEL (not sequential)
        const initPromises = [];

        // Promise 1: Firebase (with shorter 3s timeout)
        initPromises.push(
          import('./src/services/firebase')
            .then(module => module.initializeFirebase())
            .then(() => console.log('✅ Firebase ready'))
            .catch(err => console.warn('⚠️ Firebase skipped:', err.message))
        );

        // Promise 2: AdMob (with shorter 3s timeout, non-critical)
        initPromises.push(
          import('./src/services/adMobService')
            .then(module => module.default.initialize())
            .then(() => console.log('✅ AdMob ready'))
            .catch(err => console.warn('⚠️ AdMob skipped:', err.message))
        );

        // Promise 3: Notifications (with shorter 2s timeout) - EXPO ONLY
        initPromises.push(
          import('./src/services/notificationService')
            .then(module => module.requestNotificationPermissions())
            .then(() => console.log('✅ Expo Notifications ready'))
            .catch(err => console.warn('⚠️ Notifications skipped:', err.message))
        );

        // CRITICAL: Race against 4-second timeout for ALL services
        await Promise.race([
          Promise.allSettled(initPromises),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Initialization timeout')), 4000)
          )
        ]).catch(() => {
          console.log('⏱️ Some services timed out, continuing anyway...');
        });

        // Minimal delay for smooth transition (100ms)
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('✅ App ready in ~4.3 seconds!');
      } catch (e) {
        console.error('❌ Critical error:', e);
        setInitError(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      // Hide splash screen with animation
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
