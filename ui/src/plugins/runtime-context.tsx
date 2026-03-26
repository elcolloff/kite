/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/contexts/auth-context'

import { withSubPath } from '@/lib/subpath'

import {
  deletePluginResource,
  fetchPluginRegistry,
  getPluginResource,
  patchPluginResource,
  updatePluginResource,
} from './api'
import {
  PluginButton,
  PluginKubeResourceTable,
  PluginLogsViewer,
  PluginPage,
  PluginPanel,
  PluginResourceTable,
  PluginSection,
  PluginSimpleResourceDetail,
  PluginSimpleTable,
  PluginTerminal,
} from './sdk-components'
import type {
  KitePluginHostRuntime,
  KitePluginSetupApi,
  PluginMenuDefinition,
  PluginMenuGroupId,
  PluginRegistryDetailEntry,
  PluginRegistryEntry,
  PluginRegistryListEntry,
  PluginResourceDefinition,
  ResourceDetailRegistration,
  ResourceListRegistration,
} from './types'

const PLUGIN_LOAD_TIMEOUT_MS = 10000

export interface RuntimePluginMenuItem {
  itemId: string
  groupId: PluginMenuGroupId
  title: string
  icon: string
  url: string
  after?: string
}

export interface RuntimeListDefinition {
  pluginId: string
  routerName: string
  resource: PluginResourceDefinition
  title: string
  menu: PluginMenuDefinition
  component?: ResourceListRegistration['component']
}

export interface RuntimeDetailDefinition {
  pluginId: string
  routerName: string
  resource: PluginResourceDefinition
  component?: ResourceDetailRegistration['component']
}

export interface PluginLoadState {
  status: 'idle' | 'loading' | 'loaded' | 'error'
  error?: string
}

interface PluginRuntimeContextValue {
  isLoading: boolean
  plugins: PluginRegistryEntry[]
  listDefinitions: RuntimeListDefinition[]
  detailDefinitions: RuntimeDetailDefinition[]
  pluginMenus: RuntimePluginMenuItem[]
  pluginLoadStates: Record<string, PluginLoadState>
  refreshPlugins: () => Promise<void>
  ensurePluginLoaded: (pluginId: string) => Promise<void>
  getListDefinition: (
    pluginId: string,
    routerName: string
  ) => RuntimeListDefinition | undefined
  getDetailDefinition: (
    pluginId: string,
    routerName: string
  ) => RuntimeDetailDefinition | undefined
}

const PluginRuntimeContext = createContext<
  PluginRuntimeContextValue | undefined
>(undefined)

const DEFAULT_PLUGIN_ICON = 'IconCode'

const getRouteKey = (pluginId: string, routerName: string) =>
  `${pluginId}:${routerName}`

const getPluginUrl = (pluginId: string, routerName: string) =>
  `/plugins/${pluginId}/${routerName}`

const getPluginMenuItemId = (pluginId: string, routerName: string) =>
  `plugin-${pluginId}-${routerName}`

const normalizePluginMenu = (
  pluginId: string,
  routerName: string,
  menu: PluginMenuDefinition
): RuntimePluginMenuItem => ({
  itemId: getPluginMenuItemId(pluginId, routerName),
  groupId: menu.groupId,
  title: menu.title,
  icon: menu.icon || DEFAULT_PLUGIN_ICON,
  url: getPluginUrl(pluginId, routerName),
  after: menu.after,
})

const resolvePluginEntry = (entry: string) => {
  if (/^https?:\/\//.test(entry) || entry.startsWith('//')) {
    return entry
  }
  const normalizedEntry = entry.startsWith('/') ? entry : `/${entry}`
  return new URL(
    withSubPath(normalizedEntry),
    window.location.origin
  ).toString()
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const isComponentLike = (value: unknown) =>
  typeof value === 'function' || (typeof value === 'object' && value !== null)

const isValidResourceDefinition = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const resource = value as Record<string, unknown>
  if (resource.scope !== 'namespaced' && resource.scope !== 'cluster') {
    return false
  }

  if (resource.source === 'builtin') {
    return isNonEmptyString(resource.resourceType)
  }

  if (resource.source === 'crd') {
    return isNonEmptyString(resource.crdName) && isNonEmptyString(resource.kind)
  }

  return false
}

const validateListRegistration = (
  plugin: PluginRegistryEntry,
  definition: ResourceListRegistration<any>
) => {
  if (!isNonEmptyString(definition.routerName)) {
    throw new Error(`Plugin ${plugin.id} registered an invalid routerName`)
  }
  if (!isComponentLike(definition.component)) {
    throw new Error(`Plugin ${plugin.id} registered an invalid list component`)
  }
}

