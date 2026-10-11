<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { QuiReplicaRenderer, type ReplicaTarget } from '@qui-theme/ui'
import { entries, routeFor } from '../catalog'
import { pageVariant, loadMarkup, loadInteractions, loadMotions, prepareStyles } from '../replica/resources'
import type { InteractionMap, InteractionState, MotionManifest, BlankPageSettings, ScrollState } from '../replica/types'
import type { createMotion } from '../replica/motion'
import type { createControllers } from '../replica/controllers'
import type { createGestures } from '../replica/gestures'

const props = defineProps<{ slug: string }>()
const baseMarkup = ref('')
const markup = ref('')
const portalMarkup = ref('')
const themeTarget = shallowRef<HTMLElement | null>(null)
const interactions = shallowRef<InteractionMap>({})
const motions = shallowRef<MotionManifest>({ routes: {} })
const baseBodyStyle = ref(document.body.getAttribute('style') ?? '')
const narrow = ref(window.innerWidth < 600)
const variantKey = computed(() => narrow.value ? 'mobile' : 'desktop')
const error = ref('')
const busy = ref(true)
const blank: { index: number; settings: BlankPageSettings } = { index: 0, settings: [true, true, true, true] }
const pickerSelections = new Map<string, string[]>()
let motion: ReturnType<typeof createMotion> | undefined
let controllers: ReturnType<typeof createControllers> | undefined
let gestures: ReturnType<typeof createGestures> | undefined
let mediaQuery: MediaQueryList | undefined
let loading = 0
let rendered = 0
let request: AbortController | undefined
let ready: Promise<void> | undefined
let readyFailed = false
let interactionTimer: number | undefined
let activeInteraction = ''
let interactionScrolls: ScrollState[] = []
let overlayClosing = false
let authorizationReturnInteraction = ''
let captureRestoreListener: (() => void) | undefined
let captureAutoCloseListener: (() => void) | undefined

function cancelAnimations() {
  motion?.cancelAnimations()
  if (captureRestoreListener) window.removeEventListener('qui-motion-capture-settled', captureRestoreListener)
  captureRestoreListener = undefined
}
function disposeRuntime() {
  window.clearTimeout(interactionTimer)
  clearCaptureAutoClose(); cancelAnimations(); motion?.stopAutoplay(); gestures?.dispose(); controllers?.dispose()
  motion = undefined; controllers = undefined; gestures = undefined
  document.body.setAttribute('style', baseBodyStyle.value)
}
async function prepareRuntime(version: number, slug: string, device: 'mobile' | 'desktop', signal: AbortSignal, bodyReady: Promise<unknown>) {
  const page = pageVariant(slug, device)
  const controllerReady = slug === 'icon' ? bodyReady : Promise.resolve()
  const [states, phases, motionModule, controllersModule, gestureModule, districts] = await Promise.all([
    loadInteractions(page, signal), loadMotions(page, signal),
    page.motion || ['swiper', 'avatar'].includes(slug) ? controllerReady.then(() => import('../replica/motion')) : undefined,
    slug !== 'index' ? controllerReady.then(() => import('../replica/controllers')) : undefined,
    ['area', 'picker', 'datetime-picker', 'swiper', 'slip-drawer', 'blank-page'].includes(slug) ? import('../replica/gestures') : undefined,
    slug === 'area' ? import('@qui-theme/ui/regions').then(module => module.loadRegions()) : [],
  ])
  await bodyReady
  if (version !== loading) return
  signal.throwIfAborted()
  interactions.value = { [device]: states }
  motions.value = { routes: { [slug]: { [device]: phases } } }
  controllers = controllersModule?.createControllers(props, blank)
  motion = motionModule?.createMotion(props, variantKey, motions)
  gestures = gestureModule?.createGestures(props, districts, () => activeInteraction, scheduleRestore, blank, index => controllers?.setBlankPageSlide(index), (root, direction) => motion?.slideSwiper(root, direction), pickerSelections)
  await nextTick()
  if (version !== loading) return
  if (slug === 'indexes') {
    const content = document.querySelector<HTMLElement>('#app .q-index__content')
    if (content) content.scrollTop = 1288
    controllers?.syncIndexHighlight()
  }
  controllers?.syncLoadingProgress()
  if (slug === 'swiper') motion?.syncSwiperPositions()
  if (slug === 'infinite-loading') controllers?.observeInfiniteLoading()
  motion?.startAutoplay()
}
function startRuntime(version: number, slug: string, device: 'mobile' | 'desktop', signal: AbortSignal, bodyReady = Promise.resolve()) {
  readyFailed = false
  ready = prepareRuntime(version, slug, device, signal, bodyReady).catch(cause => {
    if (version === loading && !signal.aborted) { readyFailed = true; error.value = '交互资源加载失败，请重试' }
    throw cause
  })
  void ready.catch(() => {})
  return ready
}
function ensureReady() {
  if (readyFailed && request) { error.value = ''; return startRuntime(loading, props.slug, variantKey.value, request.signal) }
  return ready
}
async function loadPage() {
  const version = ++loading
  request?.abort(); disposeRuntime(); request = new AbortController()
  const { signal } = request
  const slug = props.slug
  const device = variantKey.value
  const page = pageVariant(slug, device)
  error.value = ''; busy.value = true; readyFailed = false; ready = undefined
  blank.index = 0; blank.settings = [true, true, true, true]
  activeInteraction = ''; authorizationReturnInteraction = ''; portalMarkup.value = ''
  interactions.value = {}; motions.value = { routes: {} }
  if (/Windows/i.test(navigator.userAgent)) document.documentElement.classList.add('is-win')
  baseBodyStyle.value = document.body.getAttribute('style') ?? ''
  try {
    const bodyReady = Promise.all([loadMarkup(page, signal), prepareStyles(page.styles, signal)]).then(async ([html, commitStyles]) => {
      if (version !== loading) return
      // Commit CSS and markup before the next paint, keeping the previous page intact while loading.
      themeTarget.value = null
      commitStyles(); rendered = version
      document.title = entries.find(entry => entry.slug === slug)?.title ?? 'Web 组件库'
      baseMarkup.value = html; markup.value = html; busy.value = false
      await nextTick()
      if (version === loading) themeTarget.value = document.querySelector('[data-qui-theme]')
    })
    const runtime = startRuntime(version, slug, device, signal, bodyReady)
    await bodyReady
    await runtime
  } catch (cause) {
    if (version === loading && !signal.aborted) {
      if (busy.value) request?.abort()
      busy.value = false; error.value = cause instanceof Error ? cause.message : '加载失败，请重试'
    }
  }
}

