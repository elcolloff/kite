import { createElement, useMemo, useState } from 'react'
import { SimpleResourceDetail } from '@/pages/simple-resource-detail'
import { RefreshCw, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LogViewer } from '@/components/log-viewer'
import { ResourceTable } from '@/components/resource-table'
import { NamespaceSelector } from '@/components/selector/namespace-selector'
import { Terminal } from '@/components/terminal'

import type {
  ButtonProps,
  KubeResourceTableProps,
  PageProps,
  PanelProps,
  ResourceTableProps,
  SectionProps,
  SimpleResourceDetailProps,
  SimpleTableProps,
} from './types'

export function PluginPage({
  title,
  description,
  actions,
  children,
}: PageProps) {
  return (
    <div className="space-y-4">
      {(title || description || actions) && (
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            {title ? <h1 className="text-2xl font-semibold">{title}</h1> : null}
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap gap-2">{actions}</div>
          ) : null}
        </div>
      )}
      {children}
    </div>
  )
}

export function PluginSection({ title, description, children }: SectionProps) {
  return (
    <Card>
      {(title || description) && (
        <CardHeader>
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function PluginPanel(props: PanelProps) {
  const { className, ...rest } = props
  return (
    <div
      className={['rounded-lg border p-4', className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

export function PluginButton(props: ButtonProps) {
  return <Button {...props} />
}

export function PluginSimpleTable<T>(props: SimpleTableProps<T>) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {props.columns.map((column, index) => (
              <TableHead
                key={`${column.header}-${index}`}
                className={
                  column.align === 'right'
                    ? 'text-right'
                    : column.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                }
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.data.length === 0 ? (
            <TableRow>
              <TableCell
                className="text-center text-muted-foreground"
                colSpan={props.columns.length}
              >
                {props.emptyMessage || 'No data available'}
              </TableCell>
            </TableRow>
          ) : (
            props.data.map((item, rowIndex) => (
              <TableRow key={`${rowIndex}`}>
                {props.columns.map((column, columnIndex) => (
                  <TableCell
                    key={`${column.header}-${columnIndex}`}
                    className={
                      column.align === 'right'
                        ? 'text-right'
                        : column.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                    }
                  >
                    {column.cell(column.accessor(item), item)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export function PluginSimpleResourceDetail(props: SimpleResourceDetailProps) {
  return (
    <SimpleResourceDetail
      resourceType={props.resourceType as never}
      name={props.name}
      namespace={props.namespace}
    />
  )
}

export function PluginKubeResourceTable<T>(props: KubeResourceTableProps<T>) {
  return createElement(ResourceTable as never, props as never)
}

export function PluginResourceTable<T>({
  title,
  items,
  columns,
  isLoading = false,
  error,
  emptyMessage = 'No data available',
  searchPlaceholder = 'Search...',
  searchText,
  getRowKey,
  onRefresh,
  toolbar,
  namespace,
  setNamespace,
  clusterScope = false,
}: ResourceTableProps<T>) {
  const [query, setQuery] = useState('')

  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return items
    }
    const normalizedQuery = query.trim().toLowerCase()
    return items.filter((item, rowIndex) => {
      const source = searchText
        ? searchText(item)
        : columns
            .map((column) => {
              const value = column.render(item, rowIndex)
              return typeof value === 'string' ? value : ''
            })
            .join(' ')
      return source.toLowerCase().includes(normalizedQuery)
    })
  }, [columns, items, query, searchText])

  return (
    <PluginSection
      title={title}
      description={
        !clusterScope && namespace
          ? `Namespace: ${namespace === '_all' ? 'All Namespaces' : namespace}`
          : undefined
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {!clusterScope && setNamespace ? (
              <NamespaceSelector
                selectedNamespace={namespace}
                handleNamespaceChange={setNamespace}
                showAll={true}
              />
            ) : null}
            {toolbar}
          </div>
          <div className="flex items-center gap-2">
            {onRefresh ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onRefresh()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            ) : null}
            <div className="relative min-w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        </div>

        {error ? (
          <PluginPanel>
            <div className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to load data'}
            </div>
          </PluginPanel>
        ) : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column, index) => (
                  <TableHead
                    key={`${column.header}-${index}`}
                    className={
                      column.align === 'right'
                        ? 'text-right'
                        : column.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                    }
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    className="text-center text-muted-foreground"
                    colSpan={columns.length}
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="text-center text-muted-foreground"
                    colSpan={columns.length}
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item, rowIndex) => (
                  <TableRow
                    key={getRowKey ? getRowKey(item, rowIndex) : `${rowIndex}`}
                  >
                    {columns.map((column, columnIndex) => (
                      <TableCell
                        key={`${column.header}-${columnIndex}`}
                        className={
                          column.align === 'right'
                            ? 'text-right'
                            : column.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                        }
                      >
                        {column.render(item, rowIndex)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PluginSection>
  )
}

export { LogViewer as PluginLogsViewer, Terminal as PluginTerminal }
