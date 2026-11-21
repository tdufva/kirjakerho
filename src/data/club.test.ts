import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { clubArchive } from './club'
import { readingViews } from '../domain/readings'
import { average, score } from '../domain/statistics'
import { clubInsights } from '../domain/insights'
describe('published Numbers edition', () => {
  it('contains every meeting once, all four real reviewers and every individual score', () => {
    const a = clubArchive(),
      r = readingViews(a.works)
    expect(r.map((w) => w.meetingNumber)).toEqual(Array.from({ length: 252 }, (_, i) => i + 1))
    expect(new Set(r.map((w) => w.id)).size).toBe(252)
    expect(a.members.map((m) => m.name)).toEqual(['Tiina', 'Hilkka', 'Erkki', 'Jouko'])
    expect(r.filter((w) => w.category === 'book')).toHaveLength(207)
    expect(r.reduce((s, w) => s + w.ratings.length, 0)).toBe(996)
    expect(r.filter((w) => !w.ratings.length).map((w) => w.meetingNumber)).toEqual([113, 161, 201])
    expect(r.reduce((s, w) => s + (w.pageCount ?? 0), 0)).toBe(57748)
    expect(r.every((w) => w.ratings.every((r) => r.min === 4 && r.max === 10 && score(r) === r.value))).toBe(
      true
    )
    for (const w of r.filter((w) => w.ratings.length))
      expect(w.ratings.reduce((s, r) => s + r.value, 0)).toBeCloseTo(w.sourceTotal!, 9)
  })
  it('preserves manually checked first, last, missing-author and swapped-title rows', () => {
    const r = readingViews(clubArchive().works)
    expect(r[0]).toMatchObject({ date: '1994-10-07', pageCount: 441, sourceTotal: 31 })
    expect(r[0].ratings.map((r) => r.value)).toEqual([8.25, 8, 7, 7.75])
    expect(average(r[0])).toBe(7.75)
    expect(r.at(-1)).toMatchObject({ date: '2024-09-14', title: 'Baumgartner', sourceTotal: 33.75 })
    expect(r[60]).toMatchObject({ title: 'Gilgamesh', pageCount: 200, sourceTotal: 28.5 })
    expect(r[227]).toMatchObject({ title: 'Suomen tulevaisuudet', category: 'book' })
    expect(r[234]).toMatchObject({ title: 'Sotakummilapsi', category: 'book', sourceTotal: 30 })
    expect(r[234].pageCount).toBeUndefined()
    expect(r[160]).toMatchObject({ title: 'Canasta-ilta', ratings: [] })
    expect(JSON.stringify(clubArchive())).not.toContain('Pispalanharju 23')
    expect(r[90].date).toBe('2004')
    expect(r[98].date).toBe('2005')
  })
  it('ships verified metadata rather than making visitors fetch it', () => {
    const b = readingViews(clubArchive().works).filter((w) => w.category === 'book')
    expect(b.filter((w) => w.metadata)).toHaveLength(206)
    expect(b.filter((w) => !w.metadata).map((w) => w.meetingNumber)).toEqual([57])
    expect(
      new Set(b.flatMap((w) => w.locations.filter((l) => l.kind === 'subject').map((l) => l.country))).size
    ).toBeGreaterThanOrEqual(28)
    expect(b.filter((w) => w.themes.length).length).toBeGreaterThanOrEqual(198)
  })
  it('produces shareable findings and restricts all calculations to the selected year', () => {
    const a = clubArchive(),
      all = clubInsights(a),
      year = clubInsights(a, '2024')
    expect(all).toHaveLength(8)
    expect(all[0].value).toBe('57\u00a0748')
    expect(new Set(all.map((c) => c.id)).size).toBe(all.length)
    expect(all.every((c) => c.method.length > 40)).toBe(true)
    expect(year.flatMap((c) => c.works ?? []).every((w) => w.date?.startsWith('2024'))).toBe(true)
    expect(clubInsights(a, '1900')).toHaveLength(1)
  })
  it.skipIf(!process.env.ATLAS_SOURCE_NUMBERS)(
    'reconciles every published score and source meeting against the original Numbers cells',
    () => {
      const wb = XLSX.read(readFileSync(process.env.ATLAS_SOURCE_NUMBERS!), {
        type: 'buffer',
        cellDates: true
      })
      const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], {
        header: 1,
        defval: null,
        UTC: true
      })
      const a = clubArchive()
      for (const w of a.works) {
        const row = rows[w.sourceCells!.row - 1]
        expect(row[0]).toBe(w.meetingNumber)
        if (w.meetingNumber === 161)
          expect(w.sourceCells!.title).toBe('Pispalanharju (osoitenumero jätetty pois)')
        else expect(row[3] ?? '').toBe(w.sourceCells!.title)
        expect(row[2] ?? '').toBe(w.sourceCells!.creator)
        expect(typeof row[4] === 'number' ? row[4] : undefined).toBe(w.pageCount)
        expect(w.ratings.map((r) => r.value)).toEqual(row.slice(5, 9).filter((v) => typeof v === 'number'))
        expect(w.sourceTotal).toBe(row[9])
        if (row[1] instanceof Date) expect(w.date).toBe(row[1].toISOString().slice(0, 10))
        else expect(w.date).toBe(String(row[1]))
      }
    }
  )
})
