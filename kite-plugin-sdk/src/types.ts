type ComponentType<P = unknown> = (props: P) => any
type ReactNode = unknown

export interface PluginManifest {
  schemaVersion: 1
  id: string
  name: string
  version: string
  entry: string
  kite: {
    minVersion: string
  }
  contributions?: PluginContributions
}

export interface PluginContributions {
  routes?: PluginRouteContribution[]
  groups?: PluginSidebarGroup[]
  sidebar?: PluginSidebarItem[]
}

export interface PluginSidebarGroup {
  id: string
  title: string
  order?: number
}

export interface PluginSidebarItem {
  id: string
  title: string
  path: string
  group?: string
  icon?: string
  order?: number
}

export interface PluginRouteContribution {
  id: string
  path: string
  component: string
}

export type KitePluginModule = Record<string, unknown>

export type PluginPageComponent = ComponentType<PluginPageProps>

export interface PluginPageProps {
  plugin: PluginManifest
  route: PluginRouteContribution
  params: Record<string, string>
  searchParams: URLSearchParams
}

export interface ApiRequestOptions extends RequestInit {
  retryOnUnauthorized?: boolean
}

export interface KiteAPI {
  request(url: string, options?: ApiRequestOptions): Promise<Response>
  get<T = unknown>(url: string, options?: ApiRequestOptions): Promise<T>
  post<T = unknown>(
    url: string,
    data?: unknown,
    options?: ApiRequestOptions
  ): Promise<T>
  put<T = unknown>(
    url: string,
    data?: unknown,
    options?: ApiRequestOptions
  ): Promise<T>
  patch<T = unknown>(
    url: string,
    data?: unknown,
    options?: ApiRequestOptions
  ): Promise<T>
  delete<T = unknown>(url: string, options?: ApiRequestOptions): Promise<T>
}

export interface CurrentCluster {
  clusters: unknown[]
  currentCluster: string | null
  setCurrentCluster(clusterName: string): void
  isLoading: boolean
  isSwitching?: boolean
  error: Error | null
}

export interface ResourceQuery<T = unknown> {
  data: T | undefined
  isLoading: boolean
  error: Error | null
  refetch(): Promise<unknown>
}

export interface ResourceListQuery<T = unknown> {
  data: T | undefined
  isLoading: boolean
  error: Error | null
  refetch(): Promise<unknown>
}

export interface ResourceListOptions {
  enabled?: boolean
  limit?: number
  continueToken?: string
  labelSelector?: string
  fieldSelector?: string
  reduce?: boolean
}

export interface ResourceTableProps<T = unknown> {
  resourceName: string
  resourceType?: string
  columns: unknown[]
  clusterScope?: boolean
  searchQueryFilter?: (item: T, query: string) => boolean
  showCreateButton?: boolean
  onCreateClick?: () => void
  extraToolbars?: ReactNode[]
  defaultHiddenColumns?: string[]
}

export interface YamlEditorProps<T = unknown> {
  value: string
  readOnly?: boolean
  showControls?: boolean
  title?: string
  minHeight?: number
  onChange?: (value: string) => void
  onSave?: (value: T) => void
  onCancel?: () => void
  isSaving?: boolean
  className?: string
}

export interface SimpleResourceDetailProps {
  resourceType: string
  resourceLabel?: string
  name: string
  namespace?: string
}

export interface KitePluginRuntime {
  version: string
  api: KiteAPI
  hooks: KitePluginHooks
  components: KitePluginComponents
  navigate(to: string): void
}

export interface KitePluginHooks {
  useCurrentCluster(): CurrentCluster
  useResource<T = unknown>(
    resource: string,
    name: string,
    namespace?: string
  ): ResourceQuery<T>
  useResources<T = unknown>(
    resource: string,
    namespace?: string,
    options?: ResourceListOptions
  ): ResourceListQuery<T>
}

export interface KitePluginComponents {
  ResourceTable: ComponentType<ResourceTableProps<unknown>>
  YamlEditor: ComponentType<YamlEditorProps>
  SimpleResourceDetail: ComponentType<SimpleResourceDetailProps>
}
