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

  // ✅ FIXED: Complete onboarding and go DIRECTLY to Main (skip subscription)
  const handleOnboardingComplete = async (navigation) => {
    console.log('✅ handleOnboardingComplete called - Going DIRECTLY to Main');
    
    try {
      // Save to AsyncStorage first
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      console.log('✅ Onboarding saved to AsyncStorage');
      
      // Update state
      setHasCompletedOnboarding(true);
      
      // ✅ FIXED: Reset navigation stack to Main (NO SUBSCRIPTION SCREEN)
      if (navigation) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          })
        );
        console.log('✅ Navigation reset to Main (subscription screen skipped)');
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
        // ✅ FIXED: Only show Onboarding (NO Subscription in stack)
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen}
          initialParams={{ 
            onComplete: handleOnboardingComplete
          }}
        />
      ) : (
        // ✅ After onboarding, show Main + Subscription as modal (for upgrades)
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
