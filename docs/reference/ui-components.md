---
name: windows15-reference-ui-components
description: Quick lookup for reusable UI components in components/ui.
load_when: You need consistent UI building blocks (layout, inputs, buttons) for an app.
---

# UI Components Reference

UI components are exported from `components/ui/index.ts`.

## Layout

- `AppContainer` (+ `AppContainerProps`)
- `AppSidebar` (+ `SidebarItem`)
- `AppToolbar`
- `SplitPane` (+ `SplitPaneDirection`, `SplitPaneProps`)

## Structure & display

- `Card`
- `SectionLabel`
- `StatCard` (+ `StatCardProps`)
- `TabSwitcher` (+ `TabOption`)
- `Icon` (+ `IconProps`, `IconSize`)

## Inputs

- `TextInput` (+ `TextInputProps`, `TextInputType`, `TextInputSize`)
- `TextArea` (+ `TextAreaProps`, `TextAreaVariant`, `TextAreaResize`)
- `Checkbox` (+ `CheckboxProps`)
- `Select` (+ `SelectProps`, `SelectOption`, `SelectSize`)
- `Slider` (+ `SliderProps`)
- `SearchInput` (+ `SearchInputProps`)

## Actions

- `Button` (+ `ButtonProps`, `ButtonVariant`, `ButtonSize`)
- `CopyButton`
- `ConfirmDialog` (+ `ConfirmDialogProps`) and `useConfirmDialog()`

## App states

- `LoadingState` / `LoadingWrapper` (+ `LoadingStateProps`, `LoadingVariant`)
- `EmptyState` (+ `EmptyStateProps`)
- `ErrorBanner`

## Next

- Styling guide: `guides/styling-patterns.md`
