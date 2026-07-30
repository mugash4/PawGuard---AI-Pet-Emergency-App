import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local Storage Service - Stores images/documents on device
 * FREE alternative to Firebase Storage
 */

const STORAGE_DIR = `${FileSystem.documentDirectory}pawguard/`;
const METADATA_KEY = 'pet_files_metadata';
const PET_PROFILES_KEY = 'pet_profiles'; // ✅ NEW: Storage key for pet profiles

const APP_STORAGE_URI_PREFIX = STORAGE_DIR;
const TEMP_URI_PREFIXES = ['content://', 'file:///data/user/', 'file:///data/data/'];

const getFileExtension = (uri = '') => {
  const cleanUri = uri.split('?')[0];
  const match = cleanUri.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : 'jpg';
};

const isAppStorageUri = (uri = '') => typeof uri === 'string' && uri.startsWith(APP_STORAGE_URI_PREFIX);

const isTemporaryUri = (uri = '') => {
  if (typeof uri !== 'string' || !uri) return false;

  return (
    TEMP_URI_PREFIXES.some(prefix => uri.startsWith(prefix)) ||
    uri.includes('/cache/') ||
    uri.includes('ImagePicker') ||
    uri.includes('picker') ||
    uri.includes('cropped')
  );
};

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
    if (!uri) return null;

    await initializeStorage();

    if (isAppStorageUri(uri)) {
      return uri;
    }

    const extension = getFileExtension(uri);
    const fileName = `${petId}_${Date.now()}_${type}.${extension}`;
    const newPath = `${STORAGE_DIR}${fileName}`;

    // Copy file to app directory so the URI stays valid after app restarts
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
    
    metadata[petId] = metadata[petId].filter(item => item.path !== path);

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

/**
 * Persist pet photo inside app storage so it still works after app restart
 * @param {string|null} uri - Source image URI
 * @param {string} petId - Pet profile ID
 * @returns {Promise<string|null>} Persistent image URI
 */
export const persistPetPhoto = async (uri, petId) => {
  if (!uri) return null;

  if (isAppStorageUri(uri)) {
    return uri;
  }

  return saveFile(uri, petId, 'photo');
};

/**
 * Delete a pet photo only when it belongs to this app's private storage
 * @param {string|null} uri - Photo URI
 * @param {string} petId - Pet profile ID
 */
export const deletePetPhoto = async (uri, petId) => {
  if (!uri || !isAppStorageUri(uri)) {
    return;
  }

  await deleteFile(uri, petId);
};

/**
 * Migrate older temporary photo URIs into app storage when still accessible.
 * This fixes images that were saved directly from ImagePicker temporary paths.
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Updated pet profiles
 */
export const migrateLegacyPetPhotos = async (userId) => {
  try {
    const profiles = await getPetProfile(userId);

    if (!profiles.length) {
      return profiles;
    }

    let hasChanges = false;
    const updatedProfiles = [];

    for (const pet of profiles) {
      if (!pet?.photo || isAppStorageUri(pet.photo)) {
        updatedProfiles.push(pet);
        continue;
      }

      if (!isTemporaryUri(pet.photo)) {
        updatedProfiles.push(pet);
        continue;
      }

      try {
        const fileInfo = await FileSystem.getInfoAsync(pet.photo);

        if (!fileInfo.exists) {
          console.warn(`⚠️ Legacy pet photo is no longer accessible for pet ${pet.id}`);
          updatedProfiles.push({ ...pet, photo: null });
          hasChanges = true;
          continue;
        }

        const persistentPhoto = await saveFile(pet.photo, pet.id, 'photo');
        updatedProfiles.push({ ...pet, photo: persistentPhoto });
        hasChanges = true;
      } catch (migrationError) {
        console.warn(`⚠️ Failed to migrate pet photo for pet ${pet.id}:`, migrationError);
        updatedProfiles.push(pet);
      }
    }

    if (hasChanges) {
      await savePetProfile(userId, updatedProfiles);
    }

    return updatedProfiles;
  } catch (error) {
    console.error('Error migrating legacy pet photos:', error);
    return getPetProfile(userId);
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