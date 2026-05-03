import type {
  ComponentPropsWithoutRef,
  ComponentType,
  ReactNode,
} from 'react'

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

export interface ResourceMetadata {
  name?: string
  namespace?: string
  creationTimestamp?: string
  uid?: string
  resourceVersion?: string
  labels?: Record<string, string>
  annotations?: Record<string, string>
  ownerReferences?: Array<{
    apiVersion?: string
    kind?: string
    name?: string
    uid?: string
  }>
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

export interface DataTableCellContext<T> {
  row: T
  value: unknown
  index: number
}

export interface DataTableColumn<T = unknown> {
  id?: string
  header: ReactNode
  accessorKey?: keyof T & string
  accessorFn?: (row: T) => unknown
  cell?: (context: DataTableCellContext<T>) => ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
  headerClassName?: string
  enableSorting?: boolean
}

export interface DataTableProps<T = unknown> {
  data: T[]
  columns: DataTableColumn<T>[]
  isLoading?: boolean
  rowKey?: (row: T, index: number) => string
  emptyText?: ReactNode
  loadingText?: ReactNode
  emptyState?: ReactNode
  totalRowCount?: number
  filteredRowCount?: number
  searchQuery?: string
  maxBodyHeightClassName?: string
  fitViewportHeight?: boolean
  className?: string
}

export interface YamlEditorProps<T = unknown> {
  value: string
  readOnly?: boolean
  showControls?: boolean
  title?: string
  minHeight?: number
  multipleDocuments?: boolean
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

export interface ResourceDetailShellContext<T = unknown> {
  resource: T
  yamlContent: string
  setYamlContent(value: string): void
  refreshKey: number
  isSavingYaml: boolean
  onRefresh(): Promise<unknown>
}

export interface ResourceDetailShellTab<T = unknown> {
  value: string
  label: ReactNode
  content: ReactNode | ((context: ResourceDetailShellContext<T>) => ReactNode)
}

export interface ResourceDetailShellProps<T = unknown> {
  resourceType?: string
  resourceLabel: string
  name: string
  namespace?: string
  data: T | undefined
  isLoading: boolean
  error: Error | unknown | null
  onRefresh(): Promise<unknown>
  onSaveYaml?: (content: T) => Promise<unknown>
  overview: ReactNode | ((context: ResourceDetailShellContext<T>) => ReactNode)
  preYamlTabs?: ResourceDetailShellTab<T>[]
  extraTabs?: ResourceDetailShellTab<T>[]
  headerActions?: ReactNode
  yamlToolbar?: ReactNode | ((context: ResourceDetailShellContext<T>) => ReactNode)
  loadingMessage?: string
  yamlTabLabel?: ReactNode
  showDelete?: boolean
}

export interface ResourceOverviewField {
  label: ReactNode
  value: ReactNode
  mono?: boolean
  truncate?: boolean
}

export interface ResourceOverviewProps {
  resourceType: string
  name: string
  namespace?: string
  metadata?: ResourceMetadata
  fields?: ResourceOverviewField[]
  children?: ReactNode
}

export interface ResponsiveTabItem {
  value: string
  label: ReactNode
  content: ReactNode
}

export interface ResponsiveTabsProps {
  tabs: ResponsiveTabItem[]
  className?: string
  stickyHeader?: ReactNode
  stickyHeaderClassName?: string
  tabsListClassName?: string
}

export type BadgeProps = ComponentPropsWithoutRef<'span'> & {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  asChild?: boolean
}

export type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}

export type InputProps = ComponentPropsWithoutRef<'input'>
export type TextareaProps = ComponentPropsWithoutRef<'textarea'>
export type TableProps = ComponentPropsWithoutRef<'table'>
export type TableHeaderProps = ComponentPropsWithoutRef<'thead'>
export type TableBodyProps = ComponentPropsWithoutRef<'tbody'>
export type TableFooterProps = ComponentPropsWithoutRef<'tfoot'>
export type TableRowProps = ComponentPropsWithoutRef<'tr'>
export type TableHeadProps = ComponentPropsWithoutRef<'th'>
export type TableCellProps = ComponentPropsWithoutRef<'td'>
export type TableCaptionProps = ComponentPropsWithoutRef<'caption'>
export type CardProps = ComponentPropsWithoutRef<'div'>
export type CardHeaderProps = ComponentPropsWithoutRef<'div'>
export type CardTitleProps = ComponentPropsWithoutRef<'div'>
export type CardDescriptionProps = ComponentPropsWithoutRef<'div'>
export type CardContentProps = ComponentPropsWithoutRef<'div'>
export type CardFooterProps = ComponentPropsWithoutRef<'div'>
export type AlertProps = ComponentPropsWithoutRef<'div'> & {
  variant?: 'default' | 'destructive'
}
export type AlertTitleProps = ComponentPropsWithoutRef<'h5'>
export type AlertDescriptionProps = ComponentPropsWithoutRef<'div'>
export type SkeletonProps = ComponentPropsWithoutRef<'div'>
export type SeparatorProps = ComponentPropsWithoutRef<'div'> & {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
}

export interface NamespaceSelectorProps {
  selectedNamespace?: string
  handleNamespaceChange(namespace: string): void
  showAll?: boolean
}

export interface KitePluginRuntime {
  version: string
  api: KiteAPI
  hooks: KitePluginHooks
  ui: KitePluginUI
  resource: KitePluginResource
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

export interface KitePluginUI {
  ResponsiveTabs: ComponentType<ResponsiveTabsProps>
  Badge: ComponentType<BadgeProps>
  Button: ComponentType<ButtonProps>
  Input: ComponentType<InputProps>
  Textarea: ComponentType<TextareaProps>
  Table: ComponentType<TableProps>
  TableHeader: ComponentType<TableHeaderProps>
  TableBody: ComponentType<TableBodyProps>
  TableFooter: ComponentType<TableFooterProps>
  TableRow: ComponentType<TableRowProps>
  TableHead: ComponentType<TableHeadProps>
  TableCell: ComponentType<TableCellProps>
  TableCaption: ComponentType<TableCaptionProps>
  Card: ComponentType<CardProps>
  CardHeader: ComponentType<CardHeaderProps>
  CardTitle: ComponentType<CardTitleProps>
  CardDescription: ComponentType<CardDescriptionProps>
  CardContent: ComponentType<CardContentProps>
  CardFooter: ComponentType<CardFooterProps>
  Alert: ComponentType<AlertProps>
  AlertTitle: ComponentType<AlertTitleProps>
  AlertDescription: ComponentType<AlertDescriptionProps>
  Skeleton: ComponentType<SkeletonProps>
  Separator: ComponentType<SeparatorProps>
}

export interface KitePluginResource {
  ResourceTable: ComponentType<ResourceTableProps<unknown>>
  DataTable: ComponentType<DataTableProps<unknown>>
  YamlEditor: ComponentType<YamlEditorProps>
  SimpleResourceDetail: ComponentType<SimpleResourceDetailProps>
  ResourceDetailShell: ComponentType<ResourceDetailShellProps>
  ResourceOverview: ComponentType<ResourceOverviewProps>
  NamespaceSelector: ComponentType<NamespaceSelectorProps>
}
