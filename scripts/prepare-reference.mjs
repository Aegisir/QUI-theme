import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises'
import { resolve, extname, relative, sep } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const input = resolve(root, 'apps/demo/reference')
const cache = resolve(root, 'apps/demo/.cache')
const output = resolve(cache, 'public')
const hash = data => createHash('sha256').update(data).digest('hex').slice(0, 16)
const readJson = async path => JSON.parse(await readFile(resolve(input, path), 'utf8'))
function deduplicateRules(container) {
  const seen = new Set()
  for (const node of [...(container.nodes ?? [])].reverse()) {
    if (node.type === 'rule') {
      const key = node.toString()
      if (seen.has(key)) { node.remove(); continue }
      seen.add(key)
    }
    if (node.nodes) deduplicateRules(node)
  }
}

export async function prepareReference() {
  // Only generated files beneath the fixed cache directory are replaced.
  if (!output.startsWith(cache + sep)) throw new Error('Invalid generated output')
  await rm(output, { recursive: true, force: true })
  await mkdir(output, { recursive: true })
  const emitted = new Set()
  const emit = async (kind, data, extension) => {
    const path = `reference/${kind}/${hash(data)}${extension}`
    if (!emitted.has(path)) {
      await mkdir(resolve(output, 'reference', kind), { recursive: true })
      await writeFile(resolve(output, path), data)
      emitted.add(path)
    }
    return path
  }
  const assets = new Map()
  async function copyAssets(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) await copyAssets(path)
      else assets.set(`/reference/${relative(input, path).split(sep).join('/')}`, await emit('assets', await readFile(path), extname(path)))
    }
  }
  await copyAssets(resolve(input, 'assets'))
  const rasterPattern = /data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+/g
  async function markup(source) {
    for (const match of new Set(source.match(rasterPattern) || [])) {
      const extension = match.slice(11, match.indexOf(';')).replace('jpeg', 'jpg')
      const path = await emit('assets', Buffer.from(match.slice(match.indexOf(',') + 1), 'base64'), `.${extension}`)
      source = source.replaceAll(match, `__QUI_BASE__${path}`)
    }
    for (const [original, path] of assets) source = source.replaceAll(original, `__QUI_BASE__${path}`)
    // SVG pattern rasters below the fold are activated by the renderer observer.
    return source.replace(/(<image\b[^>]*?)xlink:href="(__QUI_BASE__[^"#]+)"/g, '$1data-qui-raster="$2"')
  }
  const originalRoutes = await readJson('routes.json')
  const motions = await readJson('motion/runtime.json')
  const stylePaths = new Map()
  for (const href of new Set(Object.values(originalRoutes).flatMap(variants => Object.values(variants).flatMap(variant => variant.styles)))) {
    let css = await readFile(resolve(input, href.replace('/reference/', '')), 'utf8')
    // Keep the original Latin/CJK fallback after correcting the document language.
    css = css.replace(/font-family:(-apple-system|PingFang SC)(?=[;}])/g, '$&,"Times New Roman","Noto Sans SC"')
    for (const [original, path] of assets) css = css.replaceAll(original, `../assets/${path.split('/').at(-1)}`)
    css = css.replace(/url\((["']?)([^)"']+)\1\)/g, (match, _quote, target) => {
      if (target.startsWith('data:') || target.startsWith('#')) return match
      const asset = assets.get(new URL(target, `https://reference.invalid${href}`).pathname)
      return asset ? `url("../assets/${asset.split('/').at(-1)}")` : match
    })
    const sheet = postcss.parse(css)
    deduplicateRules(sheet)
    stylePaths.set(href, await emit('styles', sheet.toString(), '.css'))
  }
  const routes = {}
  for (const [slug, variants] of Object.entries(originalRoutes)) {
    const states = await readJson(`states/${slug}.json`)
    routes[slug] = {}
    for (const [key, variant] of Object.entries(variants)) {
      const original = gunzipSync(await readFile(resolve(input, variant.html.replace('/reference/', '')))).toString()
      const base = await markup(slug === 'index' ? original.replace('<div class="q-list-group">', '<div data-qui-theme></div><div class="q-list-group">') : original)
      const compact = {}
      for (const [name, state] of Object.entries(states[key] || {})) {
        const content = await markup(state.markup)
        compact[name] = { ...(content === base ? {} : { markup: content }), portals: await Promise.all(state.portals.map(markup)), ...(state.scrolls ? { scrolls: state.scrolls } : {}) }
      }
      const motion = motions.routes[slug]?.[key]
      routes[slug][key] = {
        html: await emit('pages', base, '.html'), styles: variant.styles.map(path => stylePaths.get(path)),
        ...(Object.keys(compact).length ? { states: await emit('states', JSON.stringify(compact), '.json') } : {}),
        ...(motion && Object.keys(motion).length ? { motion: await emit('motion', JSON.stringify(motion), '.json') } : {}),
      }
    }
  }
  const lists = Object.values(routes).flatMap(variants => Object.values(variants).map(variant => variant.styles))
  const commonStyles = lists[0].filter((path, index) => lists.every(styles => styles[index] === path && styles.slice(0, index).every((style, i) => style === lists[0][i])))
  // Shared theme tokens must also precede the first paint; route CSS is inserted before them.
  const themeStyle = stylePaths.get('/reference/styles/token.css')
  if (themeStyle && lists.every(styles => styles.at(-1) === themeStyle)) commonStyles.push(themeStyle)
  const manifest = { routes, commonStyles }
  await writeFile(resolve(cache, 'manifest.json'), JSON.stringify(manifest))
  await writeFile(resolve(output, 'favicon.ico'), await readFile(resolve(root, 'apps/demo/public/favicon.ico')))
  const icon = routes.icon.mobile
  console.log(`Prepared ${Object.keys(routes).length} routes; icon HTML ${gzipSync(await readFile(resolve(output, icon.html))).length}B gzip, states ${gzipSync(await readFile(resolve(output, icon.states))).length}B gzip`)
  return manifest
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepareReference()
