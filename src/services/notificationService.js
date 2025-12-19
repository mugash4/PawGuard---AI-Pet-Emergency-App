/**
 * Notification Service - Expo Notifications
 * Handles vaccination reminders and health check alerts
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Get Firestore instance safely (dynamic import to avoid timing issues)
 */
const getFirestoreInstance = () => {
  try {
    const firebase = require('./firebase');
    if (!firebase || !firebase.db) {
      console.warn('⚠️ Firestore not initialized yet');
      return null;
    }
    return firebase.db;
  } catch (error) {
    console.error('❌ Error getting Firestore instance:', error);
    return null;
  }
};

/**
 * Get Firestore functions (lazy import)
 */
const getFirestoreFunctions = () => {
  try {
    return require('firebase/firestore');
  } catch (error) {
    console.error('❌ Error importing Firestore functions:', error);
    return null;
  }
};

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async () => {
  try {
    if (!Device.isDevice) {
      console.log('📱 Notifications only work on physical devices');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Notification permission denied');
      return null;
    }

    // Get push token
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('✅ Notification permission granted, token:', token);

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF8C61',
      });

      await Notifications.setNotificationChannelAsync('vaccination', {
        name: 'Vaccination Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF8C61',
      });

      await Notifications.setNotificationChannelAsync('health', {
        name: 'Health Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF8C61',
      });
    }

    return token;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return null;
  }
};

/**
 * Schedule vaccination reminder
 */
export const scheduleVaccinationReminder = async (vaccination) => {
  try {
    const db = getFirestoreInstance();
    const firestoreFunctions = getFirestoreFunctions();
    
    if (!db || !firestoreFunctions) {
      console.warn('⚠️ Firestore not available, skipping database save');
    }

    const vaccinationDate = new Date(vaccination.date);
    const today = new Date();
    const reminderDays = [7, 3, 1];
    const scheduledNotifications = [];

    for (const days of reminderDays) {
      const reminderDate = new Date(vaccinationDate);
      reminderDate.setDate(reminderDate.getDate() - days);

      if (reminderDate > today) {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `💉 Vaccination Reminder for ${vaccination.petName}`,
            body: `${vaccination.name} is due in ${days} day${days > 1 ? 's' : ''}`,
            data: { 
              type: 'vaccination',
              petId: vaccination.petId,
              vaccinationName: vaccination.name
            },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            categoryIdentifier: 'vaccination',
          },
          trigger: {
            date: reminderDate,
            channelId: 'vaccination',
          },
        });

        scheduledNotifications.push({
          id: notificationId,
          date: reminderDate.toISOString(),
          daysBefore: days
        });
      }
    }

    // Save to Firestore if available
    if (db && firestoreFunctions && scheduledNotifications.length > 0) {
      const { doc, setDoc } = firestoreFunctions;
      await setDoc(doc(db, 'notifications', `vaccination_${vaccination.petId}_${vaccination.name}`), {
        type: 'vaccination',
        petId: vaccination.petId,
        petName: vaccination.petName,
        vaccinationName: vaccination.name,
        vaccinationDate: vaccination.date,
        scheduledNotifications,
        createdAt: new Date().toISOString()
      });
    }

    console.log(`✅ Scheduled ${scheduledNotifications.length} reminders for ${vaccination.name}`);
    return scheduledNotifications;
  } catch (error) {
    console.error('Error scheduling vaccination reminder:', error);
    throw error;
  }
};

/**
 * Schedule health check reminder
 */
