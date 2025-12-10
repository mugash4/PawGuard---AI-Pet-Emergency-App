import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

// ============================================
// AD UNIT ID CONFIGURATION
// ============================================
// IMPORTANT: Replace these with your real AdMob Unit IDs before publishing!
// Get your Ad Unit IDs from: https://apps.admob.com/

const AD_UNIT_IDS = {
  // BANNER ADS (shown at bottom of screens)
  banner: {
    ios: __DEV__ 
      ? TestIds.ADAPTIVE_BANNER 
      : 'ca-app-pub-3940256099942544/2934735716', // TODO: Replace with your iOS Banner Ad Unit ID
    android: __DEV__ 
      ? TestIds.ADAPTIVE_BANNER 
      : 'ca-app-pub-2371616866592450/6210568558', // TODO: Replace with your Android Banner Ad Unit ID
  },

  // INTERSTITIAL ADS (full-screen ads between screens/actions)
  interstitial: {
    ios: __DEV__ 
      ? TestIds.INTERSTITIAL 
      : 'ca-app-pub-3940256099942544/4411468910', // TODO: Replace with your iOS Interstitial Ad Unit ID
    android: __DEV__ 
      ? TestIds.INTERSTITIAL 
      : 'ca-app-pub-2371616866592450/7115073225', // TODO: Replace with your Android Interstitial Ad Unit ID
  },

  
};

// Get the appropriate Ad Unit ID for the current platform
export const getAdUnitId = (adType) => {
  const platform = Platform.OS;
  return AD_UNIT_IDS[adType][platform];
};

// Ad frequency settings (how often to show interstitial ads)
export const AD_FREQUENCY = {
  INTERSTITIAL_SCREEN_COUNT: 3, // Show interstitial ad every 3 screen navigations
  INTERSTITIAL_MIN_INTERVAL: 60000, // Minimum 60 seconds between interstitial ads
};

export default AD_UNIT_IDS;
