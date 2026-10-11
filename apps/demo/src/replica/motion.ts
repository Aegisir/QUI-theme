import type { Ref } from 'vue'
import type { MotionManifest, AutoplayTrack } from './types'
export function createMotion(props: { slug: string }, variantKey: Ref<'mobile' | 'desktop'>, motions: Ref<MotionManifest>) {
  let activeAnimations: Animation[] = []
  let captureAutoplayListener: (() => void) | undefined
  let autoplayTimers: number[] = []
  let autoplayAnimations: Animation[] = []
  let animationGeneration = 0
  let autoplayGeneration = 0
  function cancelAnimations() {
    animationGeneration++
    activeAnimations.forEach((animation) => animation.cancel())
    activeAnimations = []
  }

  function stopAutoplay() {
    autoplayGeneration++
    autoplayTimers.forEach((timer) => window.clearTimeout(timer))
    autoplayTimers = []
    if (captureAutoplayListener) window.removeEventListener('qui-motion-capture-autoplay-settled', captureAutoplayListener)
    captureAutoplayListener = undefined
    autoplayAnimations.forEach((animation) => animation.cancel())
    autoplayAnimations = []
    activeAnimations = activeAnimations.filter((animation) => {
      if (!animation.id.includes(':autoplay:')) return true
      animation.cancel()
      return false
    })
  }

  function setAutoplayState(track: AutoplayTrack, slide: number, dotIndex: number) {
    const root = document.querySelectorAll<HTMLElement>('.q-swiper')[track.rootIndex]
    root?.querySelectorAll('.q-swiper__indicator-item').forEach((dot, index) => dot.classList.toggle('on', index === dotIndex))
    const counter = root?.querySelector<HTMLElement>('.custom-indicator')
    if (counter) counter.textContent = `${slide} / ${track.childCount - 2}`
  }

  function visibleMotionTargets(selector: string) {
    return [...document.querySelectorAll(selector)].filter((element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    })
  }

  function autoplayTransform(index: number, width: number) {
    return `translate3d(${-Math.round(index * width * 1000) / 1000}px, 0px, 0px)`
  }

  function swiperStepWidth() {
    return Math.max(0, window.innerWidth - 32)
  }

  function swiperSlideCount(root: HTMLElement, list: HTMLElement) {
    const dots = root.querySelectorAll('.q-swiper__indicator-item').length
    const total = Number(root.querySelector('.custom-indicator')?.textContent?.match(/\/\s*(\d+)/)?.[1])
    return dots || total || Math.max(0, list.children.length - 2)
  }

  function swiperSlideIndex(root: HTMLElement, list: HTMLElement, count: number) {
    const activeDot = [...root.querySelectorAll('.q-swiper__indicator-item')].findIndex((dot) => dot.classList.contains('on'))
    const current = Number(root.querySelector('.custom-indicator')?.textContent?.match(/^\s*(\d+)/)?.[1]) - 1
    if (activeDot >= 0) return activeDot
    if (Number.isFinite(current) && current >= 0) return Math.min(count - 1, current)
    let offset = 0
    try { offset = new DOMMatrixReadOnly(getComputedStyle(list).transform).m41 } catch {}
    const looped = list.children.length > count
    return Math.max(0, Math.min(count - 1, Math.round(-offset / swiperStepWidth()) - (looped ? 1 : 0)))
  }

  function setSwiperTransform(list: HTMLElement, index: number, width: number, transition = list.style.transition) {
    list.style.transition = 'none'
    list.style.transform = autoplayTransform(index, width)
    void list.offsetWidth
    if (transition) list.style.transition = transition
    else list.style.removeProperty('transition')
  }

  function syncSwiperPositions() {
    const width = swiperStepWidth()
    document.querySelectorAll<HTMLElement>('#app .q-swiper').forEach((root) => {
      const list = root.querySelector<HTMLElement>('.q-swiper__list')
      if (!list) return
      const count = swiperSlideCount(root, list)
      if (!count) return
      const index = swiperSlideIndex(root, list, count) + (list.children.length > count ? 1 : 0)
      list.getAnimations().forEach((animation) => animation.cancel())
      setSwiperTransform(list, index, width)
    })
  }

  function swiperTrackPosition(track: AutoplayTrack) {
    const root = document.querySelectorAll<HTMLElement>('#app .q-swiper')[track.rootIndex]
    const list = root?.querySelector<HTMLElement>('.q-swiper__list')
    if (!root || !list) return { index: track.initialIndex, dot: track.initialDot }
    const count = Math.max(1, track.childCount - 2)
    const slide = swiperSlideIndex(root, list, count)
    return { index: slide + 1, dot: track.dotCount ? slide : -1 }
  }

  function setSwiperIndicator(root: HTMLElement, slide: number, count: number) {
    root.querySelectorAll('.q-swiper__indicator-item').forEach((dot, index) => dot.classList.toggle('on', index === slide))
    const counter = root.querySelector<HTMLElement>('.custom-indicator')
    if (counter) counter.textContent = `${slide + 1} / ${count}`
  }

  function swiperTransitionDuration(root: HTMLElement) {
    const rootIndex = [...document.querySelectorAll<HTMLElement>('#app .q-swiper')].indexOf(root)
    const route = motions.value.routes[props.slug]?.[variantKey.value]
    const track = route?.autoplay?.autoplay?.tracks.find((item) => item.rootIndex === rootIndex)
    const gesture = route?.['gesture-left']?.enter?.find((item) => item.selector.includes('q-swiper__list') && item.index === rootIndex)
    return track?.timing.duration ?? gesture?.timing.duration ?? 500
  }

  function slideSwiper(root: HTMLElement, direction: 'left' | 'right') {
    const list = root.querySelector<HTMLElement>('.q-swiper__list')
    if (!list) return
    stopAutoplay()
    const generation = autoplayGeneration
    syncSwiperPositions()
    const count = swiperSlideCount(root, list)
    if (!count) return
    const looped = list.children.length > count
    const current = swiperSlideIndex(root, list, count)
    const delta = direction === 'left' ? 1 : -1
    const next = looped ? (current + delta + count) % count : Math.max(0, Math.min(count - 1, current + delta))
    if (next === current) {
      startAutoplay()
      return
    }
    const index = (looped ? current + 1 : current) + delta
    const wraps = looped && (index < 1 || index > count)
    const width = swiperStepWidth()
    const duration = swiperTransitionDuration(root)
    const target = autoplayTransform(index, width)
    setSwiperIndicator(root, next, count)
    const animation = list.animate([{ transform: getComputedStyle(list).transform }, { transform: target }], {
      duration,
      easing: 'ease',
      fill: 'both',
    })
    autoplayAnimations.push(animation)
    animation.finished.then(() => {
      if (generation !== autoplayGeneration || !list.isConnected) return
      animation.cancel()
      const settledIndex = wraps ? (delta > 0 ? 1 : count) : index
      setSwiperTransform(list, settledIndex, width, `transform ${duration}ms`)
      startAutoplay()
    }).catch(() => {})
  }

  function advanceAutoplayTrack(track: AutoplayTrack, index: number, dot: number) {
    const generation = autoplayGeneration
    const target = visibleMotionTargets(track.selector)[track.index]
    if (!target || !(target instanceof HTMLElement)) return
    const nextIndex = index + 1
    const wraps = nextIndex >= track.childCount - 1
    const nextDot = track.dotCount ? (dot + 1) % track.dotCount : -1
    const width = swiperStepWidth()
    const endTransform = autoplayTransform(nextIndex, width)
    target.style.transition = `transform ${track.timing.duration}ms`
    setAutoplayState(track, wraps ? 1 : nextIndex, nextDot)
    const animation = target.animate([{ transform: getComputedStyle(target).transform }, { transform: endTransform }], {
      ...track.timing,
      delay: 0,
      fill: 'both',
      iterations: 1,
    })
    autoplayAnimations.push(animation)
    animation.finished.then(() => {
      if (generation !== autoplayGeneration || !target.isConnected) return
      target.style.transform = endTransform
      animation.cancel()
      autoplayAnimations = autoplayAnimations.filter((item) => item !== animation)
      const currentIndex = wraps ? 1 : nextIndex
      const currentDot = wraps ? 0 : nextDot
      if (wraps) {
        setSwiperTransform(target, currentIndex, width, `transform ${track.timing.duration}ms`)
        setAutoplayState(track, currentIndex, currentDot)
      }
      autoplayTimers.push(window.setTimeout(() => advanceAutoplayTrack(track, currentIndex, currentDot), track.rest))
    }).catch(() => {})
  }

  function finishCapturedAutoplayTrack(track: AutoplayTrack) {
    const motion = motions.value.routes[props.slug]?.[variantKey.value]?.autoplay
    const descriptor = motion?.enter?.find((item) => item.selector === track.selector && item.index === track.index)
    const target = visibleMotionTargets(track.selector)[track.index]
    const endpoint = descriptor?.keyframes.at(-1)?.transform
    if (target instanceof HTMLElement && typeof endpoint === 'string') target.style.transform = endpoint
    const animation = descriptor && activeAnimations.find((item) => item.id === descriptor.id)
    if (animation) {
      animation.cancel()
      activeAnimations = activeAnimations.filter((item) => item !== animation)
    }
    const nextIndex = track.initialIndex + 1
    const wraps = nextIndex >= track.childCount - 1
    const nextDot = track.dotCount ? (track.initialDot + 1) % track.dotCount : -1
    const currentIndex = wraps ? 1 : nextIndex
    const currentDot = wraps ? 0 : nextDot
    if (wraps && target instanceof HTMLElement) {
      setSwiperTransform(target, currentIndex, swiperStepWidth())
      setAutoplayState(track, currentIndex, currentDot)
    }
    autoplayTimers.push(window.setTimeout(() => advanceAutoplayTrack(track, currentIndex, currentDot), track.rest))
  }

  function startAvatarAutoplay() {
    const generation = autoplayGeneration
    document.querySelectorAll<HTMLElement>('.q-avatar_carousel').forEach((carousel) => {
      const images = [...carousel.querySelectorAll<HTMLElement>(':scope > img')]
      if (images.length < 2) return

      let currentIndex = Math.max(0, images.findIndex((image) => getComputedStyle(image).display !== 'none'))
      const advance = () => {
        const current = images[currentIndex]
        const nextIndex = (currentIndex + 1) % images.length
        const next = images[nextIndex]
        next.style.removeProperty('display')

        const outgoingTransform = current.animate([
          { transform: 'none' },
          { transform: 'translateX(-18px) scale(0.82)' },
        ], { duration: 300, easing: 'ease', fill: 'both' })
        const outgoingOpacity = current.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 300,
          easing: 'ease',
          fill: 'both',
        })
        const incomingTransform = next.animate([
          { transform: 'translateX(18px) scale(0.82)' },
          { transform: 'none' },
        ], { duration: 400, easing: 'ease', fill: 'both' })
        const incomingOpacity = next.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 200,
          easing: 'ease',
          fill: 'both',
        })
        const animations = [outgoingTransform, outgoingOpacity, incomingTransform, incomingOpacity]
        autoplayAnimations.push(...animations)
        currentIndex = nextIndex

        incomingTransform.finished.then(() => {
          if (generation !== autoplayGeneration || !carousel.isConnected) return
          current.style.display = 'none'
          animations.forEach((animation) => animation.cancel())
          autoplayAnimations = autoplayAnimations.filter((animation) => !animations.includes(animation))
        }).catch(() => {})

        autoplayTimers.push(window.setTimeout(advance, 1500))
      }

      autoplayTimers.push(window.setTimeout(advance, 1500))
    })
  }

  function startAutoplay() {
    stopAutoplay()
    const captureWindow = window as Window & { __QUI_MOTION_CAPTURE__?: boolean; __QUI_AUTOPLAY_CAPTURE__?: boolean }
    if (captureWindow.__QUI_MOTION_CAPTURE__ && !captureWindow.__QUI_AUTOPLAY_CAPTURE__) return
    if (props.slug === 'avatar') {
      startAvatarAutoplay()
      return
    }
    if (props.slug !== 'swiper') return
    const motion = motions.value.routes[props.slug]?.[variantKey.value]?.autoplay
    const tracks = motion?.autoplay?.tracks ?? []
    if (!tracks.length) return
    if (!captureWindow.__QUI_MOTION_CAPTURE__) {
      tracks.forEach((track) => autoplayTimers.push(window.setTimeout(() => {
        const position = swiperTrackPosition(track)
        advanceAutoplayTrack(track, position.index, position.dot)
      }, track.delay)))
      return
    }
    const timer = window.setTimeout(() => {
      tracks.forEach((track) => setAutoplayState(track, track.initialIndex + 1, track.dotCount ? (track.initialDot + 1) % track.dotCount : -1))
      playMotion('autoplay', 'enter')
      if (captureWindow.__QUI_MOTION_CAPTURE__) {
        captureAutoplayListener = () => {
          captureAutoplayListener = undefined
          tracks.forEach(finishCapturedAutoplayTrack)
        }
        window.addEventListener('qui-motion-capture-autoplay-settled', captureAutoplayListener, { once: true })
      } else {
        tracks.forEach((track) => autoplayTimers.push(window.setTimeout(() => finishCapturedAutoplayTrack(track), track.timing.duration)))
      }
    }, Math.min(...tracks.map((track) => track.delay)))
    autoplayTimers.push(timer)
  }

  function playMotion(interaction: string, phase: 'enter' | 'leave'): number {
    cancelAnimations()
    const generation = animationGeneration
    const routeMotions = motions.value.routes[props.slug]?.[variantKey.value]
    const recorded = routeMotions?.[interaction]?.[phase]
    const authorizationExit = props.slug === 'authorization' && phase === 'leave' && ['0', '1'].includes(interaction)
      ? routeMotions?.['2']?.leave
      : undefined
    const descriptors = recorded?.length ? recorded : authorizationExit ?? recorded ?? []
    const targets = new Map<string, Element[]>()
    let duration = 0
    for (const descriptor of descriptors) {
      let visible = targets.get(descriptor.selector)
      if (!visible) {
        const all = [...document.querySelectorAll(descriptor.selector)]
        visible = all.filter((element) => {
          const style = getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
        })
        if (!visible.length && descriptor.selector.endsWith('-transition"]')) {
          const baseSelector = descriptor.selector.replace(/-transition(?="\]$)/, '')
          visible = [...document.querySelectorAll(baseSelector)].filter((element) => {
            const style = getComputedStyle(element)
            const rect = element.getBoundingClientRect()
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
          })
        }
        targets.set(descriptor.selector, visible)
      }
      const all = [...document.querySelectorAll(descriptor.selector)]
      const indexed = all[descriptor.index]
      const visibleTarget = visible[descriptor.index]
      const target = visibleTarget ?? (indexed && getComputedStyle(indexed).display === 'none' ? indexed : undefined)
      if (!(target instanceof HTMLElement || target instanceof SVGElement)) continue
      const restoreDisplay = getComputedStyle(target).display === 'none'
      if (restoreDisplay) target.style.removeProperty('display')
      const options = { ...descriptor.timing, iterations: descriptor.timing.iterations === 'infinite' ? Infinity : descriptor.timing.iterations, ...(descriptor.pseudoElement ? { pseudoElement: descriptor.pseudoElement } : {}) }
      const animation = target.animate(descriptor.keyframes, options)
      animation.id = descriptor.id
      activeAnimations.push(animation)
      if (restoreDisplay) animation.finished.then(() => {
        if (generation === animationGeneration && target.isConnected) target.style.setProperty('display', 'none')
      }).catch(() => {})
      if (Number.isFinite(options.iterations)) duration = Math.max(duration, options.delay + options.duration * Number(options.iterations))
    }
    return Math.max(0, Math.ceil(duration))
  }
  return { cancelAnimations, stopAutoplay, startAutoplay, playMotion, syncSwiperPositions, slideSwiper }
}
