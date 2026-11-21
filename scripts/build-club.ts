/** Rebuild the public archive from the owner's Numbers source. Never edit the workbook.
 * pnpm exec esbuild scripts/build-club.ts --bundle --platform=node --packages=external --format=esm --outfile=tmp/build-club.mjs
 * node tmp/build-club.mjs /absolute/path/Kulttuurikerho.numbers [--enrich]
 * Network responses are cached in ignored tmp/club-public/finna/ for review/repeatability.
 */
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import * as XLSX from 'xlsx'
import { stableId, normalize, type Work, type Archive } from '../src/domain/model'
import { places } from '../src/data/places'
import { finnaCandidate, type FinnaRecord } from '../src/services/finna'

const input = process.argv[2]
if (!input) throw new Error('Give the source .numbers path')
const bytes = await fs.readFile(input)
const workbook = XLSX.read(bytes, { type: 'buffer', cellDates: true })
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, UTC: true })
await fs.mkdir('tmp/club-public/finna', { recursive: true })
await fs.mkdir('src/data', { recursive: true })
const members = [
  { id: 'tiina', name: 'Tiina', color: '#BC6438' },
  { id: 'hilkka', name: 'Hilkka', color: '#A5AB87' },
  { id: 'erkki', name: 'Erkki', color: '#AB9387' },
  { id: 'jouko', name: 'Jouko', color: '#C8A95C' }
]
// Source typos, shortened titles and one swapped author/title pair. Original cells remain in sourceCells.
const corrections: Record<number, [string, string]> = {
  33: ['Äidin ruoho on parasta', 'Dario Fo'],
  161: ['Canasta-ilta', 'Kulttuurikerho'],
  105: ['Matti', 'Aleksi Mäkelä'],
  116: ['Vihreä Palma', 'Tampereen teatterikesä'],
  117: ['Joulutarina', 'Juha Wuolijoki'],
  132: ['Avatar', 'James Cameron'],
  136: ['Rakkausrevyy', 'Musiikkiteatteri Palatsi'],
  141: ['Veljekset', 'Mika Kaurismäki'],
  169: ['Mielensäpahoittaja', 'Dome Karukoski'],
  213: ['Elämää kuoleman jälkeen', 'Klaus Härö'],
  229: ['70 on vain numero', 'Johanna Vuoksenmaa'],
  1: ['Tuomari Müller, hieno mies', 'Eeva Joenpelto'],
  2: ['Forrest Gump', 'Winston Groom'],
  15: ['Stenvallin tapaus', 'Kirsti Manninen, Jouko Raivio'],
  26: ['Pitkin Tonavaa', 'Péter Esterházy'],
  28: ['Feliks onnellinen', 'Mika Waltari'],
  39: ['Istuin Piedrajoen rannalla ja itkin', 'Paulo Coelho'],
  102: ['Tosi on!', 'Ari Turunen'],
  137: ['Pharmageddon', 'Markku Myllykangas, Tomi-Pekka Tuomainen'],
  146: ['Château Inkeroinen', 'Jari Järvelä'],
  180: ['Hyvän elämän filosofiaa', 'Ilkka Niiniluoto'],
  204: ['Vanhanakin voi ajatella', 'Antti Eskola'],
  210: ['Westend', 'Suvi Vaarla'],
  220: ['Ilmastonmuutos ilmatieteilijän silmin', 'Petteri Taalas'],
  226: ['Rusalka', 'Marissa Mehr'],
  46: ['Lukija', 'Bernhard Schlink'],
  61: ['Gilgamesh', 'Tuntematon'],
  62: ['Marian evankeliumi', 'Marianne Fredriksson'],
  64: ['Ihmiset suviyössä', 'F. E. Sillanpää'],
  68: ['Kun kesä kääntyy', 'Merete Mazzarella'],
  81: ['Elämän paras aika', 'Antti Heikkilä'],
  84: ['Juoksuhaudantie', 'Kari Hotakainen'],
  103: ['Flow', 'Mihaly Csikszentmihalyi'],
  127: ['Kultasuoni', 'Julia Cameron'],
  131: ['Grow Younger, Live Longer', 'Deepak Chopra'],
  153: ['Tuberkuloosifragmentit', 'Franz Kafka'],
  160: ['Wahlroos', 'Tuomo Pietiläinen'],
  172: ['Suoliston salaisuus', 'Giulia Enders'],
  181: ['60+ iloa elämään', 'Jaakko Valvanne, Leila Tuohino'],
  197: ['Ainoa mikä jää', 'Kari Enqvist, Janne Saarikivi'],
  222: ['Oma maa', 'Ann-Luise Bertell'],
  228: ['Suomen tulevaisuudet', 'Jarno Limnéll, Elina Hiltunen, Mikko Dufva'],
  236: ['Ensimmäinen persoona', 'Haruki Murakami'],
  242: ['Minä, Armi Maria R', 'Raija Oranen']
}
const string = (v: unknown) => (v == null ? '' : String(v).trim())
let section = 'history',
  rankingCopies = 0