export const scheduleHealthCheckReminder = async (healthCheck) => {
  try {
    const db = getFirestoreInstance();
    const firestoreFunctions = getFirestoreFunctions();

    const today = new Date();
    let nextDate = new Date(today);

    switch (healthCheck.frequency) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🏥 Health Check Reminder for ${healthCheck.petName}`,
        body: `Time for ${healthCheck.type} checkup`,
        data: { 
          type: 'healthCheck',
          petId: healthCheck.petId,
          checkType: healthCheck.type
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: 'health',
      },
      trigger: {
        date: nextDate,
        channelId: 'health',
        repeats: true,
      },
    });

    // Save to Firestore if available
    if (db && firestoreFunctions) {
      const { doc, setDoc } = firestoreFunctions;
      await setDoc(doc(db, 'notifications', `healthCheck_${healthCheck.petId}_${healthCheck.type}`), {
        type: 'healthCheck',
        petId: healthCheck.petId,
        petName: healthCheck.petName,
        checkType: healthCheck.type,
        frequency: healthCheck.frequency,
        nextDate: nextDate.toISOString(),
        notificationId,
        createdAt: new Date().toISOString()
      });
    }

    console.log(`✅ Scheduled recurring health check reminder for ${healthCheck.type}`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling health check reminder:', error);
    throw error;
  }
};

/**
 * Cancel vaccination reminder
 */
export const cancelVaccinationReminder = async (petId, vaccinationName) => {
  try {
    const db = getFirestoreInstance();
    const firestoreFunctions = getFirestoreFunctions();
    
    if (!db || !firestoreFunctions) {
      console.warn('⚠️ Firestore not available');
      return;
    }

    const { doc, getDoc } = firestoreFunctions;
    const notificationDoc = await getDoc(doc(db, 'notifications', `vaccination_${petId}_${vaccinationName}`));
    
    if (notificationDoc.exists()) {
      const data = notificationDoc.data();
      for (const scheduled of data.scheduledNotifications) {
        await Notifications.cancelScheduledNotificationAsync(scheduled.id);
      }
      console.log(`✅ Cancelled vaccination reminders for ${vaccinationName}`);
    }
  } catch (error) {
    console.error('Error cancelling vaccination reminder:', error);
  }
};

/**
 * Cancel health check reminder
 */
export const cancelHealthCheckReminder = async (petId, checkType) => {
  try {
    const db = getFirestoreInstance();
    const firestoreFunctions = getFirestoreFunctions();
    
    if (!db || !firestoreFunctions) {
      console.warn('⚠️ Firestore not available');
      return;
    }

    const { doc, getDoc } = firestoreFunctions;
    const notificationDoc = await getDoc(doc(db, 'notifications', `healthCheck_${petId}_${checkType}`));
    
    if (notificationDoc.exists()) {
      const data = notificationDoc.data();
      await Notifications.cancelScheduledNotificationAsync(data.notificationId);
      console.log(`✅ Cancelled health check reminder for ${checkType}`);
    }
  } catch (error) {
    console.error('Error cancelling health check reminder:', error);
  }
};

/**
 * Get all scheduled notifications for a pet
 */
export const getPetNotifications = async (petId) => {
  try {
    const db = getFirestoreInstance();
    const firestoreFunctions = getFirestoreFunctions();
    
    if (!db || !firestoreFunctions) {
      console.warn('⚠️ Firestore not available');
      return [];
    }

    const { collection, getDocs, query, where } = firestoreFunctions;
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('petId', '==', petId));
    const querySnapshot = await getDocs(q);
    
    const notifications = [];
    querySnapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return notifications;
  } catch (error) {
    console.error('Error getting pet notifications:', error);
    return [];
  }
};

/**
 * Send immediate notification
 */
export const sendImmediateNotification = async (title, body, data = {}) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null,
    });
    console.log('✅ Sent immediate notification');
  } catch (error) {
    console.error('Error sending immediate notification:', error);
  }
};

/**
 * Handle notification response
 */
export const setupNotificationResponseHandler = (navigation) => {
  Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    
    if (data.type === 'vaccination' || data.type === 'healthCheck') {
      navigation.navigate('PetProfile', { petId: data.petId });
    }
  });
};

/**
 * Cancel all notifications for a pet
 */
export const cancelAllPetNotifications = async (petId) => {
  try {
    const notifications = await getPetNotifications(petId);
    
    for (const notification of notifications) {
      if (notification.type === 'vaccination') {
        for (const scheduled of notification.scheduledNotifications) {
          await Notifications.cancelScheduledNotificationAsync(scheduled.id);
        }
      } else if (notification.type === 'healthCheck') {
        await Notifications.cancelScheduledNotificationAsync(notification.notificationId);
      }
    }

    console.log(`✅ Cancelled all notifications for pet ${petId}`);
  } catch (error) {
    console.error('Error cancelling all pet notifications:', error);
  }
};
