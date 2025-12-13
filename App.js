import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { UserProvider } from './src/context/UserContext';
import { initializeFirebase } from './src/services/firebase';
import AppNavigator from './src/navigation/AppNavigator';
// ❌ REMOVED: import mobileAds from 'react-native-google-mobile-ads';
// The plugin handles initialization automatically!
import { requestNotificationPermissions } from './src/services/notificationService';

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize Firebase FIRST and wait for it to complete
        await initializeFirebase();
        console.log('✅ Firebase initialized');

        // Request notification permissions (with error handling)
        try {
          await requestNotificationPermissions();
          console.log('✅ Notification permissions handled');
        } catch (notifError) {
          console.warn('⚠️ Notification permission error (non-critical):', notifError);
        }

        // ✅ FIX: Removed mobileAds().initialize() call
        // Google Mobile Ads is automatically initialized by the plugin
        // because delayAppMeasurementInit: false in app.json
        // Double initialization was causing the crash!
        console.log('✅ Google Mobile Ads will be initialized automatically by plugin');

        // Wait a bit for splash screen animation
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.error('❌ Critical initialization error:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
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
