import { SimpleResourceDetail } from '@/pages/simple-resource-detail'
import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/api-client'
import { fetchResources } from '@/lib/api/core'
import { withSubPath } from '@/lib/subpath'
import { useCluster } from '@/hooks/use-cluster'
import { ResourceTable } from '@/components/resource-table'
import { YamlEditor } from '@/components/yaml-editor'

import type {
  CurrentCluster,
  KiteAPI,
  KitePluginRuntime,
  ResourceListOptions,
  ResourceListQuery,
  ResourceQuery,
} from './types'

const pluginAPI: KiteAPI = {
  request: apiClient.request.bind(apiClient),
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  patch: apiClient.patch.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
}

function useCurrentCluster(): CurrentCluster {
  return useCluster()
}

function usePluginResource<T = unknown>(
  resource: string,
  name: string,
  namespace?: string
): ResourceQuery<T> {
  return useQuery({
    queryKey: ['plugin-resource', resource, namespace, name],
    queryFn: () =>
      apiClient.get<T>(`/${resource}/${namespace || '_all'}/${name}`),
    enabled: !!resource && !!name,
  })
}

function usePluginResources<T = unknown>(
  resource: string,
  namespace?: string,
  options?: ResourceListOptions
): ResourceListQuery<T> {
  const { enabled, ...requestOptions } = options || {}

  return useQuery({
    queryKey: ['plugin-resources', resource, namespace, options],
    queryFn: () => fetchResources<T>(resource, namespace, requestOptions),
    enabled: !!resource && (enabled ?? true),
  })
}

export const kitePluginHostRuntime: KitePluginRuntime = {
  version: 'dev',
  api: pluginAPI,
  hooks: {
    useCurrentCluster,
    useResource: usePluginResource,
    useResources: usePluginResources,
  },
  components: {
    ResourceTable: ResourceTable as never,
    YamlEditor: YamlEditor as never,
    SimpleResourceDetail: SimpleResourceDetail as never,
  },
  navigate(to: string) {
    window.location.href = withSubPath(to)
  },
}
