import { useMemo, useState } from 'react'
import {
  deleteInstalledPlugin,
  disableInstalledPlugin,
  enableInstalledPlugin,
  fetchInstalledPlugins,
  installPlugin,
} from '@/plugins/api'
import { usePluginRuntime } from '@/plugins/runtime-context'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type PluginAction =
  | { type: 'enable'; pluginId: string }
  | { type: 'disable'; pluginId: string }
  | { type: 'delete'; pluginId: string }

const DEFAULT_MANIFEST_URL = 'http://127.0.0.1:4174/manifest.json'

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Request failed'

export function PluginDebugManagement() {
  const queryClient = useQueryClient()
  const { refreshPlugins } = usePluginRuntime()
  const [manifestUrl, setManifestUrl] = useState(DEFAULT_MANIFEST_URL)

  const installedQuery = useQuery({
    queryKey: ['installed-plugins'],
    queryFn: fetchInstalledPlugins,
  })

  const syncPluginState = async () => {
    await queryClient.invalidateQueries({ queryKey: ['installed-plugins'] })
    await refreshPlugins()
  }

  const installMutation = useMutation({
    mutationFn: async () =>
      installPlugin({
        manifestUrl: manifestUrl.trim(),
      }),
    onSuccess: async () => {
      toast.success('Plugin installed')
      await syncPluginState()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const actionMutation = useMutation({
    mutationFn: async (action: PluginAction) => {
      if (action.type === 'enable') {
        return enableInstalledPlugin(action.pluginId)
      }
      if (action.type === 'disable') {
        return disableInstalledPlugin(action.pluginId)
      }
      return deleteInstalledPlugin(action.pluginId)
    },
    onSuccess: async (_, action) => {
      const messages = {
        enable: 'Plugin enabled',
        disable: 'Plugin disabled',
        delete: 'Plugin deleted',
      }
      toast.success(messages[action.type])
      await syncPluginState()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const plugins = useMemo(
    () => installedQuery.data?.plugins || [],
    [installedQuery.data?.plugins]
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Plugin Debug</CardTitle>
          <CardDescription>
            Temporary entry for installing and removing plugins.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="plugin-debug-manifest-url">Manifest URL</Label>
            <Input
              id="plugin-debug-manifest-url"
              value={manifestUrl}
              onChange={(event) => setManifestUrl(event.target.value)}
              placeholder={DEFAULT_MANIFEST_URL}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                if (!manifestUrl.trim()) {
                  toast.error('Manifest URL is required')
                  return
                }
                installMutation.mutate()
              }}
              disabled={installMutation.isPending}
            >
              {installMutation.isPending ? 'Installing...' : 'Install'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void syncPluginState()
              }}
              disabled={installedQuery.isFetching}
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Installed Plugins</CardTitle>
          <CardDescription>
            Enable, disable or delete installed plugins.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {installedQuery.isLoading && plugins.length === 0 ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : null}

          {!installedQuery.isLoading && plugins.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No plugins installed.
            </div>
          ) : null}

          {plugins.map((plugin) => (
            <div
              key={plugin.pluginId}
              className="space-y-3 rounded-lg border p-4 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{plugin.name}</div>
                    <Badge
                      variant={
                        plugin.status === 'enabled'
                          ? 'default'
                          : plugin.status === 'disabled'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {plugin.status}
                    </Badge>
                    <Badge variant="outline">{plugin.version}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {plugin.pluginId}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {plugin.enabled ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        actionMutation.mutate({
                          type: 'disable',
                          pluginId: plugin.pluginId,
                        })
                      }
                      disabled={actionMutation.isPending}
                    >
                      Disable
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        actionMutation.mutate({
                          type: 'enable',
                          pluginId: plugin.pluginId,
                        })
                      }
                      disabled={actionMutation.isPending}
                    >
                      Enable
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      actionMutation.mutate({
                        type: 'delete',
                        pluginId: plugin.pluginId,
                      })
                    }
                    disabled={actionMutation.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Manifest: {plugin.manifestUrl}</div>
                <div>Asset: {plugin.assetUrl}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
