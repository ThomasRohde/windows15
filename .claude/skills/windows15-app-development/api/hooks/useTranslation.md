# useTranslation

**Category:** Core Hook  
**Since:** v0.1.0  
**Related:** [LocalizationContext](../contexts/LocalizationContext.md), [locales/](../../locales/)

## Overview

The `useTranslation` hook provides access to localized strings for your application. It supports namespaced translations for better organization of app-specific strings.

## API

```typescript
interface UseTranslationReturn {
    t: (key: string, params?: Record<string, string | number>) => string;
    language: string;
    setLanguage: (lang: string) => void;
}

function useTranslation(namespace?: string): UseTranslationReturn;
```

### Parameters

- `namespace` (optional): Translation namespace (e.g., 'calculator', 'notepad'). If not provided, uses default namespace.

### Returns

- `t(key, params?)`: Translation function
    - `key`: Translation key (e.g., 'title', 'saveButton')
    - `params`: Optional parameters for interpolation (e.g., `{name: 'John'}`)
- `language`: Current language code (e.g., 'en', 'es')
- `setLanguage`: Function to change current language

## Usage Examples

### Basic Translation

```typescript
import { useTranslation } from '../hooks';

export const Calculator = () => {
  const { t } = useTranslation('calculator');

  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('clearButton')}</button>
    </div>
  );
};
```

### Translation with Parameters

```typescript
export const TodoList = () => {
  const { t } = useTranslation('todoList');
  const count = 5;

  return (
    <div>
      <h2>{t('itemCount', { count })}</h2>
      {/* Renders: "5 items remaining" */}
    </div>
  );
};
```

### Dynamic Language Switching

```typescript
export const LanguageSelector = () => {
  const { language, setLanguage } = useTranslation();

  return (
    <select value={language} onChange={e => setLanguage(e.target.value)}>
      <option value="en">English</option>
      <option value="es">Español</option>
      <option value="fr">Français</option>
    </select>
  );
};
```

## Translation File Structure

Translations are stored in `locales/<lang>.json`:

```json
{
    "calculator": {
        "title": "Calculator",
        "clearButton": "Clear"
    },
    "todoList": {
        "title": "Todo List",
        "itemCount": "{count} items remaining"
    }
}
```

## Best Practices

1. **Always use namespaces** for app-specific strings:

    ```typescript
    const { t } = useTranslation('myApp');
    ```

2. **Avoid hardcoding strings** in components - always use translation keys

3. **Keep keys descriptive** and hierarchical:

    ```json
    {
        "settings": {
            "theme": {
                "title": "Theme",
                "light": "Light Mode",
                "dark": "Dark Mode"
            }
        }
    }
    ```

4. **Use interpolation** for dynamic values rather than string concatenation

## Edge Cases

- **Missing translation key**: Returns the key itself (e.g., `"settings.theme.title"`)
- **Missing namespace**: Falls back to default namespace
- **Missing language file**: Falls back to English ('en')
- **Invalid parameters**: Renders placeholder as-is (e.g., `"{name}"` if name not provided)

## See Also

- [LocalizationContext](../contexts/LocalizationContext.md) - Provides language state
- [Adding New Languages](../../guides/localization.md) - How to add translations
