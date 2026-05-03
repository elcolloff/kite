import React from 'react'

import type { KitePluginRuntime } from './types'

declare global {
  interface Window {
    __KITE_PLUGIN_HOST__?: KitePluginRuntime
  }
}

export function getKiteRuntime(): KitePluginRuntime {
  const host = window.__KITE_PLUGIN_HOST__
  if (!host) {
    throw new Error('Kite plugin host runtime is not ready')
  }
  return host
}

export function useKiteRuntime(): KitePluginRuntime {
  return getKiteRuntime()
}

export function createHostComponent<P>(
  resolve: (runtime: KitePluginRuntime) => React.ComponentType<P>
) {
  return function HostComponent(props: P): React.ReactElement | null {
    const Component = resolve(getKiteRuntime()) as React.ComponentType<unknown>
    return React.createElement(Component, props as React.Attributes)
  }
}
