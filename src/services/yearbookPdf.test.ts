import { readFile, writeFile } from 'node:fs/promises'
import { it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { demoArchive } from '../data/demo'
import { yearbook } from '../domain/yearbook'
import { createYearbookPdf } from './yearbookPdf'
import { withSessions, readingId, readingViews } from '../domain/readings'
it('includes only the selected year and preserves standalone comments and rereadings', () => {
  const a = demoArchive()
  a.works = a.works.slice(0, 1)
  const w = a.works[0]
  a.works[0] = withSessions(w, [
    {
      id: readingId(w.id, '2020'),
      date: '2020',
      ratings: [],
      reviews: [{ memberId: a.members[0].id, text: 'Vanha' }]
    },
    {
      id: readingId(w.id, '2025'),
      date: '2025',
      ratings: [],
      reviews: [{ memberId: a.members[0].id, text: 'Uusi' }]
    }
  ])
  const data = yearbook(a, '2025')
  expect(data.readings).toHaveLength(1)
  expect(data.commentCount).toBe(1)
  expect(data.readings[0].reviews?.[0].text).toBe('Uusi')
  expect(data.favourites).toEqual([])
})
it('embeds local Finnish fonts, paginates full comments and generates a valid PDF', async () => {
  const archive = demoArchive(),
    proof = process.env.ATLAS_PDF_PROOF
  if (!proof) {
    archive.works = archive.works.slice(0, 1)
    archive.works[0].date = '2025'
    archive.works[0].ratings[0].review = 'Ääkköset ja ajatuksia. '.repeat(1000) + 'VIIMEINEN KOMMENTTI'
    archive.works[0].ratings[1].review = 'Harvinainen merkki: 😀'
  }
  const texture = new Uint8Array(await readFile('tests/fixtures/pdf-texture.jpg'))
  const assets = {
    body: new Uint8Array(await readFile('public/fonts/font-0.ttf')),
    heading: new Uint8Array(await readFile('public/fonts/bodoni-moda-4.ttf')),
    ground: proof ? new Uint8Array(await readFile('tmp/pdfs/ground.jpg')) : texture,
    salon: proof ? new Uint8Array(await readFile('tmp/pdfs/salon.jpg')) : texture
  }
  const years = readingViews(archive.works)
      .map((w) => w.date!.slice(0, 4))
      .sort(),
    year = proof ? years.at(-1)! : '2025'
  const bytes = await createYearbookPdf(archive, year, assets),
    doc = await PDFDocument.load(bytes)
  expect(doc.getTitle()).toBe(`Kirjakerhon vuosikirja ${year}`)
  expect(doc.getPageCount()).toBeGreaterThan(proof ? 3 : 8)
  if (proof) await writeFile(proof, bytes)
  if (!proof && process.env.ATLAS_PDF_STRESS) await writeFile(process.env.ATLAS_PDF_STRESS, bytes)
})
