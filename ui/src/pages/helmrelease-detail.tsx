import { useMemo, useState } from 'react'
import * as yaml from 'js-yaml'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { HelmRelease, HelmReleaseResource } from '@/types/api'
import { rollbackHelmRelease, upgradeHelmRelease, useResource } from '@/lib/api'
import { translateError } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { SimpleTable } from '@/components/simple-table'
import { YamlEditor } from '@/components/yaml-editor'

import {
  ResourceDetailShell,
  type ResourceDetailShellTab,
} from './resource-detail-shell'

function TextCard({ title, content }: { title: string; content?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {content ? (
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
            {content}
          </pre>
        ) : (
          <div className="text-sm text-muted-foreground">No data</div>
        )}
      </CardContent>
    </Card>
  )
}

function ResourcesTable({ resources }: { resources?: HelmReleaseResource[] }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('common.fields.resources')}</CardTitle>
      </CardHeader>
      <CardContent>
        <SimpleTable
          data={resources || []}
          emptyMessage={t('helm.messages.noResources')}
          columns={[
            {
              header: 'Kind',
              accessor: (item) => item.kind,
              cell: (value) => value as string,
              align: 'left',
            },
            {
              header: t('common.fields.name'),
              accessor: (item) => item.name,
              cell: (value) => value as string,
              align: 'left',
            },
            {
              header: t('common.fields.namespace'),
              accessor: (item) => item.namespace || '-',
              cell: (value) => value as string,
              align: 'left',
            },
            {
              header: 'API Version',
              accessor: (item) => item.apiVersion,
              cell: (value) => value as string,
              align: 'left',
            },
            {
              header: t('common.fields.status'),
              accessor: (item) => item.status || '-',
              cell: (value) => value as string,
            },
          ]}
          pagination={{ enabled: true, pageSize: 10 }}
        />
      </CardContent>
    </Card>
  )
}

export function HelmReleaseDetail(props: { namespace: string; name: string }) {
  const { namespace, name } = props
  const { t } = useTranslation()
  const [rollbackRevision, setRollbackRevision] = useState('')
  const [isRollbackOpen, setIsRollbackOpen] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const { data, isLoading, error, refetch } = useResource(
    'helmrelease',
    name,
    namespace
  )

  const handleUpgrade = async () => {
    setIsActionLoading(true)
    try {
      await upgradeHelmRelease(namespace, name)
      toast.success(t('helm.messages.upgradeStarted'))
      await refetch()
    } catch (err) {
      toast.error(translateError(err, t))
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleRollback = async () => {
    setIsActionLoading(true)
    try {
      await rollbackHelmRelease(
        namespace,
        name,
        rollbackRevision ? Number(rollbackRevision) : undefined
      )
      toast.success(t('helm.messages.rollbackStarted'))
      setIsRollbackOpen(false)
      await refetch()
    } catch (err) {
      toast.error(translateError(err, t))
    } finally {
      setIsActionLoading(false)
    }
  }

  const tabs = useMemo<ResourceDetailShellTab<HelmRelease>[]>(
    () => [
      {
        value: 'manifest',
        label: t('helm.tabs.manifest'),
        content: data ? (
          <YamlEditor
            value={data.spec?.manifest || ''}
            title={t('helm.tabs.manifest')}
            readOnly
            showControls={false}
          />
        ) : null,
      },
      {
        value: 'values',
        label: t('helm.tabs.values'),
        content: data ? (
          <YamlEditor
            value={yaml.dump(data.spec?.values || {}, { indent: 2 })}
            title={t('helm.tabs.values')}
            readOnly
            showControls={false}
          />
        ) : null,
      },
      {
        value: 'resources',
        label: t('common.fields.resources'),
        content: <ResourcesTable resources={data?.status?.resources} />,
      },
      {
        value: 'notes',
        label: t('helm.tabs.notes'),
        content: (
          <TextCard title={t('helm.tabs.notes')} content={data?.spec?.notes} />
        ),
      },
      {
        value: 'description',
        label: t('common.fields.description'),
        content: (
          <TextCard
            title={t('common.fields.description')}
            content={data?.spec?.description}
          />
        ),
      },
    ],
    [data, t]
  )

  return (
    <ResourceDetailShell
      resourceType="helmrelease"
      resourceLabel="Helm Release"
      name={name}
      namespace={namespace}
      data={data}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      overview={
        data ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('common.fields.basicInformation')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                {[
                  [t('helm.fields.chart'), data.spec?.chart || '-'],
                  [t('helm.fields.version'), data.spec?.chartVersion || '-'],
                  [t('common.fields.revision'), data.spec?.revision || '-'],
                  [t('common.fields.status'), data.status?.status || '-'],
                  [t('helm.fields.appVersion'), data.spec?.appVersion || '-'],
                  [
                    t('helm.fields.lastDeployed'),
                    data.status?.lastDeployed || '-',
                  ],
                  [
                    t('common.fields.resourceVersion'),
                    data.metadata?.resourceVersion || '-',
                  ],
                  [t('common.fields.uid'), data.metadata?.uid || '-'],
                ].map(([label, value]) => (
                  <div key={String(label)} className="space-y-1">
                    <div className="text-xs font-medium uppercase text-muted-foreground">
                      {label}
                    </div>
                    <div className="break-all text-sm">{value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null
      }
      preYamlTabs={tabs}
      showDelete
      headerActions={
        <>
          <Button
            variant="outline"
            size="sm"
            disabled={isActionLoading}
            onClick={handleUpgrade}
          >
            {t('helm.actions.upgrade')}
          </Button>
          <Popover open={isRollbackOpen} onOpenChange={setIsRollbackOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={isActionLoading}>
                {t('helm.actions.rollback')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="rollback-revision">
                    {t('helm.fields.rollbackRevision')}
                  </Label>
                  <Input
                    id="rollback-revision"
                    type="number"
                    min="1"
                    value={rollbackRevision}
                    onChange={(e) => setRollbackRevision(e.target.value)}
                    placeholder={t('helm.placeholders.latestPrevious')}
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={isActionLoading}
                  onClick={handleRollback}
                >
                  {t('helm.actions.rollback')}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </>
      }
    />
  )
}
