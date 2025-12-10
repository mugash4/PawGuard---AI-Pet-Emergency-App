import { InterstitialAd, RewardedAd, AdEventType, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { getAdUnitId, AD_FREQUENCY } from '../config/adConfig';

class AdMobService {
  constructor() {
    this.interstitialAd = null;
    this.rewardedAd = null;
    this.screenNavigationCount = 0;
    this.lastInterstitialTime = 0;
    this.isInterstitialLoaded = false;
    this.isRewardedLoaded = false;
    
    this.initializeAds();
  }

  // Initialize all ads
  initializeAds() {
    this.loadInterstitialAd();
    this.loadRewardedAd();
  }

  // ==================== INTERSTITIAL ADS ====================
  
  loadInterstitialAd() {
    try {
      this.interstitialAd = InterstitialAd.createForAdRequest(
        getAdUnitId('interstitial'),
        {
          requestNonPersonalizedAdsOnly: true,
        }
      );

      // Event: Ad loaded successfully
      const unsubscribeLoaded = this.interstitialAd.addAdEventListener(
        AdEventType.LOADED,
        () => {
          console.log('Interstitial ad loaded');
          this.isInterstitialLoaded = true;
        }
      );

      // Event: Ad closed by user
      const unsubscribeClosed = this.interstitialAd.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          console.log('Interstitial ad closed');
          this.isInterstitialLoaded = false;
          // Load next ad
          this.loadInterstitialAd();
        }
      );

      // Event: Ad failed to load
      const unsubscribeError = this.interstitialAd.addAdEventListener(
        AdEventType.ERROR,
        (error) => {
          console.log('Interstitial ad error:', error);
          this.isInterstitialLoaded = false;
        }
      );

      // Start loading the ad
      this.interstitialAd.load();

      // Store unsubscribe functions
      this.interstitialUnsubscribe = () => {
        unsubscribeLoaded();
        unsubscribeClosed();
        unsubscribeError();
      };
    } catch (error) {
      console.error('Error creating interstitial ad:', error);
    }
  }

  async showInterstitialAd() {
    const currentTime = Date.now();
    const timeSinceLastAd = currentTime - this.lastInterstitialTime;

    // Check if enough time has passed since last ad
    if (timeSinceLastAd < AD_FREQUENCY.INTERSTITIAL_MIN_INTERVAL) {
      console.log('Too soon to show another interstitial ad');
      return false;
    }

    if (this.isInterstitialLoaded && this.interstitialAd) {
      try {
        await this.interstitialAd.show();
        this.lastInterstitialTime = currentTime;
        this.screenNavigationCount = 0; // Reset counter
        return true;
      } catch (error) {
        console.error('Error showing interstitial ad:', error);
        return false;
      }
    } else {
      console.log('Interstitial ad not loaded yet');
      return false;
    }
  }

  // Track screen navigation and show ad when threshold reached
  trackScreenNavigation() {
    this.screenNavigationCount++;
    console.log(`Screen navigation count: ${this.screenNavigationCount}`);

    if (this.screenNavigationCount >= AD_FREQUENCY.INTERSTITIAL_SCREEN_COUNT) {
      return this.showInterstitialAd();
    }
    return false;
  }

  // ==================== REWARDED ADS ====================

  loadRewardedAd() {
    try {
      this.rewardedAd = RewardedAd.createForAdRequest(
        getAdUnitId('rewarded'),
        {
          requestNonPersonalizedAdsOnly: true,
        }
      );

      // Event: Ad loaded successfully
      const unsubscribeLoaded = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          console.log('Rewarded ad loaded');
          this.isRewardedLoaded = true;
        }
      );

      // Event: User earned reward
      const unsubscribeEarned = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          console.log('User earned reward:', reward);
          // Reward will be handled in the callback when showing the ad
        }
      );

      // Event: Ad closed by user
      const unsubscribeClosed = this.rewardedAd.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          console.log('Rewarded ad closed');
          this.isRewardedLoaded = false;
          // Load next ad
          this.loadRewardedAd();
        }
      );

      // Event: Ad failed to load
      const unsubscribeError = this.rewardedAd.addAdEventListener(
        AdEventType.ERROR,
        (error) => {
          console.log('Rewarded ad error:', error);
          this.isRewardedLoaded = false;
        }
      );

      // Start loading the ad
      this.rewardedAd.load();

      // Store unsubscribe functions
      this.rewardedUnsubscribe = () => {
        unsubscribeLoaded();
        unsubscribeEarned();
        unsubscribeClosed();
        unsubscribeError();
      };
    } catch (error) {
      console.error('Error creating rewarded ad:', error);
    }
  }

  async showRewardedAd(onRewardEarned) {
    if (this.isRewardedLoaded && this.rewardedAd) {
      try {
        // Set up one-time reward listener
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
        console.error('Error showing rewarded ad:', error);
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

  // ==================== CLEANUP ====================

  destroy() {
    if (this.interstitialUnsubscribe) {
      this.interstitialUnsubscribe();
    }
    if (this.rewardedUnsubscribe) {
      this.rewardedUnsubscribe();
    }
  }
}

// Export singleton instance
export default new AdMobService();
