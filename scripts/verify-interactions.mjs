import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { browser, serve, setTheme, artifacts } from '../tests/support.mjs'

const chrome = await browser()
const original = await serve(resolve(artifacts, 'original'))
const current = await serve('apps/demo/dist')
const directory = resolve(artifacts, 'interactions')
await mkdir(directory, { recursive: true })
const results = []
try {
  for (const width of [390, 1280]) for (const colorScheme of ['light', 'dark']) {
    const context = await chrome.newContext({ viewport: { width, height: 844 }, colorScheme })
    await context.addInitScript(() => { window.__QUI_MOTION_CAPTURE__ = true })
    for (const slug of ['dialog', 'popup', 'bottom-sheet', 'action-sheet', 'share-picture', 'picker', 'area', 'datetime-picker', 'authorization', 'blank-page', 'toast', 'video-toast']) {
      const images = []
      for (const [name, server] of [['original', original], ['current', current]]) {
        const page = await context.newPage()
        await page.goto(server.url + '#/' + slug)
        await page.waitForSelector('.container button')
        await page.waitForLoadState('networkidle')
        await setTheme(page, colorScheme === 'dark' ? 'default-dark' : 'default', false)
        await page.locator('.container button').first().click()
        await page.waitForSelector('.qui-replica-portals > *', { state: 'attached' })
        await page.waitForTimeout(60)
        await page.evaluate(() => document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = 200 }))
        const image = await page.screenshot()
        images.push(PNG.sync.read(image))
        await writeFile(resolve(directory, `${slug}-${width}-${colorScheme}-${name}.png`), image)
        await page.close()
      }
      const [before, after] = images
      const diff = new PNG({ width, height: 844 })
      const ratio = pixelmatch(before.data, after.data, diff.data, width, 844, { threshold: 0.1 }) / (width * 844)
      results.push({ slug, width, colorScheme, ratio })
      if (ratio > 0.001) await writeFile(resolve(directory, `${slug}-${width}-${colorScheme}-diff.png`), PNG.sync.write(diff))
    }
    await context.close()
    console.log(`${width}/${colorScheme}: 12 interactions checked at 200ms`)
  }
  await writeFile(resolve(directory, 'results.json'), JSON.stringify(results, null, 2))
  assert.equal(results.filter(item => item.ratio > 0.001).length, 0, 'Interaction visual budget')
} finally { await chrome.close(); await original.close(); await current.close() }
