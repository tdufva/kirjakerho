import type { Location, Work } from './model'
import { yearOf } from './statistics'
export type AtlasTab = 'places' | 'periods' | 'themes' | 'network'
export type PeriodMode = 'setting' | 'published' | 'read'
export function periodLabel(work: Work, mode: PeriodMode): string {
  if (mode === 'read') return yearOf(work)
  if (mode === 'published')
    return work.publicationYear ? `${Math.floor(work.publicationYear / 10) * 10}-luku` : ''
  return work.period ?? ''
}
export function atlasSelection(
  works: Work[],
  tab: AtlasTab,
  value: string,
  kind: Location['kind'],
  periodMode: PeriodMode
): Work[] {
  if (!value) return []
  if (tab === 'places')
    return works.filter((w) => w.locations.some((l) => l.kind === kind && l.country === value))
  if (tab === 'periods') return works.filter((w) => periodLabel(w, periodMode) === value)
  return works.filter((w) => w.themes.includes(value))
}
export function briefDescription(work: Work): string {
  const description = work.description?.trim() || work.metadata?.description?.trim()
  const text =
    description ||
    (work.themes.length
      ? `Aiheita ja kirjallisuuden lajeja: ${work.themes.join(', ')}.`
      : work.category === 'book'
        ? 'Kirjasta ei ole vielä lähteistettyä kuvausta.'
        : 'Kulttuurikerhon yhteinen kulttuurikohtaaminen. Tarkempaa kuvausta ei ole lähteessä.')
  if (text.length <= 320) return text
  const shortened = text.slice(0, 317)
  const boundary = shortened.lastIndexOf(' ')
  return shortened.slice(0, boundary > 230 ? boundary : 317).replace(/[,;:]$/, '') + '…'
}
