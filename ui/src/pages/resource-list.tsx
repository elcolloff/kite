import { usePluginRuntime } from '@/plugins/runtime-context'
import { Navigate, useParams } from 'react-router-dom'

import { ResourceType } from '@/types/api'
import { usePageTitle } from '@/hooks/use-page-title'
import { Card, CardContent } from '@/components/ui/card'

import { ConfigMapListPage } from './configmap-list-page'
import { CRDListPage } from './crd-list-page'
import { CronJobListPage } from './cronjob-list-page'
import { DaemonSetListPage } from './daemonset-list-page'
import { DeploymentListPage } from './deployment-list-page'
import { EventListPage } from './event-list-page'
import { HorizontalPodAutoscalerListPage } from './horizontalpodautoscaler-list-page'
import { IngressListPage } from './ingress-list-page'
import { JobListPage } from './job-list-page'
import { NamespaceListPage } from './namespace-list-page'
import { NodeListPage } from './node-list-page'
import { PodListPage } from './pod-list-page'
import { PVListPage } from './pv-list-page'
import { PVCListPage } from './pvc-list-page'
import { SecretListPage } from './secret-list-page'
import { ServiceListPage } from './service-list-page'
import { SimpleListPage } from './simple-list-page'
import { StatefulSetListPage } from './statefulset-list-page'

export function ResourceList() {
  const { resource } = useParams()
  const { isLoading, listDefinitions } = usePluginRuntime()

  usePageTitle(
    resource
      ? resource.charAt(0).toUpperCase() + resource.slice(1)
      : 'Resources'
  )

  const pluginListDefinition = resource
    ? listDefinitions.find(
        (definition) =>
          definition.resource.source === 'builtin' &&
          definition.resource.resourceType === resource
      )
    : undefined

  switch (resource) {
    case 'pods':
      return <PodListPage />
    case 'namespaces':
      return <NamespaceListPage />
    case 'nodes':
      return <NodeListPage />
    case 'ingresses':
      return <IngressListPage />
    case 'deployments':
      return <DeploymentListPage />
    case 'services':
      return <ServiceListPage />
    case 'jobs':
      return <JobListPage />
    case 'cronjobs':
      return <CronJobListPage />
    case 'statefulsets':
      return <StatefulSetListPage />
    case 'daemonsets':
      return <DaemonSetListPage />
    case 'configmaps':
      return <ConfigMapListPage />
    case 'secrets':
      return <SecretListPage />
    case 'persistentvolumeclaims':
      return <PVCListPage />
    case 'persistentvolumes':
      return <PVListPage />
    case 'crds':
      return <CRDListPage />
    case 'horizontalpodautoscalers':
      return <HorizontalPodAutoscalerListPage />
    case 'events':
      return <EventListPage />
    default:
      if (isLoading) {
        return (
          <div className="p-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  Loading plugin registry...
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }
      if (pluginListDefinition) {
        return (
          <Navigate
            replace
            to={`/plugins/${pluginListDefinition.pluginId}/${pluginListDefinition.routerName}`}
          />
        )
      }
      return <SimpleListPage resourceType={resource as ResourceType} />
  }
}
