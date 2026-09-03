import { useEffect } from 'react';
import { Alert } from 'react-native';

let Updates: typeof import('expo-updates') | null = null;
try {
  Updates = require('expo-updates');
} catch (e) {
  // Native updates module fallback
}

export const checkForUpdatesManual = async () => {
  try {
    if (__DEV__ || !Updates) {
      Alert.alert('Development Mode', 'OTA Updates are disabled during local development / Expo Go mode.');
      return;
    }

    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      Alert.alert('Downloading Update...', 'A new update is available and downloading now.');
      await Updates.fetchUpdateAsync();
      Alert.alert(
        'Update Ready! 🚀',
        'The update has been downloaded. Restart the app now to apply the latest features.',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Restart Now',
            onPress: async () => {
              await Updates.reloadAsync();
            },
          },
        ]
      );
    } else {
      Alert.alert('Up to Date ✨', 'QuoteApp is running the latest update.');
    }
  } catch (error: any) {
    Alert.alert('Update Check Failed', error.message || 'Unable to check for updates right now.');
  }
};

export const useAutoUpdateManager = () => {
  useEffect(() => {
    async function checkAutoUpdate() {
      if (__DEV__ || !Updates) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            'New Update Ready 🚀',
            'An update for QuoteApp has been downloaded. Restart now to load the latest changes?',
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Restart Now',
                onPress: async () => {
                  await Updates.reloadAsync();
                },
              },
            ]
          );
        }
      } catch (err) {
        console.log('Background OTA check note:', err);
      }
    }

    checkAutoUpdate();
  }, []);
};
