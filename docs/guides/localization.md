# Adding Localization to Your App

This guide shows you how to add multi-language support to your Windows 15 app.

## Quick Start

### 1. Use the Translation Hook

```typescript
import { useTranslation } from '../hooks';

export const MyApp = () => {
  const { t } = useTranslation('myApp');

  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('saveButton')}</button>
      <p>{t('description')}</p>
    </div>
  );
};
```

### 2. Add Translations

Edit `locales/en.json`:

```json
{
    "myApp": {
        "title": "My Application",
        "saveButton": "Save",
        "description": "This is my app description"
    }
}
```

That's it! Your app is now localized.

## Translation Namespaces

### Why Use Namespaces?

Namespaces organize translations by app:

```json
{
    "calculator": {
        "title": "Calculator",
        "clear": "Clear"
    },
    "notepad": {
        "title": "Notepad",
        "save": "Save"
    }
}
```

### Namespace Convention

Use kebab-case matching your app ID:

```typescript
// App ID: 'todoList'
// Namespace: 'todoList'
const { t } = useTranslation('todoList');

// App ID: 'mailClient'
// Namespace: 'mailClient'
const { t } = useTranslation('mailClient');
```

### Shared Translations

Use a common namespace for shared strings:

```json
{
    "common": {
        "ok": "OK",
        "cancel": "Cancel",
        "save": "Save",
        "delete": "Delete",
        "close": "Close"
    }
}
```

```typescript
const { t } = useTranslation('common');
<button>{t('ok')}</button>
```

## Interpolation

### Basic Interpolation

```typescript
// Translation
{
  "greeting": "Hello, {name}!"
}

// Usage
t('greeting', { name: 'Alice' })
// Output: "Hello, Alice!"
```

### Multiple Parameters

```typescript
// Translation
{
  "itemCount": "{count} items in {folder}"
}

// Usage
t('itemCount', { count: 5, folder: 'Documents' })
// Output: "5 items in Documents"
```

### Numeric Formatting

```typescript
// Translation
{
  "price": "${amount}",
  "percentage": "{value}%"
}

// Usage
t('price', { amount: 19.99 })
t('percentage', { value: 75 })
```

## Pluralization

Handle singular/plural forms:

```json
{
    "itemCount": "{count} {count, plural, one {item} other {items}}"
}
```

```typescript
t('itemCount', { count: 1 }); // "1 item"
t('itemCount', { count: 5 }); // "5 items"
```

## Adding New Languages

### 1. Create Translation File

Copy `locales/en.json` to `locales/es.json`:

```bash
cp locales/en.json locales/es.json
```

### 2. Translate Strings

```json
{
    "calculator": {
        "title": "Calculadora",
        "clear": "Limpiar"
    },
    "notepad": {
        "title": "Bloc de notas",
        "save": "Guardar"
    }
}
```

### 3. Add Language to Settings

Language will automatically appear in Settings > Localization.

## Best Practices

### 1. Always Use Translation Keys

```typescript
// ❌ Bad
<h1>Calculator</h1>

// ✅ Good
<h1>{t('title')}</h1>
```

### 2. Use Descriptive Keys

```typescript
// ❌ Bad
t('button1');
t('text2');

// ✅ Good
t('saveButton');
t('confirmMessage');
```

### 3. Group Related Keys

```json
{
    "form": {
        "title": "Contact Form",
        "fields": {
            "name": "Name",
            "email": "Email",
            "message": "Message"
        },
        "buttons": {
            "submit": "Submit",
            "cancel": "Cancel"
        }
    }
}
```

```typescript
t('form.title');
t('form.fields.name');
t('form.buttons.submit');
```

### 4. Avoid Concatenation

```typescript
// ❌ Bad
const message = t('you_have') + ' ' + count + ' ' + t('messages');

// ✅ Good
{
  "messageCount": "You have {count} messages"
}
t('messageCount', { count })
```

### 5. Keep Translations Short

Long text won't fit UI elements:

```json
{
    // ❌ Too long
    "saveButton": "Click this button to save your document to the file system",

    // ✅ Concise
    "saveButton": "Save"
}
```

### 6. Provide Context

Add comments in translation files:

```json
{
    // Button label for saving documents
    "saveButton": "Save",

    // Confirmation message after successful save
    "saveSuccess": "Document saved successfully"
}
```

## Dynamic Language Switching

Allow users to change language:

```typescript
import { useTranslation } from '../hooks';

export const LanguageSelector = () => {
  const { language, setLanguage } = useTranslation();

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'zh', name: '中文' },
  ];

  return (
    <select value={language} onChange={e => setLanguage(e.target.value)}>
      {languages.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  );
};
```

## Date and Time Formatting

