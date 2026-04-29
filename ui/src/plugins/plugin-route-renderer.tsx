import { useEffect, useMemo, useState } from 'react'
import { matchPath, useLocation, useSearchParams } from 'react-router-dom'

import { usePluginRegistry, type RuntimePluginRoute } from './plugin-registry'
import type {
  KitePluginModule,
  PluginPageComponent,
  PluginRouteContribution,
} from './types'

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; component: PluginPageComponent }
  | { status: 'error'; error: string }

interface RouteMatch {
  runtimeRoute: RuntimePluginRoute
  params: Record<string, string>
}

const pluginModulePromises = new Map<string, Promise<KitePluginModule>>()

function loadPluginModule(pluginId: string, entry: string) {
  const existing = pluginModulePromises.get(pluginId)
  if (existing) {
    return existing
  }

  const promise = import(/* @vite-ignore */ entry) as Promise<KitePluginModule>
  pluginModulePromises.set(pluginId, promise)
  return promise
}

function isPluginPageComponent(value: unknown): value is PluginPageComponent {
  return typeof value === 'function' || (typeof value === 'object' && !!value)
}

function getRouteMatch(
  routes: RuntimePluginRoute[],
  pathname: string
): RouteMatch | null {
  for (const runtimeRoute of routes) {
    const match = matchPath(
      { path: runtimeRoute.route.path, end: true },
      pathname
    )
    if (!match) {
      continue
    }

    return {
      runtimeRoute,
      params: Object.fromEntries(
        Object.entries(match.params).map(([key, value]) => [key, value || ''])
      ),
    }
  }
  return null
}

function getPluginComponent(
  module: KitePluginModule,
  route: PluginRouteContribution
) {
  const component = module[route.component]
  if (!isPluginPageComponent(component)) {
    throw new Error(`Plugin component "${route.component}" is not exported`)
  }
  return component
}

export function PluginRouteRenderer() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { isLoading, routes } = usePluginRegistry()
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' })

  const routeMatch = useMemo(
    () => getRouteMatch(routes, location.pathname),
    [location.pathname, routes]
  )

  useEffect(() => {
    if (!routeMatch) {
      setLoadState({ status: 'idle' })
      return
    }

    let cancelled = false
    const { plugin, route } = routeMatch.runtimeRoute

    const load = async () => {
      setLoadState({ status: 'loading' })
      try {
        const module = await loadPluginModule(plugin.id, plugin.entry)
        const component = getPluginComponent(module, route)
        if (!cancelled) {
          setLoadState({ status: 'loaded', component })
        }
      } catch (error) {
        if (!cancelled) {
          setLoadState({
            status: 'error',
            error:
              error instanceof Error ? error.message : 'Failed to load plugin',
          })
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [routeMatch])

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading plugin...</div>
    )
  }

  if (!routeMatch) {
    return (
      <div className="text-sm text-muted-foreground">Plugin not found.</div>
    )
  }

  if (loadState.status === 'loading' || loadState.status === 'idle') {
    return (
      <div className="text-sm text-muted-foreground">Loading plugin...</div>
    )
  }

  if (loadState.status === 'error') {
    return <div className="text-sm text-destructive">{loadState.error}</div>
  }

  const Component = loadState.component
  const { plugin, route } = routeMatch.runtimeRoute

  return (
    <Component
      plugin={plugin}
      route={route}
      params={routeMatch.params}
      searchParams={searchParams}
    />
  )
}
