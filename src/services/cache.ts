import { openDB } from 'idb'
import type { Archive } from '../domain/model'
export interface RecoveryPoint {
  id: string
  key: string
  at: string
  archive: Archive
}
const database = () =>
  openDB('kirjakerhon-atlas', 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('archives')) db.createObjectStore('archives')
      if (!db.objectStoreNames.contains('recovery')) db.createObjectStore('recovery')
      if (!db.objectStoreNames.contains('checkpoints'))
        db.createObjectStore('checkpoints', { keyPath: 'id' }).createIndex('key', 'key')
    }
  })
export async function loadCache(key = 'local'): Promise<Archive | undefined> {
  return (await database()).get('archives', key)
}
export async function saveCache(archive: Archive, key = 'local', backup = true) {
  const db = await database(),
    tx = db.transaction(['archives', 'recovery', 'checkpoints'], 'readwrite'),
    store = tx.objectStore('checkpoints')
  if (backup) {
    const previous = await tx.objectStore('archives').get(key)
    if (previous && JSON.stringify(previous) !== JSON.stringify(archive)) {
      const points = ((await store.index('key').getAll(key)) as RecoveryPoint[]).sort((a, b) =>
        b.at.localeCompare(a.at)
      )
      const legacyStore = tx.objectStore('recovery')
      const legacy = await legacyStore.get(key)
      if (legacy && !points.length) {
        const point = { id: crypto.randomUUID(), key, at: '', archive: legacy }
        await store.put(point)
        points.push(point)
      }
      if (legacy) await legacyStore.delete(key)
      const at = new Date(Math.max(Date.now(), Date.parse(points[0]?.at ?? '') + 1 || 0)).toISOString()
      await store.put({ id: crypto.randomUUID(), key, at, archive: previous })
      for (const point of points.slice(7)) await store.delete(point.id)
    }
  }
  await tx.objectStore('archives').put(archive, key)
  await tx.done
}
export async function recoveryPoints(key = 'local'): Promise<RecoveryPoint[]> {
  const db = await database(),
    points = (await db.getAllFromIndex('checkpoints', 'key', key)) as RecoveryPoint[]
  if (!points.length) {
    const old = await db.get('recovery', key)
    if (old) points.push({ id: 'legacy', key, at: '', archive: old })
  }
  return points.sort((a, b) => b.at.localeCompare(a.at))
}
export async function recovery(key = 'local', id?: string): Promise<Archive | undefined> {
  return (await recoveryPoints(key)).find((p) => !id || p.id === id)?.archive
}
export async function removeCache(key: string) {
  const db = await database(),
    tx = db.transaction(['archives', 'recovery', 'checkpoints'], 'readwrite')
  await tx.objectStore('archives').delete(key)
  await tx.objectStore('recovery').delete(key)
  for (const point of await tx.objectStore('checkpoints').index('key').getAll(key))
    await tx.objectStore('checkpoints').delete(point.id)
  await tx.done
}
export interface CachedClub {
  id: string
  name: string
  revision: number
  role: 'admin' | 'member' | 'reader'
}
export async function saveClubIndex(userId: string, clubs: CachedClub[]) {
  await (await database()).put('archives', clubs, `clubs:${userId}`)
}
export async function loadClubIndex(userId: string): Promise<CachedClub[]> {
  return (await (await database()).get('archives', `clubs:${userId}`)) ?? []
}
export async function clearUserCache(userId: string) {
  const db = await database(),
    tx = db.transaction(['archives', 'recovery', 'checkpoints'], 'readwrite')
  for (const store of ['archives', 'recovery'] as const) {
    const os = tx.objectStore(store)
    for (const key of await os.getAllKeys())
      if (String(key).startsWith(`${userId}:`) || key === `clubs:${userId}`) await os.delete(key)
  }
  for (const point of await tx.objectStore('checkpoints').getAll())
    if (point.key.startsWith(`${userId}:`)) await tx.objectStore('checkpoints').delete(point.id)
  await tx.done
}
