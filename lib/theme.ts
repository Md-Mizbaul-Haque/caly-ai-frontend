export type Theme = {
  dark: boolean;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    notification: string;
  };
};

const DefaultTheme: Theme = {
  dark: false,
  colors: {
    primary: 'hsl(15 91% 50%)',
    background: 'hsl(0 0% 99%)',
    card: 'hsl(0 0% 99%)',
    text: 'hsl(0 0% 0%)',
    border: 'hsl(240 14% 92%)',
    notification: 'hsl(0 75% 60%)',
  },
};

const DarkTheme: Theme = {
  dark: true,
  colors: {
    primary: 'hsl(15 91% 50%)',
    background: 'hsl(0 0% 4%)',
    card: 'hsl(0 0% 7%)',
    text: 'hsl(0 0% 94%)',
    border: 'hsl(0 0% 12%)',
    notification: 'hsl(0 71% 66%)',
  },
};

export const THEME = {
  light: {
    background: 'hsl(0 0% 99%)',
    foreground: 'hsl(0 0% 0%)',
    card: 'hsl(0 0% 99%)',
    cardForeground: 'hsl(0 0% 0%)',
    popover: 'hsl(0 0% 99%)',
    popoverForeground: 'hsl(0 0% 0%)',
    primary: 'hsl(15 91% 50%)',
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(220 14% 93%)',
    secondaryForeground: 'hsl(0 0% 3%)',
    muted: 'hsl(0 0% 96%)',
    mutedForeground: 'hsl(0 0% 32%)',
    accent: 'hsl(16 100% 96%)',
    accentForeground: 'hsl(16 95% 41%)',
    destructive: 'hsl(0 75% 60%)',
    border: 'hsl(240 14% 92%)',
    input: 'hsl(0 0% 92%)',
    ring: 'hsl(15 91% 50%)',
    radius: '1.375rem',
    chart1: 'hsl(15 91% 50%)',
    chart2: 'hsl(173 58% 39%)',
    chart3: 'hsl(197 37% 24%)',
    chart4: 'hsl(43 74% 66%)',
    chart5: 'hsl(27 87% 67%)',
  },
  dark: {
    background: 'hsl(0 0% 4%)',
    foreground: 'hsl(0 0% 94%)',
    card: 'hsl(0 0% 7%)',
    cardForeground: 'hsl(0 0% 94%)',
    popover: 'hsl(0 0% 10%)',
    popoverForeground: 'hsl(0 0% 94%)',
    primary: 'hsl(15 91% 50%)',
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(15 78% 32%)',
    secondaryForeground: 'hsl(0 0% 94%)',
    muted: 'hsl(0 0% 14%)',
    mutedForeground: 'hsl(0 0% 59%)',
    accent: 'hsl(15 86% 23%)',
    accentForeground: 'hsl(0 0% 100%)',
    destructive: 'hsl(0 71% 66%)',
    border: 'hsl(0 0% 12%)',
    input: 'hsl(0 0% 23%)',
    ring: 'hsl(15 91% 50%)',
    radius: '1.375rem',
    chart1: 'hsl(220 70% 50%)',
    chart2: 'hsl(160 60% 45%)',
    chart3: 'hsl(30 80% 55%)',
    chart4: 'hsl(280 65% 60%)',
    chart5: 'hsl(340 75% 55%)',
  },
};

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
