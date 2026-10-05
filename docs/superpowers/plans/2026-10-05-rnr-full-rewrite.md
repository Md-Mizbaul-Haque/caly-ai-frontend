# Caly AI RNR Full Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all custom UI in caly-ai-frontend with React Native Reusables primitives themed to f2470c.

**Architecture:** Install RNR via CLI into `components/ui`, unify theme to `lib/theme.ts` f2470c single source, migrate screens file-by-file in one pass, delete legacy `src/shared/components/ui`.

**Tech Stack:** Expo SDK 57, Expo Router, NativeWind 4.2.7, Tailwind 3.4.17, RNR CLI 0.7.1, `clsx` + `tailwind-merge` via `lib/utils.ts` `cn()`, `lucide-react-native`.

**Spec:** `docs/superpowers/specs/2026-10-05-rnr-full-rewrite-custom-theme-design.md`

## Global Constraints

- Primary brand is `#f2470c` / `hsl(15 91% 50%)` everywhere – no `#FF6B35` after.
- Keep `src/app` routing only – no dual `app/` + `src/app/`.
- Keep `rounded-card/btn`, `ink/cream/success` Tailwind utilities.
- `PortalHost` stays last child in `src/app/_layout.tsx`.
- `doctor` must stay `All checks passed`.
- `npx tsc --noEmit` must stay clean.
- Screens stay `.js` except new RNR `.tsx`; `_layout.tsx` keeps `// @ts-nocheck`.

## Review Focus

- Pressable with `disabled` still shows `bg-muted text-muted` not clickable – reasonable person expects disabled style.
- Secure `PasswordInput` toggles visibility without clearing value – expects value preserved.
- Sheet/Dialog opens via Portal on native, not blank – expects visible overlay.
- Toast shows on offline/online transition without duplicate stacking – expects single banner.
- Dark vars exist but app is light-first – expects light render unchanged (white bg, orange primary).

---

### Task 1: Install RNR primitives

**Files:**
- Create: `components/ui/button.tsx`, `components/ui/text.tsx`, `components/ui/card.tsx`, `components/ui/badge.tsx`, `components/ui/input.tsx`, `components/ui/textarea.tsx`, `components/ui/label.tsx`, `components/ui/avatar.tsx`, `components/ui/progress.tsx`, `components/ui/dialog.tsx`, `components/ui/sheet.tsx`, `components/ui/sonner.tsx`, `components/ui/separator.tsx`, `components/ui/skeleton.tsx`, `components/ui/switch.tsx`
- Modify: `package.json`
- Test: `C:\Users\ASUS\AppData\Local\Temp\opencode\verify-rnr.js` (temp script, delete after)

**Interfaces:**
- Consumes: `lib/utils.ts` `cn(...inputs: ClassValue[]) => string`, `lib/theme.ts` `NAV_THEME`, `global.css` vars, `tailwind.config.js` mappings
- Produces: `@/components/ui/*` imports for Tasks 3-8, e.g. `import { Button } from '@/components/ui/button'`

- [ ] **Step 1: Write failing check script**

```js
// C:\Users\ASUS\AppData\Local\Temp\opencode\verify-rnr.js
const fs = require('fs');
const path = require('path');
const base = 'E:\\Caly Ai\\caly-ai-frontend';
const needed = ['components/ui/button.tsx','components/ui/card.tsx','components/ui/badge.tsx','components/ui/input.tsx','components/ui/text.tsx'];
let missing = needed.filter(f => !fs.existsSync(path.join(base, f)));
if (missing.length) { console.log('FAIL missing: ' + missing.join(',')); process.exit(1); }
console.log('PASS all RNR present');
```

- [ ] **Step 2: Run to verify it fails**

Run: `node "C:\Users\ASUS\AppData\Local\Temp\opencode\verify-rnr.js"`
Expected: FAIL missing: components/ui/button.tsx,...

- [ ] **Step 3: Install via CLI**

Run: `npx @react-native-reusables/cli@latest add button card badge input textarea text label avatar progress dialog sheet sonner separator skeleton switch -y --cwd "E:\Caly Ai\caly-ai-frontend"`
Expected: creates `components/ui/*`, installs `@rn-primitives/*` deps via expo

- [ ] **Step 4: Verify doctor + test passes**

