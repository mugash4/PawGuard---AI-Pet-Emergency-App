import { Platform } from 'react-native';
import { InterstitialAd, RewardedAd, AdEventType, RewardedAdEventType, MobileAds } from 'react-native-google-mobile-ads';
import { getAdUnitId, AD_FREQUENCY } from '../config/adConfig';

class AdMobService {
  constructor() {
    this.interstitialAd = null;
    this.rewardedAd = null;
    this.screenNavigationCount = 0;
    this.lastInterstitialTime = 0;
    this.isInterstitialLoaded = false;
    this.isRewardedLoaded = false;
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationFailed = false;
  }

  async initialize() {
    // Prevent multiple simultaneous initialization attempts
    if (this.isInitializing) {
      console.log('⏳ AdMobService initialization already in progress...');
      // Wait for the current initialization to complete
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    if (this.isInitialized) {
      console.log('✅ AdMobService already initialized');
      return;
    }

    if (this.initializationFailed) {
      console.log('⚠️ AdMobService initialization previously failed, skipping');
      return;
    }

    this.isInitializing = true;

    try {
      console.log('🚀 Starting AdMob initialization...');

      // CRITICAL FIX: Strict timeout to prevent hanging
      const initPromise = MobileAds().initialize();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AdMob initialization timeout after 8 seconds')), 8000)
      );

      const adapterStatuses = await Promise.race([initPromise, timeoutPromise]);
      
      console.log('✅ Google Mobile Ads initialized successfully');
      
      this.isInitialized = true;
      
      // Load ads in background (non-blocking, with error handling)
      setTimeout(() => {
        try {
          this.loadInterstitialAd();
          this.loadRewardedAd();
        } catch (loadError) {
          console.warn('⚠️ Error loading initial ads (non-critical):', loadError.message);
        }
      }, 2000);

    } catch (error) {
      console.error('❌ Error initializing AdMobService:', error.message);
      this.initializationFailed = true;
      // Mark as initialized anyway to prevent retry loops
      this.isInitialized = false;
    } finally {
      this.isInitializing = false;
    }
  }

  loadInterstitialAd() {
    if (!this.isInitialized) {
      console.log('⚠️ AdMobService not initialized yet, skipping interstitial load');
      return;
    }

    try {
      this.interstitialAd = InterstitialAd.createForAdRequest(
        getAdUnitId('interstitial'),
        {
          requestNonPersonalizedAdsOnly: true,
        }
      );

      const unsubscribeLoaded = this.interstitialAd.addAdEventListener(
        AdEventType.LOADED,
        () => {
          console.log('✅ Interstitial ad loaded');
          this.isInterstitialLoaded = true;
        }
      );

      const unsubscribeClosed = this.interstitialAd.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          console.log('Interstitial ad closed');
          this.isInterstitialLoaded = false;
          // Reload next ad
          setTimeout(() => this.loadInterstitialAd(), 1000);
        }
      );

      const unsubscribeError = this.interstitialAd.addAdEventListener(
        AdEventType.ERROR,
        (error) => {
          console.log('Interstitial ad error:', error.message);
          this.isInterstitialLoaded = false;
        }
      );

      this.interstitialAd.load();

      this.interstitialUnsubscribe = () => {
        unsubscribeLoaded();
        unsubscribeClosed();
        unsubscribeError();
      };
    } catch (error) {
      console.error('Error creating interstitial ad:', error.message);
    }
  }

  async showInterstitialAd() {
    if (!this.isInitialized) {
      console.log('⚠️ AdMobService not initialized yet');
      return false;
    }

    const currentTime = Date.now();
    const timeSinceLastAd = currentTime - this.lastInterstitialTime;

    if (timeSinceLastAd < AD_FREQUENCY.INTERSTITIAL_MIN_INTERVAL) {
      console.log('Too soon to show another interstitial ad');
      return false;
    }

    if (this.isInterstitialLoaded && this.interstitialAd) {
      try {
        await this.interstitialAd.show();
        this.lastInterstitialTime = currentTime;
        this.screenNavigationCount = 0;
        return true;
      } catch (error) {
        console.error('Error showing interstitial ad:', error.message);
        return false;
      }
    } else {
      console.log('Interstitial ad not loaded yet');
      return false;
    }
  }

  trackScreenNavigation() {
    if (!this.isInitialized) {
      return false;
    }

    this.screenNavigationCount++;
    console.log(`Screen navigation count: ${this.screenNavigationCount}`);

    if (this.screenNavigationCount >= AD_FREQUENCY.INTERSTITIAL_SCREEN_COUNT) {
      return this.showInterstitialAd();
    }
    return false;
  }

  loadRewardedAd() {
    if (!this.isInitialized) {
      console.log('⚠️ AdMobService not initialized yet, skipping rewarded load');
      return;
    }

    try {
      this.rewardedAd = RewardedAd.createForAdRequest(
        getAdUnitId('rewarded'),
        {
          requestNonPersonalizedAdsOnly: true,
        }
      );

      const unsubscribeLoaded = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          console.log('✅ Rewarded ad loaded');
          this.isRewardedLoaded = true;
        }
      );

      const unsubscribeEarned = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          console.log('User earned reward:', reward);
        }
      );

      const unsubscribeClosed = this.rewardedAd.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          console.log('Rewarded ad closed');
          this.isRewardedLoaded = false;
          // Reload next ad
          setTimeout(() => this.loadRewardedAd(), 1000);
        }
      );

      const unsubscribeError = this.rewardedAd.addAdEventListener(
        AdEventType.ERROR,
        (error) => {
          console.log('Rewarded ad error:', error.message);
          this.isRewardedLoaded = false;
        }
      );

      this.rewardedAd.load();

      this.rewardedUnsubscribe = () => {
        unsubscribeLoaded();
        unsubscribeEarned();
        unsubscribeClosed();
        unsubscribeError();
      };
    } catch (error) {
      console.error('Error creating rewarded ad:', error.message);
    }
  }

  async showRewardedAd(onRewardEarned) {
    if (!this.isInitialized) {
      console.log('⚠️ AdMobService not initialized yet');
      return false;
    }

    if (this.isRewardedLoaded && this.rewardedAd) {
      try {
        const unsubscribe = this.rewardedAd.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          (reward) => {
            console.log('Reward earned:', reward);
            if (onRewardEarned) {
              onRewardEarned(reward);
            }
            unsubscribe();
          }
        );

        await this.rewardedAd.show();
        return true;
      } catch (error) {
        console.error('Error showing rewarded ad:', error.message);
        return false;
      }
    } else {
      console.log('Rewarded ad not loaded yet');
      return false;
    }
  }

  isRewardedAdReady() {
    return this.isRewardedLoaded;
  }

  destroy() {
    if (this.interstitialUnsubscribe) {
      this.interstitialUnsubscribe();
    }
    if (this.rewardedUnsubscribe) {
      this.rewardedUnsubscribe();
    }
  }
}

export default new AdMobService();
