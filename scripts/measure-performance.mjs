import assert from 'node:assert/strict'
import { writeFile, readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { browser, serve, root, artifacts } from '../tests/support.mjs'

const chrome = await browser()
const server = await serve(resolve(root, 'apps/demo/dist'))
const records = []
const slow4G = { offline: false, latency: 562.5, downloadThroughput: 180000, uploadThroughput: 84375 }
try {
  for (const slug of ['index', 'icon']) for (let run = 1; run <= 5; run++) {
    const context = await chrome.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: 'light' })
    await context.addInitScript(() => {
      window.__metrics = { lcp: 0, cls: 0, display: 0, inp: 0 }
      new PerformanceObserver(list => list.getEntries().forEach(entry => { window.__metrics.lcp = entry.startTime })).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver(list => list.getEntries().forEach(entry => { if (!entry.hadRecentInput) window.__metrics.cls += entry.value })).observe({ type: 'layout-shift', buffered: true })
      new PerformanceObserver(list => list.getEntries().forEach(entry => { if (entry.interactionId) window.__metrics.inp = Math.max(window.__metrics.inp, entry.duration) })).observe({ type: 'event', buffered: true, durationThreshold: 16 })
      const observer = new MutationObserver(() => {
        if (!document.querySelector('.container')?.children.length) return
        observer.disconnect()
        requestAnimationFrame(() => requestAnimationFrame(() => { window.__metrics.display = performance.now() }))
      })
      observer.observe(document, { childList: true, subtree: true })
    })
    const page = await context.newPage()
    const session = await context.newCDPSession(page)
    await session.send('Network.enable')
    await session.send('Network.clearBrowserCache')
    await session.send('Network.setCacheDisabled', { cacheDisabled: true })
    await session.send('Network.emulateNetworkConditions', slow4G)
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await page.goto(server.url + '#/' + slug)
    await page.waitForFunction(() => window.__metrics.display > 0)
    await page.waitForLoadState('networkidle')
    await page.waitForFunction(() => window.__metrics.lcp > 0)
    const record = await page.evaluate(() => ({ ...window.__metrics,
      bytes: performance.getEntriesByType('resource').reduce((sum, item) => sum + item.encodedBodySize, 0) + performance.getEntriesByType('navigation')[0].encodedBodySize,
      jsGzip: performance.getEntriesByType('resource').filter(item => item.name.endsWith('.js')).reduce((sum, item) => sum + item.encodedBodySize, 0),
    }))
    if (slug === 'index') {
      await page.getByRole('link', { name: '图标 Icon', exact: true }).click()
      await page.waitForSelector('.qui-icon_item')
      await page.waitForTimeout(150)
      record.inp = await page.evaluate(() => window.__metrics.inp)
    }
    records.push({ slug, run, ...record })
    console.log(`${slug}/${run}: LCP ${record.lcp.toFixed(0)}ms, display ${record.display.toFixed(0)}ms, CLS ${record.cls.toFixed(5)}, interaction ${record.inp}ms, ${record.bytes}B`)
    await context.close()
  }
  const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
  const summary = Object.fromEntries(['index', 'icon'].map(slug => [slug, Object.fromEntries(['lcp', 'cls', 'display', 'bytes', 'jsGzip', 'inp'].map(key => [key, median(records.filter(item => item.slug === slug).map(item => item[key]))]))]))
  await writeFile(resolve(artifacts, 'performance.json'), JSON.stringify({ browser: chrome.version(), cpu: 4, network: slow4G, viewport: '390x844', records, summary }, null, 2))
  assert.ok(summary.index.lcp <= 2500, `Home LCP: ${summary.index.lcp}`)
  assert.ok(summary.icon.display <= 3000, `Icon first display: ${summary.icon.display}`)
  assert.ok(summary.index.cls <= 0.01 && summary.icon.cls <= 0.01, 'CLS budget')
  assert.ok(summary.index.inp <= 200, 'Interaction budget')
  const html = await readFile(resolve(root, 'apps/demo/dist/index.html'), 'utf8')
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('')
  assert.ok(summary.index.jsGzip + gzipSync(inline).length <= 35 * 1024, 'Startup JS budget (including inline preload)')
  const originalIcon = (await readFile(resolve(root, 'apps/demo/reference/pages/icon.html.gz'))).length + gzipSync(await readFile(resolve(root, 'apps/demo/reference/states/icon.json'))).length
  assert.ok(summary.icon.bytes <= originalIcon * 0.1, 'Icon network budget')
  console.log(summary)
} finally { await chrome.close(); await server.close() }
