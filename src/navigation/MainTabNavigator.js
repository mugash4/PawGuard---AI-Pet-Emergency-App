import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import EmergencyScreen from '../screens/EmergencyScreen';
import FoodCheckerScreen from '../screens/FoodCheckerScreen';
import KnowledgeScreen from '../screens/KnowledgeScreen';
import PetProfileScreen from '../screens/PetProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Emergency') {
            iconName = focused ? 'medical' : 'medical-outline';
          } else if (route.name === 'FoodChecker') {
            iconName = focused ? 'restaurant' : 'restaurant-outline';
          } else if (route.name === 'Knowledge') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'paw' : 'paw-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Emergency" 
        component={EmergencyScreen}
        options={{ title: 'Emergency' }}
      />
      <Tab.Screen 
        name="FoodChecker" 
        component={FoodCheckerScreen}
        options={{ title: 'Food Check' }}
      />
      <Tab.Screen 
        name="Knowledge" 
        component={KnowledgeScreen}
        options={{ title: 'Learn' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={PetProfileScreen}
        options={{ title: 'My Pet' }}
      />
    </Tab.Navigator>
  );
}
