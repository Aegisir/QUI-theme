import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { build } from 'vite'
import { gzipSync } from 'node:zlib'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { root, artifacts } from '../tests/support.mjs'

const entry = resolve(root, 'tests/fixture.js')
async function consume(code) {
  const result = await build({
    configFile: false, logLevel: 'silent',
    plugins: [{ name: 'consumer', load(id) { if (id === entry.replaceAll('\\', '/')) return code } }],
    build: { write: false, lib: { entry, formats: ['es'] }, rolldownOptions: { external: ['vue'] }, minify: true },
  })
  return (Array.isArray(result) ? result : [result]).flatMap(result => result.output)
}
const dist = '../packages/qui-ui/dist/'
const cases = {
  button: `export { QuiButton } from '${dist}index.js'`,
  renderer: `export { QuiReplicaRenderer } from '${dist}index.js'`,
  icon: `export { default } from '${dist}icon.js'`,
  plugin: `export { default, QuiUI } from '${dist}index.js'`,
  regions: `export { loadRegions } from '${dist}regions.js'`,
}
const sizes = {}
for (const [name, code] of Object.entries(cases)) {
  const output = await consume(code)
  const chunks = output.filter(item => item.type === 'chunk')
  const assets = output.filter(item => item.type === 'asset' && item.fileName.endsWith('.json'))
  sizes[name] = { chunks: chunks.length, gzip: chunks.reduce((total, chunk) => total + gzipSync(chunk.code).length, 0), jsonAssets: assets.length, jsonGzip: assets.reduce((total, asset) => total + gzipSync(asset.source).length, 0) }
  if (name === 'button') {
    assert.equal(chunks.length, 1, 'Button pulled in asynchronous or unrelated chunks')
    assert.ok(sizes[name].gzip <= 1024, `Button gzip budget exceeded: ${sizes[name].gzip}`)
    assert.doesNotMatch(chunks[0].code, /QuiArea|QuiDialog|adcode|overlay-open/)
  }
  if (name === 'icon' || name === 'regions') {
    assert.ok(assets.length > 0, `${name} JSON was inlined into JavaScript`)
    assert.ok(chunks.every(chunk => !chunk.code.includes('data:application/json')), `${name} lost lazy JSON loading`)
  }
}
const entryCode = await readFile(resolve(root, 'packages/qui-ui/dist/index.js'), 'utf8')
assert.match(entryCode, /as default/, 'Runtime default export missing')
const pkg = JSON.parse(await readFile(resolve(root, 'packages/qui-ui/package.json')))
for (const value of Object.values(pkg.exports)) {
  if (typeof value === 'object' && value.types) await readFile(resolve(root, 'packages/qui-ui', value.types))
}
await mkdir(artifacts, { recursive: true })
await writeFile(resolve(artifacts, 'bundles.json'), JSON.stringify(sizes, null, 2))
console.log(sizes)
execFileSync(process.execPath, [createRequire(import.meta.url).resolve('typescript/bin/tsc'), '--noEmit', '--strict', '--moduleResolution', 'bundler', '--module', 'esnext', '--target', 'es2022', resolve(root, 'tests/public-api.ts')], { stdio: 'inherit' })
