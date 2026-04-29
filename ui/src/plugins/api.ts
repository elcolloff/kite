import { apiClient } from '@/lib/api-client'

import type { PluginManifest } from './types'

export interface PluginsResponse {
  plugins: PluginManifest[]
}

export function fetchPlugins() {
  return apiClient.get<PluginsResponse>('/plugins')
}
