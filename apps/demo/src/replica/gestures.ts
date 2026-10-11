import type { QuiDistrict } from '@qui-theme/ui/regions'
import type { PickerGesture, SlipDrawerGesture, SlipDrawerSide, BlankPageSettings } from './types'
export function createGestures(props: { slug: string }, areaDistricts: QuiDistrict[], activeInteraction: () => string, scheduleRestore: () => void, blank: { index: number; settings: BlankPageSettings }, setBlankPageSlide: (index: number) => void, slideSwiper: (root: HTMLElement, direction: 'left' | 'right') => void, pickerSelections: Map<string, string[]>) {
  let gestureStart: number | undefined
  let gestureRoot: Element | null = null
  let pickerGesture: PickerGesture | undefined
  let slipDrawerGesture: SlipDrawerGesture | undefined
  let pickerDraft: string[] = []
  let pickerOptionsCache: string[][] = []
  const openSlipDrawers = new Map<string, SlipDrawerSide>()
  const pickerTransition = 'transform 0.8s cubic-bezier(0.17, 0.97, 0.2, 0.98)'
  let frame = 0
  let pending: PointerEvent | undefined
  let pointer: number | undefined
  let active = true
  const transitions = new Set<number>()
  function pickerColumns() {
    return [...document.querySelectorAll<HTMLUListElement>('.q-popup__content .q-picker__content .q-picker-column')]
  }

  function pickerOffset(column: HTMLUListElement) {
    const match = column.style.transform.match(/,\s*(-?[\d.]+)px,/)
    return match ? Number(match[1]) : 90
  }

  function normalizeArea(values: string[], count: number) {
    const province = areaDistricts.find((item) => item.name === values[0]) ?? areaDistricts[0]
    const city = province?.children?.find((item) => item.name === values[1]) ?? province?.children?.[0]
    const district = city?.children?.find((item) => item.name === values[2]) ?? city?.children?.[0]
    return [province?.name ?? '', city?.name ?? '', district?.name ?? ''].slice(0, count)
  }

  function normalizeDate(values: string[], count: number) {
    const number = (value: string | undefined, fallback: number) => Number(value?.match(/\d+/)?.[0]) || fallback
    const year = Math.max(2016, Math.min(2036, number(values[0], 2026)))
    const month = Math.max(1, Math.min(12, number(values[1], 10)))
    const day = Math.max(1, Math.min(new Date(year, month, 0).getDate(), number(values[2], 6)))
    return [`${year}年`, `${month}月`, `${day}日`].slice(0, count)
  }

  function pickerOptions(index: number): string[] {
    if (props.slug === 'area') {
      const province = areaDistricts.find((item) => item.name === pickerDraft[0]) ?? areaDistricts[0]
      const city = province?.children?.find((item) => item.name === pickerDraft[1]) ?? province?.children?.[0]
      return (index === 0 ? areaDistricts : index === 1 ? province?.children ?? [] : city?.children ?? []).map((item) => item.name)
    }
    if (props.slug === 'picker') return pickerOptionsCache[index] ?? []
    const year = Number(pickerDraft[0]?.match(/\d+/)?.[0]) || 2026
    const month = Number(pickerDraft[1]?.match(/\d+/)?.[0]) || 10
    if (index === 0) return Array.from({ length: 21 }, (_, item) => `${2016 + item}年`)
    if (index === 1) return Array.from({ length: 12 }, (_, item) => `${item + 1}月`)
    if (index === 2) return Array.from({ length: new Date(year, month, 0).getDate() }, (_, item) => `${item + 1}日`)
    return []
  }

  function renderPickerColumns(animate = true) {
    const columns = pickerColumns()
    columns.forEach((column, index) => {
      const options = pickerOptions(index)
      const selectedIndex = Math.max(0, options.indexOf(pickerDraft[index]))
      column.replaceChildren(...options.map((label, itemIndex) => {
        const item = document.createElement('li')
        item.className = 'q-picker-column__item'
        item.textContent = label
        if (itemIndex === selectedIndex) {
          item.style.height = '56px'
          item.style.lineHeight = '56px'
        }
        return item
      }))
      column.style.transition = animate ? pickerTransition : 'none'
      column.style.transform = `translate3d(0px, ${90 - selectedIndex * 45}px, 0px)`
      column.style.touchAction = 'none'
      if (!animate) {
        const frame = requestAnimationFrame(() => { transitions.delete(frame); if (active && column.isConnected) column.style.transition = pickerTransition })
        transitions.add(frame)
      }
    })
  }

  function hydratePicker(interaction: string) {
    const columns = pickerColumns()
    if (!columns.length) return
    pickerOptionsCache = columns.map((column) => [...column.children].map((item) => item.textContent?.trim() ?? ''))
    const saved = pickerSelections.get(`${props.slug}:${interaction}`)
    const initial = saved ? [...saved] : columns.map((column) => {
      const selected = [...column.children].find((item) => (item as HTMLElement).style.height === '56px')
      return selected?.textContent?.trim() ?? ''
    })
    pickerDraft = props.slug === 'area' ? normalizeArea(initial, columns.length) : props.slug === 'datetime-picker' ? normalizeDate(initial, columns.length) : initial
    renderPickerColumns(false)
  }

  function selectPickerIndex(column: HTMLUListElement, selectedIndex: number) {
    const columns = pickerColumns()
    const index = columns.indexOf(column)
    const value = column.children.item(selectedIndex)?.textContent?.trim()
    if (index < 0 || !value) return
    const changed = pickerDraft[index] !== value
    pickerDraft[index] = value
    if (props.slug === 'area') {
      if (changed && index < 2) pickerDraft = pickerDraft.slice(0, index + 1)
      pickerDraft = normalizeArea(pickerDraft, columns.length)
    } else if (props.slug === 'datetime-picker') {
      pickerDraft = normalizeDate(pickerDraft, columns.length)
    }
    renderPickerColumns()
  }

  function pickerColumn(target: EventTarget | null) {
    if (!(props.slug === 'area' || props.slug === 'datetime-picker' || props.slug === 'picker') || !(target instanceof Element)) return null
    const column = target.closest('.q-popup__content .q-picker__content .q-picker-column')
    return column instanceof HTMLUListElement ? column : null
  }

  function beginPickerGesture(target: EventTarget | null, y: number) {
    const column = pickerColumn(target)
    if (!column) return false
    pickerGesture = { column, startY: y, startOffset: pickerOffset(column) }
    column.style.transition = 'none'
    return true
  }

  function movePickerGesture(y: number) {
    if (!pickerGesture) return false
    const { column, startY, startOffset } = pickerGesture
    const lastOffset = 90 - Math.max(0, column.children.length - 1) * 45
    const offset = Math.max(lastOffset, Math.min(90, startOffset + y - startY))
    column.style.transform = `translate3d(0px, ${offset}px, 0px)`
    return true
  }

  function endPickerGesture(y: number) {
    const gesture = pickerGesture
    pickerGesture = undefined
    if (!gesture) return false
    if (Math.abs(y - gesture.startY) < 4) {
      gesture.column.style.transition = pickerTransition
      gesture.column.style.transform = `translate3d(0px, ${gesture.startOffset}px, 0px)`
      return true
    }
    const offset = Math.max(90 - Math.max(0, gesture.column.children.length - 1) * 45, Math.min(90, gesture.startOffset + y - gesture.startY))
    selectPickerIndex(gesture.column, Math.round((90 - offset) / 45))
    return true
  }

  function handlePickerClick(element: Element) {
    const popup = element.closest('.q-popup__content')
    if (!popup) return false
    const item = element.closest('.q-picker-column__item')
    if (item) {
      const column = item.closest('.q-picker-column')
      if (column instanceof HTMLUListElement) selectPickerIndex(column, [...column.children].indexOf(item))
      return true
    }
    const button = element.closest('.q-picker__btn')
    if (button) {
      if (button.textContent?.trim() === '确定') pickerSelections.set(`${props.slug}:${activeInteraction()}`, [...pickerDraft])
      scheduleRestore()
    }
    return true
  }

  function slipDrawerTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return null
    return target.closest('.q-slip-drawer__content')?.closest<HTMLElement>('.q-slip-drawer') ?? null
  }

  function slipDrawerKey(drawer: HTMLElement) {
    return drawer.querySelector('.q-slip-drawer__content .q-list__title-txt')?.textContent?.trim() ?? ''
  }

  function setSlipDrawerOffset(drawer: HTMLElement, offset: number, animate = true) {
    const wrapper = drawer.querySelector<HTMLElement>('.q-slip-drawer__wrapper')
    if (!wrapper) return false
    wrapper.style.transition = animate ? 'transform 0.4s' : 'none'
    wrapper.style.transform = `translate3d(${offset}px, 0px, 0px)`
    return true
  }

  function setSlipDrawerSide(drawer: HTMLElement, side: SlipDrawerSide, animate = true) {
    const width = drawer.querySelector<HTMLElement>(side === 'left' ? '.q-slip-drawer__action-left' : '.q-slip-drawer__action-right')?.offsetWidth ?? 0
    const key = slipDrawerKey(drawer)
    if (!width || !key) {
      if (key) openSlipDrawers.delete(key)
      setSlipDrawerOffset(drawer, 0, animate)
      return
    }
    openSlipDrawers.set(key, side)
    setSlipDrawerOffset(drawer, side === 'left' ? width : -width, animate)
  }

  function syncSlipDrawerStates() {
    const remaining = new Set(openSlipDrawers.keys())
    document.querySelectorAll<HTMLElement>('#app .q-slip-drawer').forEach((drawer) => {
      const key = slipDrawerKey(drawer)
      const side = openSlipDrawers.get(key)
      if (!side) return
      setSlipDrawerSide(drawer, side, false)
      remaining.delete(key)
    })
    remaining.forEach((key) => openSlipDrawers.delete(key))
  }

  function beginSlipDrawerGesture(target: EventTarget | null, x: number, y: number) {
    if (props.slug !== 'slip-drawer') return false
    const drawer = slipDrawerTarget(target)
    const wrapper = drawer?.querySelector<HTMLElement>('.q-slip-drawer__wrapper')
    const key = drawer && slipDrawerKey(drawer)
    if (!drawer || !wrapper || !key) return false
    const leftWidth = drawer.querySelector<HTMLElement>('.q-slip-drawer__action-left')?.offsetWidth ?? 0
    const rightWidth = drawer.querySelector<HTMLElement>('.q-slip-drawer__action-right')?.offsetWidth ?? 0
    const side = openSlipDrawers.get(key)
    slipDrawerGesture = { drawer, wrapper, startX: x, startY: y, startOffset: side === 'left' ? leftWidth : side === 'right' ? -rightWidth : 0, leftWidth, rightWidth }
    wrapper.style.transition = 'none'
    return true
  }

  function moveSlipDrawerGesture(x: number, y: number, touch = false) {
    const gesture = slipDrawerGesture
    if (!gesture) return false
    const deltaX = x - gesture.startX
    const deltaY = y - gesture.startY
    if (touch && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
      cancelSlipDrawerGesture()
      return false
    }
    if (Math.abs(deltaX) < 4) return false
    const offset = Math.max(-gesture.rightWidth, Math.min(gesture.leftWidth, gesture.startOffset + deltaX))
    gesture.wrapper.style.transform = `translate3d(${offset}px, 0px, 0px)`
    return true
  }

  function endSlipDrawerGesture(x: number, y: number) {
    const gesture = slipDrawerGesture
    slipDrawerGesture = undefined
    if (!gesture) return false
    const deltaX = x - gesture.startX
    const side = Math.abs(deltaX) >= 24 && Math.abs(deltaX) > Math.abs(y - gesture.startY)
      ? deltaX < 0 ? 'right' : 'left'
      : undefined
    if (side) setSlipDrawerSide(gesture.drawer, side)
    else setSlipDrawerOffset(gesture.drawer, gesture.startOffset)
    return true
  }

  function cancelSlipDrawerGesture() {
    const gesture = slipDrawerGesture
    slipDrawerGesture = undefined
    if (gesture) setSlipDrawerOffset(gesture.drawer, gesture.startOffset)
  }

  function gestureTarget(target: EventTarget | null) {
    if (props.slug === 'slip-drawer') return slipDrawerTarget(target)
    const selector = props.slug === 'swiper' || props.slug === 'blank-page' ? '.q-swiper' : undefined
    return selector && target instanceof Element ? target.closest(selector) : null
  }

  function finishGesture(start: number | undefined, end: number, target: EventTarget | null) {
    const matched = gestureTarget(gestureRoot ?? target)
    gestureRoot = null
    if (start === undefined || Math.abs(end - start) < 32 || !matched) return
    if (props.slug === 'blank-page') {
      setBlankPageSlide(blank.index + (end < start ? 1 : -1))
      return
    }
    if (props.slug === 'slip-drawer' && matched instanceof HTMLElement) {
      setSlipDrawerSide(matched, end < start ? 'right' : 'left')
      return
    }
    if (props.slug === 'swiper' && matched instanceof HTMLElement) slideSwiper(matched, end < start ? 'left' : 'right')
  }
  function down(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0) return
    const matched = beginPickerGesture(event.target, event.clientY) || beginSlipDrawerGesture(event.target, event.clientX, event.clientY)
    const target = gestureTarget(event.target)
    if (!matched && !target) return
    pointer = event.pointerId
    if (!matched) { gestureStart = event.clientX; gestureRoot = target }
  }
  function flush() {
    cancelAnimationFrame(frame); frame = 0
    if (!pending) return
    moveSlipDrawerGesture(pending.clientX, pending.clientY, pending.pointerType === 'touch') || movePickerGesture(pending.clientY)
    pending = undefined
  }
  function move(event: PointerEvent) {
    if (event.pointerId !== pointer) return
    if (event.pointerType === 'mouse' && event.buttons === 0) { cancel(); return }
    if (pickerGesture) event.preventDefault()
    pending = event
    if (!frame) frame = requestAnimationFrame(flush)
  }
  function up(event: PointerEvent) {
    if (event.pointerId !== pointer) return
    flush(); pointer = undefined
    if (slipDrawerGesture) endSlipDrawerGesture(event.clientX, event.clientY)
    else if (pickerGesture) endPickerGesture(event.clientY)
    else finishGesture(gestureStart, event.clientX, gestureRoot ?? event.target)
    gestureStart = undefined
  }
  function cancel() {
    cancelAnimationFrame(frame); frame = 0; pending = undefined; pointer = undefined
    if (slipDrawerGesture) cancelSlipDrawerGesture()
    if (pickerGesture) { pickerGesture = undefined; renderPickerColumns() }
    gestureStart = undefined; gestureRoot = null
  }
  document.querySelectorAll<HTMLElement>('.q-swiper, .q-slip-drawer').forEach(element => { element.style.touchAction = 'pan-y' })
  document.addEventListener('pointerdown', down)
  document.addEventListener('pointermove', move, { passive: false })
  document.addEventListener('pointerup', up)
  document.addEventListener('pointercancel', cancel)
  return { hydratePicker, handlePickerClick, syncSlipDrawerStates, dispose() { active = false; cancel(); transitions.forEach(cancelAnimationFrame); transitions.clear(); document.removeEventListener('pointerdown', down); document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', cancel) } }
}
