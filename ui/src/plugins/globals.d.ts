import type * as React from 'react'
import type * as ReactJsxRuntime from 'react/jsx-runtime'
import type * as ReactQuery from '@tanstack/react-query'
import type * as ReactDOM from 'react-dom'
import type * as ReactDOMClient from 'react-dom/client'
import type * as ReactRouterDOM from 'react-router-dom'

import type { KitePluginRuntime } from './types'

declare global {
  interface Window {
    __KITE_PLUGIN_SHARED__?: {
      react: typeof React
      reactJsxRuntime: typeof ReactJsxRuntime
      reactDom: typeof ReactDOM
      reactDomClient: typeof ReactDOMClient
      reactRouterDom: typeof ReactRouterDOM
      reactQuery: typeof ReactQuery
    }
    __KITE_PLUGIN_HOST__?: KitePluginRuntime
  }
}

export {}
