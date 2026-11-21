import { describe, expect, it } from 'vitest'
import { clubArchive } from '../data/club'
import { readingViews } from './readings'
import { atlasSelection, briefDescription } from './atlas'
const works = readingViews(clubArchive().works)
describe('Atlas selection previews', () => {
  it('keeps subject countries separate from story settings and publication places', () => {
    const egypt = atlasSelection(works, 'places', 'Egypti', 'subject', 'read')
    expect(egypt.map((w) => w.title)).toEqual(['Sinuhe egyptiläinen'])
    expect(egypt[0].ratings.map((r) => r.value)).toEqual([10, 9, 9.75, 10])
    expect(atlasSelection(works, 'places', 'Egypti', 'publication', 'read')).toEqual([])
    expect(atlasSelection(works, 'places', '', 'subject', 'read')).toEqual([])
  })
  it('opens the requested reading year without mixing in edition dates', () => {
    const year = atlasSelection(works, 'periods', '2024', 'subject', 'read')
    expect(year).toHaveLength(7)
    expect(year.some((w) => w.title === 'Sinuhe egyptiläinen')).toBe(false)
    const editions = atlasSelection(works, 'periods', '2010-luku', 'subject', 'published')
    expect(editions.some((w) => w.title === 'Sinuhe egyptiläinen')).toBe(true)
    expect(editions.every((w) => w.publicationYear! >= 2010 && w.publicationYear! < 2020)).toBe(true)
  })
  it('uses the same exact theme for theme tiles and the connection chart', () => {
    const theme = atlasSelection(works, 'themes', 'historialliset romaanit', 'subject', 'read')
    expect(theme.length).toBeGreaterThan(1)
    expect(theme).toEqual(atlasSelection(works, 'network', 'historialliset romaanit', 'subject', 'read'))
    expect(theme.every((w) => w.themes.includes('historialliset romaanit'))).toBe(true)
  })
  it('preserves missing ratings in cultural meetings', () => {
    const year = atlasSelection(works, 'periods', '2014', 'subject', 'read')
    expect(year.find((w) => w.meetingNumber === 161)?.ratings).toEqual([])
    expect(year.every((w) => w.ratings.every((r) => r.min === 4 && r.max === 10))).toBe(true)
  })
  it('uses sourced short descriptions and explicitly handles a missing description', () => {
    const unknown = works.find((w) => w.meetingNumber === 57)!
    expect(briefDescription(unknown)).toBe('Kirjasta ei ole vielä lähteistettyä kuvausta.')
    const sinuhe = works.find((w) => w.title === 'Sinuhe egyptiläinen')!
    expect(briefDescription(sinuhe)).toContain('historialliset romaanit')
    const long = briefDescription({ ...sinuhe, description: 'Lähteistetty kuvaus. '.repeat(50) })
    expect(long.length).toBeLessThanOrEqual(320)
    expect(long.endsWith('…')).toBe(true)
  })
})
