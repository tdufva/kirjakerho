import 'fake-indexeddb/auto'
import { readFile } from 'node:fs/promises'
import { it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import expected from '../../tests/fixtures/expected.json'
import { readWorkbook, interpret, mergeArchive, detectSheet, type Workbook } from './excel'
import { readingViews, sessionsFor, reviewText } from '../domain/readings'
import { annual, sharedPairs } from '../domain/statistics'
import { saveCache, loadCache, removeCache } from '../services/cache'
import { createBackup, readBackup } from '../services/backups'
import type { Archive, ImportRecord } from '../domain/model'
const empty: Archive = { version: 1, mode: 'local', works: [], members: [], imports: [] }
const record: ImportRecord = {
  id: 'golden',
  filename: 'synthetic.xlsx',
  fingerprint: 'golden',
  at: '2026-11-04T12:00:00Z',
  added: 0,
  updated: 0,
  warnings: [],
  mapping: {}
}
const workbook = (rows: (string | number | null)[][]): Workbook => ({
  filename: 'new.xlsx',
  fingerprint: 'new',
  sheets: [detectSheet('Kirjat', rows)]
})
it('reconciles the hand-checked XLSX, reimports, reopens and restores its complete readings', async () => {
  const bytes = await readFile('tests/fixtures/kirjakerho-synthetic.xlsx'),
    wb = await readWorkbook(new File([bytes], 'synthetic.xlsx')),
    p = interpret(wb, 1, 10),
    views = readingViews(p.works)
  expect(p.works).toHaveLength(expected.works)
  expect(views).toHaveLength(expected.readings)
  expect(p.members.map((m) => m.name)).toEqual(expected.members)
  expect(views.reduce((n, w) => n + w.ratings.length, 0)).toBe(expected.ratings)
  expect(views.reduce((n, w) => n + (w.reviews?.length ?? 0), 0)).toBe(expected.comments)
  const sinuhe = p.works.find((w) => w.title === 'Sinuhe egyptiläinen')!
  expect(sessionsFor(sinuhe).map((s) => s.date)).toEqual(expected.sinuheDates)
  expect(sessionsFor(sinuhe).map((s) => s.ratings.map((r) => r.value))).toEqual(expected.sinuheScores)
  expect(p.cells.find((c) => c.address === expected.reviewOnlySource)?.interpreted).toContain(
    'Kommentti ilman numeroa.'
  )
  expect(p.cells.find((c) => c.address === expected.shiftedTitleSource)?.raw).toBe('Syrjässä')
  expect(p.cells.find((c) => c.address === expected.invalidScoreSource)?.status).toBe('review')
  expect(p.rowAudit.find((r) => r.sheet === 'Kirjat' && r.row + 1 === expected.missingTitleRow)?.status).toBe(
    'review'
  )
  expect(p.cells).toHaveLength(wb.sheets.reduce((n, s) => n + s.rows.length * s.columns.length, 0))
  expect(p.rowAudit).toHaveLength(wb.sheets.reduce((n, s) => n + s.rows.length, 0))
  let a = mergeArchive(empty, p, record).archive
  const again = mergeArchive(a, p, { ...record, id: 'again' })
  expect(again.updated).toBe(0)
  expect(again.newReadings).toBe(0)
  expect(again.changes).toEqual([])
  a = again.archive
  await saveCache(a, 'golden')
  const reopened = (await loadCache('golden'))!
  expect(reopened).toEqual(a)
  expect(readingViews(reopened.works)).toHaveLength(expected.readings)
  const restored = await readBackup(new File([JSON.stringify(await createBackup(reopened))], 'backup.json'))
  expect(restored.verified).toBe(true)
  expect(restored.archive).toEqual(a)
  await removeCache('golden')
  expect(annual(a.works).find((y) => y.year === '2020')?.count).toBe(1)
  expect(annual(a.works).find((y) => y.year === '2025')?.count).toBe(3)
  const aino = a.members.find((m) => m.name === 'Aino')!.id,
    matti = a.members.find((m) => m.name === 'Matti')!.id
  expect(sharedPairs(a.works, aino, matti)).toHaveLength(2)
})
it('deletes only explicitly blank scores for the same reading, retaining all comments', () => {
  const first = interpret(
      workbook([
        ['Kirja', 'Päivämäärä', 'Aino arvosana', 'Aino kommentti', 'Matti arvosana'],
        ['Kirja A', '2020', 8, 'Alkuperäinen', 7],
        ['Kirja A', '2025', 9, 'Uusi', 6]
      ]),
      1,
      10
    ),
    a = mergeArchive(empty, first, record).archive
  const next = interpret(
    workbook([
      ['Kirja', 'Päivämäärä', 'Aino arvosana'],
      ['Kirja A', '2025', null]
    ]),
    1,
    10
  )
  expect(readingViews(mergeArchive(a, next, record, 'keep').archive.works).at(-1)?.ratings).toHaveLength(2)
  const result = mergeArchive(a, next, record, 'delete')
  const views = readingViews(result.archive.works)
  expect(views[0].ratings.map((r) => r.value)).toEqual([8, 7])
  expect(views[1].ratings.map((r) => r.value)).toEqual([6])
  expect(reviewText(views[1], a.members.find((m) => m.name === 'Aino')!.id)).toBe('Uusi')
  expect(result.changes).toHaveLength(1)
  const invalid = interpret(
    workbook([
      ['Kirja', 'Päivämäärä', 'Aino arvosana'],
      ['Kirja A', '2025', 'virhe']
    ]),
    1,
    10
  )
  expect(readingViews(mergeArchive(a, invalid, record, 'delete').archive.works)[1].ratings).toHaveLength(2)
})
it('preserves legacy review-only member IDs and reuses the canonical work ID', () => {
  const a = mergeArchive(
    empty,
    interpret(
      workbook([
        ['Kirja', 'Päivämäärä', 'Aino kommentti'],
        ['A', '2020', 'Ilman numeroa']
      ]),
      1,
      10
    ),
    record
  ).archive
  a.members[0].id = 'old-member'
  a.works[0].id = 'old-work'
  a.works[0].reviews![0].memberId = 'old-member'
  a.works[0].readingSessions = undefined
  const result = mergeArchive(
    a,
    interpret(
      workbook([
        ['Kirja', 'Päivämäärä', 'Aino kommentti'],
        ['A', '2025', 'Toinen']
      ]),
      1,
      10
    ),
    record
  )
  expect(result.archive.works).toHaveLength(1)
  expect(result.archive.works[0].id).toBe('old-work')
  expect(
    sessionsFor(result.archive.works[0])
      .flatMap((s) => s.reviews)
      .map((r) => r.memberId)
  ).toEqual(['old-member', 'old-member'])
})
it('does not delete formula errors or formula cells without cached values', async () => {
  const book = XLSX.utils.book_new(),
    sheet = XLSX.utils.aoa_to_sheet([
      ['Kirja', 'Aino arvosana'],
      ['Kaava', 8],
      ['Virhe', 8]
    ])
  sheet.B2 = { t: 'n', f: 'SUM(2,3)' }
  sheet.B3 = { t: 'e', v: 7 }
  XLSX.utils.book_append_sheet(book, sheet, 'Kirjat')
  const wb = await readWorkbook(
    new File([XLSX.write(book, { type: 'array', bookType: 'xlsx' })], 'formula.xlsx')
  )
  const p = interpret(wb, 1, 10)
  expect(p.blankRatings).toHaveLength(0)
  expect(p.works.flatMap((w) => w.ratings)).toHaveLength(0)
  expect(p.cells.filter((c) => c.role === 'memberRating' && c.status === 'review')).toHaveLength(2)
})
