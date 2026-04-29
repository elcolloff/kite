import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPluginRuntime } from '@kite-dev/plugin-sdk/build-runtime'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

await buildPluginRuntime({
  outdir: path.resolve(rootDir, 'public/assets/plugin-runtime'),
  resolveFrom: rootDir,
})
