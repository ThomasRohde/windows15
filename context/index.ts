/**
 * Context providers barrel exports
 */

// Database context
export { DbProvider, useDb } from './DbContext';

// User profile context
export { UserProfileProvider, useUserProfile } from './UserProfileContext';
export type { UserProfile } from './UserProfileContext';

// Main OS context (composition wrapper for backward compatibility)
export { OSProvider, useOS } from './OSContext';

// Individual focused contexts (can be used directly for better tree-shaking)
export { AppRegistryProvider, useAppRegistry } from './AppRegistryContext';
export { WallpaperProvider, useWallpaper } from './WallpaperContext';
export { StartMenuProvider, useStartMenu } from './StartMenuContext';
export { WindowProvider, useWindowManager } from './WindowContext';
export { LocalizationProvider, useLocalization } from './LocalizationContext';
export type { TFunction } from './LocalizationContext';

// 3D Window Space context (F087)
export { WindowSpaceProvider, useWindowSpace } from './WindowSpaceContext';
export type { WindowSpaceMode, WindowSpaceSettings } from './WindowSpaceContext';
