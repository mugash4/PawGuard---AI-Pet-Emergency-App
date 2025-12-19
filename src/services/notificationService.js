/**
 * Notification Service - Unified Expo + FCM
 * This service integrates both Expo Notifications and FCM
 * Supports ONLINE and OFFLINE notifications
 */

import fcmService from './fcmService';

// Re-export FCM service methods for convenience
export const requestNotificationPermissions = async () => {
  return await fcmService.initialize();
};

export const scheduleVaccinationReminder = async (vaccination) => {
  try {
    const vaccinationDate = new Date(vaccination.date);
    const today = new Date();
    const reminderDays = [7, 3, 1];
    const notificationIds = [];

    for (const days of reminderDays) {
      const reminderDate = new Date(vaccinationDate);
      reminderDate.setDate(reminderDate.getDate() - days);

      if (reminderDate > today) {
        const id = await fcmService.scheduleLocalNotification(
          `💉 Vaccination Reminder for ${vaccination.petName}`,
          `${vaccination.name} is due in ${days} day${days > 1 ? 's' : ''}`,
          reminderDate,
          {
            type: 'vaccination',
            petId: vaccination.petId,
            vaccinationName: vaccination.name
          },
          'vaccination'
        );
        if (id) notificationIds.push(id);
      }
    }

    console.log(`✅ Scheduled ${notificationIds.length} vaccination reminders`);
    return notificationIds;
  } catch (error) {
    console.error('Error scheduling vaccination reminder:', error);
    return [];
  }
};

export const scheduleHealthCheckReminder = async (healthCheck) => {
  try {
    let intervalSeconds;
    
    switch (healthCheck.frequency) {
      case 'daily':
        intervalSeconds = 86400;
        break;
      case 'weekly':
        intervalSeconds = 604800;
        break;
      case 'monthly':
        intervalSeconds = 2592000;
        break;
      case 'quarterly':
        intervalSeconds = 7776000;
        break;
      case 'yearly':
        intervalSeconds = 31536000;
        break;
      default:
        intervalSeconds = 2592000;
    }

    const notificationId = await fcmService.scheduleRepeatingNotification(
      `🏥 Health Check for ${healthCheck.petName}`,
      `Time for ${healthCheck.type} checkup`,
      intervalSeconds,
      {
        type: 'healthCheck',
        petId: healthCheck.petId,
        checkType: healthCheck.type
      },
      'health'
    );

    console.log(`✅ Scheduled recurring health check reminder`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling health check reminder:', error);
    return null;
  }
};

export const sendImmediateNotification = async (title, body, data = {}) => {
  return await fcmService.sendImmediateNotification(title, body, data);
};

export const cancelNotification = async (notificationId) => {
  return await fcmService.cancelNotification(notificationId);
};

export const cancelAllPetNotifications = async () => {
  return await fcmService.cancelAllNotifications();
};

export const getAllScheduledNotifications = async () => {
  return await fcmService.getAllScheduledNotifications();
};

export const getFCMToken = () => {
  return fcmService.getToken();
};

// Legacy exports for backwards compatibility
export const cancelVaccinationReminder = cancelNotification;
export const cancelHealthCheckReminder = cancelNotification;
export const setupNotificationResponseHandler = (navigation) => {
  // Handled automatically by FCM service
  console.log('Notification response handler set up');
};
export const getPetNotifications = getAllScheduledNotifications;