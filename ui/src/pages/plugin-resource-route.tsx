import { useEffect, useRef, useState } from 'react'
import { fetchPluginResourceList, getPluginResource } from '@/plugins/api'
import { PluginRenderBoundary } from '@/plugins/plugin-render-boundary'
import { usePluginRuntime } from '@/plugins/runtime-context'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'

import { usePageTitle } from '@/hooks/use-page-title'
import { Card, CardContent } from '@/components/ui/card'

const getNamespaceStorageKey = () =>
  `${localStorage.getItem('current-cluster') || ''}selectedNamespace`

function PluginRouteError({ message }: { message: string }) {
  return (
    <div className="p-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">{message}</div>
        </CardContent>
      </Card>
    </div>
  )
}

export function PluginResourceRoute() {
  const navigate = useNavigate()
  const { pluginId, routerName, namespace, name } = useParams()
  const {
    isLoading,
    ensurePluginLoaded,
    plugins,
    getListDefinition,
    getDetailDefinition,
    pluginLoadStates,
  } = usePluginRuntime()

  const plugin = pluginId
    ? plugins.find((item) => item.id === pluginId)
    : undefined
  const listDefinition =
    pluginId && routerName ? getListDefinition(pluginId, routerName) : undefined
  const detailDefinition =
    pluginId && routerName
      ? getDetailDefinition(pluginId, routerName)
      : undefined
  const pluginLoadState = pluginId
    ? pluginLoadStates[pluginId] || { status: 'idle' as const }
    : { status: 'idle' as const }
  const hadResolvedRouteRef = useRef(false)

  const [selectedNamespace, setSelectedNamespace] = useState<
    string | undefined
  >(() => {
    if (listDefinition?.resource.scope === 'cluster') {
      return undefined
    }
    return localStorage.getItem(getNamespaceStorageKey()) || '_all'
  })

  useEffect(() => {
    if (!pluginId || isLoading || !plugin) {
      return
    }
    void ensurePluginLoaded(pluginId).catch((error) => {
      console.error(`Failed to ensure plugin ${pluginId} is loaded:`, error)
    })
  }, [ensurePluginLoaded, isLoading, plugin, pluginId])

  useEffect(() => {
    if (!listDefinition || listDefinition.resource.scope === 'cluster') {
      setSelectedNamespace(undefined)
      return
    }
    const storedNamespace = localStorage.getItem(getNamespaceStorageKey())
    setSelectedNamespace(storedNamespace || '_all')
  }, [listDefinition])

  useEffect(() => {
    if (plugin && listDefinition && (!name || detailDefinition)) {
      hadResolvedRouteRef.current = true
    }
  }, [detailDefinition, listDefinition, name, plugin])

  useEffect(() => {
    if (isLoading || !hadResolvedRouteRef.current) {
      return
    }
    if (!plugin || !listDefinition || (name && !detailDefinition)) {
      navigate('/', { replace: true })
    }
  }, [detailDefinition, isLoading, listDefinition, name, navigate, plugin])

  const routeBase =
    pluginId && routerName ? `/plugins/${pluginId}/${routerName}` : '/plugins'

  const pageTitle = name
    ? `${name} (${listDefinition?.title || routerName || 'Plugin'})`
    : listDefinition?.title || routerName || 'Plugin'
  usePageTitle(pageTitle)

  const listQuery = useQuery({
    queryKey: [
      'plugin-resource-list',
      pluginId,
      routerName,
      selectedNamespace,
      listDefinition?.resource,
    ],
    queryFn: () =>
      fetchPluginResourceList(
        listDefinition!.resource,
        listDefinition!.resource.scope === 'cluster'
          ? undefined
          : selectedNamespace
      ),
    enabled: Boolean(listDefinition) && !name,
  })

  const detailQuery = useQuery({
    queryKey: [
      'plugin-resource-detail',
      pluginId,
      routerName,
      namespace,
      name,
      detailDefinition?.resource,
    ],
    queryFn: () =>
      getPluginResource(detailDefinition!.resource, {
        name: name!,
        namespace,
      }),
    enabled: Boolean(detailDefinition && name),
  })

  if (!pluginId || !routerName) {
    return <PluginRouteError message="Invalid plugin route." />
  }

  if (isLoading) {
    return <PluginRouteError message="Loading plugin registry..." />
  }

  if (!plugin) {
    return <PluginRouteError message="Plugin not found." />
  }

  if (!name && !listDefinition) {
    return <PluginRouteError message="Plugin list page not found." />
  }

  if (name && (!listDefinition || !detailDefinition)) {
    return <PluginRouteError message="Plugin detail page not found." />
  }

  if (pluginLoadState.status === 'error') {
    return (
      <PluginRouteError
        message={pluginLoadState.error || 'Failed to load plugin module.'}
      />
    )
  }

  if (!name && listDefinition) {
    if (!listDefinition.component) {
      return <PluginRouteError message="Loading plugin page..." />
    }
    const ListComponent = listDefinition.component
    return (
      <PluginRenderBoundary
        key={`${pluginId}:${routerName}:list`}
        pluginId={pluginId}
        routerName={routerName}
        pageType="list"
      >
        <ListComponent
          items={listQuery.data || []}
          isLoading={listQuery.isLoading}
          error={listQuery.error}
          namespace={selectedNamespace}
          setNamespace={(nextNamespace) => {
            localStorage.setItem(getNamespaceStorageKey(), nextNamespace)
            setSelectedNamespace(nextNamespace)
          }}
          refetch={() => listQuery.refetch()}
          routeBase={routeBase}
          resource={listDefinition.resource}
        />
      </PluginRenderBoundary>
    )
  }

  if (!detailDefinition?.component) {
    return <PluginRouteError message="Loading plugin page..." />
  }
  const DetailComponent = detailDefinition!.component
  return (
    <PluginRenderBoundary
      key={`${pluginId}:${routerName}:detail:${namespace || ''}:${name || ''}`}
      pluginId={pluginId}
      routerName={routerName}
      pageType="detail"
    >
      <DetailComponent
        item={(detailQuery.data as object | null) || null}
        isLoading={detailQuery.isLoading}
        error={detailQuery.error}
        refetch={() => detailQuery.refetch()}
        routeBase={routeBase}
        resource={detailDefinition!.resource}
      />
    </PluginRenderBoundary>
  )
}