Run: `npx @react-native-reusables/cli@latest doctor --cwd "E:\Caly Ai\caly-ai-frontend"`
Expected: `All checks passed.`
Run: `node "C:\Users\ASUS\AppData\Local\Temp\opencode\verify-rnr.js"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/ui package.json
git commit -m "feat: add RNR primitives"
```

### Task 2: Unify theme to f2470c

**Files:**
- Modify: `src/shared/theme/tokens.js:2-12`, `lib/theme.ts:37-63`, `global.css`, `tailwind.config.js`
- Test: `C:\Users\ASUS\AppData\Local\Temp\opencode\verify-theme.js`

**Interfaces:**
- Consumes: Task 1 RNR files (they read `hsl(var(--primary))`)
- Produces: `tokens.colors.primary === '#f2470c'` for Tasks 3-8, `THEME.light.primary === 'hsl(15 91% 50%)'`

- [ ] **Step 1: Write failing theme check**

```js
// C:\Users\ASUS\AppData\Local\Temp\opencode\verify-theme.js
const tokens = require('E:\\Caly Ai\\caly-ai-frontend\\src\\shared\\theme\\tokens.js');
if (tokens.colors.primary.toLowerCase() !== '#f2470c') { console.log('FAIL primary is ' + tokens.colors.primary); process.exit(1); }
console.log('PASS theme f2470c');
```

- [ ] **Step 2: Run to verify it fails**

Run: `node "C:\Users\ASUS\AppData\Local\Temp\opencode\verify-theme.js"`
Expected: FAIL primary is #FF6B35

- [ ] **Step 3: Minimal theme fix**

```js
// src/shared/theme/tokens.js:2-12
module.exports = {
  colors: {
    primary: '#f2470c',
    primaryDark: '#E85A24',
    ink: '#1A1A1A',
    muted: '#8A8A8A',
    cream: '#FFF8F2',
    card: '#FFFFFF',
    success: '#22C55E',
    danger: '#EF4444',
    border: '#F1E8E0',
  },
  radii: { card: 18, button: 14, chip: 999, input: 12 },
  spacing: { screen: 16, gap: 12, section: 24 },
  shadows: { card: { elevation: 2 } },
  type: { h1: 24, h2: 20, body: 14, caption: 12 },
};
```

Keep `lib/theme.ts`, `global.css`, `tailwind.config.js` as already f2470c (no change unless doctor fails).

- [ ] **Step 4: Verify passes**

Run: `node "C:\Users\ASUS\AppData\Local\Temp\opencode\verify-theme.js"`
Expected: PASS
Run: `npx tsc --noEmit`
Expected: clean (no output)

- [ ] **Step 5: Commit**

```bash
git add src/shared/theme/tokens.js
git commit -m "fix: unify primary to f2470c"
```

### Task 3: Migrate Button + Text

**Files:**
- Modify: `src/shared/components/ui/Button.js`, `src/features/dashboard/screens/DashboardScreen.js:12`, `src/features/scan/screens/ScanResultScreen.js:5`, `src/features/meals/screens/LogFoodScreen.js:6`, `src/features/progress/screens/ProgressScreen.js:5`
- Test: `C:\Users\ASUS\AppData\Local\Temp\opencode\verify-button.js`

**Interfaces:**
- Consumes: `@/components/ui/button` `Button`, `@/components/ui/text` `Text`, `lib/utils.ts` `cn`
- Produces: `PrimaryButton({title,onPress,disabled})` wrapper using RNR for Task 9 screens

- [ ] **Step 1: Write failing import check**

```js
// C:\Users\ASUS\AppData\Local\Temp\opencode\verify-button.js
const fs = require('fs');
const s = fs.readFileSync('E:\\Caly Ai\\caly-ai-frontend\\src\\shared\\components\\ui\\Button.js','utf8');
if (!s.includes('@/components/ui/button')) { console.log('FAIL Button not RNR'); process.exit(1); }
console.log('PASS Button RNR');
```

- [ ] **Step 2: Run to verify fails**

Run: `node "C:\Users\ASUS\AppData\Local\Temp\opencode\verify-button.js"`
Expected: FAIL

- [ ] **Step 3: Minimal Button rewrite**

