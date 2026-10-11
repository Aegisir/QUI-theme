import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { root, artifacts, routes, browser, serve, setTheme } from '../tests/support.mjs'

const capture = process.argv.includes('--capture')
const directory = resolve(artifacts, capture ? 'baseline' : 'current')
await mkdir(directory, { recursive: true })
const source = process.argv.includes('--source') ? process.argv[process.argv.indexOf('--source') + 1] : 'apps/demo/dist'
const server = await serve(resolve(root, source))
const chrome = await browser()
const results = []
try {
  for (const width of [390, 1280]) for (const colorScheme of ['light', 'dark']) {
    const context = await chrome.newContext({ viewport: { width, height: 844 }, colorScheme, deviceScaleFactor: 1 })
    await context.addInitScript(() => { window.__QUI_MOTION_CAPTURE__ = true })
    const page = await context.newPage()
    for (const slug of Object.keys(routes)) {
      const errors = []
      const onError = error => errors.push(String(error))
      page.on('pageerror', onError)
      await page.goto('about:blank')
      await page.goto(`${server.url}#/${slug}?m`)
      await page.waitForFunction(() => document.querySelector('#app .container')?.children.length && document.querySelector('#app .container')?.getAttribute('aria-busy') !== 'true')
      await page.waitForLoadState('networkidle')
      await setTheme(page, colorScheme === 'dark' ? 'default-dark' : 'default', false)
      const name = `${slug}-${width}-${colorScheme}.png`
      const image = await page.screenshot({ animations: 'disabled' })
      await writeFile(resolve(directory, name), image)
      page.off('pageerror', onError)
      assert.deepEqual(errors, [], `${name}: browser errors`)
      if (!capture) {
        const before = PNG.sync.read(await readFile(resolve(artifacts, 'baseline', name)))
        const after = PNG.sync.read(image)
        const diff = new PNG({ width: after.width, height: after.height })
        const ratio = pixelmatch(before.data, after.data, diff.data, after.width, after.height, { threshold: 0.1 }) / (after.width * after.height)
        results.push({ name, ratio })
        if (ratio > 0.001) await writeFile(resolve(directory, `${name}.diff.png`), PNG.sync.write(diff))
      }
    }
    await context.close()
    console.log(`${width}/${colorScheme}: ${Object.keys(routes).length} routes ${capture ? 'captured' : 'checked'}`)
  }
  await writeFile(resolve(directory, 'results.json'), JSON.stringify(results, null, 2))
  assert.equal(results.filter(result => result.ratio > 0.001).length, 0, 'Visual differences exceed 0.1%; inspect artifacts/local/current')
} finally { await chrome.close(); await server.close() }
