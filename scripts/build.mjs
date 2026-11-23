/**
 * Builds both halves of the bundle with esbuild.
 *
 * The host half is plain ESM. The client half is wrapped in the Web module
 * loader factory so the browser can mount it as a plugin; `react` stays
 * external and comes from the browser module table.
 */
import { build } from 'esbuild'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const check = process.argv.includes('--check')
const lib = join(root, 'lib')

const host = await build({
  entryPoints: [join(root, 'src/index.js')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  external: ['@deepseek-ai/*'],
  write: false,
  logLevel: 'silent',
})

const client = await build({
  entryPoints: [join(root, 'src/client/index.js')],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  external: ['react', 'react/jsx-runtime'],
  write: false,
  logLevel: 'silent',
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(pkg.name)}, factory: (require) => { var module = { exports: {} }; var exports = module.exports;`,
  },
  footer: { js: 'return module.exports; } });' },
})

const outputs = [
  { file: join(lib, 'index.js'), contents: host.outputFiles[0].text },
  { file: join(lib, 'client.js'), contents: client.outputFiles[0].text },
]

if (check) {
  const drift = outputs.filter(({ file, contents }) => !existsSync(file) || readFileSync(file, 'utf8') !== contents)
  if (drift.length > 0) {
    for (const { file } of drift) console.error(`committed build differs from source: ${file}`)
    console.error('run npm run build and commit lib/')
    process.exit(1)
  }
  console.log('lib/ matches the sources')
} else {
  mkdirSync(lib, { recursive: true })
  for (const { file, contents } of outputs) writeFileSync(file, contents)
  console.log(`built ${outputs.map(({ file }) => file.slice(root.length + 1)).join(', ')}`)
}
