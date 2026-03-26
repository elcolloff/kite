import { apiClient } from '@/lib/api-client'

import type {
  InstalledPlugin,
  PluginManifest,
  PluginOperationParams,
  PluginRegistryEntry,
  PluginResourceDefinition,
} from './types'

const resolveNamespaceSegment = (
  resource: PluginResourceDefinition,
  namespace?: string
) => {
  if (resource.scope === 'cluster') {
    return '_all'
  }
  return namespace || '_all'
}

const getResourceBasePath = (resource: PluginResourceDefinition) => {
  if (resource.source === 'builtin') {
    return `/${resource.resourceType}`
  }
  return `/${resource.crdName}`
}

export const fetchPluginRegistry = async () => {
  return apiClient.get<{ plugins?: PluginRegistryEntry[] }>('/plugins/registry')
}

export const fetchInstalledPlugins = async () => {
  return apiClient.get<{ plugins?: InstalledPlugin[] }>('/admin/plugins/')
}

export const installPlugin = async (data: {
  manifestUrl: string
  enabled?: boolean
}) => {
  return apiClient.post<InstalledPlugin>('/admin/plugins/install', data)
}

export const enableInstalledPlugin = async (pluginId: string) => {
  return apiClient.post<InstalledPlugin>(`/admin/plugins/${pluginId}/enable`)
}

export const disableInstalledPlugin = async (pluginId: string) => {
  return apiClient.post<InstalledPlugin>(`/admin/plugins/${pluginId}/disable`)
}

export const deleteInstalledPlugin = async (pluginId: string) => {
  return apiClient.delete<{ pluginId: string; deleted: boolean }>(
    `/admin/plugins/${pluginId}`
  )
}

export const fetchPluginManifest = async (manifestUrl: string) => {
  const response = await fetch(manifestUrl, { credentials: 'omit' })
  if (!response.ok) {
    throw new Error(`Failed to fetch plugin manifest: ${response.status}`)
  }
  return (await response.json()) as PluginManifest
}

export const fetchPluginResourceList = async <T = unknown>(
  resource: PluginResourceDefinition,
  namespace?: string
): Promise<T[]> => {
  const basePath = getResourceBasePath(resource)
  const ns = resolveNamespaceSegment(resource, namespace)
  const endpoint =
    resource.scope === 'cluster' ? `${basePath}/_all` : `${basePath}/${ns}`

  const response = await apiClient.get<
    { items?: T[]; metadata?: unknown } | T[]
  >(endpoint)

  if (Array.isArray(response)) {
    return response
  }

  return response.items || []
}

export const getPluginResource = async <T = unknown>(
  resource: PluginResourceDefinition,
  params: PluginOperationParams
): Promise<T> => {
  const basePath = getResourceBasePath(resource)
  const ns = resolveNamespaceSegment(resource, params.namespace)
  return apiClient.get<T>(`${basePath}/${ns}/${params.name}`)
}

export const updatePluginResource = async <T = unknown>(
  resource: PluginResourceDefinition,
  params: PluginOperationParams,
  body: T
) => {
  const basePath = getResourceBasePath(resource)
  const ns = resolveNamespaceSegment(resource, params.namespace)
  await apiClient.put(`${basePath}/${ns}/${params.name}`, body)
}

export const patchPluginResource = async <T = unknown>(
  resource: PluginResourceDefinition,
  params: PluginOperationParams,
  body: T
) => {
  const basePath = getResourceBasePath(resource)
  const ns = resolveNamespaceSegment(resource, params.namespace)
  await apiClient.patch(
    `${basePath}/${ns}/${params.name}?patchType=merge`,
    body
  )
}

export const deletePluginResource = async (
  resource: PluginResourceDefinition,
  params: PluginOperationParams,
  options?: { force?: boolean; wait?: boolean }
) => {
  const basePath = getResourceBasePath(resource)
  const ns = resolveNamespaceSegment(resource, params.namespace)
  const searchParams = new URLSearchParams()

  if (options?.force) {
    searchParams.set('force', 'true')
  }
  if (options?.wait === false) {
    searchParams.set('wait', 'false')
  }

  const suffix = searchParams.toString()
  const endpoint = `${basePath}/${ns}/${params.name}${suffix ? `?${suffix}` : ''}`
  await apiClient.delete(endpoint)
}
