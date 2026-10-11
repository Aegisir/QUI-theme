import type { BlankPageSettings } from './types'
export function createControllers(props: { slug: string }, blank: { index: number; settings: BlankPageSettings }) {
  let infiniteObserver: IntersectionObserver | undefined
  let infiniteLoadTimer: number | undefined
  let infiniteLoadPending = false
  const loadingCircleTimers = new Map<SVGSVGElement, number>()
  let loadingDemoProgress = 0
  let scrollFrame = 0
  const indexes = new WeakMap<HTMLElement, { groups: HTMLElement[]; indicators: HTMLElement[] }>()
  const scrollableTabs = props.slug === 'tab' ? [...document.querySelectorAll<HTMLElement>('#app .q-tab__nav_scrollable')] : []
  const tabTouchActions = scrollableTabs.map(nav => nav.style.touchAction)
  scrollableTabs.forEach(nav => { nav.style.touchAction = 'pan-y' })
  let tabDrag: { nav: HTMLElement; pointerId: number; startX: number; startY: number; startOffset: number; maxOffset: number; transition: string; moved: boolean; cancelled: boolean } | undefined
  let suppressedTabClick: HTMLElement | undefined
  let clearTabClickTimer = 0
  function syncIndexHighlight(content = document.querySelector<HTMLElement>('#app .q-index__content')) {
    if (!content) return
    let cached = indexes.get(content)
    if (!cached?.groups[0]?.isConnected) {
      cached = { groups: [...content.querySelectorAll<HTMLElement>('.q-index__group-label')], indicators: [...(content.closest('.q-index')?.querySelectorAll<HTMLElement>('.q-index__indicator > li') ?? [])] }
      indexes.set(content, cached)
    }
    const { groups, indicators } = cached
    if (!groups.length || groups.length !== indicators.length) return

    const top = content.getBoundingClientRect().top
    let active = 0
    groups.forEach((group, index) => {
      if (group.getBoundingClientRect().top <= top) active = index
    })
    groups.forEach((group, index) => group.classList.toggle('on', index === active))
    indicators.forEach((item, index) => item.classList.toggle('on', index === active))
  }

  function onIndexScroll(event: Event) {
    const content = event.target
    if (props.slug === 'indexes' && content instanceof HTMLElement && content.matches('#app .q-index__content')) {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; syncIndexHighlight(content) })
    }
  }

  function stopInfiniteLoading() {
    infiniteObserver?.disconnect()
    infiniteObserver = undefined
    window.clearTimeout(infiniteLoadTimer)
    infiniteLoadTimer = undefined
    infiniteLoadPending = false
  }

  function stopLoadingProgress() {
    loadingCircleTimers.forEach((timer) => window.clearInterval(timer))
    loadingCircleTimers.clear()
  }

  function setTabOffset(nav: HTMLElement, offset: number, maxOffset = Math.max(0, nav.scrollWidth - (nav.closest<HTMLElement>('.q-tab')?.clientWidth ?? 0))) {
    nav.style.transform = `translate3d(${-Math.max(0, Math.min(maxOffset, offset))}px, 0px, 0px)`
  }

  function onTabPointer(event: PointerEvent) {
    if (event.type === 'pointerdown') {
      const target = event.target
      if (!(target instanceof Element) || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
      const nav = target.closest<HTMLElement>('.q-tab__nav_scrollable')
      const tab = nav?.closest<HTMLElement>('.q-tab')
      if (!nav || !tab || !scrollableTabs.includes(nav)) return
      const transform = new DOMMatrixReadOnly(getComputedStyle(nav).transform)
      tabDrag = { nav, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startOffset: Math.max(0, -transform.m41), maxOffset: Math.max(0, nav.scrollWidth - tab.clientWidth), transition: nav.style.transition, moved: false, cancelled: false }
      return
    }

    const drag = tabDrag
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.type === 'pointermove') {
      const x = event.clientX - drag.startX
      const y = event.clientY - drag.startY
      if (drag.cancelled) return
      if (!drag.moved && Math.abs(y) > 8 && Math.abs(y) > Math.abs(x)) { drag.cancelled = true; return }
      if (!drag.moved && (Math.abs(x) <= 8 || Math.abs(x) <= Math.abs(y))) return
      if (!drag.moved) { drag.moved = true; drag.nav.style.transition = 'none' }
      event.preventDefault()
      setTabOffset(drag.nav, drag.startOffset - x, drag.maxOffset)
      return
    }

    if (drag.moved) {
      drag.nav.style.transition = drag.transition
      if (event.type === 'pointerup') {
        suppressedTabClick = drag.nav
        window.clearTimeout(clearTabClickTimer)
        clearTabClickTimer = window.setTimeout(() => { suppressedTabClick = undefined }, 0)
      }
    }
    tabDrag = undefined
  }

  function suppressDraggedTabClick(event: MouseEvent) {
    const target = event.target
    if (!suppressedTabClick || !(target instanceof Element) || target.closest('.q-tab__nav_scrollable') !== suppressedTabClick) return
    event.preventDefault()
    event.stopImmediatePropagation()
    suppressedTabClick = undefined
    window.clearTimeout(clearTabClickTimer)
  }

  function setLoadingProgress(circle: SVGSVGElement, progress: number) {
    const label = circle.querySelector<SVGTextElement>('.q-loading_circle-text')
    if (!label) return
    label.textContent = `${progress}%`
    circle.querySelectorAll<SVGCircleElement>('.q-loading_circle-inner').forEach((arc) => {
      const radius = Number(arc.getAttribute('r'))
      if (radius) arc.setAttribute('stroke-dasharray', `${(2 * Math.PI * radius * progress / 100).toFixed(1)},1000`)
    })
  }

  function syncLoadingProgress() {
    const circles = props.slug === 'loading' ? [...document.querySelectorAll<SVGSVGElement>('.q-loading_circle')] : []
    const active = new Set(circles)
    loadingCircleTimers.forEach((timer, circle) => {
      if (active.has(circle)) return
      window.clearInterval(timer)
      loadingCircleTimers.delete(circle)
    })
    circles.forEach((circle) => {
      if (loadingCircleTimers.has(circle)) return
      const demoCircle = circle.closest('.circle-loading') !== null
      let progress = demoCircle ? loadingDemoProgress : 0
      setLoadingProgress(circle, progress)
      loadingCircleTimers.set(circle, window.setInterval(() => {
        progress = progress >= 100 ? 0 : progress + 10
        if (demoCircle) loadingDemoProgress = progress
        setLoadingProgress(circle, progress)
      }, 1000))
    })
  }

  function observeInfiniteLoading() {
    const scroller = document.querySelector<HTMLElement>('.infinite-loading-demo')
    const list = scroller?.querySelector<HTMLElement>('.infinite-loading-list')
    const sentinel = scroller?.querySelector<HTMLElement>('.q-infinite-loading [class*="__more"]')
    if (!scroller || !list || !sentinel || !('IntersectionObserver' in window)) return

    infiniteObserver = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || infiniteLoadPending) return
      infiniteLoadPending = true
      sentinel.innerHTML = '<div class="q-infinite-loading__next"><div class="q-loading q-loading_normal"><div class="q-loading__inner"><div class="q-loading__icon q-loading__icon-gray"></div><span class="q-loading__txt-tips">加载中</span></div></div></div>'
      infiniteLoadTimer = window.setTimeout(() => {
        const count = list.children.length
        list.insertAdjacentHTML('beforeend', Array.from({ length: 30 }, (_, index) => `<li class="list-item">${count + index + 1}</li>`).join(''))
        sentinel.innerHTML = '<!---->'
        infiniteLoadTimer = undefined
        infiniteLoadPending = false
      }, 250)
    }, { root: scroller })
    infiniteObserver.observe(sentinel)
  }

  function setBlankPageSlide(index: number, animate = true) {
    const swiper = document.querySelector<HTMLElement>('#app .q-swiper')
    const list = swiper?.querySelector<HTMLElement>('.q-swiper__list')
    if (!swiper || !list) return
    const count = list.querySelectorAll('.q-swiper__item').length
    if (!count) return
    blank.index = Math.max(0, Math.min(index, count - 1))
    swiper.scrollLeft = 0
    list.style.transition = animate ? 'transform 0.5s' : 'none'
    list.style.transform = `translate3d(${-blank.index * swiper.clientWidth}px, 0px, 0px)`
    swiper.querySelectorAll('.q-swiper__indicator-item').forEach((item, index) => {
      item.classList.toggle('on', index === blank.index)
    })
  }

  function applyBlankPageSettings() {
    const contentSelectors = ['.blank-page-button', '.q-blank-page__title', '.q-blank-page__desc']
    document.querySelectorAll<HTMLElement>('#app .container .q-blank-page').forEach((page) => {
      page.classList.toggle('q-blank-page_fullscreen', blank.settings[0])
      page.querySelectorAll<HTMLElement>('.q-icon').forEach((icon) => {
        icon.style.fontSize = blank.settings[0] ? '100px' : '80px'
      })
      contentSelectors.forEach((selector, index) => {
        page.querySelectorAll<HTMLElement>(selector).forEach((element) => {
          element.style.display = blank.settings[index + 1] ? '' : 'none'
        })
      })
      page.querySelectorAll<HTMLElement>('.blank-page-button').forEach((button) => {
        button.classList.toggle('q-button_medium', blank.settings[0])
        button.classList.toggle('q-button_small', !blank.settings[0])
      })
    })
    document.querySelectorAll<HTMLElement>('.q-popup [role="switch"]').forEach((control, index) => {
      const checked = blank.settings[index]
      if (checked === undefined) return
      control.setAttribute('aria-checked', String(checked))
      control.classList.toggle('q-switch_checked', checked)
    })
  }

  function selectTabItem(tabItem: HTMLElement) {
    const tab = tabItem.closest<HTMLElement>('.q-tab')
    const nav = tabItem.parentElement
    if (!tab || !nav) return

    const items = [...nav.children]
    const index = items.indexOf(tabItem)
    if (index < 0) return

    items.forEach((item, itemIndex) => {
      const selected = itemIndex === index
      item.classList.toggle('on', selected)
      if (selected) item.setAttribute('aria-selected', 'true')
      else item.removeAttribute('aria-selected')
    })

    if (nav.matches('.q-tab__nav_scrollable')) {
      const navRect = nav.getBoundingClientRect()
      const itemRect = tabItem.getBoundingClientRect()
      setTabOffset(nav, itemRect.left - navRect.left + itemRect.width / 2 - tab.clientWidth / 2)
    }

    const content = tab.querySelector<HTMLElement>('.q-tab__content')
    if (content) content.style.transform = `translate3d(${-tab.offsetWidth * index}px, 0px, 0px)`
  }

  function adjustProgressDemo(element: Element) {
    const label = element.closest('button')?.textContent?.trim()
    const step = label === '+' ? 10 : label === '-' ? -10 : 0
    if (!step) return false
    document.querySelectorAll<HTMLElement>('.progress-demo .q-progress').forEach((progress) => {
      const bar = progress.querySelector<HTMLElement>('.q-progress__inner')
      const current = Number.parseFloat(bar?.style.width ?? '')
      if (!bar || !Number.isFinite(current)) return
      const value = Math.max(0, Math.min(100, current + step))
      bar.style.width = `${value}%`
      const text = progress.querySelector<HTMLElement>('.q-progress__text') ?? progress.querySelector<HTMLElement>('span')
      if (text) text.textContent = text.classList.contains('q-progress__text') ? `${value}%` : `LV${Math.floor(value / 10)}`
    })
    return true
  }

  function copyWithSelection(text: string): boolean {
    const input = document.createElement('textarea')
    input.value = text
    input.setAttribute('readonly', '')
    input.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0'
    document.body.append(input)
    input.focus()
    input.select()
    input.setSelectionRange(0, text.length)
    try {
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      input.remove()
    }
  }

  function copyText(text: string): Promise<boolean> {
    const clipboard = navigator.clipboard
    if (!clipboard?.writeText) return Promise.resolve(copyWithSelection(text))
    try {
      return clipboard.writeText(text).then(() => true, () => copyWithSelection(text))
    } catch {
      return Promise.resolve(copyWithSelection(text))
    }
  }
  if (props.slug === 'indexes') document.addEventListener('scroll', onIndexScroll, true)
  if (scrollableTabs.length) {
    document.addEventListener('pointerdown', onTabPointer)
    document.addEventListener('pointermove', onTabPointer)
    document.addEventListener('pointerup', onTabPointer)
    document.addEventListener('pointercancel', onTabPointer)
    document.addEventListener('click', suppressDraggedTabClick, true)
  }
  return { syncIndexHighlight, syncLoadingProgress, observeInfiniteLoading, setBlankPageSlide, applyBlankPageSettings, selectTabItem, adjustProgressDemo, copyText, dispose() {
    stopInfiniteLoading(); stopLoadingProgress(); cancelAnimationFrame(scrollFrame); document.removeEventListener('scroll', onIndexScroll, true)
    if (scrollableTabs.length) {
      document.removeEventListener('pointerdown', onTabPointer); document.removeEventListener('pointermove', onTabPointer); document.removeEventListener('pointerup', onTabPointer); document.removeEventListener('pointercancel', onTabPointer); document.removeEventListener('click', suppressDraggedTabClick, true)
      window.clearTimeout(clearTabClickTimer); suppressedTabClick = undefined
      if (tabDrag) tabDrag.nav.style.transition = tabDrag.transition
      tabDrag = undefined
      scrollableTabs.forEach((nav, index) => { nav.style.touchAction = tabTouchActions[index] })
    }
  } }
}
