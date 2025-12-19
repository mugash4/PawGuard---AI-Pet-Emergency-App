/**
 * FCM Service - Firebase Cloud Messaging (V1 API)
 * Works with AND without internet connectivity
 * Uses Expo + Firebase Cloud Messaging API (V1)
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './firebase';

const FCM_TOKEN_KEY = '@pawguard_fcm_token';
const VAPID_KEY = 'YOUR_VAPID_KEY_HERE'; // Get from Firebase Console > Project Settings > Cloud Messaging

// Configure notification handler (foreground notifications)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class FCMService {
  constructor() {
    this.fcmToken = null;
    this.messaging = null;
    this.isInitialized = false;
  }

  /**
   * Initialize FCM Service
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('✅ FCM already initialized');
        return this.fcmToken;
      }

      console.log('🚀 Initializing FCM Service...');

      // Request permissions first
      const permissionGranted = await this.requestPermissions();
      if (!permissionGranted) {
        console.log('❌ Notification permissions denied');
        return null;
      }

      // Get or retrieve FCM token
      await this.getFCMToken();

      // Set up notification channels (Android)
      await this.setupNotificationChannels();

      // Set up foreground message listener
      this.setupForegroundListener();

      // Set up background message handler
      this.setupBackgroundListener();

      this.isInitialized = true;
      console.log('✅ FCM Service initialized successfully');
      
      return this.fcmToken;
    } catch (error) {
      console.error('❌ FCM initialization error:', error);
      return null;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions() {
    try {
      if (!Device.isDevice) {
        console.warn('⚠️ Notifications only work on physical devices');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Notification permission not granted');
        return false;
      }

      console.log('✅ Notification permissions granted');
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Get FCM Token (Firebase Cloud Messaging)
   */
  async getFCMToken() {
    try {
      // Try to get cached token first
      const cachedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      if (cachedToken) {
        this.fcmToken = cachedToken;
        console.log('✅ Using cached FCM token');
        return cachedToken;
      }

      // Get new FCM token
      if (Platform.OS === 'web') {
        // Web platform (PWA) - uses VAPID key
        this.messaging = getMessaging(app);
        const token = await getToken(this.messaging, { vapidKey: VAPID_KEY });
        this.fcmToken = token;
      } else {
        // Mobile (iOS/Android) - uses Expo push token as fallback
        // For native FCM, you'll need @react-native-firebase/messaging
        const expoPushToken = (await Notifications.getExpoPushTokenAsync()).data;
        this.fcmToken = expoPushToken;
      }

      // Cache the token
      if (this.fcmToken) {
        await AsyncStorage.setItem(FCM_TOKEN_KEY, this.fcmToken);
        console.log('✅ FCM Token obtained and cached:', this.fcmToken.substring(0, 20) + '...');
      }

      return this.fcmToken;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Set up notification channels (Android only)
   */
  async setupNotificationChannels() {
    if (Platform.OS !== 'android') return;

    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF8C61',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('vaccination', {
        name: 'Vaccination Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF8C61',
        sound: 'default',
        description: 'Reminders for upcoming vaccinations',
      });

      await Notifications.setNotificationChannelAsync('health', {
        name: 'Health Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF8C61',
        sound: 'default',
        description: 'Health check and wellness reminders',
      });

      await Notifications.setNotificationChannelAsync('emergency', {
        name: 'Emergency Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF0000',
        sound: 'default',
        description: 'Critical emergency notifications',
      });

      console.log('✅ Notification channels configured');
    } catch (error) {
      console.error('Error setting up notification channels:', error);
    }
  }

  /**
   * Set up foreground message listener (when app is open)
   * Works WITH internet connection
   */
  setupForegroundListener() {
    if (Platform.OS === 'web' && this.messaging) {
      // Web platform
      onMessage(this.messaging, (payload) => {
        console.log('📩 Foreground FCM message received:', payload);
        this.displayNotification(payload);
      });
    } else {
      // Mobile platform
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('📩 Foreground notification received:', notification);
        // Notification is automatically displayed by Expo
      });
    }
  }

  /**
   * Set up background message handler (when app is closed/background)
   * Works WITHOUT internet connection (scheduled notifications)
   */
  setupBackgroundListener() {
    // Background notifications are handled automatically by:
    // 1. FCM service worker (web)
    // 2. Native push notification system (iOS/Android)
    // 3. Scheduled local notifications (offline)
    
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('📩 Background notification tapped:', response);
      // Handle notification tap
      const data = response.notification.request.content.data;
      this.handleNotificationTap(data);
    });
  }

  /**
   * Display notification from FCM payload
   */
  async displayNotification(payload) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.notification?.title || 'PawGuard',
          body: payload.notification?.body || '',
          data: payload.data || {},
          sound: true,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error displaying notification:', error);
    }
  }

  /**
   * Handle notification tap
   */
  handleNotificationTap(data) {
    // Implement navigation logic based on notification data
    console.log('Notification tapped with data:', data);
    // Example: Navigate to specific screen
    // navigation.navigate('ScreenName', { param: data.param });
  }

  /**
   * Schedule LOCAL notification (works offline)
   * This is the key for offline notifications!
   */
  async scheduleLocalNotification(title, body, triggerDate, data = {}, channelId = 'default') {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: channelId,
        },
        trigger: {
          date: triggerDate,
          channelId,
        },
      });

      console.log(`✅ Local notification scheduled (ID: ${notificationId})`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      return null;
    }
  }

  /**
   * Schedule REPEATING local notification (works offline)
   */
  async scheduleRepeatingNotification(title, body, intervalSeconds, data = {}, channelId = 'default') {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: channelId,
        },
        trigger: {
          seconds: intervalSeconds,
          repeats: true,
          channelId,
        },
      });

      console.log(`✅ Repeating notification scheduled (ID: ${notificationId})`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling repeating notification:', error);
      return null;
    }
  }

  /**
   * Cancel notification by ID
   */
  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`✅ Notification cancelled (ID: ${notificationId})`);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  /**
   * Cancel ALL scheduled notifications
   */
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getAllScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📋 ${notifications.length} scheduled notifications found`);
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Send immediate notification (online + offline)
   */
  async sendImmediateNotification(title, body, data = {}, channelId = 'default') {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: channelId,
        },
        trigger: null, // Show immediately
      });
      console.log('✅ Immediate notification sent');
    } catch (error) {
      console.error('Error sending immediate notification:', error);
    }
  }

  /**
   * Get FCM token for sending push notifications from server
   */
  getToken() {
    return this.fcmToken;
  }

  /**
   * Refresh FCM token
   */
  async refreshToken() {
    try {
      await AsyncStorage.removeItem(FCM_TOKEN_KEY);
      return await this.getFCMToken();
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new FCMService();

// Export helper functions for convenience
export const scheduleVaccinationReminder = async (petName, vaccinationName, dueDate) => {
  const fcmService = new FCMService();
  
  const vaccinationDate = new Date(dueDate);
  const today = new Date();
  const reminderDays = [7, 3, 1];
  const notificationIds = [];

  for (const days of reminderDays) {
    const reminderDate = new Date(vaccinationDate);
    reminderDate.setDate(reminderDate.getDate() - days);

    if (reminderDate > today) {
      const id = await fcmService.scheduleLocalNotification(
        `💉 Vaccination Reminder for ${petName}`,
        `${vaccinationName} is due in ${days} day${days > 1 ? 's' : ''}`,
        reminderDate,
        { 
          type: 'vaccination',
          petName,
          vaccinationName,
          daysRemaining: days
        },
        'vaccination'
      );
      if (id) notificationIds.push(id);
    }
  }

  return notificationIds;
};

export const scheduleHealthCheckReminder = async (petName, checkType, frequency) => {
  const fcmService = new FCMService();
  
  let intervalSeconds;
  switch (frequency) {
    case 'daily':
      intervalSeconds = 86400; // 24 hours
      break;
    case 'weekly':
      intervalSeconds = 604800; // 7 days
      break;
    case 'monthly':
      intervalSeconds = 2592000; // 30 days
      break;
    case 'quarterly':
      intervalSeconds = 7776000; // 90 days
      break;
    case 'yearly':
      intervalSeconds = 31536000; // 365 days
      break;
    default:
      intervalSeconds = 2592000; // default 30 days
  }

  return await fcmService.scheduleRepeatingNotification(
    `🏥 Health Check for ${petName}`,
    `Time for ${checkType} checkup`,
    intervalSeconds,
    {
      type: 'healthCheck',
      petName,
      checkType
    },
    'health'
  );
};