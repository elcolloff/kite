import type {
  ButtonHTMLAttributes,
  ComponentType,
  HTMLAttributes,
  ReactNode,
} from 'react'

export type PluginMenuGroupId = 'plugin'

export type PluginResourceScope = 'namespaced' | 'cluster'

export interface BuiltinPluginResource {
  source: 'builtin'
  resourceType: string
  scope: PluginResourceScope
}

export interface CRDPluginResource {
  source: 'crd'
  crdName: string
  kind: string
  scope: PluginResourceScope
}

export type PluginResourceDefinition =
  | BuiltinPluginResource
  | CRDPluginResource

export interface PluginMenuDefinition {
  groupId: PluginMenuGroupId
  title: string
  icon?: string
  after?: string
}

export interface PluginRegistryListEntry {
  routerName: string
  title: string
  resource: PluginResourceDefinition
  menu: PluginMenuDefinition
}

export interface PluginRegistryDetailEntry {
  routerName: string
  resource: PluginResourceDefinition
}

export interface PluginRegistryEntry {
  id: string
  name: string
  version: string
  enabled: boolean
  entry: string
  lists?: PluginRegistryListEntry[]
  details?: PluginRegistryDetailEntry[]
}

export interface PluginManifest {
  schemaVersion: string
  id: string
  name: string
  version: string
  sdkVersionRange: string
  hostVersionRange: string
  entry: string
  lists?: PluginRegistryListEntry[]
  details?: PluginRegistryDetailEntry[]
}

export type InstalledPluginStatus = 'enabled' | 'disabled' | 'failed'

export interface InstalledPlugin {
  id: number
  pluginId: string
  name: string
  version: string
  enabled: boolean
  status: InstalledPluginStatus
  manifestUrl: string
  assetUrl: string
  sdkVersionRange: string
  hostVersionRange: string
  errorMessage?: string
  installSource: string
  manifest?: PluginManifest
  createdAt: string
  updatedAt: string
}

export interface PluginOperationParams {
  name: string
  namespace?: string
}

export interface ResourceTableColumn<T> {
  header: string
  render: (item: T, index: number) => ReactNode
  align?: 'left' | 'center' | 'right'
}

export interface ResourceTableProps<T> {
  title?: ReactNode
  items: T[]
  columns: ResourceTableColumn<T>[]
  isLoading?: boolean
  error?: unknown
  emptyMessage?: string
  searchPlaceholder?: string
  searchText?: (item: T) => string
  getRowKey?: (item: T, index: number) => string
  onRefresh?: () => void | Promise<void>
  toolbar?: ReactNode
  namespace?: string
  setNamespace?: (namespace: string) => void
  clusterScope?: boolean
}

export interface SimpleTableColumn<T> {
  header: string
  accessor: (item: T) => unknown
  cell: (value: unknown, item: T) => ReactNode
  align?: 'left' | 'center' | 'right'
}

export interface SimpleTableProps<T> {
  data: T[]
  columns: SimpleTableColumn<T>[]
  emptyMessage?: string
}

export interface PageProps {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}

export interface SectionProps {
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export type PanelProps = HTMLAttributes<HTMLDivElement>

export interface SimpleResourceDetailProps {
  resourceType: string
  name: string
  namespace?: string
}

export interface KubeResourceTableProps<T> {
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

export interface PluginListPageProps<T = unknown> {
  items: T[]
  isLoading: boolean
  error?: unknown
  namespace?: string
  setNamespace?: (namespace: string) => void
  refetch: () => Promise<unknown> | unknown
  routeBase: string
  resource: PluginResourceDefinition
}

export interface PluginDetailPageProps<T = unknown> {
  item: T | null
  isLoading: boolean
  error?: unknown
  refetch: () => Promise<unknown> | unknown
  routeBase: string
  resource: PluginResourceDefinition
}

export interface ResourceListRegistration<T = unknown> {
  routerName: string
  component: ComponentType<PluginListPageProps<T>>
}

export interface ResourceDetailRegistration<T = unknown> {
  routerName: string
  component: ComponentType<PluginDetailPageProps<T>>
}

export interface KitePluginSetupApi {
  registerResourceList: <T = unknown>(
    def: ResourceListRegistration<T>
  ) => void
  registerResourceDetail: <T = unknown>(
    def: ResourceDetailRegistration<T>
  ) => void
}

export interface LogsViewerProps {
  namespace: string
  podName?: string
  pods?: Array<{ metadata?: { name?: string } }>
  labelSelector?: string
  containers?: Array<{ name: string }>
  initContainers?: Array<{ name: string }>
  onClose?: () => void
}

export interface TerminalProps {
  type?: 'node' | 'pod' | 'kubectl'
  namespace?: string
  podName?: string
  nodeName?: string
  pods?: Array<{ metadata?: { name?: string } }>
  containers?: Array<{ name: string }>
  initContainers?: Array<{ name: string }>
  embedded?: boolean
}

export interface KitePluginHostAPI {
  getResource: <T = unknown>(
    resource: PluginResourceDefinition,
    params: PluginOperationParams
  ) => Promise<T>
  updateResource: <T = unknown>(
    resource: PluginResourceDefinition,
    params: PluginOperationParams,
    body: T
  ) => Promise<void>
  patchResource: <T = unknown>(
    resource: PluginResourceDefinition,
    params: PluginOperationParams,
    body: T
  ) => Promise<void>
  deleteResource: (
    resource: PluginResourceDefinition,
    params: PluginOperationParams,
    options?: { force?: boolean; wait?: boolean }
  ) => Promise<void>
}

export interface KitePluginHostComponents {
  ResourceTable: ComponentType<ResourceTableProps<unknown>>
  SimpleTable: ComponentType<SimpleTableProps<unknown>>
  SimpleResourceDetail: ComponentType<SimpleResourceDetailProps>
  KubeResourceTable: ComponentType<KubeResourceTableProps<unknown>>
  LogsViewer: ComponentType<LogsViewerProps>
  Terminal: ComponentType<TerminalProps>
  Page: ComponentType<PageProps>
  Section: ComponentType<SectionProps>
  Button: ComponentType<ButtonProps>
  Panel: ComponentType<PanelProps>
}

export interface KitePluginHostRuntime {
  api: KitePluginHostAPI
  components: KitePluginHostComponents
}
