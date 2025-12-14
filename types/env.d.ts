/// <reference types="vite/client" />

/**
 * Type definitions for environment variables
 *
 * Only VITE_ prefixed variables are exposed to the client.
 * Add new environment variables here for TypeScript support.
 */
interface ImportMetaEnv {
    /**
     * Dexie Cloud database URL for sync functionality.
     * @example "https://z12345.dexie.cloud"
     */
    readonly VITE_DEXIE_CLOUD_URL?: string;

    /**
     * Base path for deployment.
     * Used for subdirectory hosting (e.g., "/my-app/").
     * @default "/"
     */
    readonly BASE_URL: string;

    /**
     * Current mode (development, production, etc.)
     */
    readonly MODE: string;

    /**
     * Whether running in development mode
     */
    readonly DEV: boolean;

    /**
     * Whether running in production mode
     */
    readonly PROD: boolean;

    /**
     * Whether running in SSR mode
     */
    readonly SSR: boolean;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
