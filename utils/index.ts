/**
 * Utilities barrel exports
 */

// Constants
export * from './constants';

// Debug logging
export { debugSync } from './debugLogger';

// Event bus
export { createEventBus, appEventBus } from './eventBus';
export type { EventBus, AppEvents } from './eventBus';

// File system utilities
export * from './fileSystem';

// Clipboard utilities
export * from './clipboard';

// Array utilities
export { ensureArray } from './ensureArray';

// Date utilities
export * from './dateUtils';

// Storage (re-export from storage/index.ts)
export * from './storage';

// Color utilities
export * from './color';

// UUID generation
export { generateUuid, createId } from './uuid';
