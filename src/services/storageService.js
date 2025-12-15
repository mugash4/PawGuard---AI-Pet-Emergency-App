import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local Storage Service - Stores images/documents on device
 * FREE alternative to Firebase Storage
 */

const STORAGE_DIR = `${FileSystem.documentDirectory}pawguard/`;
const METADATA_KEY = 'pet_files_metadata';
const PET_PROFILES_KEY = 'pet_profiles'; // ✅ NEW: Storage key for pet profiles

/**
 * Initialize storage directory
 */
export const initializeStorage = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(STORAGE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(STORAGE_DIR, { intermediates: true });
      console.log('✅ Storage directory created');
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
};

/**
 * Save file to local storage
 * @param {string} uri - File URI from image picker
 * @param {string} petId - Pet profile ID
 * @param {string} type - File type (photo/document)
 * @returns {Promise<string>} Saved file path
 */
export const saveFile = async (uri, petId, type = 'photo') => {
  try {
    await initializeStorage();
    
    const fileName = `${petId}_${Date.now()}_${type}.jpg`;
    const newPath = `${STORAGE_DIR}${fileName}`;
    
    // Copy file to app directory
    await FileSystem.copyAsync({
      from: uri,
      to: newPath,
    });
    
    // Save metadata
    await saveFileMetadata(fileName, petId, type, newPath);
    
    console.log('✅ File saved:', newPath);
    return newPath;
  } catch (error) {
    console.error('Error saving file:', error);
    throw new Error('Failed to save file');
  }
};

/**
 * Save file metadata
 */
const saveFileMetadata = async (fileName, petId, type, path) => {
  try {
    const stored = await AsyncStorage.getItem(METADATA_KEY);
    const metadata = stored ? JSON.parse(stored) : {};
    
    if (!metadata[petId]) {
      metadata[petId] = [];
    }
    
    metadata[petId].push({
      fileName,
      type,
      path,
      createdAt: new Date().toISOString(),
    });
    
    await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('Error saving metadata:', error);
  }
};

/**
 * Get all files for a pet
 * @param {string} petId - Pet profile ID
 * @returns {Promise<Array>} List of files
 */
export const getPetFiles = async (petId) => {
  try {
    const stored = await AsyncStorage.getItem(METADATA_KEY);
    if (!stored) return [];
    
    const metadata = JSON.parse(stored);
    return metadata[petId] || [];
  } catch (error) {
    console.error('Error getting pet files:', error);
    return [];
  }
};

/**
 * Delete file
 * @param {string} path - File path
 * @param {string} petId - Pet profile ID
 */
