import { createContext, useContext } from 'react';

const TabShellContext = createContext(null);

export function TabShellProvider({ value, children }) {
  return <TabShellContext.Provider value={value}>{children}</TabShellContext.Provider>;
}

export function useTabShell() {
  const ctx = useContext(TabShellContext);
  if (!ctx) throw new Error('useTabShell must be used inside (tabs)/_layout');
  return ctx;
}
