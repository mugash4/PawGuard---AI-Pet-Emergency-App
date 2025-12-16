/**
 * Navigation Helper - Handles upgrade navigation with connectivity check
 * FIXED: Compatible with React Navigation v6 and nested navigators
 */

import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import { CommonActions } from '@react-navigation/native';

/**
 * Navigate to Subscription screen with connectivity check and error handling
 * @param {object} navigation - React Navigation object
 * @param {object} options - Optional configuration
 * @returns {Promise<boolean>} True if navigation succeeded, false otherwise
 */
export const navigateToSubscription = async (navigation, options = {}) => {
  const {
    checkInternet = true,
    showOfflineAlert = true,
    onSuccess = null,
    onError = null,
  } = options;

  try {
    // Step 1: Check if navigation object exists
    if (!navigation) {
      console.error('❌ Navigation object not available');
      Alert.alert(
        'Navigation Error',
        'Unable to open subscription screen. Please restart the app.',
        [{ text: 'OK' }]
      );
      if (onError) onError(new Error('Navigation object missing'));
      return false;
    }

    // Step 2: Check internet connectivity (if enabled)
    if (checkInternet) {
      const netInfo = await NetInfo.fetch();
      console.log('🌐 Network Status:', netInfo);

      const isConnected = netInfo.isConnected && netInfo.isInternetReachable !== false;

      if (!isConnected) {
        if (showOfflineAlert) {
          Alert.alert(
            '📡 No Internet Connection',
            'Please check your internet connection and try again. An internet connection is required to view subscription options.',
            [{ text: 'OK' }]
          );
        }
        console.warn('⚠️ No internet connection - cannot open subscription screen');
        if (onError) onError(new Error('No internet connection'));
        return false;
      }

      console.log('✅ Internet connection confirmed');
    }

    // Step 3: Navigate to Subscription screen
    console.log('🚀 Navigating to Subscription screen...');

    // CRITICAL FIX: Use CommonActions.navigate for cross-navigator navigation
    // This works from any nested navigator (like tabs) to root stack screens
    try {
      navigation.dispatch(
        CommonActions.navigate({
          name: 'Subscription',
        })
      );
      console.log('✅ Navigation dispatched successfully');
      
      if (onSuccess) onSuccess();
      return true;
    } catch (navError) {
      console.error('❌ Navigation dispatch failed:', navError);
      throw navError;
    }

  } catch (error) {
    console.error('❌ Navigation error:', error);
    Alert.alert(
      'Navigation Error',
      'Unable to open subscription screen. Please try:\n\n1. Check your internet connection\n2. Restart the app\n3. Contact support if issue persists',
      [{ text: 'OK' }]
    );
    if (onError) onError(error);
    return false;
  }
};

/**
 * Check internet connectivity only
 * @returns {Promise<boolean>} True if connected, false otherwise
 */
export const checkInternetConnection = async () => {
  try {
    const netInfo = await NetInfo.fetch();
    const isConnected = netInfo.isConnected && netInfo.isInternetReachable !== false;
    console.log('🌐 Internet check:', isConnected ? 'Connected ✅' : 'Offline ❌');
    return isConnected;
  } catch (error) {
    console.error('❌ Error checking internet:', error);
    return false; // Assume offline on error
  }
};

/**
 * Show custom offline alert
 * @param {string} customMessage - Optional custom message
 */
export const showOfflineAlert = (customMessage) => {
  Alert.alert(
    '📡 No Internet Connection',
    customMessage || 'Please check your internet connection and try again.',
    [{ text: 'OK' }]
  );
};

/**
 * Test navigation object validity
 * @param {object} navigation - React Navigation object
 * @returns {boolean} True if valid, false otherwise
 */
export const isNavigationValid = (navigation) => {
  if (!navigation) {
    console.warn('⚠️ Navigation object is null/undefined');
    return false;
  }

  if (!navigation.navigate && !navigation.dispatch) {
    console.warn('⚠️ Navigation object missing required methods');
    return false;
  }

  console.log('✅ Navigation object is valid');
  return true;
};
