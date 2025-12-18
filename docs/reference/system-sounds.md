# System Sounds Reference

Complete reference for all system sound effects available in Windows 15.

## SystemSound Type

```typescript
type SystemSound = 'startup' | 'shutdown' | 'notification' | 'success' | 'error' | 'click' | 'open' | 'close';
```

## Sound Catalog

| Sound            | Description          | Use Cases                   | Audio Character                |
| ---------------- | -------------------- | --------------------------- | ------------------------------ |
| **startup**      | OS boot sound        | System startup              | Ascending chime, welcoming     |
| **shutdown**     | OS shutdown sound    | System shutdown             | Descending chime, farewell     |
| **notification** | General notification | Toast messages, alerts      | Gentle ping, non-intrusive     |
| **success**      | Action succeeded     | Save, delete, complete      | Positive ding, affirming       |
| **error**        | Action failed        | Validation errors, failures | Alert beep, attention-grabbing |
| **click**        | UI interaction       | Button clicks, selections   | Subtle click, tactile          |
| **open**         | Opening items        | Open file, expand menu      | Soft whoosh, expansive         |
| **close**        | Closing items        | Close window, collapse      | Soft thud, conclusive          |

## Usage

### Basic Playback

```typescript
import { useSound } from '../hooks';

export const MyApp = () => {
  const { play } = useSound();

  const handleSave = async () => {
    try {
      await saveFile();
      play('success');
    } catch (err) {
      play('error');
    }
  };

  return <button onClick={handleSave}>Save</button>;
};
```

### Check if Enabled

```typescript
const { play, enabled } = useSound();

if (enabled) {
    play('notification');
}
```

### Volume Awareness

```typescript
const { play, volume } = useSound();

// Skip sound for bulk operations when volume is low
if (volume > 0.3) {
    play('click');
}
```

## Sound Guidelines

### When to Play Sounds

**DO play sounds for:**

- ✅ User-initiated actions (save, delete, send)
- ✅ Important state changes (connected, disconnected)
- ✅ Errors that need attention
- ✅ Background task completion
- ✅ Incoming notifications

**DON'T play sounds for:**

- ❌ Every keystroke or mouse move
- ❌ Continuous/repeated actions (typing, scrolling)
- ❌ Passive UI updates (loading indicators)
- ❌ Minor state changes
- ❌ Actions that happen in rapid succession

### Choosing the Right Sound

| Action           | Sound          | Rationale                   |
| ---------------- | -------------- | --------------------------- |
| File saved       | `success`      | Confirms action completion  |
| File deleted     | `success`      | Confirms destructive action |
| Operation failed | `error`        | Alerts user to problem      |
| Button clicked   | `click`        | Tactile feedback            |
| Modal opened     | `open`         | Draws attention to new UI   |
| Modal closed     | `close`        | Confirms dismissal          |
| Message received | `notification` | Non-intrusive alert         |
| App opened       | `open`         | Signals new content         |
| App closed       | `close`        | Confirms exit               |

### Sound Combinations

Avoid playing multiple sounds simultaneously:

```typescript
// ❌ Bad: Sound spam
play('click');
play('open');
play('success');

// ✅ Good: One sound per action
play('success'); // Implies open + success
```

### Debouncing

For rapid actions, debounce sound playback:

```typescript
import { debounce } from '../utils';

const debouncedClick = debounce(() => {
  play('click');
}, 100);

<button onClick={debouncedClick}>Rapid Click</button>
```

## User Settings

Users can control sounds via Settings > Sound:

- **Enable/Disable**: Toggle all sounds
- **Volume**: Adjust playback volume (0-100%)
- **System Sounds**: Future: per-sound enable/disable

Always respect user preferences:

```typescript
const { enabled } = useSound();

// Check before playing
if (enabled) {
    play('notification');
}
```

## Implementation Details

### Sound Files

Sounds are stored in `public/sounds/`:

```
public/sounds/
├── startup.mp3
├── shutdown.mp3
├── notification.mp3
├── success.mp3
├── error.mp3
├── click.mp3
├── open.mp3
└── close.mp3
```

### Sound Service

Underlying service: `utils/soundService.ts`

```typescript
import { soundService } from '../utils';

soundService.play('success');
soundService.setVolume(0.5);
soundService.setEnabled(false);
```

### Integration with Components

Many components auto-integrate sound:

```typescript
// RecycleBin automatically plays 'success' on delete
<RecycleBin />

// NotificationToast plays 'notification' automatically
<NotificationToast type="success" message="Saved" />

// useNotification hook plays sounds automatically
notify.success('Done'); // Plays 'success' sound
```

## Browser Compatibility

### Autoplay Policies

Modern browsers block autoplay until user interaction:

```typescript
// ❌ May not work on page load
play('startup');

// ✅ Works after user clicks
<button onClick={() => play('startup')}>Start</button>
```

### Fallback Behavior

If sound fails to play:

- No error thrown
- Warning logged to console
- App continues normally

## Examples

### Complete Integration

```typescript
import { useSound, useNotification } from '../hooks';

export const FileManager = () => {
  const { play } = useSound();
  const notify = useNotification();

  const deleteFile = async (file: File) => {
    try {
      await db.files.delete(file.id);
      play('success');
      notify.success(`Deleted ${file.name}`);
    } catch (err) {
      play('error');
      notify.error('Failed to delete file');
    }
  };

  return (
    <button onClick={() => deleteFile(file)}>Delete</button>
  );
};
```

### Conditional Playback

```typescript
const { play, enabled, volume } = useSound();

const handleAction = () => {
    // Only play for important actions
    if (isImportantAction && enabled && volume > 0) {
        play('notification');
    }

    // Always perform action
    doAction();
};
```

### Custom Sound Manager

```typescript
const SoundManager = {
    playSuccess: () => {
        const { play, enabled } = useSound();
        if (enabled) play('success');
    },

    playError: () => {
        const { play, enabled } = useSound();
        if (enabled) play('error');
    },
};
```

## See Also

- [useSound Hook API](../api/hooks/useSound.md) - Detailed documentation
- [Sound Service](../utils/SoundService.md) - Underlying implementation
- [Settings](../../apps/Settings.md) - User sound preferences
- [Accessibility](./accessibility.md) - Sound and reduced motion
