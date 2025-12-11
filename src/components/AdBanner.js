import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useUser } from '../context/UserContext';

// Ad Unit IDs - Replace with your actual IDs for production
const AD_UNIT_IDS = {
  banner: {
    ios: __DEV__ 
      ? TestIds.ADAPTIVE_BANNER 
      : 'ca-app-pub-3940256099942544/2934735716',
    android: __DEV__ 
      ? TestIds.ADAPTIVE_BANNER 
      : 'ca-app-pub-2371616866592450/6210568558',
  },
};

export default function AdBanner() {
  const { user } = useUser();

  // Don't show ads for premium users
  if (user?.isPremium) {
    return null;
  }

  const adUnitId = Platform.OS === 'ios' 
    ? AD_UNIT_IDS.banner.ios 
    : AD_UNIT_IDS.banner.android;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          console.log('Banner ad loaded successfully');
        }}
        onAdFailedToLoad={(error) => {
          console.log('Banner ad failed to load:', error);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    width: '100%',
  },
});
