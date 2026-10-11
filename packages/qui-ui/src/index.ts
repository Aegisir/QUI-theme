import { defineAsyncComponent, type App, type Plugin } from 'vue'
import * as primitives from './components/primitives'
import * as overlays from './components/overlays'
import * as business from './components/business'
import QuiReplicaRenderer from './components/ReplicaRenderer.vue'

const QuiIcon = /* @__PURE__ */ defineAsyncComponent(() => import('./components/Icon.vue'))

export * from './types'
export * from './components/primitives'
export * from './components/overlays'
export * from './components/business'
export { QuiIcon }
export { default as QuiOverlayShell } from './components/OverlayShell.vue'
export { QuiReplicaRenderer }
export { default as quiTokens } from './data/tokens.json'

export const QuiUI: Plugin = {
  install(app: App) {
    Object.entries({ ...primitives, ...overlays, ...business, QuiIcon, QuiReplicaRenderer }).forEach(([name, component]) => app.component(name, component))
  },
}

export default QuiUI