Use `Intl` APIs for locale-aware formatting:

```typescript
const { language } = useTranslation();

// Date
const date = new Date();
const formatted = new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
}).format(date);

// Number
const number = 1234.56;
const formatted = new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'USD',
}).format(number);
```

## Testing Translations

### Check for Missing Keys

```typescript
const { t } = useTranslation('myApp');

// Check console - warns if key missing
t('nonexistent.key'); // ⚠️ Warning: Translation key not found
```

### Test All Languages

1. Open Settings > Localization
2. Switch to each language
3. Navigate through your app
4. Check for:
    - Missing translations
    - Truncated text
    - Layout issues
    - Character encoding

### Pseudo-Localization

Test with longer text:

```json
{
    "en": {
        "save": "Save"
    },
    "test": {
        "save": "[Sáve Dôcümént]" // Longer + special chars
    }
}
```

## Common Patterns

### Button Labels

```json
{
    "buttons": {
        "save": "Save",
        "cancel": "Cancel",
        "ok": "OK",
        "delete": "Delete",
        "edit": "Edit",
        "close": "Close",
        "open": "Open",
        "new": "New"
    }
}
```

### Status Messages

```json
{
    "status": {
        "loading": "Loading...",
        "saving": "Saving...",
        "saved": "Saved",
        "error": "An error occurred",
        "success": "Operation successful"
    }
}
```

### Form Validation

```json
{
    "validation": {
        "required": "This field is required",
        "email": "Please enter a valid email",
        "minLength": "Must be at least {min} characters",
        "maxLength": "Must be no more than {max} characters"
    }
}
```

### Confirmation Dialogs

```json
{
    "confirm": {
        "delete": "Are you sure you want to delete this item?",
        "unsavedChanges": "You have unsaved changes. Discard them?",
        "overwrite": "File already exists. Overwrite?"
    }
}
```

## Folder Structure

```
locales/
├── en.json          # English (default)
├── es.json          # Spanish
├── fr.json          # French
├── de.json          # German
├── zh.json          # Chinese
├── ja.json          # Japanese
└── README.md        # Translation guidelines
```

## Translation File Structure

```json
{
    "appName": {
        "title": "App Title",
        "sections": {
            "section1": "Section 1",
            "section2": "Section 2"
        },
        "buttons": {
            "action1": "Action 1",
            "action2": "Action 2"
        },
        "messages": {
            "success": "Success message",
            "error": "Error message"
        }
    }
}
```

## Gotchas

### Missing Keys Return Key Name

```typescript
t('nonexistent'); // Returns: "nonexistent"
```

### Parameters Must Match

```json
{
    "greeting": "Hello, {name}!"
}
```

```typescript
t('greeting', { wrongParam: 'value' });
// Returns: "Hello, {name}!"  // Parameter not replaced
```

### Namespace Required

```typescript
// ❌ No namespace - uses default
const { t } = useTranslation();

// ✅ Always specify namespace
const { t } = useTranslation('myApp');
```

## Example: Complete App Localization

```typescript
// MyApp.tsx
import { useTranslation } from '../hooks';

export const TodoList = () => {
  const { t } = useTranslation('todoList');
  const [todos, setTodos] = useState([]);

  const addTodo = (text: string) => {
    // ...
    notify.success(t('messages.todoAdded'));
  };

  const deleteTodo = (id: string) => {
    if (confirm(t('confirm.deleteTodo'))) {
      // ...
      notify.success(t('messages.todoDeleted'));
    }
  };

  return (
    <div>
      <h1>{t('title')}</h1>
      <input placeholder={t('placeholders.newTodo')} />
      <button>{t('buttons.add')}</button>
      {todos.length === 0 && (
        <p>{t('messages.noTodos')}</p>
      )}
      <p>{t('status.itemCount', { count: todos.length })}</p>
    </div>
  );
};
```

```json
// locales/en.json
{
    "todoList": {
        "title": "Todo List",
        "buttons": {
            "add": "Add",
            "delete": "Delete",
            "edit": "Edit"
        },
        "placeholders": {
            "newTodo": "What needs to be done?"
        },
        "messages": {
            "noTodos": "No todos yet. Add one to get started!",
            "todoAdded": "Todo added successfully",
            "todoDeleted": "Todo deleted"
        },
        "confirm": {
            "deleteTodo": "Are you sure you want to delete this todo?"
        },
        "status": {
            "itemCount": "{count} {count, plural, one {item} other {items}}"
        }
    }
}
```

## See Also

- [useTranslation Hook](../api/hooks/useTranslation.md)
- [LocalizationContext](../api/contexts/LocalizationContext.md)
- [Contributing Translations](../../CONTRIBUTING.md#translations)
