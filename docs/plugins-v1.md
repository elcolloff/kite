# Kite 插件开发文档

## 1. 概览

Kite v1 插件只扩展资源页面。

插件可以提供：

- 资源 `list` 页面
- 资源 `detail` 页面
- 左侧菜单项

运行时约束：

- 插件是独立 repo
- 宿主安装时会拉取插件的 `manifest.json` 和 `entry.js`
- 宿主运行时通过自己的 `/assets/plugins/<plugin-id>/<version>-<revision>.js` 动态加载插件
- 插件只输出一个 `entry.js`
- 插件不能输出和加载任何 CSS
- 插件样式完全依赖宿主已有的 Tailwind 和 SDK 暴露的组件

当前仓库里为了方便开发，示例插件临时放在根目录 `plugins/`，后续可以整体移动到独立 repo。

## 2. 运行模型

宿主启动后会：

1. 请求 `GET /api/v1/plugins/registry`
2. 先用 registry 里的 `lists/details` 元信息生成菜单和路由
3. 用户真正进入插件页面时，再执行 `import(entry)`
4. 调用插件默认导出的 `setup(api)`
5. 把插件导出的页面组件挂到对应路由上

其中 `entry` 不是插件原始地址，而是宿主生成的本地代理地址：

- `/assets/plugins/<plugin-id>/<version>-<revision>.js`

插件路由固定挂在 `/plugins` 下：

- `/plugins/:pluginId/:routerName`
- `/plugins/:pluginId/:routerName/:name`
- `/plugins/:pluginId/:routerName/:namespace/:name`

插件菜单只能注册到宿主新增的 `plugin` 父组。

## 3. 目录约定

推荐插件 repo 结构：

```text
gateway-plugins/
  package.json
  pnpm-lock.yaml
  tsconfig.json
  vite.config.ts
  manifest.json
  src/
    entry.ts
    gateway-list.tsx
    gateway-detail.tsx
    httproute-list.tsx
    httproute-detail.tsx
```

当前仓库中的相关目录：

```text
plugins/
  package.json
  pnpm-workspace.yaml
  gateway-plugins/
kite-plugin-sdk/
```

其中：

- `plugins/` 是插件开发用的独立 pnpm workspace 根
- `kite-plugin-sdk` 供所有插件共享

## 4. 插件清单

插件通过自己的 `manifest.json` 描述元信息，宿主通过管理员 API 安装。

示例：

```json
{
  "schemaVersion": "v1",
  "id": "gateway-plugins",
  "name": "Gateway Plugins",
  "version": "0.1.0",
  "sdkVersionRange": ">=0.1.0 <1.0.0",
  "hostVersionRange": ">=0.0.0",
  "entry": "./entry.js",
  "lists": [
    {
      "routerName": "gateways",
      "title": "Gateways",
      "resource": {
        "source": "builtin",
        "resourceType": "gateways",
        "scope": "namespaced"
      },
      "menu": {
        "groupId": "plugin",
        "title": "Gateways",
        "icon": "IconLoadBalancer"
      }
    }
  ],
  "details": [
    {
      "routerName": "gateways",
      "resource": {
        "source": "builtin",
        "resourceType": "gateways",
        "scope": "namespaced"
      }
    }
  ]
}
```

字段说明：

- `schemaVersion`: manifest 版本，当前固定为 `v1`
- `id`: 插件唯一标识
- `name`: 展示名称
- `version`: 插件版本
- `sdkVersionRange`: 兼容的 SDK 版本范围
- `hostVersionRange`: 兼容的 Kite 版本范围
- `entry`: 插件远程入口，只能是单个 JS 文件，可以使用相对路径
- 宿主安装时会读取这个地址的内容并固化到数据库
- `lists`: list 页面元信息，宿主用它生成菜单和路由
- `details`: detail 页面元信息，宿主用它生成路由

## 5. 插件工程要求

插件工程要求：

- `plugins/` 目录本身是一个独立的 `pnpm workspace` 根
- `@kite-dev/plugin-sdk` 通过 workspace 依赖接入
- 常用依赖版本统一收敛在 `plugins/pnpm-workspace.yaml` 的 `catalog` 里
- 使用 `pnpm`
- 使用 `vite`
- 可以保留 `tailwindcss + shadcn` 的工程结构
- 运行时不能导入插件自己的 CSS
- 构建产物只能有一个 `entry.js`

## 6. Vite 配置

插件构建必须把宿主共享依赖 external 掉，保留 bare import，由宿主 import map 解析。

关键点：

- 不要在插件入口里 `import './index.css'`
- 不要生成额外 CSS 文件
- 不要把 React 打进插件 bundle
- 构建结束后要把 `manifest.json` 一起发布

## 7. 插件入口

插件入口固定导出一个默认函数：

```ts
export default defineKitePlugin(async (api) => {
  api.registerResourceList({
    routerName: 'gateways',
    component: GatewayListPage,
  })

  api.registerResourceDetail({
    routerName: 'gateways',
    component: GatewayDetailPage,
  })
})
```

运行时规则：

- manifest 是页面元信息唯一来源
- `setup()` 只负责 `routerName -> component`
- 不保留旧注册签名兼容层

## 8. 宿主安装 API

插件安装和管理先走管理员 API：

- `GET /api/v1/admin/plugins/`
- `POST /api/v1/admin/plugins/install`
- `POST /api/v1/admin/plugins/:pluginId/enable`
- `POST /api/v1/admin/plugins/:pluginId/disable`
- `DELETE /api/v1/admin/plugins/:pluginId`

安装请求：

```json
{
  "manifestUrl": "http://127.0.0.1:4174/manifest.json"
}
```

宿主安装后会把 manifest 快照和 entry 内容固化到数据库，registry 在请求时由 manifest 快照实时生成。
插件资产路径会包含版本和修订号，宿主可以对它返回长期缓存。

## 9. 本地开发

### 9.1 安装依赖

```bash
cd plugins
pnpm install
```

### 9.2 启动示例插件

```bash
cd plugins/gateway-plugins
pnpm run dev
```

默认本地地址：

```text
http://127.0.0.1:4174/manifest.json
```

### 9.3 启动宿主

```bash
make dev
```

或者：

```bash
cd ui
pnpm install
pnpm run dev
```

### 9.4 安装到宿主

```bash
curl -X POST http://127.0.0.1:8080/api/v1/admin/plugins/install \
  -H 'Content-Type: application/json' \
  -d '{"manifestUrl":"http://127.0.0.1:4174/manifest.json"}'
```

说明：

- 如果修改了 `manifest.json`，需要重新 install
- 如果修改了 `entry.js` 对应代码，也需要重新 install

## 10. 示例插件

示例插件目录：

```text
plugins/gateway-plugins
```

它注册了两个资源：

- `gateways`
- `httproutes`

对应路由：

- `/plugins/gateway-plugins/gateways`
- `/plugins/gateway-plugins/gateways/:namespace/:name`
- `/plugins/gateway-plugins/httproutes`
- `/plugins/gateway-plugins/httproutes/:namespace/:name`

其中：

- list 页面使用 `KubeResourceTable` 复用宿主原生列表 UI
- detail 页面使用 `SimpleResourceDetail` 复用宿主默认详情页

## 11. 限制

v1 限制如下：

- 插件不能输出 CSS
- 插件不能覆盖主页
- 插件不能新建 sidebar 分组
- 插件菜单只能进 `plugin` 分组
- 插件目前只扩展资源 `list/detail`
- 插件运行在宿主同一个页面上下文里，不做 iframe 隔离