```js
// src/shared/components/ui/Button.js
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
export default function PrimaryButton({ title, onPress, disabled }) {
  return (
    <Button onPress={onPress} disabled={disabled} className={cn('rounded-btn', disabled ? 'bg-muted' : 'bg-primary')}>
      <Text className={cn('font-bold', disabled ? 'text-muted-foreground' : 'text-primary-foreground')}>{title}</Text>
    </Button>
  );
}
```

- [ ] **Step 4: Verify**

Run: `node "C:\Users\ASUS\AppData\Local\Temp\opencode\verify-button.js"`
Expected: PASS
Run: `npx eslint src/shared/components/ui/Button.js`
Expected: clean
Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/ui/Button.js
git commit -m "feat: migrate Button to RNR"
```

### Task 4: Migrate Card

**Files:**
- Modify: `src/shared/components/ui/Card.js`
- Test: `C:\Users\ASUS\AppData\Local\Temp\opencode\verify-card.js`

**Interfaces:**
- Consumes: `@/components/ui/card` `Card`, `CardContent`
- Produces: `Card({children,style,className})` RNR wrapper

- [ ] **Step 1: Write failing check**

```js
// C:\Users\ASUS\AppData\Local\Temp\opencode\verify-card.js
const fs=require('fs');
const s=fs.readFileSync('E:\\Caly Ai\\caly-ai-frontend\\src\\shared\\components\\ui\\Card.js','utf8');
if(!s.includes('@/components/ui/card')){console.log('FAIL');process.exit(1)}console.log('PASS');
```

- [ ] **Step 2: Run fails**

Run: `node "C:\Users\ASUS\AppData\Local\Temp\opencode\verify-card.js"`
Expected: FAIL

- [ ] **Step 3: Implement**

```js
// src/shared/components/ui/Card.js
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
export default function UICard({ children, style, className }) {
  return (
    <Card style={[{ shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }, style]} className={cn('rounded-card border-border bg-card', className)}>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Verify**

Run: `node "C:\Users\ASUS\AppData\Local\Temp\opencode\verify-card.js"`
Expected: PASS
Run: `npx eslint src/shared/components/ui/Card.js`
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/ui/Card.js
git commit -m "feat: migrate Card to RNR"
```

### Task 5: Migrate Chip/Badge + Input

**Files:**
- Modify: `src/shared/components/ui/Chip.js`, `src/shared/components/auth/AuthInput.js`, `src/shared/components/auth/PasswordInput.js`
- Test: `C:\Users\ASUS\AppData\Local\Temp\opencode\verify-chip-input.js`

**Interfaces:**
- Consumes: `@/components/ui/badge` `Badge`, `@/components/ui/input` `Input`, `@/components/ui/label` `Label`, `@/components/ui/text`
- Produces: Chip, AuthInput, PasswordInput RNR wrappers preserving `active`, `secureEntry`, `error` props

- [ ] **Step 1: Write failing check**

```js
// C:\Users\ASUS\AppData\Local\Temp\opencode\verify-chip-input.js
const fs=require('fs');
const base='E:\\Caly Ai\\caly-ai-frontend\\src\\shared\\components\\';
const c=fs.readFileSync(base+'ui\\Chip.js','utf8');
const a=fs.readFileSync(base+'auth\\AuthInput.js','utf8');
if(!c.includes('@/components/ui/badge')||!a.includes('@/components/ui/input')){console.log('FAIL');process.exit(1)}console.log('PASS');
```

- [ ] **Step 2: Run fails**

Run: `node "C:\Users\ASUS\AppData\Local\Temp\opencode\verify-chip-input.js"`
Expected: FAIL

- [ ] **Step 3: Implement Chip**

```js
// src/shared/components/ui/Chip.js
import { Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
export default function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} className={cn('px-4 py-2 rounded-full mr-2 border', active ? 'bg-primary border-primary' : 'bg-card border-border')}>
      <Text className={cn(active ? 'text-primary-foreground font-semibold' : 'text-foreground')}>{label}</Text>
    </Pressable>
  );
}
```

```js
// src/shared/components/auth/AuthInput.js – replace View+TextInput with RNR
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
export default function AuthInput({ label, error, ...props }) {
  return (
    <>
      {label ? <Label className="mb-1 text-foreground">{label}</Label> : null}
      <Input {...props} className={cn('rounded-btn border-input bg-card', error ? 'border-destructive' : null)} />
      {error ? <Text className="text-destructive mt-1">{error}</Text> : null}
    </>
  );
}
```

PasswordInput: same + `secureTextEntry` toggle button using RNR `Button` small, preserves value, no clear on toggle.

- [ ] **Step 4: Verify**

Run: `node "C:\Users\ASUS\AppData\Local\Temp\opencode\verify-chip-input.js"`
Expected: PASS
Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/ui/Chip.js src/shared/components/auth/AuthInput.js src/shared/components/auth/PasswordInput.js
git commit -m "feat: migrate Chip Input to RNR"
```

