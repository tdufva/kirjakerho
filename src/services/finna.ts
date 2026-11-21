import { normalize, type Metadata, type Work, type Location } from '../domain/model'
import { places } from '../data/places'
import type { Catalogue } from '../domain/catalogue'
interface Subject {
  heading?: string[]
  type?: string
}
export interface FinnaRecord {
  id: string
  title: string
  nonPresenterAuthors?: { name?: string; role?: string }[]
  subjects?: string[][]
  subjectsExtended?: Subject[]
  placesOfPublication?: string[]
  year?: string
  summary?: string[]
  images?: string[]
}
export interface FinnaCandidate {
  title: string
  creator: string
  metadata: Metadata
  catalogue: Catalogue
  automatic: boolean
}
const aliases: Record<string, string> = {
  helsinki: 'Suomi',
  tampere: 'Suomi',
  turku: 'Suomi',
  espoo: 'Suomi',
  oulu: 'Suomi',
  porvoo: 'Suomi',
  hki: 'Suomi',
  stockholm: 'Ruotsi',
  tukholma: 'Ruotsi',
  göteborg: 'Ruotsi',
  oslo: 'Norja',
  kööpenhamina: 'Tanska',
  københavn: 'Tanska',
  paris: 'Ranska',
  pariisi: 'Ranska',
  london: 'Englanti',
  lontoo: 'Englanti',
  berlin: 'Saksa',
  berliini: 'Saksa',
  'new york': 'Yhdysvallat',
  'new york ny': 'Yhdysvallat',
  boston: 'Yhdysvallat',
  washington: 'Yhdysvallat',
  tokio: 'Japani',
  tokyo: 'Japani',
  rooma: 'Italia',
  roma: 'Italia',
  rome: 'Italia',
  moskova: 'Venäjä',
  pietari: 'Venäjä',
  dublin: 'Irlanti',
  amsterdam: 'Alankomaat',
  kairo: 'Egypti',
  'united states': 'Yhdysvallat',
  usa: 'Yhdysvallat',
  'united kingdom': 'Yhdistynyt kuningaskunta',
  'iso britannia': 'Yhdistynyt kuningaskunta',
  englanti: 'Englanti',
  england: 'Englanti',
  skotlanti: 'Yhdistynyt kuningaskunta',
  wales: 'Yhdistynyt kuningaskunta',
  finland: 'Suomi',
  sweden: 'Ruotsi',
  norway: 'Norja',
  denmark: 'Tanska',
  iceland: 'Islanti',
  france: 'Ranska',
  germany: 'Saksa',
  spain: 'Espanja',
  italy: 'Italia',
  russia: 'Venäjä',
  egypt: 'Egypti',
  japan: 'Japani',
  china: 'Kiina',
  syria: 'Syyria',
  india: 'Intia',
  ireland: 'Irlanti',
  'south africa': 'Etelä-Afrikka',
  australia: 'Australia',
  canada: 'Kanada'
}
function countryOf(value: string) {
  const key = normalize(value.replace(/[;:[\]]/g, ' ')),
    direct = places.find((p) => normalize(p.country) === key)
  return direct ?? places.find((p) => p.country === aliases[key])
}
function similarity(a: string, b: string) {
  const left = new Set(normalize(a).split(' ').filter(Boolean)),
    right = new Set(normalize(b).split(' ').filter(Boolean))
  return [...left].filter((t) => right.has(t)).length / Math.max(left.size, right.size, 1)
}
function usableTheme(value: string) {
  const label = normalize(value)
  return (
    label.length > 1 &&
    !countryOf(label) &&
    !/^\d/.test(label) &&
    !/(ennakkotieto|äänikirjat|e kirjat|suomen kieli|ruotsin kieli|englannin kieli|kielinen kirjallisuus|kaunokirjallisuus|isotekstiset kirjat)/.test(
      label
    )
  )
}
export function finnaCandidate(work: Work, record: FinnaRecord): FinnaCandidate {
  const authors = (record.nonPresenterAuthors ?? [])
    .filter((a) => !a.role || /kirjoittaja|tekijä|author|författare/.test(a.role))
    .map((a) => a.name ?? '')
    .filter(Boolean)
  const titleScore = similarity(work.title, record.title),
    authorScore = Math.max(0, ...authors.map((a) => similarity(work.creator, a)))
  const automatic = !!work.creator.trim() && titleScore >= 0.85 && authorScore >= 0.5
  const creator = authors.join(', '),
    url = `https://www.finna.fi/Record/${encodeURIComponent(record.id)}`,
    retrievedAt = new Date().toISOString()
  const structured = record.subjectsExtended ?? [],
    subjects = structured.length
      ? structured
          .filter((s) => !['personal name', 'corporate name', 'uniform title'].includes(s.type ?? ''))
          .map((s) => s.heading ?? [])
      : (record.subjects ?? [])
  const allSubjects = subjects
    .flat()
    .map((s) => s.trim())
    .filter(Boolean)
  const themes = [...new Set(allSubjects.filter(usableTheme))]
  const locations: Location[] = []
  function addCountry(label: string, kind: Location['kind']) {
    const country = countryOf(label)
    if (country && !locations.some((l) => l.country === country.country && l.kind === kind))
      locations.push({ ...country, kind })
  }
  for (const subject of allSubjects) addCountry(subject, 'subject')
  for (const place of record.placesOfPublication ?? [])
    for (const part of place.split(/\s*;\s*/)) addCountry(part, 'publication')
  const catalogue: Catalogue = { source: 'Finna', url, retrievedAt, themes, locations }
  const image = record.images?.[0]
  let cover: string | undefined
  if (image) {
    const candidate = new URL(image, 'https://api.finna.fi')
    if (candidate.protocol === 'https:') cover = candidate.href
  }
  return {
    title: record.title,
    creator,
    automatic,
    catalogue,
    metadata: {
      source: 'Finna',
      url,
      retrievedAt,
      externalId: record.id,
      confidence: titleScore * 0.75 + authorScore * 0.25,
      publicationYear: Number(record.year) || undefined,
      description: record.summary?.join(' ') || undefined,
      cover,
      subjects: allSubjects
    }
  }
}
export async function findFinna(work: Work, signal?: AbortSignal): Promise<FinnaCandidate[]> {
  const controller = new AbortController(),
    abort = () => controller.abort(),
    timeout = setTimeout(abort, 12000)
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  try {
    const query = new URLSearchParams({
      lookfor: `${work.title} ${work.creator}`,
      type: 'AllFields',
      limit: '15',
      'filter[]': 'format:"0/Book/"'
    })
    for (const field of [
      'id',
      'title',
      'nonPresenterAuthors',
      'year',
      'summary',
      'images',
      'subjects',
      'subjectsExtended',
      'placesOfPublication'
    ])
      query.append('field[]', field)
    const response = await fetch(`https://api.finna.fi/v1/search?${query}`, { signal: controller.signal })
    if (!response.ok) throw new Error(`Finna ei vastannut (${response.status}).`)
    const data = (await response.json()) as { status?: string; records?: FinnaRecord[] }
    if (data.status !== 'OK' || !Array.isArray(data.records))
      throw new Error('Finnan hakutulos ei ollut luettavissa.')
    return data.records
      .map((r) => finnaCandidate(work, r))
      .sort(
        (a, b) =>
          Number(b.automatic) - Number(a.automatic) ||
          b.metadata.confidence - a.metadata.confidence ||
          b.catalogue.themes.length +
            b.catalogue.locations.length -
            (a.catalogue.themes.length + a.catalogue.locations.length)
      )
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
