import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/contexts/auth-context'

import { fetchPlugins } from './api'
import type {
  PluginManifest,
  PluginRouteContribution,
  PluginSidebarGroup,
  PluginSidebarItem,
} from './types'

export interface RuntimePluginRoute {
  plugin: PluginManifest
  route: PluginRouteContribution
}

export interface RuntimePluginSidebarItem extends PluginSidebarItem {
  pluginId: string
  itemId: string
}

export interface RuntimePluginSidebarGroup extends PluginSidebarGroup {
  pluginId: string
  groupId: string
}

interface PluginRegistryContextValue {
  isLoading: boolean
  plugins: PluginManifest[]
  routes: RuntimePluginRoute[]
  sidebarGroups: RuntimePluginSidebarGroup[]
  sidebarItems: RuntimePluginSidebarItem[]
  refreshPlugins(): Promise<void>
}

const defaultPluginRegistry: PluginRegistryContextValue = {
  isLoading: false,
  plugins: [],
  routes: [],
  sidebarGroups: [],
  sidebarItems: [],
  refreshPlugins: async () => {},
}

const PluginRegistryContext = createContext<PluginRegistryContextValue>(
  defaultPluginRegistry
)

export function PluginRegistryProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [plugins, setPlugins] = useState<PluginManifest[]>([])

  const clearPlugins = useCallback(() => {
    setPlugins([])
  }, [])

  const refreshPlugins = useCallback(async () => {
    if (!user) {
      clearPlugins()
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const payload = await fetchPlugins()
      setPlugins(payload.plugins || [])
    } catch (error) {
      console.error('Failed to load plugins:', error)
      clearPlugins()
    } finally {
      setIsLoading(false)
    }
  }, [clearPlugins, user])

  useEffect(() => {
    if (isAuthLoading) {
      return
    }

    void refreshPlugins()
  }, [isAuthLoading, refreshPlugins])

  const routes = useMemo(
    () =>
      plugins.flatMap((plugin) =>
        (plugin.contributions?.routes || []).map((route) => ({
          plugin,
          route,
        }))
      ),
    [plugins]
  )

  const sidebarItems = useMemo(
    () =>
      plugins.flatMap((plugin) =>
        (plugin.contributions?.sidebar || []).map((item) => ({
          ...item,
          pluginId: plugin.id,
          itemId: `${plugin.id}:${item.id}`,
        }))
      ),
    [plugins]
  )

  const sidebarGroups = useMemo(
    () =>
      plugins.flatMap((plugin) =>
        (plugin.contributions?.groups || []).map((group) => ({
          ...group,
          pluginId: plugin.id,
          groupId: `${plugin.id}:${group.id}`,
        }))
      ),
    [plugins]
  )

  const value = useMemo<PluginRegistryContextValue>(
    () => ({
      isLoading,
      plugins,
      routes,
      sidebarGroups,
      sidebarItems,
      refreshPlugins,
    }),
    [isLoading, plugins, refreshPlugins, routes, sidebarGroups, sidebarItems]
  )

  return (
    <PluginRegistryContext.Provider value={value}>
      {children}
    </PluginRegistryContext.Provider>
  )
}

export function usePluginRegistry() {
  return useContext(PluginRegistryContext)
}
