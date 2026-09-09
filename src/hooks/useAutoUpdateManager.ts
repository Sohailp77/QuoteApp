import { useEffect } from 'react';
import { Alert } from 'react-native';

let Updates: typeof import('expo-updates') | null = null;
try {
  Updates = require('expo-updates');
} catch (e) {
  // Native updates module fallback
}


/**
 * Checks if expo-updates is currently enabled and supported in this environment
 */

export const isOtaEnabled = (): boolean => {
  try {
    return Boolean(Updates && Updates.isEnabled);
  } catch {
    return false;
  }
};

export const checkForUpdatesManual = async () => {
  try {
    if (__DEV__ || !isOtaEnabled()) {
      Alert.alert(
        'OTA Updates Inactive',
        'OTA updates are only active in standalone production builds. In development or local preview mode, code changes sync live via Metro bundler.'
      );
      return;
    }

    Alert.alert('Checking...', 'Checking for available OTA updates...');

    const update = await Updates!.checkForUpdateAsync();
    if (update.isAvailable) {
      Alert.alert('Downloading Update...', 'A new update is available and downloading now.');
      await Updates!.fetchUpdateAsync();
      Alert.alert(
        'Update Ready! 🚀',
        'The update has been downloaded successfully. Restart the app now to apply the latest features.',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Restart Now',
            onPress: async () => {
              try {
                await Updates!.reloadAsync();
              } catch (e) {
                Alert.alert('Reload Failed', 'Please restart the app manually to apply changes.');
              }
            },
          },
        ]
      );
    } else {
      Alert.alert('Up to Date ✨', 'BizFlow is running the latest update version.');
    }
  } catch (error: any) {
    console.warn('OTA Manual Check Warning:', error);
    const msg = error?.message || String(error);

    if (msg.includes('not enabled') || msg.includes('rejected') || msg.includes('ExpoUpdates')) {
      Alert.alert(
        'Development Environment',
        'OTA Update service is not enabled for local Metro dev builds. Installed APK release builds will receive OTA updates automatically.'
      );
    } else {
      Alert.alert('Update Check', msg || 'Unable to check for updates at this moment.');
    }
  }
};

export const useAutoUpdateManager = () => {
  useEffect(() => {
    async function checkAutoUpdate() {
      if (__DEV__ || !isOtaEnabled()) return;
      try {
        const update = await Updates!.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates!.fetchUpdateAsync();
          Alert.alert(
            'New Update Ready 🚀',
            'An update for BizFlow has been downloaded. Restart now to load the latest changes?',
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Restart Now',
                onPress: async () => {
                  try {
                    await Updates!.reloadAsync();
                  } catch (e) {
                    // Ignore background reload failure
                  }
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
