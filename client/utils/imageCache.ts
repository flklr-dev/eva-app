import { Image } from 'react-native';

/**
 * Pre-cache images to reduce loading latency
 * This ensures images are loaded into memory on app startup
 */
export const preloadImages = async () => {
  const backgroundImage = require('../assets/background.png');
  
  try {
    // Prefetch the background image
    const imageUri = Image.resolveAssetSource(backgroundImage).uri;
    await Image.prefetch(imageUri);
    console.log('Background image cached successfully');
  } catch (error) {
    console.warn('Failed to preload background image:', error);
  }
};

/**
 * Get the pre-required background image
 * Should only be used after preloadImages() has been called
 */
export const getBackgroundImage = () => {
  return require('../assets/background.png');
};
