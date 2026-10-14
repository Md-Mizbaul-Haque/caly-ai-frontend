import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// System / Light / Dark. Persisted locally; 'system' follows the OS.
// The resolved value drives the NativeWind `dark` class (darkMode: 'class'
// in tailwind.config) and the status-bar style in the root layout.
const STORAGE_KEY = 'caly.theme';
const CHOICES = ['system', 'light', 'dark'];

// Concrete hexes for the few places that cannot take classNames (the root
// SafeAreaView background). Kept in sync with global.css :root / .dark:root.
const SURFACE = {
  light: { background: '#FCFCFA', card: '#FCFCFA' },
  dark: { background: '#0A0A0A', card: '#121212' },
};

const ThemeContext = createContext({
  choice: 'system',
  isDark: false,
  loaded: false,
  surface: SURFACE.light,
  setChoice: async () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [choice, setChoiceState] = useState('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v && CHOICES.includes(v)) setChoiceState(v);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setChoice = useCallback(async (next) => {
    if (!CHOICES.includes(next)) return;
    setChoiceState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {
      // best effort — the in-memory choice still applies this session
    }
  }, []);

  const isDark = choice === 'dark' || (choice === 'system' && systemScheme === 'dark');
  return (
    <ThemeContext.Provider
      value={{ choice, isDark, loaded, surface: isDark ? SURFACE.dark : SURFACE.light, setChoice }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// 'dark' class for the subtree root of overlays rendered outside the main
// tree (RN Modals): guarantees the dark tokens resolve there too.
export function useThemeClass() {
  return useTheme().isDark ? 'dark' : undefined;
}
