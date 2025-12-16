import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from '../screens/OnboardingScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import MainTabNavigator from './MainTabNavigator';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const completed = await AsyncStorage.getItem('hasCompletedOnboarding');
      setHasCompletedOnboarding(completed === 'true');
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setHasCompletedOnboarding(false);
    }
  };

  // CRITICAL FIX: Listen for onboarding completion changes
  useEffect(() => {
    const subscription = AsyncStorage.addListener?.('change', (data) => {
      if (data?.hasCompletedOnboarding === 'true') {
        setHasCompletedOnboarding(true);
      }
    });

    return () => subscription?.remove?.();
  }, []);

  if (hasCompletedOnboarding === null) {
    return null; // Loading
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!hasCompletedOnboarding ? (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen 
            name="Subscription" 
            component={SubscriptionScreen}
            // CRITICAL FIX: Pass callback to update onboarding state
            initialParams={{ 
              onComplete: () => setHasCompletedOnboarding(true) 
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          {/* Subscription accessible after login with modal presentation */}
          <Stack.Screen 
            name="Subscription" 
            component={SubscriptionScreen}
            options={{
              presentation: 'modal',
              gestureEnabled: true,
              cardOverlayEnabled: true,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
