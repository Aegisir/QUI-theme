import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  experimental: {
    renderBuiltUrl(filename, { hostType, type }) {
      if (hostType === 'js' && type === 'asset' && filename.endsWith('.json')) {
        return { runtime: `new URL(${JSON.stringify(`${filename}?no-inline`)}, import.meta.url).href` }
      }
    },
  },
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    lib: {
      entry: {
        index: fileURLToPath(new URL('./src/entry.ts', import.meta.url)),
        icon: fileURLToPath(new URL('./src/icon.ts', import.meta.url)),
        icons: fileURLToPath(new URL('./src/icons.ts', import.meta.url)),
        'icon-index': fileURLToPath(new URL('./src/icon-index.ts', import.meta.url)),
        'icon-groups': fileURLToPath(new URL('./src/icon-groups.ts', import.meta.url)),
        theme: fileURLToPath(new URL('./src/theme.ts', import.meta.url)),
        regions: fileURLToPath(new URL('./src/regions.ts', import.meta.url)),
        assets: fileURLToPath(new URL('./src/assets.ts', import.meta.url)),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
      cssFileName: 'ui',
    },
    rolldownOptions: { external: ['vue'] },
  },
})
