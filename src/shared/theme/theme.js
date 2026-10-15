import { createContext, useContext } from 'react';

// Theme is fixed to light. The dark-mode toggle (Appearance screen) was
// removed, so isDark is always false and the `dark` className is never
// applied. Consumers keep reading useTheme() unchanged.
const SURFACE = { background: '#FCFCFA', card: '#FCFCFA' };

const ThemeContext = createContext({
  choice: 'light',
  isDark: false,
  loaded: true,
  surface: SURFACE,
  setChoice: async () => {},
});

export function ThemeProvider({ children }) {
  return (
    <ThemeContext.Provider
      value={{ choice: 'light', isDark: false, loaded: true, surface: SURFACE, setChoice: async () => {} }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Kept for callers that render RN Modals outside the main tree; always light.
export function useThemeClass() {
  return undefined;
}
