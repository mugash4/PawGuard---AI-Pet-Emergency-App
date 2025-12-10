import { useEffect } from 'react';
import { useUser } from '../context/UserContext';
import adMobService from '../services/adMobService';

// Custom hook to show interstitial ads when navigating between screens
export const useInterstitialAd = (navigation) => {
  const { user } = useUser();

  useEffect(() => {
    // Only track navigation for free users
    if (user?.isPremium) {
      return;
    }

    // Listen to navigation events
    const unsubscribe = navigation.addListener('focus', () => {
      // Track screen navigation and show ad if threshold reached
      adMobService.trackScreenNavigation();
    });

    return unsubscribe;
  }, [navigation, user]);
};
