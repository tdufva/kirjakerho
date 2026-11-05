import type { Archive } from '../domain/model'
import { dateValue } from '../importer/excel'
const fail = (path: string): never => {
  throw new Error(`Varmuuskopion rakenne ei kelpaa: ${path}.`)
}
const obj = (v: unknown, p: string): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : fail(p)
const array = (v: unknown, p: string): unknown[] => (Array.isArray(v) ? v : fail(p))
const text = (v: unknown, p: string): string => (typeof v === 'string' ? v : fail(p))
const num = (v: unknown, p: string): number => (typeof v === 'number' && Number.isFinite(v) ? v : fail(p))
const optionalText = (v: unknown, p: string) => {
  if (v !== undefined) text(v, p)
}
function unique(ids: string[], path: string) {
  if (new Set(ids).size !== ids.length) fail(`${path}: päällekkäisiä tunnisteita`)
}
function date(v: unknown, p: string) {
  if (v !== undefined && (typeof v !== 'string' || dateValue(v) !== v)) fail(p)
}
export function validateArchive(value: unknown): Archive {
  const a = obj(value, 'arkisto')
  if (a.version !== 1 || !['demo', 'local', 'cloud'].includes(String(a.mode)))
    fail('versio tai tallennustapa')
  const members = array(a.members, 'jäsenet').map((v, i) => {
    const m = obj(v, `jäsen ${i + 1}`)
    const id = text(m.id, 'jäsenen tunniste')
    if (!text(m.name, 'jäsenen nimi').trim()) fail('tyhjä jäsenen nimi')
    if (!/^#[a-fA-F0-9]{3,8}$/.test(text(m.color, 'jäsenen väri'))) fail('jäsenen väri')
    return id
  })
  unique(members, 'jäsenet')
  const rating = (v: unknown) => {
    const r = obj(v, 'arvosana')
    if (!members.includes(text(r.memberId, 'arvioijan tunniste'))) fail('tuntematon arvioija')
    const n = num(r.value, 'arvosana'),
      min = num(r.min, 'asteikon alaraja'),
      max = num(r.max, 'asteikon yläraja')
    if (max <= min || n < min || n > max) fail('arvosana asteikon ulkopuolella')
    optionalText(r.review, 'arvio')
    optionalText(r.source, 'lähde')
    return String(r.memberId)
  }
  const reviews = (v: unknown) => {
    if (v !== undefined)
      for (const item of array(v, 'kommentit')) {
        const r = obj(item, 'kommentti')
        if (!members.includes(text(r.memberId, 'kommentin arvioija'))) fail('tuntematon kommentoija')
        text(r.text, 'kommentin teksti')
        optionalText(r.source, 'kommentin lähde')
      }
  }
  const workIds = array(a.works, 'teokset').map((v, i) => {
    const w = obj(v, `teos ${i + 1}`)
    const id = text(w.id, 'teoksen tunniste')
    if (!text(w.title, 'nimi').trim()) fail('tyhjä teoksen nimi')
    text(w.creator, 'tekijä')
    if (!['book', 'theatre', 'exhibition', 'other'].includes(String(w.category))) fail('kulttuurilaji')
    if (!/^#[a-fA-F0-9]{3,8}$/.test(text(w.color, 'teoksen väri'))) fail('teoksen väri')
    if (!Number.isInteger(num(w.motif, 'kuvio')) || Number(w.motif) < 0) fail('kuvio')
    date(w.date, 'teoksen päiväys')
    unique(array(w.ratings, 'arvosanat').map(rating), 'teoksen arvosanat')
    reviews(w.reviews)
    array(w.themes, 'teemat').forEach((x) => text(x, 'teema'))
    for (const v of array(w.locations, 'paikat')) {
      const l = obj(v, 'paikka')
      text(l.name, 'paikannimi')
      text(l.country, 'maa')
      if (
        Math.abs(num(l.lat, 'leveysaste')) > 90 ||
        Math.abs(num(l.lon, 'pituusaste')) > 180 ||
        !['setting', 'author', 'publication'].includes(String(l.kind))
      )
        fail('paikka')
    }
    for (const field of ['description', 'period', 'notes', 'source', 'annotationSource'])
      optionalText(w[field], field)
    if (w.publicationYear !== undefined) num(w.publicationYear, 'julkaisuvuosi')
    if (w.readingSessions !== undefined) {
      const sessions = array(w.readingSessions, 'lukukerrat')
      if (!sessions.length) fail('tyhjät lukukerrat')
      const dates: string[] = []
      unique(
        sessions.map((v) => {
          const s = obj(v, 'lukukerta')
          date(s.date, 'lukukerran päiväys')
          dates.push(String(s.date ?? ''))
          unique(array(s.ratings, 'lukukerran arvosanat').map(rating), 'lukukerran arvosanat')
          reviews(s.reviews)
          optionalText(s.notes, 'muistiinpanot')
          optionalText(s.source, 'lähde')
          return text(s.id, 'lukukerran tunniste')
        }),
        'lukukerrat'
      )
      unique(dates, 'lukukertojen päiväykset')
    }
    if (w.metadata !== undefined) {
      const m = obj(w.metadata, 'lähdetiedot')
      if (!['Finna', 'Open Library', 'Google Books'].includes(String(m.source))) fail('lähdepalvelu')
      text(m.retrievedAt, 'hakuaika')
      num(m.confidence, 'varmuus')
      text(m.externalId, 'lähdetunniste')
      optionalText(m.description, 'lähdekuvaus')
      if (m.publicationYear !== undefined) num(m.publicationYear, 'lähteen julkaisuvuosi')
      if (m.subjects !== undefined) array(m.subjects, 'asiasanat').forEach((x) => text(x, 'asiasana'))
      for (const field of ['url', 'cover'])
        if (m[field] !== undefined) {
          let url: URL
          try {
            url = new URL(text(m[field], field))
          } catch {
            fail(field)
          }
          if (!['https:', 'http:'].includes(url!.protocol)) fail(field)
        }
    }
    return id
  })
  unique(workIds, 'teokset')
  const imports = array(a.imports, 'tuontihistoria').map((v) => {
    const i = obj(v, 'tuonti')
    for (const f of ['filename', 'fingerprint', 'at']) text(i[f], f)
    num(i.added, 'lisätyt')
    num(i.updated, 'päivitetyt')
    array(i.warnings, 'huomiot').forEach((x) => text(x, 'huomio'))
    return text(i.id, 'tuonnin tunniste')
  })
  unique(imports, 'tuonnit')
  return value as Archive
}
async function checksum(value: unknown) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)))
  return Array.from(new Uint8Array(digest))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
}
export async function createBackup(archive: Archive) {
  return {
    format: 'kirjakerhon-atlas',
    formatVersion: 1,
    createdAt: new Date().toISOString(),
    sha256: await checksum(archive),
    archive
  }
}
export async function readBackup(file: File): Promise<{ archive: Archive; verified: boolean }> {
  if (file.size > 50 * 1024 * 1024) throw new Error('Varmuuskopio saa olla enintään 50 Mt.')
  let value: unknown
  try {
    value = JSON.parse(await file.text())
  } catch {
    throw new Error('Tiedosto ei ole luettavaa JSON-muotoa.')
  }
  const data = obj(value, 'tiedosto')
  let verified = false,
    payload: unknown = data
  if (data.format === 'kirjakerhon-atlas') {
    if (data.formatVersion !== 1) throw new Error('Tätä varmuuskopion versiota ei tueta.')
    if (data.sha256 !== (await checksum(data.archive)))
      throw new Error('Varmuuskopion tarkistussumma ei täsmää. Tiedosto voi olla muuttunut.')
    verified = true
    payload = data.archive
  }
  return { archive: validateArchive(payload), verified }
}
