import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Text } from 'react-native'; 
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useUser } from '../context/UserContext';
import adMobService from '../services/adMobService';

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
  const [isAdMobReady, setIsAdMobReady] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(null);

  useEffect(() => {
    // CRITICAL FIX: Wait for AdMob to be fully initialized
    let checkInterval;
    let attempts = 0;
    const maxAttempts = 50; // 10 seconds maximum wait time

    const checkAdMobStatus = () => {
      if (adMobService.isInitialized) {
        console.log('✅ AdMob is ready, banner can now load');
        setIsAdMobReady(true);
        if (checkInterval) clearInterval(checkInterval);
      } else {
        attempts++;
        console.log(`⏳ Waiting for AdMob initialization... (attempt ${attempts}/${maxAttempts})`);
        
        if (attempts >= maxAttempts) {
          console.warn('⚠️ AdMob initialization timeout, giving up on banner ad');
          setAdError('AdMob initialization timeout');
          if (checkInterval) clearInterval(checkInterval);
        }
      }
    };

    // Check immediately
    checkAdMobStatus();

    // If not ready, check every 200ms
    if (!adMobService.isInitialized) {
      checkInterval = setInterval(checkAdMobStatus, 200);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  // Don't show ads for premium users
  if (user?.isPremium) {
    return null;
  }

  // Don't render banner until AdMob is ready
  if (!isAdMobReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#FF8C61" />
        <Text style={styles.loadingText}>Loading ad...</Text>
      </View>
    );
  }

  // Show error state if AdMob failed to initialize
  if (adError) {
    console.log('❌ Banner ad error state:', adError);
    // Return nothing (no placeholder) if ads can't load
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
          console.log('✅ Banner ad loaded successfully');
          setAdLoaded(true);
        }}
        onAdFailedToLoad={(error) => {
          console.log('❌ Banner ad failed to load:', error);
          setAdError(error.message);
          setAdLoaded(false);
        }}
      />
      {!adLoaded && (
        <View style={styles.placeholderOverlay}>
          <ActivityIndicator size="small" color="#FF8C61" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    marginVertical: 16,
    width: '100%',
    borderRadius: 8,
    minHeight: 60, // Ensure minimum height for ad space
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    marginVertical: 16,
    width: '100%',
    borderRadius: 8,
    minHeight: 60,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  placeholderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