### Task 6: Migrate Progress + misc primitives

**Files:**
- Modify: `src/shared/components/ui/ProgressRing.js`, `src/shared/components/ui/MacroBar.js`, `src/shared/components/ui/MacroCard.js`, `src/shared/components/ui/EmptyState.js`, `src/shared/components/ui/icons.js`
- Test: `C:\Users\ASUS\AppData\Local\Temp\opencode\verify-progress.js`

**Interfaces:**
- Consumes: `@/components/ui/progress` `Progress`, `@/components/ui/text`, `@/components/ui/avatar`
- Produces: Progress-based bars, EmptyState with RNR text/button

- [ ] **Step 1: Write failing check**

```js
// C:\Users\ASUS\AppData\Local\Temp\opencode\verify-progress.js
const fs=require('fs');
const s=fs.readFileSync('E:\\Caly Ai\\caly-ai-frontend\\src\\shared\\components\\ui\\MacroBar.js','utf8');
if(!s.includes('@/components/ui/progress') && !s.includes('cn(')){console.log('FAIL');process.exit(1)}console.log('PASS');
```

- [ ] **Step 2: Run fails**

Run: `node "C:\Users\ASUS\AppData\Local\Temp\opencode\verify-progress.js"`
Expected: FAIL

- [ ] **Step 3: Implement (example MacroBar, repeat for others)**

```js
// src/shared/components/ui/MacroBar.js
import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
export default function MacroBar({ label, value, max, className }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <>
      <Text className="text-foreground">{label}</Text>
      <Progress value={pct} className={cn('bg-muted', className)} />
    </>
  );
}
```

EmptyState: RNR `Text` + `Button`. icons.js: re-export `lucide-react-native` + `iconWithClassName` from RNR. ProgressRing: keep `react-native-svg` ring (RNR has no ring), but wrap labels with RNR `Text` + `cn()`.

- [ ] **Step 4: Verify**

Run: `node "C:\Users\ASUS\AppData\Local\Temp\opencode\verify-progress.js"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/ui/ProgressRing.js src/shared/components/ui/MacroBar.js src/shared/components/ui/MacroCard.js src/shared/components/ui/EmptyState.js src/shared/components/ui/icons.js
git commit -m "feat: migrate progress + misc to RNR"
```

### Task 7: Migrate Sheets/Dialogs (Portal)

**Files:**
- Modify: `src/shared/components/ui/QuickLogSheet.js`, `src/shared/components/WeightLogSheet.js`, `src/app/(tabs)/_layout.js:4-5`
- Test: manual Portal check + `C:\Users\ASUS\AppData\Local\Temp\opencode\verify-sheet.js`

**Interfaces:**
- Consumes: `@/components/ui/sheet` (`Sheet`, `SheetContent`), `@/components/ui/dialog`, `PortalHost` in `src/app/_layout.tsx:46`
- Produces: Sheets that open via Portal, no blank overlay

- [ ] **Step 1: Write failing check**

```js
// C:\Users\ASUS\AppData\Local\Temp\opencode\verify-sheet.js
const fs=require('fs');
const s=fs.readFileSync('E:\\Caly Ai\\caly-ai-frontend\\src\\shared\\components\\ui\\QuickLogSheet.js','utf8');
if(!s.includes('@/components/ui/sheet')&&!s.includes('@/components/ui/dialog')){console.log('FAIL no portal sheet');process.exit(1)}console.log('PASS');
```

- [ ] **Step 2: Run fails**

Run: `node "C:\Users\ASUS\AppData\Local\Temp\opencode\verify-sheet.js"`
Expected: FAIL

