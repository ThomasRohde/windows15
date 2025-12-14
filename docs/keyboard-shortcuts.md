# Keyboard Shortcuts

Windows 15 supports keyboard shortcuts for quick access to common actions.

## Global Shortcuts

These shortcuts work anywhere in the application (except when typing in text inputs).

### App Launchers

| Shortcut       | Action             |
| -------------- | ------------------ |
| `Ctrl+Shift+E` | Open File Explorer |
| `Ctrl+Shift+T` | Open Terminal      |
| `Ctrl+Shift+N` | Open Notepad       |
| `Ctrl+Shift+C` | Open Calculator    |
| `Ctrl+Shift+S` | Open Settings      |

### Window Control

| Shortcut     | Action                      |
| ------------ | --------------------------- |
| `Ctrl+W`     | Close focused window        |
| `Alt+F4`     | Close focused window        |
| `Ctrl+M`     | Minimize focused window     |
| `Ctrl+Alt+3` | Toggle 3D Window Space mode |

## Developer API

### useHotkey Hook

For single shortcuts:

```tsx
import { useHotkey } from './hooks';

// Basic usage
useHotkey('ctrl+s', () => save());

// Disabled when needed
useHotkey('ctrl+s', () => save(), { enabled: canSave });
```

### useHotkeys Hook

For multiple shortcuts:

```tsx
import { useHotkeys } from './hooks';

useHotkeys({
    'ctrl+s': () => save(),
    'ctrl+z': () => undo(),
    'ctrl+shift+z': () => redo(),
});
```

### getShortcutLabel Utility

For displaying shortcuts in UI:

```tsx
import { getShortcutLabel } from './hooks';

// Returns platform-aware labels
getShortcutLabel('ctrl+s'); // "Ctrl+S" on Windows/Linux, "⌘S" on Mac
getShortcutLabel('alt+f4'); // "Alt+F4" on Windows/Linux, "⌥F4" on Mac
```

## Shortcut Format

Shortcuts are defined as strings with modifier keys separated by `+`:

- **ctrl** - Control key (Cmd on Mac)
- **alt** - Alt key (Option on Mac)
- **shift** - Shift key
- **meta** - Windows/Cmd key

Key names are case-insensitive and can include:

- Letters: `a` through `z`
- Numbers: `0` through `9`
- Function keys: `f1` through `f12`
- Special keys: `escape`, `enter`, `space`, `tab`, `backspace`, `delete`, `arrowup`, `arrowdown`, `arrowleft`, `arrowright`

### Examples

```
ctrl+s          # Ctrl + S
ctrl+shift+n    # Ctrl + Shift + N
alt+f4          # Alt + F4
f5              # F5
escape          # Escape
```

## Notes

- Shortcuts are automatically disabled when typing in text inputs (`<input>`, `<textarea>`, or elements with `contenteditable`)
- Platform-specific key mappings ensure consistent behavior across Windows, Mac, and Linux
- Shortcuts prevent default browser behavior when matched
