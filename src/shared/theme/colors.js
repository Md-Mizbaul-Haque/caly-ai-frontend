// Literals for contexts NativeWind classes can't reach (icon `color` props,
// shadows, ActivityIndicator). Single source of truth — mirrors `:root` in
// global.css (--primary = 15 91% 50%, --ink = 0 0% 10%). Do NOT add new
// colors here; extend the global.css tokens + tailwind mapping instead.
export const PRIMARY = '#f2470c';
export const INK = '#1A1A1A';
