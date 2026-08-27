import React, { useState } from 'react';
import { Settings, Bell, Palette, RefreshCw, ShieldAlert, Check } from 'lucide-react';
import { useSettingsStore } from '../context/useSettingsStore';

export default function SettingsPage() {
  const store = useSettingsStore();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [offlineSync, setOfflineSync] = useState(store.offlineSync);
  const [theme, setTheme] = useState<'light' | 'dark'>(store.theme);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    store.setTheme(theme);
    store.setOfflineSync(offlineSync);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Title block */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-3">
        <div className="bg-brand-50 p-2 rounded-xl text-brand-600 border border-brand-100">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-slate-800">Preferences & Settings</h1>
          <span className="text-xs text-slate-400">Configure application and platform behaviour</span>
        </div>
      </div>

      {/* Options */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
        
        {/* Theme Settings */}
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <Palette className="h-5 w-5 text-slate-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Visual Theme</h3>
              <p className="text-xs text-slate-500 mt-0.5">Toggle light or dark modes across the app</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 rounded-xl">
            <button
              onClick={() => setTheme('light')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                theme === 'light' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                theme === 'dark' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500'
              }`}
            >
              Dark
            </button>
          </div>
        </div>

        {/* Notifications Settings */}
        {/* <div className="p-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <Bell className="h-5 w-5 text-slate-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Email Notifications</h3>
              <p className="text-xs text-slate-500 mt-0.5">Receive digests and updates on form submissions</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={emailNotifs}
              onChange={(e) => setEmailNotifs(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
          </label>
        </div> */}

        {/* Sync Settings */}
        <div className="p-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <RefreshCw className="h-5 w-5 text-slate-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Auto Offline Sync</h3>
              <p className="text-xs text-slate-500 mt-0.5">Synchronize local drafts silently when internet reconnects</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={offlineSync}
              onChange={(e) => setOfflineSync(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
          </label>
        </div>

        {/* Security Settings */}
        {/* <div className="p-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <ShieldAlert className="h-5 w-5 text-slate-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Biometric Verification</h3>
              <p className="text-xs text-slate-500 mt-0.5">Prompt device credentials when syncing critical databases</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-not-allowed mt-1 opacity-50">
            <input type="checkbox" disabled className="sr-only peer" />
            <div className="w-9 h-5 bg-slate-200 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4" />
          </label>
        </div> */}

      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl shadow-sm">
        {saved && (
          <span className="text-xs font-semibold text-brand-600 flex items-center gap-1 animate-pulse">
            <Check className="h-3.5 w-3.5" />
            Settings saved
          </span>
        )}
        <button
          onClick={handleSave}
          className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-brand-500/20"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
