import { ResourceDetailShell } from '@/pages/resource-detail-shell'
import { SimpleResourceDetail } from '@/pages/simple-resource-detail'
import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/api-client'
import { fetchResources } from '@/lib/api/core'
import { withSubPath } from '@/lib/subpath'
import { useCluster } from '@/hooks/use-cluster'
import { ResourceTable } from '@/components/resource-table'
import { ResourceOverview } from '@/components/resource-overview'
import { YamlEditor } from '@/components/yaml-editor'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ResponsiveTabs } from '@/components/ui/responsive-tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { NamespaceSelector } from '@/components/selector/namespace-selector'

import { DataTable } from './data-table'
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
  ui: {
    ResponsiveTabs,
    Badge,
    Button,
    Input,
    Textarea,
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableRow,
    TableHead,
    TableCell,
    TableCaption,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    Alert,
    AlertTitle,
    AlertDescription,
    Skeleton,
    Separator,
  },
  resource: {
    ResourceTable:
      ResourceTable as KitePluginRuntime['resource']['ResourceTable'],
    DataTable,
    YamlEditor,
    SimpleResourceDetail:
      SimpleResourceDetail as KitePluginRuntime['resource']['SimpleResourceDetail'],
    ResourceDetailShell:
      ResourceDetailShell as KitePluginRuntime['resource']['ResourceDetailShell'],
    ResourceOverview:
      ResourceOverview as KitePluginRuntime['resource']['ResourceOverview'],
    NamespaceSelector,
  },
  navigate(to: string) {
    window.location.href = withSubPath(to)
  },
}