function onResizeChange(event: MediaQueryListEvent) {
  narrow.value = event.matches
}

function onSwiperResize() {
  if (props.slug !== 'swiper') return
  motion?.stopAutoplay()
  motion?.syncSwiperPositions()
  motion?.startAutoplay()
}

function navigate(text: string): boolean {
  const normalized = text.trim().replace(/\s+/g, ' ')
  const entry = entries.find((item) => item.label === normalized || item.title === normalized)
  if (!entry) return false
  window.location.hash = routeFor(entry.slug)
  return true
}

function restorePage() {
  window.clearTimeout(interactionTimer)
  motion?.stopAutoplay()
  clearCaptureAutoClose()
  cancelAnimations()
  overlayClosing = false
  activeInteraction = ''
  authorizationReturnInteraction = ''
  markup.value = baseMarkup.value
  portalMarkup.value = ''
  document.body.setAttribute('style', baseBodyStyle.value)
  const root = document.querySelector<HTMLElement>('#app .container')
  for (const path of [[], ...interactionScrolls.map(scroll => scroll.path)]) {
    const target = path.reduce<HTMLElement | null>((node, index) => node?.children.item(index) as HTMLElement | null, root)
    if (target) { target.scrollTop = 0; target.scrollLeft = 0 }
  }
  interactionScrolls = []
  const indexContent = document.querySelector<HTMLElement>('#app .q-index__content')
  if (indexContent) indexContent.scrollTop = 1288
  const version = loading
  void nextTick().then(() => {
    if (version !== loading) return
    controllers?.syncLoadingProgress()
    if (props.slug === 'indexes') controllers?.syncIndexHighlight()
    if (props.slug === 'swiper') motion?.syncSwiperPositions()
    if (props.slug === 'blank-page') {
      controllers?.setBlankPageSlide(blank.index, false)
      controllers?.applyBlankPageSettings()
    }
    if (props.slug === 'slip-drawer') gestures?.syncSlipDrawerStates()
    motion?.startAutoplay()
  })
}

function clearCaptureAutoClose() {
  if (captureAutoCloseListener) window.removeEventListener('qui-motion-capture-enter-settled', captureAutoCloseListener)
  captureAutoCloseListener = undefined
}

function scheduleRestore() {
  if (props.slug === 'popup' || props.slug === 'bottom-sheet') {
    if (overlayClosing) return
    overlayClosing = true
    document.querySelectorAll<HTMLElement>('.q-popup__mask, .q-bottom-sheet__mask').forEach((mask) => {
      mask.style.pointerEvents = 'none'
    })
  }
  window.clearTimeout(interactionTimer)
  const duration = motion?.playMotion(activeInteraction, 'leave') ?? 0
  if (duration && (window as Window & { __QUI_MOTION_CAPTURE__?: boolean }).__QUI_MOTION_CAPTURE__) {
    captureRestoreListener = restorePage
    window.addEventListener('qui-motion-capture-settled', captureRestoreListener, { once: true })
  } else if (duration) interactionTimer = window.setTimeout(restorePage, duration)
  else restorePage()
}

