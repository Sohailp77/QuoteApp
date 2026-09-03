import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { AppNotification } from './useNotifications';

const isExpoGo = Constants.appOwnership === 'expo' || (Constants as any).executionEnvironment === 'storeClient';

// Configure foreground notification presentation options safely
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.log('[PushNotification] Handler init note:', e);
}

export const usePushNotificationManager = (notifications: AppNotification[]) => {
  const activePushedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
      } catch (err) {
        console.warn('[PushNotification] Permission check note:', err);
      }
    };

    requestPermissions();
  }, []);

  useEffect(() => {
    if (!notifications) return;

    const currentNotifIds = new Set(notifications.map((n) => n.id));

    // 1. Trigger push notifications for active unresolved issues
    notifications.forEach(async (notif) => {
      if (!activePushedIds.current.has(notif.id)) {
        activePushedIds.current.add(notif.id);
        try {
          await Notifications.scheduleNotificationAsync({
            identifier: notif.id,
            content: {
              title: `⚠️ ${notif.title}`,
              body: notif.body,
              sound: true,
              data: {
                actionScreen: notif.actionScreen,
                actionParams: notif.actionParams,
              },
            },
            trigger: null, // Display push notification immediately
          });
        } catch (e) {
          console.warn('[PushNotification] Scheduling note:', e);
        }
      }
    });

    // 2. STOP & CANCEL push notifications as soon as the issue is resolved
    activePushedIds.current.forEach(async (pushedId) => {
      if (!currentNotifIds.has(pushedId)) {
        activePushedIds.current.delete(pushedId);
        try {
          await Notifications.cancelScheduledNotificationAsync(pushedId);
          await Notifications.dismissNotificationAsync(pushedId);
        } catch (e) {
          console.warn('[PushNotification] Dismissing note:', e);
        }
      }
    });
  }, [notifications]);
};
