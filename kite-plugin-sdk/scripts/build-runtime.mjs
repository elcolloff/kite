import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(__dirname, '..')
const identifierPattern = /^[$A-Z_a-z][$\w]*$/

const sharedModules = [
  {
    specifier: 'react',
    globalKey: 'react',
    filename: 'react.js',
  },
  {
    specifier: 'react/jsx-runtime',
    globalKey: 'reactJsxRuntime',
    filename: 'react-jsx-runtime.js',
  },
  {
    specifier: 'react-dom',
    globalKey: 'reactDom',
    filename: 'react-dom.js',
  },
  {
    specifier: 'react-dom/client',
    globalKey: 'reactDomClient',
    filename: 'react-dom-client.js',
  },
  {
    specifier: 'react-router-dom',
    globalKey: 'reactRouterDom',
    filename: 'react-router-dom.js',
  },
  {
    specifier: '@tanstack/react-query',
    globalKey: 'reactQuery',
    filename: 'tanstack-react-query.js',
  },
]

const getModuleResolver = (resolveFrom) => {
  const resolverBase = path.resolve(resolveFrom || packageDir, 'package.json')
  return createRequire(resolverBase)
}

const importResolvedModule = async (specifier, moduleResolver) => {
  const resolvedPath = moduleResolver.resolve(specifier)
  return import(pathToFileURL(resolvedPath).href)
}

const getExportNames = async (specifier, moduleResolver) => {
  const moduleValue = await importResolvedModule(specifier, moduleResolver)
  return Object.keys(moduleValue).filter(
    (name) =>
      name !== 'default' &&
      name !== 'module.exports' &&
      identifierPattern.test(name)
  )
}

const writeSharedProxyModule = async (
  outdir,
  moduleResolver,
  { specifier, globalKey, filename }
) => {
  const exportNames = await getExportNames(specifier, moduleResolver)
  const lines = [
    'const getModule = () => {',
    `  const shared = window.__KITE_PLUGIN_SHARED__?.${globalKey}`,
    '  if (!shared) {',
    `    throw new Error(${JSON.stringify(
      `Kite plugin shared module "${specifier}" is not ready`
    )})`,
    '  }',
    '  return shared',
    '}',
    '',
    'const moduleValue = getModule()',
    'export default moduleValue.default ?? moduleValue',
  ]

  for (const name of exportNames) {
    lines.push(`export const ${name} = moduleValue[${JSON.stringify(name)}]`)
  }

  writeFileSync(path.join(outdir, filename), `${lines.join('\n')}\n`)
}

export async function buildPluginRuntime({ outdir, resolveFrom }) {
  if (!outdir) {
    throw new Error('outdir is required')
  }

  const moduleResolver = getModuleResolver(resolveFrom)
  const { build: viteBuild } = await importResolvedModule(
    'vite',
    moduleResolver
  )

  rmSync(outdir, { recursive: true, force: true })
  mkdirSync(outdir, { recursive: true })

  for (const sharedModule of sharedModules) {
    await writeSharedProxyModule(outdir, moduleResolver, sharedModule)
  }

  await viteBuild({
    configFile: false,
    root: packageDir,
    publicDir: false,
    logLevel: 'error',
    build: {
      target: 'es2020',
      outDir: outdir,
      emptyOutDir: false,
      minify: false,
      sourcemap: false,
      lib: {
        entry: path.resolve(packageDir, 'src/host-runtime.ts'),
        formats: ['es'],
        fileName: () => 'kite-dev-plugin-sdk',
      },
      codeSplitting: false,
      rollupOptions: {
        external: ['react'],
        output: {
          entryFileNames: 'kite-dev-plugin-sdk.js',
        },
      },
    },
  })
}

const runFromCLI = async () => {
  const outdirArg = process.argv[2]
  if (!outdirArg) {
    throw new Error('Usage: node build-runtime.mjs <outdir>')
  }
  await buildPluginRuntime({
    outdir: path.resolve(process.cwd(), outdirArg),
    resolveFrom: process.cwd(),
  })
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await runFromCLI()
}
