import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { UserProvider } from './src/context/UserContext';
import AppNavigator from './src/navigation/AppNavigator';

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if already prevented
});

const isInternetAvailable = (state) => {
  if (!state) return false;
  return Boolean(state.isConnected) && state.isInternetReachable !== false;
};

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [initError, setInitError] = useState(null);
  const [isOnline, setIsOnline] = useState(null);
  const [networkChecked, setNetworkChecked] = useState(false);
  const [servicesInitialized, setServicesInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const applyNetworkState = (state) => {
      if (!isMounted) return;
      setIsOnline(isInternetAvailable(state));
      setNetworkChecked(true);
    };

    NetInfo.fetch()
      .then(applyNetworkState)
      .catch((error) => {
        console.warn('⚠️ Initial network check failed:', error?.message || error);
        if (isMounted) {
          setIsOnline(false);
          setNetworkChecked(true);
        }
      });

    const unsubscribe = NetInfo.addEventListener(applyNetworkState);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function prepareOnlineServices() {
      if (!networkChecked) return;

      if (!isOnline) {
        setAppIsReady(true);
        return;
      }

      if (servicesInitialized) {
        setAppIsReady(true);
        return;
      }

      try {
        console.log('🚀 Starting online-only app initialization...');

        // Minimal initial delay for smooth startup
        await new Promise(resolve => setTimeout(resolve, 100));

        const initPromises = [];

        // Firebase
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

        // AdMob
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

        // Notifications
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

        await Promise.race([
          Promise.allSettled(initPromises),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Initialization timeout')), 5000)
          )
        ]).catch(() => {
          console.log('⏱️ Some services timed out, continuing anyway...');
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        if (!cancelled) {
          setServicesInitialized(true);
          console.log('✅ Online-only app ready!');
        }
      } catch (e) {
        console.error('❌ Critical error during initialization:', e);
        if (!cancelled) {
          setInitError(e);
        }
      } finally {
        if (!cancelled) {
          setAppIsReady(true);
        }
      }
    }

    prepareOnlineServices();

    return () => {
      cancelled = true;
    };
  }, [networkChecked, isOnline, servicesInitialized]);

  useEffect(() => {
    if (appIsReady && networkChecked) {
      SplashScreen.hideAsync().catch(err => {
        console.warn('⚠️ Error hiding splash screen:', err);
      });
    }
  }, [appIsReady, networkChecked]);

  const retryConnectionCheck = async () => {
    try {
      const state = await NetInfo.fetch();
      setIsOnline(isInternetAvailable(state));
      setNetworkChecked(true);
    } catch (error) {
      console.warn('⚠️ Retry network check failed:', error?.message || error);
      setIsOnline(false);
      setNetworkChecked(true);
    }
  };

  if (!networkChecked || !appIsReady) {
    return null; // Splash screen is still showing
  }

  if (initError && initError.message?.includes('Critical')) {
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

  if (!isOnline) {
    return (
      <SafeAreaProvider>
        <View style={styles.offlineContainer}>
          <Text style={styles.offlineIcon}>🌐</Text>
          <Text style={styles.offlineTitle}>Internet connection required</Text>
          <Text style={styles.offlineText}>
            PawGuard is now online-only. Connect to the internet to open and use the app.
          </Text>

          <TouchableOpacity style={styles.retryButton} onPress={retryConnectionCheck}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <UserProvider>
        <NavigationContainer>
          <AppNavigator />
          {!servicesInitialized && (
            <View style={styles.connectingOverlay} pointerEvents="none">
              <View style={styles.connectingCard}>
                <ActivityIndicator size="small" color="#FF8C61" />
                <Text style={styles.connectingText}>Connecting...</Text>
              </View>
            </View>
          )}
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
  offlineContainer: {
    flex: 1,
    backgroundColor: '#FFF8F4',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  offlineIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  offlineTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  offlineText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#FF8C61',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  connectingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  connectingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  connectingText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
});