const works: Work[] = []
const issues: { meeting: number; message: string }[] = []
for (const [index, cells] of rows.entries()) {
  const c = string(cells[2])
  if (/Kultturikerhon parhaat|Häntäpää/.test(c)) section = 'ranking'
  if (/^Vuosi 2019|^Lisätty/.test(c)) section = 'history'
  const number = Number(cells[0])
  if (!Number.isInteger(number) || number < 1 || number > 252) continue
  if (section === 'ranking') {
    rankingCopies++
    continue
  }
  const date =
    cells[1] instanceof Date
      ? cells[1].toISOString().slice(0, 10)
      : typeof cells[1] === 'number' && cells[1] >= 1900 && cells[1] < 2100
        ? String(cells[1])
        : undefined
  if (!date) throw new Error(`Missing meeting date at row ${index + 1}`)
  const pageCount = typeof cells[4] === 'number' && cells[4] > 0 ? cells[4] : undefined
  const isBook = !!pageCount || number === 235 // Sotakummilapsi: source pages blank, verified book in Finna.
  const sourceTitle = string(cells[3]),
    sourceCreator = c
  const [title, creator] = corrections[number] ?? [sourceTitle || sourceCreator, sourceCreator]
  const category = isBook
    ? 'book'
    : /teatteri|TTT|^TT$|revyy|pasodoble|tulenkantajat|klassikot lavalla/i.test(c + ' ' + sourceTitle)
      ? 'theatre'
      : /näyttely|taidemuseo|taidehalli|Art Area|nuori taiteilija/i.test(c + ' ' + sourceTitle)
        ? 'exhibition'
        : 'other'
  const source = `Kulttuurikerho.numbers · ${workbook.SheetNames[0]}!A${index + 1}:J${index + 1}`
  const ratings = members.flatMap((member, i) => {
    const v = cells[5 + i]
    if (typeof v !== 'number') return []
    if (v < 4 || v > 10) throw new Error(`Out-of-scale rating in meeting ${number}`)
    return [
      {
        memberId: member.id,
        value: v,
        min: 4,
        max: 10,
        source: `${workbook.SheetNames[0]}!${'FGHI'[i]}${index + 1}`
      }
    ]
  })
  const sourceTotal = typeof cells[9] === 'number' ? cells[9] : undefined
  if (ratings.length && Math.abs(ratings.reduce((s, r) => s + r.value, 0) - (sourceTotal ?? NaN)) > 1e-8)
    issues.push({ meeting: number, message: 'Lähteen yhteispisteet poikkeavat laskusta.' })
  if (!isBook && number === 182)
    issues.push({
      meeting: number,
      message: 'Tapahtuman nimisolu on tyhjä; nimenä käytetään tapahtumasaraketta.'
    })
  if (number === 235)
    issues.push({
      meeting: number,
      message: 'Sotakummilapsi on kirja. Lähteen sivumäärä on tyhjä; sivutilasto ei sisällä sitä.'
    })
  const id = stableId(`kulttuurikerho:meeting:${number}`)
  works.push({
    id,
    title,
    creator,
    category,
    date,
    meetingNumber: number,
    pageCount,
    sourceTotal,
    sourceCells: {
      row: index + 1,
      title: cells[3] == null ? '' : String(cells[3]),
      creator: cells[2] == null ? '' : String(cells[2])
    },
    ratings,
    themes: [],
    locations: [],
    source,
    motif: number % 8,
    color: ['#6E6121', '#BC6438', '#A5AB87', '#AB9387'][number % 4],
    readingSessions: [
      {
        id: stableId(`kulttuurikerho:reading:${number}`),
        date,
        meetingNumber: number,
        pageCount,
        sourceTotal,
        ratings,
        reviews: [],
        source
      }
    ]
  })
}
works.sort((a, b) => a.meetingNumber! - b.meetingNumber!)
if (works.length !== 252 || works.some((w, i) => w.meetingNumber !== i + 1))
  throw new Error('Meetings 1–252 must each occur once')
if (works.reduce((s, w) => s + w.ratings.length, 0) !== 996) throw new Error('Expected 996 ratings')
if (works.reduce((s, w) => s + (w.pageCount ?? 0), 0) !== 57748) throw new Error('Page reconciliation failed')

