/**
 * TypeScript utility types for Windows15
 */

/**
 * Make all properties of T optional recursively
 */
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

/**
 * Make all properties of T readonly recursively
 */
export type DeepReadonly<T> = T extends object ? { readonly [P in keyof T]: DeepReadonly<T[P]> } : T;

/**
 * Make T nullable (T | null)
 */
export type Nullable<T> = T | null;

/**
 * Make T optional (T | undefined)
 */
export type Optional<T> = T | undefined;

/**
 * Make T nullable and optional
 */
export type Maybe<T> = T | null | undefined;

/**
 * Extract the element type from an array
 */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

/**
 * Make specific keys of T required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific keys of T optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Exclude null and undefined from T
 */
export type NonNullish<T> = Exclude<T, null | undefined>;

/**
 * Get the keys of T that are required
 */
export type RequiredKeys<T> = {
    [K in keyof T]-?: object extends Pick<T, K> ? never : K;
}[keyof T];

/**
 * Get the keys of T that are optional
 */
export type OptionalKeysOf<T> = {
    [K in keyof T]-?: object extends Pick<T, K> ? K : never;
}[keyof T];

/**
 * Create a type that ensures at least one property is defined
 */
export type AtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
    {
        [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
    }[Keys];

/**
 * Make a union type distributive for conditional types
 */
export type Distribute<T> = T extends unknown ? T : never;

/**
 * Get the return type of an async function
 */
export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> = T extends (
    ...args: unknown[]
) => Promise<infer R>
    ? R
    : never;

/**
 * Create a branded/opaque type for type-safe IDs
 */
export type Brand<T, B> = T & { readonly __brand: B };

/**
 * Branded string type for entity IDs
 */
export type EntityId<T extends string> = Brand<string, T>;

/**
 * Callback function type with optional return
 */
export type Callback<T = void> = () => T;

/**
 * Event handler type
 */
export type EventHandler<E = Event> = (event: E) => void;

/**
 * React component props with children
 */
export type PropsWithChildren<P = object> = P & {
    children?: React.ReactNode;
};

/**
 * Record with string keys and values of type T
 */
export type StringRecord<T> = Record<string, T>;

/**
 * Ensure an object has all keys of an enum
 */
export type EnumRecord<E extends string | number | symbol, T> = {
    [K in E]: T;
};
