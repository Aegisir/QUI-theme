<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ReferencePage from './pages/ReferencePage.vue'

const route = ref(window.location.hash.slice(1) || '/index')
const syncRoute = () => { route.value = window.location.hash.slice(1) || '/index' }
const slug = computed(() => route.value.replace(/^\//, '').split('?')[0] || 'index')
const themes = ['default-white', 'default-dark', 'white', 'dark', 'grey', 'green', 'yellow', 'pink', 'purple', 'blue', 'red']
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
const dark = ref(systemTheme.matches)
let followSystem = true

function applyTheme(themeId: string) {
  if (themeId !== 'default' && !themes.includes(themeId)) return false
  document.body.classList.remove(...themes)
  if (themeId !== 'default') document.body.classList.add(themeId)
  dark.value = themeId.endsWith('dark')
  return true
}
function syncSystemTheme() {
  if (followSystem) applyTheme(systemTheme.matches ? 'default-dark' : 'default')
}
function toggleTheme() {
  followSystem = false
  applyTheme(dark.value ? 'default' : 'default-dark')
}
function onThemeMessage({ data }: MessageEvent<{ themeId?: string; isSave?: boolean }>) {
  const { themeId, isSave = true } = data ?? {}
  if (!themeId || !applyTheme(themeId)) return
  followSystem = false
  try {
    if (themeId === 'default') localStorage.removeItem('qui_themeId')
    else if (isSave) localStorage.setItem('qui_themeId', themeId)
  } catch {}
}

syncSystemTheme()
onMounted(() => {
  window.addEventListener('hashchange', syncRoute)
  window.addEventListener('message', onThemeMessage)
  systemTheme.addEventListener('change', syncSystemTheme)
})
onUnmounted(() => {
  window.removeEventListener('hashchange', syncRoute)
  window.removeEventListener('message', onThemeMessage)
  systemTheme.removeEventListener('change', syncSystemTheme)
})
</script>

<template>
  <ReferencePage :slug="slug">
    <template #theme>
      <div class="q-list" style="cursor: pointer; touch-action: manipulation" @click.stop="toggleTheme">
        <span style="font-size: 17px">深色模式 Dark Mode</span>
        <button type="button" role="switch" aria-label="深色模式" :aria-checked="dark" class="q-switch" :class="{ 'q-switch_checked': dark }" style="border: 0; padding: 0; cursor: pointer" />
      </div>
    </template>
  </ReferencePage>
</template>
