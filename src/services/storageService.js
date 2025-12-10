import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local Storage Service - Stores images/documents on device
 * FREE alternative to Firebase Storage
 */

const STORAGE_DIR = `${FileSystem.documentDirectory}pawguard/`;
const METADATA_KEY = 'pet_files_metadata';

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
