import index from './data/icon-index.json'
import { loadJSON } from './data-loader'

type IconMap = Record<string, string>

const chunkFor = index as Record<string, string>
const urls = import.meta.glob<string>('./data/icon-chunks/*.json', { eager: true, query: '?url&no-inline', import: 'default' })

export async function loadIcon(name: string) {
  const key = name in chunkFor ? name : name.replace(/^Q/, '')
  const chunk = chunkFor[key]
  const url = urls[`./data/icon-chunks/${chunk}.json`]
  if (!url) return ''
  const data = await loadJSON<IconMap>(url)
  return data[name] ?? data[key] ?? ''
}
