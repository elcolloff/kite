import React from 'react'

import { createHostComponent, getKiteRuntime } from './runtime'
import type {
  DataTableProps,
  NamespaceSelectorProps,
  ResourceDetailShellProps,
  ResourceOverviewProps,
  ResourceTableProps,
  SimpleResourceDetailProps,
  YamlEditorProps,
} from './types'

export function ResourceTable<T = unknown>(
  props: ResourceTableProps<T>
): React.ReactElement | null {
  const Component = getKiteRuntime().resource
    .ResourceTable as React.ComponentType<ResourceTableProps<T>>
  return React.createElement(Component, props)
}

export function DataTable<T = unknown>(
  props: DataTableProps<T>
): React.ReactElement | null {
  const Component = getKiteRuntime().resource
    .DataTable as React.ComponentType<DataTableProps<T>>
  return React.createElement(Component, props)
}

export function YamlEditor<T = unknown>(
  props: YamlEditorProps<T>
): React.ReactElement | null {
  const Component = getKiteRuntime().resource
    .YamlEditor as React.ComponentType<YamlEditorProps<T>>
  return React.createElement(Component, props)
}

export function ResourceDetailShell<T = unknown>(
  props: ResourceDetailShellProps<T>
): React.ReactElement | null {
  const Component = getKiteRuntime().resource
    .ResourceDetailShell as React.ComponentType<ResourceDetailShellProps<T>>
  return React.createElement(Component, props)
}

export const SimpleResourceDetail =
  createHostComponent<SimpleResourceDetailProps>(
    (runtime) => runtime.resource.SimpleResourceDetail
  )

export const ResourceOverview = createHostComponent<ResourceOverviewProps>(
  (runtime) => runtime.resource.ResourceOverview
)

export const NamespaceSelector = createHostComponent<NamespaceSelectorProps>(
  (runtime) => runtime.resource.NamespaceSelector
)

export type {
  DataTableCellContext,
  DataTableColumn,
  DataTableProps,
  NamespaceSelectorProps,
  ResourceDetailShellContext,
  ResourceDetailShellProps,
  ResourceDetailShellTab,
  ResourceMetadata,
  ResourceOverviewField,
  ResourceOverviewProps,
  ResourceTableProps,
  SimpleResourceDetailProps,
  YamlEditorProps,
} from './types'
