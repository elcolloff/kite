import * as React from 'react'
import * as ReactJsxRuntime from 'react/jsx-runtime'
import * as ReactQuery from '@tanstack/react-query'
import * as ReactDOM from 'react-dom'
import * as ReactDOMClient from 'react-dom/client'
import * as ReactRouterDOM from 'react-router-dom'

import './index.css'
import './i18n'

import { AppearanceProvider } from './components/appearance-provider'
import { AuthProvider } from './contexts/auth-context'
import { SidebarConfigProvider } from './contexts/sidebar-config-context'
import { QueryProvider } from './lib/query-provider'
import { kitePluginHostRuntime } from './plugins/host-runtime'
import { PluginRegistryProvider } from './plugins/plugin-registry'
import { router } from './routes'

window.__KITE_PLUGIN_SHARED__ = {
  react: React,
  reactJsxRuntime: ReactJsxRuntime,
  reactDom: ReactDOM,
  reactDomClient: ReactDOMClient,
  reactRouterDom: ReactRouterDOM,
  reactQuery: ReactQuery,
}

window.__KITE_PLUGIN_HOST__ = kitePluginHostRuntime

ReactDOMClient.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <AppearanceProvider
        defaultTheme="system"
        defaultColorTheme="default"
        defaultFont="maple"
      >
        <AuthProvider>
          <PluginRegistryProvider>
            <SidebarConfigProvider>
              <ReactRouterDOM.RouterProvider router={router} />
            </SidebarConfigProvider>
          </PluginRegistryProvider>
        </AuthProvider>
      </AppearanceProvider>
    </QueryProvider>
  </React.StrictMode>
)
