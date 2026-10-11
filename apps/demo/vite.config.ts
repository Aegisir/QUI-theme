import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  publicDir: '.cache/public',
  plugins: [vue(), {
    name: 'reference-styles',
    transformIndexHtml(html) {
      const manifest = JSON.parse(readFileSync(new URL('./.cache/manifest.json', import.meta.url), 'utf8')) as { commonStyles: string[] }
      const bootstrap = `
          const snapshot = JSON.parse(document.getElementById('qui-reference').textContent);
          const pages = snapshot.routes;
          const slug = location.hash.slice(1).replace(/^\\//, '').split('?')[0];
          const page = (pages[slug] || pages.index)[innerWidth < 600 ? 'mobile' : 'desktop'];
          const preload = document.createElement('link');
          preload.rel = 'preload'; preload.as = 'fetch'; preload.crossOrigin = 'anonymous'; preload.fetchPriority = 'high'; preload.href = './' + page.html;
          document.head.append(preload);
          for (const path of page.styles) {
            if (snapshot.commonStyles.includes(path)) continue;
            const href = new URL('./' + path, document.baseURI).href;
            const link = document.createElement('link'); link.rel = 'preload'; link.as = 'style'; link.href = href;
            document.head.append(link);
          }
        `
      return {
        html: html.replace(/<meta name="viewport"[^>]*>/, tag => `${tag}<script id="qui-reference" type="application/json">${JSON.stringify(manifest)}</script><script>${bootstrap}</script>`),
        tags: manifest.commonStyles.map(href => ({ tag: 'link', attrs: { rel: 'stylesheet', href: './' + href, 'data-reference-style': '', 'data-reference-shared': '' }, injectTo: 'head' as const })),
      }
    },
  }],
  resolve: { alias: [
    { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    { find: /^@qui-theme\/ui$/, replacement: fileURLToPath(new URL('../../packages/qui-ui/src/index.ts', import.meta.url)) },
    { find: /^@qui-theme\/ui\/icon$/, replacement: fileURLToPath(new URL('../../packages/qui-ui/src/icon.ts', import.meta.url)) },
    { find: /^@qui-theme\/ui\/icons$/, replacement: fileURLToPath(new URL('../../packages/qui-ui/src/icons.ts', import.meta.url)) },
    { find: /^@qui-theme\/ui\/icon-index$/, replacement: fileURLToPath(new URL('../../packages/qui-ui/src/icon-index.ts', import.meta.url)) },
    { find: /^@qui-theme\/ui\/icon-groups$/, replacement: fileURLToPath(new URL('../../packages/qui-ui/src/icon-groups.ts', import.meta.url)) },
    { find: /^@qui-theme\/ui\/theme$/, replacement: fileURLToPath(new URL('../../packages/qui-ui/src/theme.ts', import.meta.url)) },
    { find: /^@qui-theme\/ui\/regions$/, replacement: fileURLToPath(new URL('../../packages/qui-ui/src/regions.ts', import.meta.url)) },
    { find: /^@qui-theme\/ui\/assets$/, replacement: fileURLToPath(new URL('../../packages/qui-ui/src/assets.ts', import.meta.url)) },
  ] },
  server: { host: '127.0.0.1' },
})
