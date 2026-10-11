import { build, normalizePath } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { root, artifacts } from '../tests/support.mjs'
process.chdir(root)
if (!process.argv[2]) throw new Error('Pass a Git ref from before the snapshot migration.')
const ref = execFileSync('git', ['rev-parse', '--verify', '--end-of-options', process.argv[2] + '^{commit}'], { encoding: 'utf8' }).trim()
const original = file => execFileSync('git', ['show', ref + ':' + file], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
const files = execFileSync('git', ['ls-tree', '-r', '--name-only', ref, 'apps/demo/src', 'packages/qui-ui/src'], { encoding: 'utf8' }).trim().split('\n')
const contents = new Map(files.filter(file => /\.(vue|ts|css)$/.test(file)).map(file => [normalizePath(resolve(file)), original(file)]))
if (contents.has(normalizePath(resolve('apps/demo/src/replica/resources.ts')))) throw new Error('Use a pre-migration ref, or compare an archived build with verify-replica --source.')
await build({ configFile: false, root: resolve('apps/demo'), base: './', publicDir: false,
  plugins: [{ name: 'original', enforce: 'pre', load(id) { return contents.get(id) }, transformIndexHtml: { order: 'pre', handler: () => original('apps/demo/index.html') } }, vue()],
  resolve: { alias: [{ find: /^@qui-theme\/ui$/, replacement: normalizePath(resolve('packages/qui-ui/src/index.ts')) }, ...['icon', 'icons', 'icon-index', 'icon-groups', 'theme', 'assets'].map(name => ({ find: `@qui-theme/ui/${name}`, replacement: normalizePath(resolve(`packages/qui-ui/src/${name}.ts`)) }))] },
  build: { outDir: resolve('artifacts/local/original'), emptyOutDir: true },
})
const resources = execFileSync('git', ['ls-tree', '-r', '--name-only', ref, 'apps/demo/public/reference', 'apps/demo/reference'], { encoding: 'utf8' }).trim().split('\n')
for (const file of resources) {
  if (!file) continue
  const destination = resolve(artifacts, "original/reference", file.split("/reference/")[1])
  await mkdir(resolve(destination, ".."), { recursive: true })
  await writeFile(destination, execFileSync("git", ["show", ref + ":" + file], { maxBuffer: 32 * 1024 * 1024 }))
}
await writeFile(resolve(artifacts, "original/favicon.ico"), execFileSync("git", ["show", ref + ":apps/demo/public/favicon.ico"]))
await writeFile(resolve(artifacts, "baseline-build.json"), JSON.stringify({ ref: execFileSync("git", ["rev-parse", ref], { encoding: "utf8" }).trim() }, null, 2))