export const deleteFile = async (path, petId) => {
  try {
    // Delete physical file
    await FileSystem.deleteAsync(path, { idempotent: true });
    
    // Update metadata
    const stored = await AsyncStorage.getItem(METADATA_KEY);
    if (stored) {
      const metadata = JSON.parse(stored);
      if (metadata[petId]) {
        metadata[petId] = metadata[petId].filter(f => f.path !== path);
        await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
      }
    }
    
    console.log('✅ File deleted');
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

/**
 * Get storage size used
 * @returns {Promise<number>} Size in bytes
 */
export const getStorageSize = async () => {
  try {
    await initializeStorage();
    const files = await FileSystem.readDirectoryAsync(STORAGE_DIR);
    
    let totalSize = 0;
    for (const file of files) {
      const info = await FileSystem.getInfoAsync(`${STORAGE_DIR}${file}`);
      totalSize += info.size || 0;
    }
    
    return totalSize;
  } catch (error) {
    console.error('Error getting storage size:', error);
    return 0;
  }
};

// ============================================
// ✅ NEW: PET PROFILE STORAGE FUNCTIONS
// ============================================

/**
 * Save pet profile(s) for a user
 * @param {string} userId - User ID
 * @param {Array} profiles - Array of pet profile objects
 * @returns {Promise<boolean>} Success status
 */
export const savePetProfile = async (userId, profiles) => {
  try {
    // Get all profiles from storage
    const stored = await AsyncStorage.getItem(PET_PROFILES_KEY);
    const allProfiles = stored ? JSON.parse(stored) : {};
    
    // Update this user's profiles
    allProfiles[userId] = profiles;
    
    // Save back to storage
    await AsyncStorage.setItem(PET_PROFILES_KEY, JSON.stringify(allProfiles));
    
    console.log('✅ Pet profile saved successfully');
    return true;
  } catch (error) {
    console.error('❌ Error saving pet profile:', error);
    throw new Error('Failed to save pet profile');
  }
};

/**
 * Get pet profile(s) for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of pet profile objects
 */
export const getPetProfile = async (userId) => {
  try {
    // Get all profiles from storage
    const stored = await AsyncStorage.getItem(PET_PROFILES_KEY);
    if (!stored) {
      console.log('ℹ️ No pet profiles found in storage');
      return [];
    }
    
    const allProfiles = JSON.parse(stored);
    const userProfiles = allProfiles[userId] || [];
    
    console.log(`✅ Retrieved ${userProfiles.length} pet profile(s) for user ${userId}`);
    return userProfiles;
  } catch (error) {
    console.error('❌ Error getting pet profile:', error);
    return [];
  }
};

/**
 * Delete a specific pet profile
 * @param {string} userId - User ID
 * @param {string} petId - Pet ID to delete
 * @returns {Promise<boolean>} Success status
 */
export const deletePetProfile = async (userId, petId) => {
  try {
    // Get current profiles
    const profiles = await getPetProfile(userId);
    
    // Filter out the pet to delete
    const updatedProfiles = profiles.filter(pet => pet.id !== petId);
    
    // Save updated profiles
    await savePetProfile(userId, updatedProfiles);
    
    // Also delete associated files
    await deleteAllPetFiles(petId);
    
    console.log(`✅ Pet profile ${petId} deleted successfully`);
    return true;
  } catch (error) {
    console.error('❌ Error deleting pet profile:', error);
    throw new Error('Failed to delete pet profile');
  }
};

/**
 * Delete all files associated with a pet
 * @param {string} petId - Pet ID
 */
const deleteAllPetFiles = async (petId) => {
  try {
    const files = await getPetFiles(petId);
    
    for (const file of files) {
      await deleteFile(file.path, petId);
    }
    
    console.log(`✅ Deleted all files for pet ${petId}`);
  } catch (error) {
    console.error('Error deleting pet files:', error);
  }
};

/**
 * Get a single pet by ID
 * @param {string} userId - User ID
 * @param {string} petId - Pet ID
 * @returns {Promise<Object|null>} Pet profile object or null
 */
export const getPetById = async (userId, petId) => {
  try {
    const profiles = await getPetProfile(userId);
    const pet = profiles.find(p => p.id === petId);
    return pet || null;
  } catch (error) {
    console.error('Error getting pet by ID:', error);
    return null;
  }
};

/**
 * Update a single pet profile
 * @param {string} userId - User ID
 * @param {string} petId - Pet ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<boolean>} Success status
 */
export const updatePetProfile = async (userId, petId, updates) => {
  try {
    const profiles = await getPetProfile(userId);
    const updatedProfiles = profiles.map(pet => 
      pet.id === petId 
        ? { ...pet, ...updates, updatedAt: new Date().toISOString() } 
        : pet
    );
    
    await savePetProfile(userId, updatedProfiles);
    console.log(`✅ Pet profile ${petId} updated successfully`);
    return true;
  } catch (error) {
    console.error('Error updating pet profile:', error);
    throw new Error('Failed to update pet profile');
  }
};

/**
 * Clear all pet profiles for a user (useful for logout/reset)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export const clearPetProfiles = async (userId) => {
  try {
    await savePetProfile(userId, []);
    console.log(`✅ Cleared all pet profiles for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error clearing pet profiles:', error);
    throw new Error('Failed to clear pet profiles');
  }
};