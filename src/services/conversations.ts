/**
 * conversations — Web fallback (re-exports from conversations.web.ts)
 *
 * On web, Expo's file resolution picks up conversations.web.ts directly.
 * This file exists so that TypeScript and bundler resolve the module
 * correctly on non-native platforms. It re-exports everything from the
 * web implementation.
 *
 * @see conversations.web.ts for the actual implementation
 * @see conversations.native.ts for the native (SQLite) implementation
 */
export * from './conversations.web';