const overrides: Record<string, string> = JSON.parse(
  await fs.readFile('scripts/club-matches.json', 'utf8').catch(() => '{}')
)
async function search(query: string, type = 'AllFields'): Promise<FinnaRecord[]> {
  const cache = `tmp/club-public/finna/${createHash('sha256')
    .update(type + query)
    .digest('hex')}.json`
  try {
    return JSON.parse(await fs.readFile(cache, 'utf8'))
  } catch {
    /* not cached */
  }
  const params = new URLSearchParams({ lookfor: query, type, limit: '30', 'filter[]': 'format:"0/Book/"' })
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
    params.append('field[]', field)
  const response = await fetch(`https://api.finna.fi/v1/search?${params}`, {
    signal: AbortSignal.timeout(20000)
  })
  if (!response.ok) throw new Error(`Finna ${response.status}`)
  const data = await response.json()
  if (data.status !== 'OK') throw new Error('Invalid Finna response')
  await fs.writeFile(cache, JSON.stringify(data.records ?? []))
  return data.records ?? []
}
const candidates: Record<string, unknown> = {}
const failures: string[] = []
async function enrich(w: Work) {
  const number = w.meetingNumber!
  try {
    let records = await search(`"${w.title}"`, 'Title')
    let choices = records.map((r) => finnaCandidate(w, r))
    if (!choices.some((c) => c.automatic)) {
      records = [...records, ...(await search(`${w.title} ${w.creator === 'Tuntematon' ? '' : w.creator}`))]
      choices = records.map((r) => finnaCandidate(w, r))
    }
    const selectedId = overrides[number]
    if (selectedId && !records.some((r) => r.id === selectedId)) {
      const cache = `tmp/club-public/finna/record-${selectedId.replace(/[^\w.-]/g, '_')}.json`
      let record: FinnaRecord
      try {
        record = JSON.parse(await fs.readFile(cache, 'utf8'))
      } catch {
        const res = await fetch(`https://api.finna.fi/v1/record?id=${encodeURIComponent(selectedId)}`, {
          signal: AbortSignal.timeout(20000)
        })
        const data = await res.json()
        record = data.records?.[0]
        if (!record) throw new Error(`Missing override ${selectedId}`)
        await fs.writeFile(cache, JSON.stringify(record))
      }
      choices.push(finnaCandidate(w, record))
    }
    // Prefer records with subject headings; never infer a match from a shared author alone.
    choices.sort(
      (a, b) =>
        Number(b.automatic) - Number(a.automatic) ||
        b.catalogue.themes.length +
          b.catalogue.locations.length -
          (a.catalogue.themes.length + a.catalogue.locations.length) ||
        b.metadata.confidence - a.metadata.confidence
    )
    const plain = (s: string) =>
      normalize(s)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    const authorTokens = plain(w.creator)
      .split(' ')
      .filter((t) => t.length > 2)
    const close = choices.filter((c) => {
      const a = plain(w.title),
        b = plain(c.title.split(/\s[:/]\s/)[0])
      const titleMatch =
        a === b || b.startsWith(a + ' ') || (a.startsWith(b + ' ') && b.length / a.length > 0.7)
      const authorMatch =
        authorTokens.filter((t) => plain(c.creator).split(' ').includes(t)).length /
          Math.max(1, authorTokens.length) >=
        0.5
      return titleMatch && authorMatch
    })
    const suitable = choices.filter(
      (c) => (c.automatic || close.includes(c)) && !/kuunnelma|selkomukautus|sarjakuva/i.test(c.title)
    )
    suitable.sort(
      (a, b) =>
        b.catalogue.themes.length +
        b.catalogue.locations.length -
        (a.catalogue.themes.length + a.catalogue.locations.length)
    )
    const selected = selectedId ? choices.find((c) => c.metadata.externalId === selectedId) : suitable[0]
    candidates[number] = choices.slice(0, 6).map((c) => ({
      id: c.metadata.externalId,
      title: c.title,
      creator: c.creator,
      automatic: c.automatic,
      themes: c.catalogue.themes,
      locations: c.catalogue.locations.map((l) => `${l.kind}:${l.country}`)
    }))
    if (selected) {
      w.catalogue = selected.catalogue
      w.metadata = selected.metadata
      w.description = selected.metadata.description
      w.publicationYear = selected.metadata.publicationYear
    } else failures.push(`${number}: ${w.title} / ${w.creator}`)
  } catch (e) {
    failures.push(`${number}: ${w.title} (${String(e)})`)
  }
}
if (process.argv.includes('--enrich')) {
  const queue = works.filter((w) => w.category === 'book')
  let finished = 0
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      while (queue.length) {
        const w = queue.shift()!
        await enrich(w)
        finished++
        if (finished % 20 === 0) console.log(`Enriched ${finished}/207, unresolved ${failures.length}`)
      }
    })
  )
  await fs.writeFile('tmp/club-public/candidates.json', JSON.stringify(candidates, null, 2))
  await fs.writeFile('tmp/club-public/unresolved.json', JSON.stringify(failures, null, 2))
}
// Two English-language titles are absent from Finna. Verified title/author matches in Open Library.
const openLibrary: Record<number, { id: string; year: number; themes: string[] }> = {
  100: { id: 'OL19903082W', year: 2003, themes: ['tantra', 'seksuaalisuus', 'parisuhde'] },
  131: { id: 'OL548729W', year: 2001, themes: ['ikääntyminen', 'pitkäikäisyys', 'terveyskäyttäytyminen'] }
}
const supplements = JSON.parse(await fs.readFile('scripts/club-supplements.json', 'utf8'))
for (const w of works) {
  if (w.meetingNumber === 161 && w.sourceCells) {
    // A home street number is not needed in the public cultural archive.
    w.sourceCells.title = 'Pispalanharju (osoitenumero jätetty pois)'
    issues.push({
      meeting: 161,
      message:
        'Canasta-tapaamisen osoitenumero on jätetty pois julkisesta versiosta. Päiväys ja tapaaminen säilyvät.'
    })
  }
  const extra = supplements[w.meetingNumber!]
  if (extra && process.argv.includes('--enrich')) {
    w.themes = extra.themes
    w.annotationSource = extra.url
    w.period = extra.period
    w.locations = (extra.countries ?? []).map((country: string) => ({
      ...places.find((p) => p.country === country)!,
      kind: 'setting'
    }))
  }
  const fallback = openLibrary[w.meetingNumber!]
  if (fallback && process.argv.includes('--enrich')) {
    const url = `https://openlibrary.org/works/${fallback.id}`
    w.metadata = {
      source: 'Open Library',
      url,
      externalId: fallback.id,
      retrievedAt: new Date().toISOString(),
      confidence: 1,
      publicationYear: fallback.year,
      subjects: fallback.themes
    }
    w.themes = fallback.themes
    w.publicationYear = fallback.year
    w.annotationSource = url
  }
  if (w.meetingNumber === 57)
    w.notes =
      'Omistaja vahvisti nimen ja tekijän 21.11.2026. Mahdollinen omakustanne. Kirjastotietuetta, teemoja tai tapahtumapaikkaa ei saatu varmistettua.'
  if (w.meetingNumber === 57)
    issues.push({
      meeting: 57,
      message:
        'Ranskalaisen talon poika / Tero Ansio: omistaja vahvisti nimen ja tekijän. Mahdollinen omakustanne; kirjastovastaavuutta ei löytynyt. Merkintä ja arvosanat ovat mukana.'
    })
  // Avoid reproducing long publisher blurbs; subject-derived descriptions are explicit and compact.
  if (w.notes && w.readingSessions?.[0]) w.readingSessions[0].notes = w.notes
  const labels = [...new Set([...w.themes, ...(w.catalogue?.themes ?? [])])]
  w.description = labels.length
    ? `Aiheita ja kirjallisuuden lajeja: ${labels.slice(0, 8).join(', ')}.`
    : undefined
  if (w.metadata) delete w.metadata.description
}
const archive: Archive = {
  version: 1,
  mode: 'local',
  members,
  works,
  imports: [],
  dataset: {
    id: 'kulttuurikerho',
    version: '2026-11-21.1',
    filename: 'Kulttuurikerho.numbers',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    firstDate: works[0].date!,
    lastDate: works.at(-1)!.date!,
    meetings: works.length,
    ratings: 996,
    rankingCopies,
    recordedPages: 57748,
    issues,
    metadataCheckedAt: new Date().toISOString().slice(0, 10)
  }
}
await fs.writeFile(
  'tmp/club-public/unresolved.json',
  JSON.stringify(
    works
      .filter((w) => w.category === 'book' && !w.metadata)
      .map((w) => `${w.meetingNumber}: ${w.title} / ${w.creator}`),
    null,
    2
  )
)
await fs.writeFile('src/data/club.json', JSON.stringify(archive, null, 2) + '\n')
console.log(
  JSON.stringify(
    {
      meetings: works.length,
      books: works.filter((w) => w.category === 'book').length,
      ratings: 996,
      rankingCopies,
      enriched: works.filter((w) => w.metadata).length,
      unresolved: works.filter((w) => w.category === 'book' && !w.metadata).map((w) => w.title),
      issues
    },
    null,
    2
  )
)
