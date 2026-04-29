import React from 'react'

import type {
  CurrentCluster,
  KitePluginRuntime,
  ResourceListOptions,
  ResourceListQuery,
  ResourceQuery,
  SimpleResourceDetailProps,
  ResourceTableProps,
  YamlEditorProps,
} from './types'

declare global {
  interface Window {
    __KITE_PLUGIN_HOST__?: KitePluginRuntime
  }
}

const getHost = (): KitePluginRuntime => {
  const host = window.__KITE_PLUGIN_HOST__
  if (!host) {
    throw new Error('Kite plugin host runtime is not ready')
  }
  return host
}

export function useKiteRuntime(): KitePluginRuntime {
  return getHost()
}

export function useCurrentCluster(): CurrentCluster {
  return getHost().hooks.useCurrentCluster()
}

export function useResource<T = unknown>(
  resource: string,
  name: string,
  namespace?: string
): ResourceQuery<T> {
  return getHost().hooks.useResource<T>(resource, name, namespace)
}

export function useResources<T = unknown>(
  resource: string,
  namespace?: string,
  options?: ResourceListOptions
): ResourceListQuery<T> {
  return getHost().hooks.useResources<T>(resource, namespace, options)
}

export function ResourceTable<T = unknown>(
  props: ResourceTableProps<T>
): React.ReactElement | null {
  const Component = getHost().components.ResourceTable as React.ComponentType<
    ResourceTableProps<T>
  >
  return React.createElement(Component, props)
}

export function YamlEditor<T = unknown>(
  props: YamlEditorProps<T>
): React.ReactElement | null {
  const Component = getHost().components.YamlEditor as React.ComponentType<
    YamlEditorProps<T>
  >
  return React.createElement(Component, props)
}

export function SimpleResourceDetail(
  props: SimpleResourceDetailProps
): React.ReactElement | null {
  const Component = getHost().components
    .SimpleResourceDetail as React.ComponentType<SimpleResourceDetailProps>
  return React.createElement(Component, props)
}

export type * from './types'
