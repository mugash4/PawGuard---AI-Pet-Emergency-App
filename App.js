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

        // Minimal initial delay for smooth startup
        await new Promise(resolve => setTimeout(resolve, 100));

        // Initialize services in parallel with proper error handling
        const initPromises = [];

        // Promise 1: Firebase (with timeout and graceful degradation)
        initPromises.push(
          Promise.resolve().then(async () => {
            try {
              const module = await import('./src/services/firebase');
              if (module && module.initializeFirebase) {
                await module.initializeFirebase();
                console.log('✅ Firebase ready');
              }
            } catch (err) {
              console.warn('⚠️ Firebase skipped (non-critical):', err.message);
            }
          })
        );

        // Promise 2: AdMob (with timeout and graceful degradation)
        initPromises.push(
          Promise.resolve().then(async () => {
            try {
              const module = await import('./src/services/adMobService');
              if (module && module.default && module.default.initialize) {
                await module.default.initialize();
                console.log('✅ AdMob ready');
              }
            } catch (err) {
              console.warn('⚠️ AdMob skipped (non-critical):', err.message);
            }
          })
        );

        // Promise 3: Notifications (with timeout and graceful degradation)
        initPromises.push(
          Promise.resolve().then(async () => {
            try {
              const module = await import('./src/services/notificationService');
              if (module && module.requestNotificationPermissions) {
                await module.requestNotificationPermissions();
                console.log('✅ Notifications ready');
              }
            } catch (err) {
              console.warn('⚠️ Notifications skipped (non-critical):', err.message);
            }
          })
        );

        // Wait for all services with timeout
        await Promise.race([
          Promise.allSettled(initPromises),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Initialization timeout')), 5000)
          )
        ]).catch(() => {
          console.log('⏱️ Some services timed out, continuing anyway...');
        });

        // Small delay for smooth transition
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('✅ App ready!');
      } catch (e) {
        console.error('❌ Critical error during initialization:', e);
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
      SplashScreen.hideAsync().catch(err => {
        console.warn('⚠️ Error hiding splash screen:', err);
      });
    }
  }, [appIsReady]);

  // Show error screen if critical failure (but continue normally for non-critical errors)
  if (initError && initError.message.includes('Critical')) {
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
