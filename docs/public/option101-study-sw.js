const CACHE_PREFIX = 'option101-workbook-'
const CACHE_NAME = CACHE_PREFIX + 'v1'
const urls = [
  './option101-study.ko.html',
  './option101-study.webmanifest',
  './option101-icon-180.png',
  './option101-icon-192.png',
  './option101-icon-512.png'
].map(path => new URL(path, self.location).href)
const [workbookUrl] = urls

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    await cache.addAll(urls.map(url => new Request(url, { cache: 'reload' })))
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const oldCaches = (await caches.keys()).filter(name =>
      name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME
    )
    await Promise.all(oldCaches.map(name => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  url.search = ''
  if (!urls.includes(url.href)) return

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    try {
      const response = await fetch(request)
      if (response.ok) {
        await cache.put(url.href, response.clone())
        return response
      }
      return await cache.match(url.href) || response
    } catch {
      return await cache.match(url.href) || Response.error()
    }
  })())
})
