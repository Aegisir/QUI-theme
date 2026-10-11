import { nextTick, onBeforeUnmount, onMounted, watch, type Ref } from 'vue'

export function useAutoDismiss(state: () => readonly [boolean, number], close: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const clear = () => { clearTimeout(timer); timer = undefined }
  watch(state, ([show, duration]) => {
    clear()
    if (show && duration > 0) timer = setTimeout(close, duration)
  }, { immediate: true })
  onBeforeUnmount(clear)
}

interface OverlayEntry { close: () => void; panel: Ref<HTMLElement | undefined>; previous: Element | null; lock: boolean; zIndex: () => number }
const overlays: OverlayEntry[] = []
const focusable = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
const top = () => overlays.reduce<OverlayEntry | undefined>((current, entry) => !current || entry.zIndex() >= current.zIndex() ? entry : current, undefined)
function onKey(event: KeyboardEvent) {
  const entry = top()
  if (!entry) return
  if (event.key === 'Escape') { event.preventDefault(); entry.close() }
  if (event.key !== 'Tab' || !entry.lock) return
  const items = [...(entry.panel.value?.querySelectorAll<HTMLElement>(focusable) ?? [])].filter(item => item.getClientRects().length)
  const first = items[0] ?? entry.panel.value
  const last = items.at(-1) ?? first
  if (!items.length || !entry.panel.value?.contains(document.activeElement) || event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    ;(event.shiftKey ? last : first)?.focus()
  }
}
export function useOverlayStack(open: Ref<boolean>, panel: Ref<HTMLElement | undefined>, close: () => void, lock: () => boolean, zIndex: () => number) {
  const entry: OverlayEntry = { close, panel, previous: null, lock: false, zIndex }
  let active = false
  const sync = (value: boolean) => {
    if (value === active) return
    active = value
    if (value) {
      entry.previous = document.activeElement
      entry.lock = lock()
      overlays.push(entry)
      if (overlays.length === 1) document.addEventListener('keydown', onKey)
      void nextTick(() => { if (active && top() === entry && entry.lock) (panel.value?.querySelector<HTMLElement>(focusable) ?? panel.value)?.focus() })
    } else {
      const wasTop = top() === entry
      overlays.splice(overlays.indexOf(entry), 1)
      overlays.forEach(item => { if (item.previous && entry.panel.value?.contains(item.previous)) item.previous = entry.previous })
      if (!overlays.length) document.removeEventListener('keydown', onKey)
      if (wasTop && entry.previous instanceof HTMLElement && entry.previous.isConnected) entry.previous.focus()
    }
    document.body.classList.toggle('qui-overlay-open', overlays.some(item => item.lock))
  }
  watch(open, sync)
  watch(lock, value => { if (active) { entry.lock = value; document.body.classList.toggle('qui-overlay-open', overlays.some(item => item.lock)) } })
  onMounted(() => sync(open.value))
  onBeforeUnmount(() => sync(false))
}
