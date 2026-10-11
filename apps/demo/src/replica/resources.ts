import type { PageVariant, RouteVariants, InteractionState, MotionPhaseMap } from './types'

const routes: Record<string, RouteVariants> = JSON.parse(document.getElementById('qui-reference')!.textContent!).routes
export const pageVariant = (slug: string, device: 'mobile' | 'desktop'): PageVariant => (routes[slug] ?? routes.index)![device]
const base = new URL(import.meta.env.BASE_URL, document.baseURI).href
const url = (path: string) => new URL(path, base).href
const resolveMarkup = (text: string) => text.replaceAll('__QUI_BASE__', base)
async function request(path: string, signal: AbortSignal, priority: RequestPriority = 'low') {
  const response = await fetch(url(path), { signal, priority })
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${path}`)
  return response
}
export async function loadMarkup(page: PageVariant, signal: AbortSignal) {
  return resolveMarkup(await (await request(page.html, signal, 'high')).text())
}
export async function loadInteractions(page: PageVariant, signal: AbortSignal): Promise<Record<string, InteractionState>> {
  if (!page.states) return {}
  const states: Record<string, InteractionState> = await (await request(page.states, signal)).json()
  return Object.fromEntries(Object.entries(states).map(([key, state]) => [key, {
    ...state, ...(state.markup === undefined ? {} : { markup: resolveMarkup(state.markup) }), portals: state.portals.map(resolveMarkup),
  }]))
}
export async function loadMotions(page: PageVariant, signal: AbortSignal): Promise<MotionPhaseMap> {
  return page.motion ? (await request(page.motion, signal)).json() : {}
}
export async function prepareStyles(styles: string[], signal: AbortSignal) {
  signal.throwIfAborted()
  const previous = [...document.querySelectorAll<HTMLLinkElement>('link[data-reference-style]')]
  const hrefs = styles.map(url)
  const added: HTMLLinkElement[] = []
  const discard = () => { signal.removeEventListener('abort', discard); added.forEach(link => link.remove()) }
  signal.addEventListener('abort', discard, { once: true })
  try {
    await Promise.all(hrefs.map((href, index) => {
      const existing = previous.find(link => link.href === href)
      if (existing?.sheet) return Promise.resolve()
      return new Promise<void>((resolve, reject) => {
        const link = existing ?? document.createElement('link')
        const cleanup = () => { link.onload = null; link.onerror = null; signal.removeEventListener('abort', abort) }
        const abort = () => { cleanup(); reject(signal.reason) }
        link.onload = () => { cleanup(); resolve() }
        link.onerror = () => { cleanup(); reject(new Error(`Stylesheet failed: ${styles[index]}`)) }
        signal.addEventListener('abort', abort, { once: true })
        if (signal.aborted) return abort()
        if (!existing) {
          link.rel = 'stylesheet'; link.href = href; link.media = 'not all'; link.fetchPriority = 'high'; link.dataset.referenceStyle = ''
          added.push(link)
          // Moving an active link detaches its stylesheet; insert only new links in cascade order.
          document.head.insertBefore(link, previous.find(item => hrefs.slice(index + 1).includes(item.href)) ?? null)
        }
      })
    }))
    signal.throwIfAborted()
    return () => {
      signal.throwIfAborted()
      signal.removeEventListener('abort', discard)
      added.forEach(link => { link.media = 'all' })
      previous.filter(link => !hrefs.includes(link.href) && !link.hasAttribute('data-reference-shared')).forEach(link => link.remove())
    }
  } catch (error) { discard(); throw error }
}
