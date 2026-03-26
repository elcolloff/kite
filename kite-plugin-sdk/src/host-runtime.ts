import React from 'react'

import type {
  ButtonProps,
  KubeResourceTableProps,
  KitePluginHostRuntime,
  LogsViewerProps,
  PageProps,
  PanelProps,
  PluginOperationParams,
  PluginResourceDefinition,
  ResourceTableProps,
  SectionProps,
  SimpleResourceDetailProps,
  SimpleTableProps,
  TerminalProps,
} from './types'

declare global {
  interface Window {
    __KITE_PLUGIN_HOST__?: KitePluginHostRuntime
  }
}

const getHost = (): KitePluginHostRuntime => {
  const host = window.__KITE_PLUGIN_HOST__
  if (!host) {
    throw new Error('Kite plugin host runtime is not ready')
  }
  return host
}

const createComponentProxy =
  <P,>(key: keyof KitePluginHostRuntime['components']) =>
  (props: P) => {
    const Component = getHost().components[key] as React.ComponentType<any>
    return React.createElement(Component, props as any)
  }

export function defineKitePlugin<T>(setup: T): T {
  return setup
}

export function ResourceTable<T>(
  props: ResourceTableProps<T>
): React.ReactElement | null {
  const Component = getHost().components.ResourceTable as React.ComponentType<
    ResourceTableProps<T>
  >
  return React.createElement(Component, props)
}

export function SimpleTable<T>(
  props: SimpleTableProps<T>
): React.ReactElement | null {
  const Component = getHost().components.SimpleTable as React.ComponentType<
    SimpleTableProps<T>
  >
  return React.createElement(Component, props)
}

export function KubeResourceTable<T>(
  props: KubeResourceTableProps<T>
): React.ReactElement | null {
  const Component = getHost().components.KubeResourceTable as React.ComponentType<
    KubeResourceTableProps<T>
  >
  return React.createElement(Component, props)
}

export const SimpleResourceDetail =
  createComponentProxy<SimpleResourceDetailProps>('SimpleResourceDetail')
export const LogsViewer = createComponentProxy<LogsViewerProps>('LogsViewer')
export const Terminal = createComponentProxy<TerminalProps>('Terminal')
export const Page = createComponentProxy<PageProps>('Page')
export const Section = createComponentProxy<SectionProps>('Section')
export const Button = createComponentProxy<ButtonProps>('Button')
export const Panel = createComponentProxy<PanelProps>('Panel')

export function getResource<T = unknown>(
  resource: PluginResourceDefinition,
  params: PluginOperationParams
): Promise<T> {
  return getHost().api.getResource<T>(resource, params)
}

export function updateResource<T = unknown>(
  resource: PluginResourceDefinition,
  params: PluginOperationParams,
  body: T
): Promise<void> {
  return getHost().api.updateResource(resource, params, body)
}

export function patchResource<T = unknown>(
  resource: PluginResourceDefinition,
  params: PluginOperationParams,
  body: T
): Promise<void> {
  return getHost().api.patchResource(resource, params, body)
}

export function deleteResource(
  resource: PluginResourceDefinition,
  params: PluginOperationParams,
  options?: { force?: boolean; wait?: boolean }
): Promise<void> {
  return getHost().api.deleteResource(resource, params, options)
}

export type * from './types'
