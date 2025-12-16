import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from '../screens/OnboardingScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import MainTabNavigator from './MainTabNavigator';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    checkOnboarding();
  }, [forceUpdate]);

  const checkOnboarding = async () => {
    try {
      const completed = await AsyncStorage.getItem('hasCompletedOnboarding');
      console.log('📋 Onboarding status:', completed);
      setHasCompletedOnboarding(completed === 'true');
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setHasCompletedOnboarding(false);
    }
  };

  // CRITICAL FIX: Function to complete onboarding and update navigation state
  const handleOnboardingComplete = async () => {
    console.log('✅ Onboarding completion triggered');
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      console.log('✅ Onboarding saved to AsyncStorage');
      // Force re-render by updating state
      setHasCompletedOnboarding(true);
      // Trigger effect to double-check
      setForceUpdate(prev => prev + 1);
    } catch (error) {
      console.error('❌ Error saving onboarding completion:', error);
    }
  };

  if (hasCompletedOnboarding === null) {
    return null; // Loading
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!hasCompletedOnboarding ? (
        <>
          <Stack.Screen 
            name="Onboarding" 
            component={OnboardingScreen}
            initialParams={{ 
              onNavigateToSubscription: (navigation) => {
                // Pass the completion handler when navigating to Subscription
                navigation.navigate('Subscription', { 
                  onComplete: handleOnboardingComplete 
                });
              }
            }}
          />
          <Stack.Screen 
            name="Subscription" 
            component={SubscriptionScreen}
            // The onComplete callback will be passed via navigation params
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          {/* Subscription accessible after onboarding with modal presentation */}
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