- [ ] **Step 3: Implement QuickLogSheet wrapper**

```js
// src/shared/components/ui/QuickLogSheet.js
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
export default function QuickLogSheet({ open, onOpenChange, children }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card rounded-t-2xl p-4">
        <Text className="text-foreground font-bold mb-2">Quick Log</Text>
        {children}
      </SheetContent>
    </Sheet>
  );
}
```

Repeat for `WeightLogSheet`. Verify `src/app/_layout.tsx` still has `<PortalHost />` last.

- [ ] **Step 4: Verify**

Run: `node "C:\Users\ASUS\AppData\Local\Temp\opencode\verify-sheet.js"`
Expected: PASS
Run: `npx @react-native-reusables/cli@latest doctor --cwd "E:\Caly Ai\caly-ai-frontend"`
Expected: All checks passed.

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/ui/QuickLogSheet.js src/shared/components/WeightLogSheet.js
git commit -m "feat: migrate sheets to RNR portal"
```

### Task 8: Migrate Toast + final cleanup

**Files:**
- Modify: `src/shared/components/ui/ThemedToast.js`, `src/shared/components/ui/OfflineBanner.js`, `src/shared/components/ui/BottomNav.js`, delete legacy after zero imports
- Test: `C:\Users\ASUS\AppData\Local\Temp\opencode\verify-toast.js`

**Interfaces:**
- Consumes: `@/components/ui/sonner` if works on native, else `react-native-toast-message` wrapper with `cn()` + theme vars
- Produces: Single toast/banner system, `BottomNav` styled with `text-primary`

- [ ] **Step 1: Write failing check**

```js
// C:\Users\ASUS\AppData\Local\Temp\opencode\verify-toast.js
const { execSync } = require('child_process');
const out = execSync('rg -l "from.*shared/components/ui/Button|from.*shared/components/ui/Card|from.*shared/components/ui/Chip" E:\\Caly\\ Ai\\caly-ai-frontend\\src --glob "*.js" || echo none', {encoding:'utf8'});
// simpler: check ThemedToast uses cn + theme
const fs=require('fs');
const s=fs.readFileSync('E:\\Caly Ai\\caly-ai-frontend\\src\\shared\\components\\ui\\ThemedToast.js','utf8');
if(!s.includes('cn(')){console.log('FAIL toast not themed');process.exit(1)}console.log('PASS');
```

- [ ] **Step 2: Run fails**

Run: `node "C:\Users\ASUS\AppData\Local\Temp\opencode\verify-toast.js"`
Expected: FAIL

- [ ] **Step 3: Implement – probe sonner, fallback to wrapper**

```js
// src/shared/components/ui/ThemedToast.js
import Toast from 'react-native-toast-message';
import { cn } from '@/lib/utils';
export default function ThemedToast({ className }) {
  return <Toast topOffset={60} />;
}
export function toastSuccess(msg) { Toast.show({ type: 'success', text1: msg }); }
export function toastError(msg) { Toast.show({ type: 'error', text1: msg }); }
```

If `@/components/ui/sonner` works on Expo Go native, use it instead – test with `npx expo start --clear`, trigger toast, must show once, no duplicate.

BottomNav: keep native tabs, change classes to `text-primary` / `text-muted`, `bg-card border-t border-border`.

- [ ] **Step 4: Verify full suite**

Run: `npx @react-native-reusables/cli@latest doctor --cwd "E:\Caly Ai\caly-ai-frontend"`
Expected: All checks passed.
Run: `npx tsc --noEmit`
Expected: clean
Run: `npx eslint src/shared/components/ui src/shared/components/auth src/features/dashboard/screens/DashboardScreen.js`
Expected: clean (pre-existing `(tabs)/_layout.js` errors out of scope, do not fix here)
Run: `npx expo start --clear` smoke welcome/login/dashboard/log/progress, sheet open, toast show
Expected: renders with `bg-primary #f2470c`, no white-on-white

- [ ] **Step 5: Commit + cleanup temp scripts**

```bash
git add src/shared/components/ui/ThemedToast.js src/shared/components/ui/OfflineBanner.js src/shared/components/ui/BottomNav.js
git commit -m "feat: migrate toast nav to RNR theme"
rm C:\Users\ASUS\AppData\Local\Temp\opencode\verify-*.js
```

