import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationState {
  readIds: string[];
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
  isRead: (id: string) => boolean;
  clearAll: () => void;
}

const STORAGE_KEY = 'quoteapp_notification_read_ids';

// Load persisted read IDs from AsyncStorage (called once at startup)
export const loadNotificationState = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      useNotificationStore.setState({ readIds: JSON.parse(stored) });
    }
  } catch {}
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  readIds: [],

  markRead: (id) => {
    const next = [...new Set([...get().readIds, id])];
    set({ readIds: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },

  markAllRead: (ids) => {
    const next = [...new Set([...get().readIds, ...ids])];
    set({ readIds: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },

  isRead: (id) => get().readIds.includes(id),

  clearAll: () => {
    set({ readIds: [] });
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
}));
