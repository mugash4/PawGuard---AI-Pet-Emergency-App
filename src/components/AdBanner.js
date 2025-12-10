import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useUser } from '../context/UserContext';
import { getAdUnitId } from '../config/adConfig';

export default function AdBanner() {
  const { user } = useUser();

  // Don't show ads for premium users
  if (user?.isPremium) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={getAdUnitId('banner')}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
  },
});
