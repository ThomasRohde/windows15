/**
 * Context providers barrel exports
 */

// Database context
export { DbProvider, useDb } from './DbContext';

// Main OS context (composition wrapper for backward compatibility)
export { OSProvider, useOS } from './OSContext';

// Individual focused contexts (can be used directly for better tree-shaking)
export { AppRegistryProvider, useAppRegistry } from './AppRegistryContext';
export { WallpaperProvider, useWallpaper } from './WallpaperContext';
export { StartMenuProvider, useStartMenu } from './StartMenuContext';
export { WindowProvider, useWindowManager } from './WindowContext';
export { LocalizationProvider, useLocalization } from './LocalizationContext';
