import * as React from 'react'
import * as ReactJsxRuntime from 'react/jsx-runtime'
import { loader } from '@monaco-editor/react'
import * as ReactQuery from '@tanstack/react-query'
import * as monaco from 'monaco-editor'
import * as ReactDOM from 'react-dom'
import * as ReactDOMClient from 'react-dom/client'
import * as ReactRouterDom from 'react-router-dom'

import './index.css'
import './i18n'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

import { AppearanceProvider } from './components/appearance-provider'
import { AuthProvider } from './contexts/auth-context'
import { SidebarConfigProvider } from './contexts/sidebar-config-context'
import { QueryProvider } from './lib/query-provider'
import { PluginRuntimeProvider } from './plugins/runtime-context'
import { router } from './routes'

self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker()
  },
}

loader.config({ monaco })

window.__KITE_PLUGIN_SHARED__ = {
  react: React,
  reactJsxRuntime: ReactJsxRuntime,
  reactDom: ReactDOM,
  reactDomClient: ReactDOMClient,
  reactRouterDom: ReactRouterDom,
  reactQuery: ReactQuery,
}

ReactDOMClient.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <AppearanceProvider
        defaultTheme="system"
        defaultColorTheme="default"
        defaultFont="maple"
      >
        <AuthProvider>
          <PluginRuntimeProvider>
            <SidebarConfigProvider>
              <ReactRouterDom.RouterProvider router={router} />
            </SidebarConfigProvider>
          </PluginRuntimeProvider>
        </AuthProvider>
      </AppearanceProvider>
    </QueryProvider>
  </React.StrictMode>
)
