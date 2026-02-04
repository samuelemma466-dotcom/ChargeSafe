import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'system' | 'dark' | 'light';
type Currency = 'NGN' | 'USD' | 'GHS' | 'KES';
type Language = 'en' | 'fr' | 'ha' | 'ig' | 'yo';

interface SettingsState {
  theme: Theme;
  currency: Currency;
  language: Language;
  soundEnabled: boolean;
  autoPrint: boolean;
  alertsEnabled: boolean;
}

interface SettingsContextType extends SettingsState {
  updateSetting: (key: keyof SettingsState, value: any) => void;
  playSound: (type: 'click' | 'success' | 'error' | 'toggle-on' | 'toggle-off') => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial state from localStorage
  const [settings, setSettings] = useState<SettingsState>({
    theme: (localStorage.getItem('cs_theme') as Theme) || 'system',
    currency: (localStorage.getItem('cs_currency') as Currency) || 'NGN',
    language: (localStorage.getItem('cs_language') as Language) || 'en',
    soundEnabled: localStorage.getItem('cs_sound') !== 'false',
    autoPrint: localStorage.getItem('cs_autoprint') === 'true',
    alertsEnabled: localStorage.getItem('cs_alerts') !== 'false',
  });

  const updateSetting = (key: keyof SettingsState, value: any) => {
    setSettings(prev => {
      const newState = { ...prev, [key]: value };
      localStorage.setItem(`cs_${key === 'soundEnabled' ? 'sound' : key === 'alertsEnabled' ? 'alerts' : key}`, String(value));
      return newState;
    });
  };

  // --- SOUND ENGINE (Web Audio API) ---
  const playSound = (type: 'click' | 'success' | 'error' | 'toggle-on' | 'toggle-off') => {
    if (!settings.soundEnabled) return;

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'click') {
        // Subtle click (High pitch, very short)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } 
      else if (type === 'success') {
        // Success Chime (Ascending Major Triad)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
      else if (type === 'error') {
        // Error Buzz (Sawtooth, low)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
      else if (type === 'toggle-on') {
        // Rising blip
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }
      else if (type === 'toggle-off') {
        // Falling blip
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(400, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }

    } catch (e) {
      console.warn("Sound play failed", e);
    }
  };

  // --- THEME ENGINE (CSS Variable Injection) ---
  useEffect(() => {
    const root = document.documentElement;
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      // DARK MODE (Default Mappings)
      root.style.setProperty('--slate-50', '#f8fafc');
      root.style.setProperty('--slate-100', '#f1f5f9');
      root.style.setProperty('--slate-200', '#e2e8f0');
      root.style.setProperty('--slate-300', '#cbd5e1');
      root.style.setProperty('--slate-400', '#94a3b8');
      root.style.setProperty('--slate-500', '#64748b');
      root.style.setProperty('--slate-600', '#475569');
      root.style.setProperty('--slate-700', '#334155');
      root.style.setProperty('--slate-800', '#1e293b');
      root.style.setProperty('--slate-850', '#172033');
      root.style.setProperty('--slate-900', '#0f172a');
      root.style.setProperty('--slate-950', '#020617');
      root.style.setProperty('--color-white', '#ffffff');
      root.style.setProperty('--color-black', '#000000');
    } else {
      // LIGHT MODE (Inverted Mappings)
      // Backgrounds (950) become Light (50)
      // Text (50) becomes Dark (950)
      root.style.setProperty('--slate-50', '#020617');   // Text Main
      root.style.setProperty('--slate-100', '#0f172a');  // Text Secondary
      root.style.setProperty('--slate-200', '#1e293b');  // Borders Darker
      root.style.setProperty('--slate-300', '#334155');  // Icons
      root.style.setProperty('--slate-400', '#475569');  // Muted Text
      root.style.setProperty('--slate-500', '#64748b');  // Mid (Stays sameish)
      root.style.setProperty('--slate-600', '#94a3b8');  // Disabled
      root.style.setProperty('--slate-700', '#cbd5e1');  // Borders Lighter
      root.style.setProperty('--slate-800', '#e2e8f0');  // Secondary Bg (Cards)
      root.style.setProperty('--slate-850', '#f1f5f9');  // Highlight
      root.style.setProperty('--slate-900', '#ffffff');  // Card Bg
      root.style.setProperty('--slate-950', '#f8fafc');  // Main Bg
      root.style.setProperty('--color-white', '#0f172a'); // Text-white becomes dark
      root.style.setProperty('--color-black', '#ffffff'); // Black becomes white
    }

  }, [settings.theme]);

  const value = {
    ...settings,
    updateSetting,
    playSound
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};