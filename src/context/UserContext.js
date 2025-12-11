import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

// Export UserContext so it can be imported in other files
export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      // Get or create device ID (anonymous user ID)
      let deviceId = await AsyncStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = `${Device.osName}_${Device.modelName}_${Date.now()}`;
        await AsyncStorage.setItem('deviceId', deviceId);
      }

      // Load user data from AsyncStorage
      const userData = await AsyncStorage.getItem('userData');
      const parsedData = userData ? JSON.parse(userData) : {};

      setUser({
        id: deviceId,
        userId: deviceId, // Add userId property for compatibility
        isPremium: parsedData.isPremium || false,
        isAdmin: parsedData.isAdmin || false,
        subscriptionType: parsedData.subscriptionType || 'free',
        dailyAIUsage: parsedData.dailyAIUsage || {},
        createdAt: parsedData.createdAt || new Date().toISOString(),
        ...parsedData
      });
    } catch (error) {
      console.error('Error loading user:', error);
      // Set a default user to prevent crashes
      const fallbackId = `fallback_${Date.now()}`;
      setUser({
        id: fallbackId,
        userId: fallbackId,
        isPremium: false,
        isAdmin: false,
        subscriptionType: 'free',
        dailyAIUsage: {},
        createdAt: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const upgradeToPremium = async (subscriptionType) => {
    await updateUser({
      isPremium: true,
      subscriptionType,
      premiumSince: new Date().toISOString()
    });
  };

  const resetDailyUsage = async () => {
    const today = new Date().toISOString().split('T')[0];
    await updateUser({
      dailyAIUsage: { [today]: 0 }
    });
  };

  const incrementAIUsage = async () => {
    const today = new Date().toISOString().split('T')[0];
    const currentUsage = user.dailyAIUsage[today] || 0;
    await updateUser({
      dailyAIUsage: {
        ...user.dailyAIUsage,
        [today]: currentUsage + 1
      }
    });
  };

  const getDailyAIUsage = () => {
    const today = new Date().toISOString().split('T')[0];
    return user?.dailyAIUsage?.[today] || 0;
  };

  const getRemainingAIQueries = () => {
    if (user?.isPremium) return 999; // Unlimited
    const used = getDailyAIUsage();
    return Math.max(0, 5 - used);
  };

  return (
    <UserContext.Provider value={{
      user,
      loading,
      updateUser,
      upgradeToPremium,
      resetDailyUsage,
      incrementAIUsage,
      getDailyAIUsage,
      getRemainingAIQueries
    }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};
