import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = fileURLToPath(new URL('../packages/qui-ui/', import.meta.url))
function jsonType(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return `Array<${[...new Set(value.map(jsonType))].join(' | ') || 'never'}>`
  if (typeof value === 'object') return `{ ${Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${jsonType(item)}`).join('; ')} }`
  return typeof value
}
const output = resolve(directory, 'dist/types/data')
await mkdir(output, { recursive: true })
for (const name of ['icon-index', 'icons', 'icon-groups', 'tokens']) {
  const value = JSON.parse(await readFile(resolve(directory, `src/data/${name}.json`), 'utf8'))
  await writeFile(resolve(output, `${name}.json.d.ts`), `declare const data: ${jsonType(value)};\nexport default data;\n`)
}
