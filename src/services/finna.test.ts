import { it, expect, vi, afterEach } from 'vitest'
import { demoArchive } from '../data/demo'
import { finnaCandidate, type FinnaRecord } from './finna'
import { atlasWork } from '../domain/catalogue'
import { readingViews } from '../domain/readings'
import { validateArchive } from './backups'
import { enrichWorks } from './enrichment'
const work = {
  ...demoArchive().works[0],
  title: 'Sinuhe egyptiläinen',
  creator: 'Mika Waltari',
  themes: [],
  locations: []
}
const record: FinnaRecord = {
  id: 'test.book',
  title: 'Sinuhe egyptiläinen',
  nonPresenterAuthors: [
    { name: 'Waltari, Mika', role: 'kirjoittaja' },
    { name: 'Lukija, Kalle', role: 'lukija' }
  ],
  subjectsExtended: [
    { type: 'personal name', heading: ['Waltari, Mika'] },
    { type: 'topic', heading: ['orjuus', 'Egypti'] },
    { type: 'topic', heading: ['suomenkielinen kirjallisuus'] },
    { heading: ['Syyria', 'ENNAKKOTIETO'] }
  ],
  placesOfPublication: ['Helsinki']
}
afterEach(() => vi.unstubAllGlobals())
it('keeps catalogue subject countries separate from story settings and publication places, retaining source links', () => {
  const candidate = finnaCandidate(work, record)
  expect(candidate.automatic).toBe(true)
  expect(candidate.catalogue.themes).toEqual(['orjuus'])
  expect(candidate.catalogue.locations.map((l) => [l.country, l.kind])).toEqual([
    ['Egypti', 'subject'],
    ['Syyria', 'subject'],
    ['Suomi', 'publication']
  ])
  expect(candidate.catalogue.locations.some((l) => l.kind === 'author')).toBe(false)
  const original = { ...work, themes: ['Muisti'], catalogue: candidate.catalogue }
  const view = atlasWork(original)
  expect(view.themes).toEqual(['Muisti', 'orjuus'])
  expect(original.themes).toEqual(['Muisti'])
  expect(readingViews([original])[0].locations).toHaveLength(3)
  const archive = demoArchive()
  archive.works = [original]
  expect(validateArchive(archive).works[0].catalogue?.url).toContain('finna.fi')
})
it('rejects ambiguous authors, exhibition brochures and unverified title matches', () => {
  expect(
    finnaCandidate(work, { ...record, nonPresenterAuthors: [{ name: 'Toinen Tekijä' }] }).automatic
  ).toBe(false)
  expect(
    finnaCandidate(work, { ...record, title: 'Mika Waltari - Sinuhe egyptiläinen / näyttelyesite' }).automatic
  ).toBe(false)
  expect(finnaCandidate({ ...work, creator: '' }, record).automatic).toBe(false)
})
it('retrieves matching source metadata without sending scores or comments', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'OK', records: [record] })))
  vi.stubGlobal('fetch', fetch)
  const updates = await enrichWorks([work], new AbortController().signal, () => {})
  expect(updates).toHaveLength(1)
  const url = fetch.mock.calls[0][0] as string
  expect(url).toContain('Sinuhe')
  expect(url).not.toContain('rating')
  expect(updates[0].catalogue.themes).toContain('orjuus')
})
it('reports failed requests and returns already completed results on cancellation', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Palvelinvirhe')))
  let failures = 0
  const updates = await enrichWorks([work], new AbortController().signal, (p) => {
    failures = p.failures.length
  })
  expect(updates).toEqual([])
  expect(failures).toBe(1)
  const controller = new AbortController()
  controller.abort()
  expect(await enrichWorks([work], controller.signal, () => {})).toEqual([])
})