function applyState(interaction: string, state: InteractionState, playEnter = true) {
  window.clearTimeout(interactionTimer)
  motion?.stopAutoplay()
  clearCaptureAutoClose()
  cancelAnimations()
  overlayClosing = false
  activeInteraction = interaction
  interactionScrolls = state.scrolls ?? []
  markup.value = state.markup ?? baseMarkup.value
  portalMarkup.value = state.portals.join('')
  const version = loading
  void nextTick().then(() => {
    if (version !== loading) return
    controllers?.syncLoadingProgress()
    const root = document.querySelector<HTMLElement>('#app .container')
    for (const scroll of state.scrolls ?? []) {
      const target = scroll.path.reduce<HTMLElement | null>((node, index) => node?.children.item(index) as HTMLElement | null, root)
      if (target) {
        target.scrollTop = scroll.top
        target.scrollLeft = scroll.left
      }
    }
    if (props.slug === 'indexes') controllers?.syncIndexHighlight()
    if (props.slug === 'blank-page') {
      controllers?.setBlankPageSlide(blank.index, false)
      controllers?.applyBlankPageSettings()
    }
    if (props.slug === 'slip-drawer') gestures?.syncSlipDrawerStates()
    if (props.slug === 'area' || props.slug === 'datetime-picker' || props.slug === 'picker') gestures?.hydratePicker(interaction)
    void nextTick().then(() => {
      if (version !== loading) return
      if (playEnter) motion?.playMotion(interaction, 'enter')
      motion?.startAutoplay()
    })
  })
  const duration = motions.value.routes[props.slug]?.[variantKey.value]?.[interaction]?.autoCloseMs ?? 0
  if (duration && (window as Window & { __QUI_MOTION_CAPTURE__?: boolean }).__QUI_MOTION_CAPTURE__) {
    captureAutoCloseListener = () => {
      captureAutoCloseListener = undefined
      interactionTimer = window.setTimeout(scheduleRestore, duration)
    }
    window.addEventListener('qui-motion-capture-enter-settled', captureAutoCloseListener, { once: true })
  } else if (duration) interactionTimer = window.setTimeout(scheduleRestore, duration)
}

function matchAuthorizationCardHeight(state: InteractionState) {
  const height = document.querySelector<HTMLElement>('.qui-replica-portals .q-authorization-wrapper')?.style.height
  if (!height) return state
  const portals = state.portals.map((markup) => {
    const template = document.createElement('template')
    template.innerHTML = markup
    const wrapper = template.content.querySelector<HTMLElement>('.q-authorization-wrapper')
    if (wrapper) wrapper.style.height = height
    return template.innerHTML
  })
  return { ...state, portals }
}

