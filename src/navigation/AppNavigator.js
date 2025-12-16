import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from '../screens/OnboardingScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import MainTabNavigator from './MainTabNavigator';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);
  const [navigationRef, setNavigationRef] = useState(null);

  useEffect(() => {
    checkOnboarding();
  }, []);

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

  // CRITICAL FIX: Complete onboarding and immediately navigate to Main
  const handleOnboardingComplete = async (navigation) => {
    console.log('✅ handleOnboardingComplete called');
    
    try {
      // Save to AsyncStorage first
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      console.log('✅ Onboarding saved to AsyncStorage');
      
      // Update state
      setHasCompletedOnboarding(true);
      
      // CRITICAL FIX: Immediately reset navigation stack to Main
      // This forces the navigation to change without waiting for re-render
      if (navigation) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          })
        );
        console.log('✅ Navigation reset to Main');
      }
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
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
              onComplete: handleOnboardingComplete
            }}
          />
          <Stack.Screen 
            name="Subscription" 
            component={SubscriptionScreen}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
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