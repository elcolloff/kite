import type {
  CurrentCluster,
  ResourceListOptions,
  ResourceListQuery,
  ResourceQuery,
} from './types'
import { getKiteRuntime, useKiteRuntime } from './runtime'

export { getKiteRuntime, useKiteRuntime }

export function useCurrentCluster(): CurrentCluster {
  return getKiteRuntime().hooks.useCurrentCluster()
}

export function useResource<T = unknown>(
  resource: string,
  name: string,
  namespace?: string
): ResourceQuery<T> {
  return getKiteRuntime().hooks.useResource<T>(resource, name, namespace)
}

export function useResources<T = unknown>(
  resource: string,
  namespace?: string,
  options?: ResourceListOptions
): ResourceListQuery<T> {
  return getKiteRuntime().hooks.useResources<T>(resource, namespace, options)
}

export type {
  ApiRequestOptions,
  CurrentCluster,
  KiteAPI,
  KitePluginModule,
  KitePluginRuntime,
  PluginContributions,
  PluginManifest,
  PluginPageComponent,
  PluginPageProps,
  PluginRouteContribution,
  PluginSidebarGroup,
  PluginSidebarItem,
  ResourceListOptions,
  ResourceListQuery,
  ResourceQuery,
} from './types'