const validateRegistryListEntry = (
  plugin: PluginRegistryEntry,
  definition: PluginRegistryListEntry
) => {
  if (!isNonEmptyString(definition.routerName)) {
    throw new Error(`Plugin ${plugin.id} registered an invalid routerName`)
  }
  if (!isNonEmptyString(definition.title)) {
    throw new Error(`Plugin ${plugin.id} registered an invalid list title`)
  }
  if (!isValidResourceDefinition(definition.resource)) {
    throw new Error(`Plugin ${plugin.id} registered an invalid list resource`)
  }
  if (!definition.menu || definition.menu.groupId !== 'plugin') {
    throw new Error(
      `Plugin ${plugin.id} can only register menus in the plugin group`
    )
  }
  if (!isNonEmptyString(definition.menu.title)) {
    throw new Error(`Plugin ${plugin.id} registered an invalid menu title`)
  }
}

const validateDetailRegistration = (
  plugin: PluginRegistryEntry,
  definition: ResourceDetailRegistration<any>
) => {
  if (!isNonEmptyString(definition.routerName)) {
    throw new Error(`Plugin ${plugin.id} registered an invalid routerName`)
  }
  if (!isComponentLike(definition.component)) {
    throw new Error(
      `Plugin ${plugin.id} registered an invalid detail component`
    )
  }
}

const validateRegistryDetailEntry = (
  plugin: PluginRegistryEntry,
  definition: PluginRegistryDetailEntry
) => {
  if (!isNonEmptyString(definition.routerName)) {
    throw new Error(`Plugin ${plugin.id} registered an invalid routerName`)
  }
  if (!isValidResourceDefinition(definition.resource)) {
    throw new Error(`Plugin ${plugin.id} registered an invalid detail resource`)
  }
}

const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string) =>
  new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)

    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timer)
        reject(error)
      }
    )
  })

const pluginHostRuntime: KitePluginHostRuntime = {
  api: {
    getResource: getPluginResource,
    updateResource: updatePluginResource,
    patchResource: patchPluginResource,
    deleteResource: deletePluginResource,
  },
  components: {
    ResourceTable: PluginResourceTable,
    SimpleTable: PluginSimpleTable,
    SimpleResourceDetail: PluginSimpleResourceDetail,
    KubeResourceTable: PluginKubeResourceTable,
    LogsViewer: PluginLogsViewer,
    Terminal: PluginTerminal,
    Page: PluginPage,
    Section: PluginSection,
    Button: PluginButton,
    Panel: PluginPanel,
  },
}

