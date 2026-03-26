import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'

interface PluginRenderBoundaryProps {
  pluginId: string
  routerName: string
  pageType: 'list' | 'detail'
  children: ReactNode
}

interface PluginRenderBoundaryState {
  hasError: boolean
}

export class PluginRenderBoundary extends Component<
  PluginRenderBoundaryProps,
  PluginRenderBoundaryState
> {
  state: PluginRenderBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): PluginRenderBoundaryState {
    return {
      hasError: true,
    }
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error(
      `Plugin render failed: ${this.props.pluginId}/${this.props.routerName}/${this.props.pageType}`,
      error,
      errorInfo
    )
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 text-center">
              <div className="font-medium">Plugin page crashed</div>
              <div className="text-sm text-muted-foreground">
                {this.props.pluginId}/{this.props.routerName} (
                {this.props.pageType})
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}
