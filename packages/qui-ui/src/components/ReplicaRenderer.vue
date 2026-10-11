<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { ReplicaTarget } from '../types'

const controlSelector = 'button, [role="button"], [role="tab"], [role="switch"], .q-tabbar-item, .q-checkbox__icon, .q-index__indicator > li, .qui-icon_item'

const props = defineProps<{ markup: string; portals?: string }>()
defineOptions({ inheritAttrs: false })
const emit = defineEmits<{
  click: [target: ReplicaTarget]
  input: [element: HTMLInputElement | HTMLTextAreaElement]
  change: [element: HTMLInputElement | HTMLSelectElement]
}>()
const root = ref<HTMLElement>()
const portalsRoot = ref<HTMLElement>()
let buttons: Element[] | undefined
let controls: Element[] | undefined
let observer: IntersectionObserver | undefined
let generation = 0
watch(() => [props.markup, props.portals], async (values, previous) => {
  const current = ++generation
  if (values[0] !== previous?.[0]) { buttons = undefined; controls = undefined }
  await nextTick()
  if (current !== generation) return
  observer?.disconnect()
  const items = root.value?.querySelectorAll<HTMLElement>('.q-list, .qui-icon_item') ?? []
  items.forEach(item => {
    const label = item.querySelector('.q-list__title-txt, .qui-icon_name')?.textContent?.trim()
    if (!label) return
    item.tabIndex = 0
    item.setAttribute('role', item.matches('.q-list') ? 'link' : 'button')
    item.setAttribute('aria-label', label)
  })
  const activate = (element: Element) => {
    const images = element.matches('[data-qui-raster]') ? [element] : [...element.querySelectorAll('[data-qui-raster]')]
    images.forEach(image => {
      image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', image.getAttribute('data-qui-raster')!)
      image.removeAttribute('data-qui-raster')
    })
  }
  observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.target.isConnected) return
      entry.target.toggleAttribute('data-qui-visible', entry.isIntersecting)
      if (entry.isIntersecting) activate(entry.target)
    })
  }, { rootMargin: '300px' }) : undefined
  items.forEach(item => { if (item.matches('.qui-icon_item')) observer?.observe(item) })
  for (const surface of [root.value, portalsRoot.value]) surface?.querySelectorAll('[data-qui-raster]').forEach(image => {
    const item = image.closest('.qui-icon_item')
    if (observer && item) observer.observe(item)
    else activate(image)
  })
}, { immediate: true, flush: 'post' })
onBeforeUnmount(() => { generation++; observer?.disconnect() })
const markup = computed(() => {
  const opening = '<div class="container">'
  if (!props.markup.startsWith(opening)) return props.markup
  const end = props.markup.lastIndexOf('</div>')
  return end > opening.length ? props.markup.slice(opening.length, end) : props.markup
})

function handleClick(event: MouseEvent) {
  const target = event.target instanceof Element ? event.target : null
  if (!target || !root.value) return
  const link = target.closest('a')
  if (link) event.preventDefault()
  const button = target.closest('button')
  const control = target.closest(controlSelector)
  emit('click', {
    element: target,
    buttonIndex: button ? (buttons ??= [...root.value.querySelectorAll('button')]).indexOf(button) : -1,
    controlIndex: control ? (controls ??= [...root.value.querySelectorAll(controlSelector)]).indexOf(control) : -1,
    text: (button?.textContent ?? target.textContent ?? '').trim().replace(/\s+/g, ' '),
  })
}

function handleKey(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  const target = event.target
  if (target instanceof HTMLElement && target.matches('.q-list, .qui-icon_item')) {
    event.preventDefault()
    target.click()
  }
}

function handleInput(event: Event) {
  const input = event.target
  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) emit('input', input)
}

function handleChange(event: Event) {
  const input = event.target
  if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) emit('change', input)
}
</script>

<template>
  <div ref="root" v-bind="$attrs" class="container" role="main" v-html="markup" @click="handleClick" @keydown="handleKey" @input="handleInput" @change="handleChange" />
  <div v-if="portals" ref="portalsRoot" class="qui-replica-portals" style="display: contents" v-html="portals" @click="handleClick" @input="handleInput" @change="handleChange" />
</template>
