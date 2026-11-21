import { readFile } from 'node:fs/promises'
import { it, expect } from 'vitest'
import {
  detectSheet,
  interpret,
  mergeArchive,
  readWorkbook,
  dateValue,
  type Cell,
  type Workbook
} from './excel'
import { readingViews } from '../domain/readings'
import { withSessions } from '../domain/readings'
import type { Archive, ImportRecord } from '../domain/model'
const empty: Archive = { version: 1, mode: 'local', works: [], members: [], imports: [] }
const record: ImportRecord = {
  id: 'test-import',
  at: '2026-11-21',
  filename: 'test.numbers',
  fingerprint: 'test',
  added: 0,
  updated: 0,
  warnings: [],
  mapping: {}
}
const rows: Cell[][] = [
  ['kokous n:ro', 'pvm', 'Kirjailija/Tapahtuma', 'Kirjan nimi', 'Sivua', 'T', 'H', 'E', 'J', 'Yht.'],
  [1, '2020-02-03', 'Tekijä A', 'Teos A', 250, 8.25, 7.5, 9, 8, 32.75],
  [2, '2020-04-05', 'Tekijä B', 'Teos B', 120, 7, 8, 7.5, 8.25, 30.75],
  [null, null, null, 'Yhteensä (2 kirjaa)', 370, 975.25, 926.75, 935.25, 924.75, 3762],
  [null, null, 'Parhaat pisteet'],
  [1, '2020-02-03', 'Tekijä A', 'Teos A', 250, 8.25, 7.5, 9, 8, 32.75],
  [3, '2020-06-07', 'Taidenäyttely', null, null, 9, 8, 8.25, 8.5, 33.75]
]
rows.push([null, null, null, 'Keskiarvo (185 sivua/kirja)', 185, 7.625, 7.75, 8.25, 8.125, 31.75])
const workbook: Workbook = {
  filename: 'test.numbers',
  fingerprint: 'test',
  sheets: [detectSheet('Kulttuuri', rows)]
}
it('recognizes initial reviewer columns despite summary outliers, and keeps totals out of scores', () => {
  const sheet = workbook.sheets[0]
  expect(sheet.columns.slice(5, 9).map((c) => c.role)).toEqual(Array(4).fill('memberRating'))
  expect(sheet.columns[2].role).toBe('creator')
  expect(sheet.columns[9].role).toBe('ignore')
  const p = interpret(workbook, 1, 10)
  expect(p.members.map((m) => m.name)).toEqual(['T', 'H', 'E', 'J'])
  expect(p.works).toHaveLength(3)
  expect(readingViews(p.works).reduce((n, w) => n + w.ratings.length, 0)).toBe(12)
  expect(p.works[0].creator).toBe('Tekijä A')
  expect(p.works.find((w) => w.title === 'Taidenäyttely')?.category).toBe('other')
  expect(p.rowAudit[3].status).toBe('excluded')
  expect(p.rowAudit[5].status).toBe('merged')
  expect(p.issues).toEqual([])
})
it('repairs the previous authorless import without duplicating works and removes imported summary works', () => {
  const oldWorkbook: Workbook = {
    ...workbook,
    sheets: workbook.sheets.map((s) => ({
      ...s,
      columns: s.columns.map((c) => (c.index === 2 || c.index >= 5 ? { ...c, role: 'ignore' as const } : c))
    }))
  }
  const previous = mergeArchive(empty, interpret(oldWorkbook, 1, 10), record).archive
  previous.works.push({
    ...previous.works[0],
    id: 'legacy-summary',
    title: 'Yhteensä (2 kirjaa)',
    creator: '',
    date: undefined,
    readingSessions: undefined,
    ratings: [],
    source: 'Kulttuuri, rivi 4'
  })
  const id = previous.works.find((w) => w.title === 'Teos A')!.id,
    result = mergeArchive(previous, interpret(workbook, 1, 10), record)
  expect(result.archive.works.filter((w) => w.title === 'Teos A')).toHaveLength(1)
  expect(result.archive.works.find((w) => w.id === id)?.creator).toBe('Tekijä A')
  expect(result.removed).toBe(1)
  expect(result.archive.works.some((w) => w.id === 'legacy-summary')).toBe(false)
  expect(result.changes.some((c) => c.kind === 'details')).toBe(true)
})
it('keeps spreadsheet calendar dates independent of the host timezone', () => {
  expect(dateValue(new Date('1994-10-07T00:00:00Z'))).toBe('1994-10-07')
})
it('separates source readings when the old missing author column combined two namesake works', () => {
  const source: Workbook = {
    filename: 'repair.xlsx',
    fingerprint: 'repair',
    sheets: [
      detectSheet('Kirjat', [
        ['Kirja', 'Kirjailija', 'Päivämäärä', 'T'],
        ['Sama nimi', 'Tekijä A', '2020', 8],
        ['Sama nimi', 'Tekijä B', '2025', 9]
      ])
    ]
  }
  const preview = interpret(source, 1, 10)
  const legacy = withSessions({ ...preview.works[0], creator: '', source: 'Kirjat, rivi 2' }, [
    { id: 'legacy-a', date: '2020', ratings: [], reviews: [], notes: 'Ensimmäisen rivin tieto' },
    { id: 'legacy-b', date: '2025', ratings: [], reviews: [], notes: 'Toisen rivin tieto' }
  ])
  const repaired = mergeArchive({ ...empty, works: [legacy] }, preview, record).archive
  expect(repaired.works).toHaveLength(2)
  expect(readingViews(repaired.works)).toHaveLength(2)
  expect(repaired.works.find((work) => work.creator === 'Tekijä B')?.notes).toContain('Toisen rivin tieto')
  expect(repaired.works.find((work) => work.creator === 'Tekijä A')?.id).toBe(legacy.id)
})
const numbersPath = process.env.ATLAS_SOURCE_NUMBERS,
  xlsxPath = process.env.ATLAS_SOURCE_XLSX
it.skipIf(!numbersPath || !xlsxPath)(
  'matches the supplied Numbers file and Excel export against independently checked totals',
  async () => {
    const previews: ReturnType<typeof interpret>[] = []
    for (const path of [numbersPath!, xlsxPath!]) {
      const wb = await readWorkbook(new File([await readFile(path)], path.split('/').at(-1)!)),
        p = interpret(wb, 1, 10)
      expect(p.works).toHaveLength(252)
      expect(readingViews(p.works)).toHaveLength(252)
      expect(p.members.map((m) => m.name)).toEqual(['T', 'H', 'E', 'J'])
      expect(readingViews(p.works).reduce((n, w) => n + w.ratings.length, 0)).toBe(996)
      expect(p.issues).toEqual([])
      expect(p.rowAudit.filter((r) => r.reason.startsWith('Yhteenvetorivi'))).toHaveLength(4)
      previews.push(p)
    }
    const signature = (p: (typeof previews)[0]) =>
      readingViews(p.works)
        .map((w) => ({
          id: w.id,
          title: w.title,
          creator: w.creator,
          date: w.date,
          category: w.category,
          ratings: w.ratings.map(({ value, min, max, memberId }) => ({ value, min, max, memberId }))
        }))
        .sort((a, b) => a.id.localeCompare(b.id))
    expect(signature(previews[0])).toEqual(signature(previews[1]))
  }
)
