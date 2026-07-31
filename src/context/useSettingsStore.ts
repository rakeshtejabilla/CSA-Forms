import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark';
  offlineSync: boolean;
  setTheme: (theme: 'light' | 'dark') => void;
  setOfflineSync: (offlineSync: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      offlineSync: true,
      setTheme: (theme) => {
        set({ theme });
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
      setOfflineSync: (offlineSync) => set({ offlineSync }),
    }),
    {
      name: 'fb-settings-v1',
    }
  )
);