export function PluginRuntimeProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [plugins, setPlugins] = useState<PluginRegistryEntry[]>([])
  const [listDefinitions, setListDefinitions] = useState<
    RuntimeListDefinition[]
  >([])
  const [detailDefinitions, setDetailDefinitions] = useState<
    RuntimeDetailDefinition[]
  >([])
  const [pluginLoadStates, setPluginLoadStates] = useState<
    Record<string, PluginLoadState>
  >({})
  const pluginLoadPromisesRef = useRef(new Map<string, Promise<void>>())
  const registryGenerationRef = useRef(0)

  const clearPluginRuntime = useCallback(() => {
    registryGenerationRef.current += 1
    pluginLoadPromisesRef.current.clear()
    setPlugins([])
    setListDefinitions([])
    setDetailDefinitions([])
    setPluginLoadStates({})
  }, [])

  const applyRegistryEntries = useCallback(
    (registryPlugins: PluginRegistryEntry[]) => {
      const enabledPlugins = registryPlugins.filter((plugin) => plugin.enabled)
      const nextListDefs = new Map<string, RuntimeListDefinition>()
      const nextDetailDefs = new Map<string, RuntimeDetailDefinition>()

      for (const plugin of enabledPlugins) {
        for (const definition of plugin.lists || []) {
          try {
            validateRegistryListEntry(plugin, definition)
            const routeKey = getRouteKey(plugin.id, definition.routerName)
            if (nextListDefs.has(routeKey)) {
              throw new Error(`Duplicate list registration: ${routeKey}`)
            }
            nextListDefs.set(routeKey, {
              pluginId: plugin.id,
              routerName: definition.routerName,
              resource: definition.resource,
              title: definition.title,
              menu: definition.menu,
            })
          } catch (error) {
            console.error(`Invalid plugin list manifest ${plugin.id}:`, error)
          }
        }

        for (const definition of plugin.details || []) {
          try {
            validateRegistryDetailEntry(plugin, definition)
            const routeKey = getRouteKey(plugin.id, definition.routerName)
            if (nextDetailDefs.has(routeKey)) {
              throw new Error(`Duplicate detail registration: ${routeKey}`)
            }
            nextDetailDefs.set(routeKey, {
              pluginId: plugin.id,
              routerName: definition.routerName,
              resource: definition.resource,
            })
          } catch (error) {
            console.error(`Invalid plugin detail manifest ${plugin.id}:`, error)
          }
        }
      }

      registryGenerationRef.current += 1
      pluginLoadPromisesRef.current.clear()
      setPlugins(enabledPlugins)
      setListDefinitions(Array.from(nextListDefs.values()))
      setDetailDefinitions(Array.from(nextDetailDefs.values()))
      setPluginLoadStates(
        Object.fromEntries(
          enabledPlugins.map((plugin) => [plugin.id, { status: 'idle' }])
        )
      )
    },
    []
  )

  const refreshPlugins = useCallback(async () => {
    if (!user) {
      clearPluginRuntime()
      return
    }

    setIsLoading(true)
    try {
      const payload = await fetchPluginRegistry()
      applyRegistryEntries(payload.plugins || [])
    } catch (error) {
      console.error('Failed to refresh plugins:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [applyRegistryEntries, clearPluginRuntime, user])

  useEffect(() => {
    window.__KITE_PLUGIN_HOST__ = pluginHostRuntime
    return () => {
      delete window.__KITE_PLUGIN_HOST__
    }
  }, [])

  useEffect(() => {
    if (isAuthLoading) {
      return
    }

    if (!user) {
      clearPluginRuntime()
      return
    }

    let cancelled = false

    const loadPlugins = async () => {
      setIsLoading(true)
      try {
        const payload = await fetchPluginRegistry()

        if (cancelled) {
          return
        }

        applyRegistryEntries(payload.plugins || [])
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to initialize plugins:', error)
          clearPluginRuntime()
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadPlugins()

    return () => {
      cancelled = true
    }
  }, [applyRegistryEntries, clearPluginRuntime, isAuthLoading, user])

  const ensurePluginLoaded = useCallback(
    async (pluginId: string) => {
      const plugin = plugins.find((item) => item.id === pluginId)
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`)
      }

      const currentState = pluginLoadStates[pluginId]
      if (currentState?.status === 'loaded') {
        return
      }

      const existingPromise = pluginLoadPromisesRef.current.get(pluginId)
      if (existingPromise) {
        return existingPromise
      }

      const promise = (async () => {
        const generation = registryGenerationRef.current
        setPluginLoadStates((prev) => ({
          ...prev,
          [pluginId]: { status: 'loading' },
        }))

        try {
          const listManifestDefinitions = listDefinitions.filter(
            (definition) => definition.pluginId === pluginId
          )
          const detailManifestDefinitions = detailDefinitions.filter(
            (definition) => definition.pluginId === pluginId
          )
          const listManifestKeys = new Set(
            listManifestDefinitions.map((definition) =>
              getRouteKey(definition.pluginId, definition.routerName)
            )
          )
          const detailManifestKeys = new Set(
            detailManifestDefinitions.map((definition) =>
              getRouteKey(definition.pluginId, definition.routerName)
            )
          )
          const listManifestMap = new Map(
            listManifestDefinitions.map((definition) => [
              getRouteKey(definition.pluginId, definition.routerName),
              definition,
            ])
          )
          const detailManifestMap = new Map(
            detailManifestDefinitions.map((definition) => [
              getRouteKey(definition.pluginId, definition.routerName),
              definition,
            ])
          )
          const nextListDefs = new Map<
            string,
            ResourceListRegistration<any>['component']
          >()
          const nextDetailDefs = new Map<
            string,
            ResourceDetailRegistration<any>['component']
          >()
          const module = (await withTimeout(
            import(
              /* @vite-ignore */ resolvePluginEntry(plugin.entry)
            ) as Promise<{
              default?: (api: KitePluginSetupApi) => void | Promise<void>
            }>,
            PLUGIN_LOAD_TIMEOUT_MS,
            `Plugin ${plugin.id} import`
          )) as {
            default?: (api: KitePluginSetupApi) => void | Promise<void>
          }

          if (typeof module.default !== 'function') {
            throw new Error(`Plugin ${plugin.id} has no default setup export`)
          }

          const setupApi: KitePluginSetupApi = {
            registerResourceList: (definition) => {
              const routeKey = getRouteKey(plugin.id, definition.routerName)
              const manifestDefinition = listManifestMap.get(routeKey)
              if (!manifestDefinition) {
                throw new Error(
                  `Plugin ${plugin.id} registered a list route that is not declared in registry: ${definition.routerName}`
                )
              }
              validateListRegistration(plugin, definition)
              if (!listManifestKeys.has(routeKey)) {
                throw new Error(
                  `Plugin ${plugin.id} registered a list route that is not declared in registry: ${definition.routerName}`
                )
              }
              if (nextListDefs.has(routeKey)) {
                throw new Error(`Duplicate list registration: ${routeKey}`)
              }
              nextListDefs.set(routeKey, definition.component)
            },
            registerResourceDetail: (definition) => {
              const routeKey = getRouteKey(plugin.id, definition.routerName)
              const manifestDefinition = detailManifestMap.get(routeKey)
              if (!manifestDefinition) {
                throw new Error(
                  `Plugin ${plugin.id} registered a detail route that is not declared in registry: ${definition.routerName}`
                )
              }
              validateDetailRegistration(plugin, definition)
              if (!detailManifestKeys.has(routeKey)) {
                throw new Error(
                  `Plugin ${plugin.id} registered a detail route that is not declared in registry: ${definition.routerName}`
                )
              }
              if (nextDetailDefs.has(routeKey)) {
                throw new Error(`Duplicate detail registration: ${routeKey}`)
              }
              nextDetailDefs.set(routeKey, definition.component)
            },
          }

          await withTimeout(
            Promise.resolve(module.default(setupApi)),
            PLUGIN_LOAD_TIMEOUT_MS,
            `Plugin ${plugin.id} setup`
          )

          for (const routeKey of listManifestKeys) {
            if (!nextListDefs.has(routeKey)) {
              throw new Error(
                `Plugin ${plugin.id} did not register list route declared in registry: ${routeKey}`
              )
            }
          }

          for (const routeKey of detailManifestKeys) {
            if (!nextDetailDefs.has(routeKey)) {
              throw new Error(
                `Plugin ${plugin.id} did not register detail route declared in registry: ${routeKey}`
              )
            }
          }

          if (generation !== registryGenerationRef.current) {
            return
          }

          setListDefinitions((prev) =>
            prev.map((definition) => {
              const routeKey = getRouteKey(
                definition.pluginId,
                definition.routerName
              )
              const component = nextListDefs.get(routeKey)
              if (!component) {
                return definition
              }
              return {
                ...definition,
                component,
              }
            })
          )
          if (generation !== registryGenerationRef.current) {
            return
          }
          setDetailDefinitions((prev) =>
            prev.map((definition) => {
              const routeKey = getRouteKey(
                definition.pluginId,
                definition.routerName
              )
              const component = nextDetailDefs.get(routeKey)
              if (!component) {
                return definition
              }
              return {
                ...definition,
                component,
              }
            })
          )
          if (generation !== registryGenerationRef.current) {
            return
          }
          setPluginLoadStates((prev) => ({
            ...prev,
            [pluginId]: { status: 'loaded' },
          }))
        } catch (error) {
          if (generation !== registryGenerationRef.current) {
            return
          }
          const message =
            error instanceof Error ? error.message : 'Unknown plugin load error'
          setPluginLoadStates((prev) => ({
            ...prev,
            [pluginId]: { status: 'error', error: message },
          }))
          throw error
        } finally {
          pluginLoadPromisesRef.current.delete(pluginId)
        }
      })()

      pluginLoadPromisesRef.current.set(pluginId, promise)
      return promise
    },
    [detailDefinitions, listDefinitions, pluginLoadStates, plugins]
  )

  const pluginMenus = useMemo(
    () =>
      listDefinitions.map((definition) =>
        normalizePluginMenu(
          definition.pluginId,
          definition.routerName,
          definition.menu
        )
      ),
    [listDefinitions]
  )

  const value = useMemo<PluginRuntimeContextValue>(
    () => ({
      isLoading,
      plugins,
      listDefinitions,
      detailDefinitions,
      pluginMenus,
      pluginLoadStates,
      refreshPlugins,
      ensurePluginLoaded,
      getListDefinition: (pluginId, routerName) =>
        listDefinitions.find(
          (definition) =>
            definition.pluginId === pluginId &&
            definition.routerName === routerName
        ),
      getDetailDefinition: (pluginId, routerName) =>
        detailDefinitions.find(
          (definition) =>
            definition.pluginId === pluginId &&
            definition.routerName === routerName
        ),
    }),
    [
      detailDefinitions,
      ensurePluginLoaded,
      isLoading,
      listDefinitions,
      pluginLoadStates,
      pluginMenus,
      plugins,
      refreshPlugins,
    ]
  )

  return (
    <PluginRuntimeContext.Provider value={value}>
      {children}
    </PluginRuntimeContext.Provider>
  )
}

export function usePluginRuntime() {
  const context = useContext(PluginRuntimeContext)
  if (!context) {
    throw new Error(
      'usePluginRuntime must be used within a PluginRuntimeProvider'
    )
  }
  return context
}
