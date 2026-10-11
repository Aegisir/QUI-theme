# @qui-theme/ui

Reusable Vue 3 components and local design assets for the QQ QUI gallery.

```ts
import { createApp } from 'vue'
import { QuiButton, QuiDialog } from '@qui-theme/ui'
import '@qui-theme/ui/style.css'

createApp(App).mount('#app')
```

For global registration, install the `QuiUI` plugin. Components use typed props, declared events and `v-model` where appropriate. Theme values are CSS custom properties and can be overridden by the consuming app.

Public subpaths expose the icon component (`/icon`), a lightweight icon index (`/icon-index`), the 487 local SVG icons (`/icons`), icon categories (`/icon-groups`), design tokens (`/theme`), local images (`/assets`) and the async district loader (`/regions`). Both default and named `QuiUI` exports register the components.

`loadRegions()` returns `Promise<QuiDistrict[]>`. Districts and grouped icon SVGs are fetched as local JSON assets when needed, with shared request caching and eviction on failure. Keep the emitted JSON assets alongside the JavaScript when publishing or deploying; bundlers resolve their relative URLs. No runtime requests go to Tencent hosts. The icon component exposes `retry()` on its template reference.

`QuiButton` accepts `nativeType: 'button' | 'submit' | 'reset'`, defaulting to `button`. Existing `type` values still select the visual style. Overlay instances share a scroll lock and focus stack; Escape closes the top instance. Selection events expose typed payloads; disabled options cannot be selected.

Run `pnpm check` from the repository root to validate declarations, actual dist consumption and browser behavior. Bundle budgets exclude Vue and CSS; data asset sizes are reported separately from JavaScript.

The build emits structural declarations for public JSON data, preserving icon keys without embedding SVG values in types. Consumer checks include library declarations and do not require `resolveJsonModule`.
