import type { KitePluginHostRuntime } from './types'

interface KitePluginSharedModules {
  react: typeof import('react')
  reactJsxRuntime: typeof import('react/jsx-runtime')
  reactDom: typeof import('react-dom')
  reactDomClient: typeof import('react-dom/client')
  reactRouterDom: typeof import('react-router-dom')
  reactQuery: typeof import('@tanstack/react-query')
}

declare global {
  interface Window {
    __KITE_PLUGIN_HOST__?: KitePluginHostRuntime
    __KITE_PLUGIN_SHARED__?: KitePluginSharedModules
  }
}

export {}