async function onClick(target: ReplicaTarget) {
  const { element, buttonIndex, controlIndex } = target
  const label = element.closest('.q-list')?.querySelector('.q-list__title-txt')?.textContent
  if (label && navigate(label)) return
  if (rendered !== loading) return
  const version = loading
  try { await ensureReady() } catch { return }
  if (version !== loading || !element.isConnected) return
  if (props.slug === 'authorization') {
    const states = interactions.value[variantKey.value]
    if (element.closest('.q-authorization-header__right') && activeInteraction !== 'authorization-info') {
      const state = states?.['authorization-info']
      if (state) {
        authorizationReturnInteraction = activeInteraction || '0'
        applyState('authorization-info', matchAuthorizationCardHeight(state))
      }
      return
    }
    if (activeInteraction === 'authorization-info' && element.closest('.q-authorization-header__left')) {
      const interaction = authorizationReturnInteraction || '0'
      const state = states?.[interaction]
      authorizationReturnInteraction = ''
      if (!state) return
      const duration = motion?.playMotion('authorization-info', 'leave') ?? 0
      if (duration) interactionTimer = window.setTimeout(() => applyState(interaction, state, false), duration)
      else applyState(interaction, state, false)
      return
    }
    if (activeInteraction === 'authorization-info' && element.closest('button, .q-popup__mask, .q-bottom-sheet__mask')) {
      activeInteraction = authorizationReturnInteraction || '0'
      authorizationReturnInteraction = ''
    }
  }
  if (props.slug === 'action-sheet') {
    const option = element.closest('.q-action-sheet__menu')
    if (option) {
      if (activeInteraction === '3') {
        const index = [...document.querySelectorAll('.qui-replica-portals .q-action-sheet__menu')].indexOf(option)
        const state = interactions.value[variantKey.value]?.[`3-selected-${index}`]
        if (state) applyState('3', state, false)
      }
      return
    }
  }
  if (props.slug === 'toast' && element.closest('.q-toast.clickable')) {
    window.location.assign('https://im.qq.com/index/#/')
    return
  }
  if (props.slug === 'blank-page') {
    const settingSwitch = element.closest('.q-popup [role="switch"]')
    if (settingSwitch) {
      const index = [...document.querySelectorAll('.q-popup [role="switch"]')].indexOf(settingSwitch)
      if (index >= 0 && index < blank.settings.length) {
        blank.settings[index] = !blank.settings[index]
        controllers?.applyBlankPageSettings()
      }
      return
    }
  }
  if ((props.slug === 'area' || props.slug === 'datetime-picker' || props.slug === 'picker') && gestures?.handlePickerClick(element)) return
  if (props.slug === 'progress' && controllers?.adjustProgressDemo(element)) return
  const popup = element.closest('.q-popup__content, .q-dialog__box, .q-bottom-sheet__content_bottom')
  if (popup && !popup.matches('[style*="display: none"]')) {
    if (element.closest('button, a, [role="button"], .q-popup__mask, .q-dialog__mask, .q-bottom-sheet__mask')) {
      scheduleRestore()
    }
    return
  }
  if (element.closest('.q-popup__mask, .q-bottom-sheet__mask')) {
    scheduleRestore()
    return
  }
  const tabItem = element.closest('.q-tab__item, .q-tab__item-capsule')
  if (tabItem instanceof HTMLElement) {
    controllers?.selectTabItem(tabItem)
    return
  }
  const states = interactions.value[variantKey.value]
  const iconItem = element.closest('.qui-icon_item')
  const baseInteraction = buttonIndex >= 0 ? String(buttonIndex) : iconItem ? 'target-0' : `target-${controlIndex}`
  const alternateInteraction = `${baseInteraction}-alt`
  const interaction = activeInteraction === baseInteraction && states?.[alternateInteraction]
    ? alternateInteraction
    : activeInteraction === alternateInteraction ? baseInteraction : baseInteraction
  const state = states?.[interaction] ?? states?.[baseInteraction]
  if (iconItem) {
    const name = iconItem.querySelector('.qui-icon_name')?.textContent?.trim()
    if (!name) return
    void controllers?.copyText(`<${name} />`).then((copied) => {
      if (copied && state && version === loading) applyState(interaction, state)
    })
    return
  }
  if (state) {
    applyState(interaction, state)
    return
  }
  const tabbarItem = element.closest('.q-tabbar-item')
  if (tabbarItem && !state) {
    const parent = tabbarItem.parentElement
    parent?.querySelectorAll('.on').forEach((item) => item.classList.remove('on'))
    tabbarItem.classList.add('on')
  }
}

function onInput(input: HTMLInputElement | HTMLTextAreaElement) {
  const field = input.closest('.q-input')
  const counter = field?.querySelector('.q-input__indicator')
  if (counter) {
    const limit = input.maxLength > 0 ? input.maxLength : Number(counter.textContent?.match(/\/(\d+)/)?.[1] ?? 0)
    counter.textContent = `${input.value.length}/${limit}字`
  }
  const search = input.closest('.q-search-bar')
  if (search && input.value) search.classList.add('q-search-bar--focus')
}

function onChange(input: HTMLInputElement | HTMLSelectElement) {
  const checkbox = input.closest('.q-checkbox__icon')
  if (checkbox && input instanceof HTMLInputElement) checkbox.classList.toggle('q-checkbox_checked', input.checked)
}

watch([() => props.slug, variantKey], () => { void loadPage() }, { immediate: true })
onMounted(() => {
  mediaQuery = window.matchMedia('(max-width: 599px)')
  mediaQuery.addEventListener('change', onResizeChange)
  window.addEventListener('resize', onSwiperResize)
})
onBeforeUnmount(() => {
  loading++; request?.abort(); disposeRuntime()
  mediaQuery?.removeEventListener('change', onResizeChange)
  window.removeEventListener('resize', onSwiperResize)
  document.querySelectorAll('link[data-reference-style]:not([data-reference-shared])').forEach(link => link.remove())
})
</script>

<template>
  <div v-if="error" role="alert">{{ error }} <button type="button" @click="loadPage">重试</button></div>
  <QuiReplicaRenderer :markup="markup" :portals="portalMarkup" :aria-busy="busy" @click="onClick" @input="onInput" @change="onChange" />
  <Teleport v-if="themeTarget" :to="themeTarget"><slot name="theme" /></Teleport>
</template>
