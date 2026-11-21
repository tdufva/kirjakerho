import * as XLSX from 'xlsx'
import { readingId, sessionsFor, withSessions, uniqueReviews, type ReadingSession } from '../domain/readings'
import { normalize, stableId, workKey, memberColors } from '../domain/model'
import type { Archive, Category, Member, Work, ImportRecord } from '../domain/model'
export type Cell = string | number | boolean | Date | null
export type Role =
  | 'title'
  | 'creator'
  | 'date'
  | 'publicationYear'
  | 'category'
  | 'reviewer'
  | 'rating'
  | 'review'
  | 'memberRating'
  | 'memberReview'
  | 'location'
  | 'notes'
  | 'ignore'
export interface Column {
  index: number
  header: string
  role: Role
  member?: string
  confidence: number
}
export interface Sheet {
  name: string
  rows: Cell[][]
  headerRow: number
  columns: Column[]
  enabled: boolean
  cellWarnings?: Record<string, string>
  originalRows?: Cell[][]
}
export interface Workbook {
  filename: string
  fingerprint: string
  sheets: Sheet[]
}
export type AuditStatus = 'imported' | 'merged' | 'empty' | 'stored' | 'review' | 'excluded' | 'header'
export interface CellAudit {
  sheet: string
  row: number
  column: number
  address: string
  raw: Cell
  original: Cell
  role: Role
  member?: string
  status: AuditStatus
  interpreted: string
  reason: string
  workId?: string
  readingId?: string
}
export interface RowAudit {
  sheet: string
  row: number
  status: AuditStatus
  title: string
  reason: string
}
export interface BlankRating {
  workId: string
  date?: string
  memberId: string
  source: string
}
export interface Preview {
  works: Work[]
  members: Member[]
  issues: string[]
  skipped: number
  rows: number
  cells: CellAudit[]
  rowAudit: RowAudit[]
  blankRatings: BlankRating[]
}
export type BlankPolicy = 'keep' | 'delete'
export interface ImportChange {
  kind: 'work' | 'reading' | 'rating' | 'review' | 'notes' | 'details'
  title: string
  date?: string
  member?: string
  before: string
  after: string
  source?: string
}
export const roleLabels: Record<Role, string> = {
  title: 'Teoksen nimi',
  creator: 'Tekijä',
  date: 'Luku- tai tapahtumapäivä',
  publicationYear: 'Julkaisuvuosi',
  category: 'Kulttuurilaji',
  reviewer: 'Arvioijan nimi',
  rating: 'Arvosana',
  review: 'Kirjoitettu arvio',
  memberRating: 'Jäsenen arvosana',
  memberReview: 'Jäsenen kirjoitettu arvio',
  location: 'Paikka (alkuperäinen)',
  notes: 'Muistiinpano',
  ignore: 'Säilytä muistiinpanona'
}
const patterns: [Role, RegExp][] = [
  ['title', /^(kirja|kirjan nimi|teos|teoksen nimi|nimi|title|book|bok|titel|esitys|näyttely)$/],
  ['creator', /^(kirjailija(?: tapahtuma)?|tekijä|author|writer|författare|upphov|taiteilija|ohjaaja)$/],
  ['publicationYear', /^(julkaisuvuosi|ilmestymisvuosi|publication year|published|utgivningsår)$/],
  ['date', /^(päivämäärä|pvm|päivä|luettu|vuosi|year|date|datum|läst|luku.*päivä|keskustelu.*)$/],
  ['category', /^(laji|kulttuurilaji|kategoria|category|type|typ|luokka)$/],
  ['reviewer', /^(arvioija|jäsen|henkilö|reviewer|member|person|namn|recensent)$/],
  ['rating', /^(arvosana|arvosanat|pisteet|piste|rating|score|betyg|poäng|arvio\s*\(numero\))$/],
  ['review', /^(arvio|kommentti|kommentit|arvostelu|review|comment|recension|omdöme)$/],
  ['location', /^(paikka|kaupunki|maa|location|country|stad|land)$/],
  ['notes', /^(muistiinpanot|huomiot|notes|anteckningar|lisätiedot)$/]
]
const numeric = (v: Cell): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string' || !/^-?\d+(?:[.,]\d+)?$/.test(v.trim())) return null
  return Number(v.trim().replace(',', '.'))
}
const str = (v: Cell | undefined): string =>
  v == null ? '' : v instanceof Date && Number.isFinite(v.getTime()) ? dateValue(v)! : String(v).trim()
function headerScore(row: Cell[]): number {
  const labels = row.map((v) => normalize(str(v)))
  return (
    labels.reduce((sum, h) => sum + (patterns.some(([, p]) => p.test(h)) ? 2 : 0), 0) +
    (labels.some((h) => patterns[0][1].test(h)) ? 5 : 0)
  )
}
export function detectSheet(name: string, rows: Cell[][], forcedHeader?: number): Sheet {
  let headerRow = 0,
    best = -1
  rows.slice(0, 40).forEach((row, i) => {
    const score = headerScore(row)
    if (score > best) {
      best = score
      headerRow = i
    }
  })
  if (forcedHeader !== undefined) headerRow = forcedHeader
  const headers = rows[headerRow] ?? [],
    data = rows.slice(headerRow + 1).filter((r) => r.some((v) => str(v)))
  const width = data.reduce((width, row) => Math.max(width, row.length), headers.length)
  const columns: Column[] = Array.from({ length: width }, (_, index) => {
    const header = str(headers[index]) || `Sarake ${XLSX.utils.encode_col(index)}`,
      h = normalize(header)
    const recognized = patterns.find(([, p]) => p.test(h))
    const commentLabel = /\b(kommentit|kommentti|arvostelu|arvio|reviews?|comments?|recension|omdöme)\b/gi
    const scoreLabel = /\b(arvosanat?|ratings?|betyg|pisteet|poäng|score)\b/gi
    const memberName = (label: RegExp) =>
      header
        .replace(label, '')
        .replace(/^[\s:–—()_-]+|[\s:–—()_-]+$/g, '')
        .trim()
    if (recognized) return { index, header, role: recognized[0], confidence: 0.98 }
    if (memberName(commentLabel) !== header && memberName(commentLabel))
      return { index, header, role: 'memberReview', member: memberName(commentLabel), confidence: 0.85 }
    if (
      memberName(scoreLabel) !== header &&
      memberName(scoreLabel) &&
      !/(keskiarvo|average|medel|summa|yhteensä)/.test(h)
    )
      return { index, header, role: 'memberRating', member: memberName(scoreLabel), confidence: 0.85 }
    const values = data
      .map((r) => r[index] ?? null)
      .filter((v) => str(v) && !patterns.some(([, p]) => p.test(normalize(str(v)))))
    const nums = values.map(numeric).filter((n): n is number => n !== null)
    const excludes =
      /keskiarvo|average|medel|yhteensä|summa|^yht$|^total$|kokous|sivu|pages|antal|numero|isbn|id|vuosi|year/.test(
        h
      )
    if (
      !excludes &&
      nums.length &&
      nums.length / values.length >= 0.6 &&
      nums.filter((n) => n >= 0 && n <= 100).length / nums.length >= 0.8
    ) {
      return {
        index,
        header,
        role: 'memberRating',
        member: header.replace(/\s*(arvosana|rating|betyg|pisteet)\s*/gi, '').trim(),
        confidence: 0.78
      }
    }
    if (
      !excludes &&
      values.length >= 3 &&
      values.every((v) => typeof v === 'string' && str(v).length < 40) &&
      new Set(values.map(str)).size <= 8 &&
      new Set(values.map(str)).size < values.length * 0.6
    ) {
      return { index, header, role: 'reviewer', confidence: 0.5 }
    }
    return { index, header, role: 'ignore', confidence: 0.25 }
  })
  return { name, rows, headerRow, columns, enabled: columns.some((c) => c.role === 'title') }
}
export async function readWorkbook(file: File): Promise<Workbook> {
  if (file.size > 20 * 1024 * 1024) throw new Error('Valitse alle 20 megatavun tiedosto.')
  const bytes = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const fingerprint = Array.from(new Uint8Array(digest))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(bytes, { type: 'array', cellDates: true })
  } catch {
    throw new Error(
      file.name.toLowerCase().endsWith('.numbers')
        ? 'Numbers-tiedostoa ei voitu avata. Poista mahdollinen salasana tai vie tiedosto Numbersissa Excel-muotoon.'
        : 'Tiedostoa ei voitu avata. Valitse ehjä Numbers-, Excel-, CSV- tai ODS-tiedosto.'
    )
  }
  let totalCells = 0
  const sheets = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name]
    // Ignore formatting-only cells. Their declared range can extend to the end of an Excel sheet.
    const end = { r: 0, c: 0 }
    for (const [address, cell] of Object.entries(ws))
      if (!address.startsWith('!') && (cell?.v != null || cell?.f)) {
        const position = XLSX.utils.decode_cell(address)
        end.r = Math.max(end.r, position.r)
        end.c = Math.max(end.c, position.c)
      }
    for (const merge of ws['!merges'] ?? [])
      if (ws[XLSX.utils.encode_cell(merge.s)]?.v != null) {
        end.r = Math.max(end.r, merge.e.r)
        end.c = Math.max(end.c, merge.e.c)
      }
    totalCells += (end.r + 1) * (end.c + 1)
    if (totalCells > 250_000)
      throw new Error(
        'Taulukon alue on liian suuri kerralla tarkistettavaksi. Jaa tiedosto pienempiin osiin ja yritä uudelleen.'
      )
    const readRows = () =>
      XLSX.utils.sheet_to_json<Cell[]>(ws, {
        header: 1,
        defval: null,
        raw: true,
        UTC: true,
        blankrows: true,
        range: { s: { r: 0, c: 0 }, e: end }
      })
    const originalRows = readRows()
    // Only propagate cells that Excel explicitly marks as merged.
    const merges = ws['!merges'] ?? []
    for (const merge of merges) {
      const first = ws[XLSX.utils.encode_cell(merge.s)]
      if (first?.v != null)
        for (let r = merge.s.r; r <= merge.e.r; r++)
          for (let c = merge.s.c; c <= merge.e.c; c++) {
            const key = XLSX.utils.encode_cell({ r, c })
            if (!ws[key]) ws[key] = { ...first }
          }
    }
    const rows = merges.length ? readRows() : originalRows
    const cellWarnings: Record<string, string> = {}
    for (const [address, cell] of Object.entries(ws))
      if (!address.startsWith('!') && cell && typeof cell === 'object') {
        if (cell.t === 'e') cellWarnings[address] = 'Excel-solussa on virhe.'
        else if (cell.f && (cell.v == null || cell.v === ''))
          cellWarnings[address] = 'Kaavan tulos puuttuu. Laske ja tallenna tiedosto Excelissä.'
      }
    return { ...detectSheet(name, rows), originalRows, cellWarnings }
  })
  if (!sheets.some((s) => s.rows.some((r) => r.some(str)) || Object.keys(s.cellWarnings).length))
    throw new Error('Tiedostossa ei ole luettavia rivejä.')
  return { filename: file.name, fingerprint, sheets }
}
export function dateValue(v: Cell): string | undefined {
  if (v instanceof Date && !Number.isNaN(v.getTime()))
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}-${String(v.getUTCDate()).padStart(2, '0')}`
  const s = str(v)
  if (/^\d{4}$/.test(s) && +s >= 1400 && +s <= 2200) return s
  const fi = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  const parts = fi ? [+fi[3], +fi[2], +fi[1]] : iso ? [+iso[1], +iso[2], +iso[3]] : null
  if (parts) {
    const [y, m, d] = parts,
      test = new Date(Date.UTC(y, m - 1, d))
    if (test.getUTCFullYear() === y && test.getUTCMonth() === m - 1 && test.getUTCDate() === d)
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  if (typeof v === 'number' && v > 10000 && v < 100000) {
    const d = XLSX.SSF.parse_date_code(v)
    return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : undefined
  }
  return undefined
}
function categoryOf(value: string): Category {
  const s = normalize(value)
  if (/teatter|theat|pjäs|esitys/.test(s)) return 'theatre'
  if (/näyttely|exhibit|utställ|museo|art area/.test(s)) return 'exhibition'
  if (/muu|other|övrig|konsertti|concert/.test(s)) return 'other'
  return 'book'
}
export function interpret(wb: Workbook, min: number, max: number, current?: Archive): Preview {
  const works = new Map<string, Work>(),
    members = new Map<string, Member>(),
    issues: string[] = [],
    cells: CellAudit[] = [],
    rowAudit: RowAudit[] = [],
    blankRatings: BlankRating[] = []
  const existing = new Map(
    current?.mode === 'demo' ? [] : current?.works.map((w) => [workKey(w), w] as const)
  )
  let skipped = 0,
    rows = 0
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min)
    return {
      works: [],
      members: [],
      issues: ['Asteikon ylärajan täytyy olla alarajaa suurempi.'],
      skipped,
      rows,
      cells,
      rowAudit,
      blankRatings
    }
  function member(name: string): Member {
    const key = normalize(name)
    let m = members.get(key)
    if (!m) {
      m = { id: stableId(`member:${key}`), name: name.trim(), color: memberColors[members.size % 4] }
      members.set(key, m)
    }
    return m
  }
  for (const sheet of wb.sheets) {
    const col = (role: Role) => sheet.columns.find((c) => c.role === role)?.index,
      titleCol = col('title')
    if (sheet.enabled && titleCol === undefined) issues.push(`${sheet.name}: valitse teoksen nimen sarake.`)
    for (let ri = 0; ri < sheet.rows.length; ri++) {
      const row = sheet.rows[ri],
        source = `${sheet.name}!`,
        get = (role: Role): Cell => {
          const c = col(role)
          return c === undefined ? null : (row[c] ?? null)
        }
      const rawTitle = titleCol === undefined ? '' : str(row[titleCol])
      const mixedCreator = sheet.columns.some(
        (c) => c.role === 'creator' && /tapahtuma/.test(normalize(c.header))
      )
      const eventTitle = !rawTitle && mixedCreator && dateValue(get('date')) ? str(get('creator')) : ''
      const title = rawTitle || eventTitle
      const summaryRow =
        !dateValue(get('date')) &&
        /^(yhteensä|summa|totals?|grand total|keskiarvo|average|mean|medelvärde)(?:\s|$)/.test(
          normalize(rawTitle)
        )
      const hasRating = sheet.columns.some(
        (c) => ['memberRating', 'rating', 'memberReview', 'review'].includes(c.role) && str(row[c.index])
      )
      const sectionRow = !title && !str(get('date')) && !hasRating
      const isHeader =
        ri <= sheet.headerRow ||
        (!!title &&
          normalize(title) === normalize(sheet.columns.find((c) => c.index === titleCol)?.header ?? ''))
      let status: AuditStatus = !sheet.enabled
        ? 'excluded'
        : summaryRow
          ? 'excluded'
          : isHeader || sectionRow
            ? 'header'
            : !row.some((v) => str(v))
              ? 'empty'
              : !title || titleCol === undefined
                ? 'review'
                : 'imported'
      let reason =
        status === 'excluded'
          ? summaryRow
            ? 'Yhteenvetorivi säilyy tuontihistoriassa. Summia ei tuoda arvosanoina.'
            : 'Välilehti ei ole mukana tuonnissa.'
          : status === 'header'
            ? 'Otsikko tai sitä edeltävä rivi.'
            : status === 'empty'
              ? 'Tyhjä rivi.'
              : status === 'review'
                ? 'Teoksen nimi puuttuu.'
                : 'Uusi lukukerta.'
      let w: Work | undefined,
        session: ReadingSession | undefined,
        reliableDate = true
      if (!['excluded', 'header', 'empty'].includes(status)) rows++
      if (status === 'review') {
        skipped++
        issues.push(`${sheet.name}, rivi ${ri + 1}: ${reason}`)
      }
      if (
        status === 'imported' &&
        titleCol !== undefined &&
        sheet.cellWarnings?.[XLSX.utils.encode_cell({ r: ri, c: titleCol })]
      ) {
        status = 'review'
        reason = 'Teoksen nimisolussa on Excel-virhe.'
        skipped++
        issues.push(`${sheet.name}, rivi ${ri + 1}: ${reason}`)
      }
      if (status === 'imported') {
        const creator = eventTitle ? '' : str(get('creator')),
          rawDate = get('date'),
          date = dateValue(rawDate) ?? sheet.name.match(/(?:19|20)\d{2}/)?.[0],
          category = eventTitle
            ? ('other' as const)
            : categoryOf(
                str(get('category')) || (mixedCreator ? `${creator} ${title} ${sheet.name}` : sheet.name)
              )
        const dateCol = col('date')
        reliableDate =
          (!str(rawDate) || dateValue(rawDate) !== undefined) &&
          (dateCol === undefined || !sheet.cellWarnings?.[XLSX.utils.encode_cell({ r: ri, c: dateCol })])
        const key = workKey({ title, creator, category, date }),
          existingWork = existing.get(key)
        w = works.get(key) ?? {
          id: stableId(`work:${key}`),
          title,
          creator,
          category,
          publicationYear: numeric(get('publicationYear')) ?? undefined,
          themes: [],
          locations: [],
          ratings: [],
          color: memberColors[works.size % 4],
          motif: works.size % 6
        }
        const sessions = w.readingSessions ?? []
        session = sessions.find((s) => s.date === date)
        if (session) {
          status = 'merged'
          reason = 'Rivi yhdistetään saman teoksen samaan lukukertaan.'
        } else {
          session = {
            id: readingId(w.id, date),
            date,
            ratings: [],
            reviews: [],
            source: `${sheet.name}, rivi ${ri + 1}`
          }
          sessions.push(session)
          if (existingWork && sessionsFor(existingWork).some((s) => s.date === date)) {
            status = 'merged'
            reason = 'Rivi yhdistetään arkistossa olevaan lukukertaan.'
          } else if (existingWork) reason = 'Uusi lukukerta arkistossa olevaan teokseen.'
        }
        const notes = sheet.columns
          .filter((c) => ['notes', 'ignore', 'location'].includes(c.role) && str(row[c.index]))
          .map((c) => `${c.header}: ${str(row[c.index])}`)
        session.notes =
          [...new Set([...(session.notes?.split('\n') ?? []), ...notes])].join('\n') || undefined
        works.set(key, withSessions(w, sessions))
        w = works.get(key)!
        session = w.readingSessions!.find((s) => s.date === date)!
      }
      const rowReport: RowAudit = { sheet: sheet.name, row: ri, title, status, reason }
      rowAudit.push(rowReport)
      for (const c of sheet.columns) {
        const raw = row[c.index] ?? null,
          address = XLSX.utils.encode_cell({ r: ri, c: c.index }),
          cellSource = `${source}${address}`,
          warning = sheet.cellWarnings?.[address]
        const name = c.role.startsWith('member') ? (c.member ?? c.header) : str(get('reviewer'))
        const audit: CellAudit = {
          sheet: sheet.name,
          row: ri,
          column: c.index,
          address: cellSource,
          raw,
          original: sheet.originalRows ? (sheet.originalRows[ri]?.[c.index] ?? null) : raw,
          role: c.role,
          member: name || undefined,
          status,
          interpreted: '',
          reason,
          workId: w?.id,
          readingId: session?.id
        }
        if (w && session) {
          audit.interpreted = str(raw)
          audit.reason = 'Tallennetaan teoksen tietona.'
          if (warning) {
            audit.status = 'review'
            audit.reason = warning
            audit.interpreted = 'Ei tuoda'
            issues.push(`${cellSource}: ${warning}`)
          } else if (['memberRating', 'rating', 'memberReview', 'review'].includes(c.role)) {
            if (!name.trim() && str(raw)) {
              audit.status = 'review'
              audit.reason = 'Arvioijan nimi puuttuu.'
              issues.push(`${cellSource}: ${audit.reason}`)
            } else if (name.trim()) {
              const m = member(name)
              if (c.role === 'memberReview' || c.role === 'review') {
                if (str(raw)) {
                  session.reviews = uniqueReviews([
                    ...session.reviews,
                    { memberId: m.id, text: str(raw), source: cellSource }
                  ])
                  audit.interpreted = `${m.name}: ${str(raw)}`
                  audit.reason = 'Kirjoitettu arvio säilyy myös ilman arvosanaa.'
                } else {
                  audit.status = 'empty'
                  audit.reason = 'Tyhjä kommentti ei poista aiempaa tekstiä.'
                }
              } else if (!str(raw)) {
                if (reliableDate)
                  blankRatings.push({ workId: w.id, date: session.date, memberId: m.id, source: cellSource })
                audit.status = 'empty'
                audit.reason = reliableDate
                  ? 'Tyhjän arvosanan käsittely valitaan ennen tallennusta.'
                  : 'Arvosana säilytetään, koska päiväys on epävarma.'
                audit.interpreted = 'Tyhjä arvosana'
              } else {
                const n = numeric(raw),
                  existing = session.ratings.find((r) => r.memberId === m.id)
                if (n === null || n < min || n > max) {
                  audit.status = 'review'
                  audit.reason = `Arvosana ei kelpaa asteikolle ${min}–${max}.`
                  audit.interpreted = 'Ei tuoda arvosanana'
                  issues.push(`${cellSource}: ${m.name}, ${audit.reason}`)
                  session.notes = [session.notes, `${cellSource} ${m.name}: ${str(raw)}`]
                    .filter(Boolean)
                    .join('\n')
                } else if (
                  existing &&
                  (existing.value !== n || existing.min !== min || existing.max !== max)
                ) {
                  audit.status = 'review'
                  audit.reason = `Sama arvioija on arvioinut lukukerran kahdesti. Ensimmäinen (${existing.value}) säilyy.`
                  audit.interpreted = `${m.name}: ${existing.value}`
                  issues.push(`${cellSource}: ${audit.reason}`)
                } else {
                  if (!existing)
                    session.ratings.push({ memberId: m.id, value: n, min, max, source: cellSource })
                  audit.interpreted = `${m.name}: ${n} (asteikko ${min}–${max})`
                  audit.reason = existing ? 'Sama arvio yhdistetään.' : 'Arvosana tuodaan.'
                }
              }
            } else {
              audit.status = 'empty'
              audit.reason = 'Tyhjä arvio ilman arvioijan nimeä.'
            }
          } else if (c.role === 'date') {
            audit.interpreted = session.date ?? 'Ei päiväystä'
            if (str(raw) && !dateValue(raw)) {
              audit.status = 'review'
              audit.reason = 'Päivämäärää ei tunnistettu; käytetään välilehden vuotta, jos se on saatavilla.'
              issues.push(`${cellSource}: ${audit.reason}`)
            } else
              audit.reason = str(raw) ? 'Lukukerran päiväys.' : 'Päiväys välilehden vuodesta tai puuttuu.'
          } else if (['ignore', 'notes', 'location'].includes(c.role)) {
            audit.status = str(raw) ? 'stored' : 'empty'
            audit.reason = str(raw) ? 'Säilytetään lukukerran muistiinpanossa.' : 'Tyhjä muistiinpanosolu.'
          } else if (!str(raw)) {
            audit.status = 'empty'
            audit.reason = 'Tyhjä tieto.'
          }
          if (audit.status === 'review') {
            rowReport.status = 'review'
            rowReport.reason = 'Rivillä on tarkistettavia soluja.'
          }
        }
        cells.push(audit)
      }
      if (w) works.set(workKey(w), withSessions(w, w.readingSessions!))
    }
  }
  return {
    works: [...works.values()],
    members: [...members.values()],
    issues: [...new Set(issues)],
    skipped,
    rows,
    cells,
    rowAudit,
    blankRatings
  }
}
export function mergeArchive(
  current: Archive,
  preview: Preview,
  record: ImportRecord,
  blankPolicy: BlankPolicy = 'keep'
) {
  const base = current.mode === 'demo' ? { ...current, works: [], members: [], imports: [] } : current
  const members = [...base.members],
    ids = new Map<string, string>(),
    changes: ImportChange[] = [],
    conflicts: string[] = []
  for (const m of preview.members) {
    const old = members.find((x) => normalize(x.name) === normalize(m.name))
    ids.set(m.id, old?.id ?? m.id)
    if (!old) members.push(m)
  }
  const summaryTitles = new Set(
    preview.rowAudit
      .filter((row) => row.status === 'excluded' && row.reason.startsWith('Yhteenvetorivi'))
      .map((row) => normalize(row.title))
  )
  const obsolete = base.works.filter(
    (work) => work.source && !work.date && !work.ratings.length && summaryTitles.has(normalize(work.title))
  )
  const works = base.works.filter((work) => !obsolete.includes(work))
  for (const work of obsolete)
    changes.push({
      kind: 'details',
      title: work.title,
      before: 'Yhteenvetorivi teosluettelossa',
      after: 'Poistetaan teosluettelosta. Alkuperäinen rivi säilyy tuontihistoriassa.',
      source: work.source
    })
  let added = 0,
    updated = 0,
    newReadings = 0
  const invalidScores = new Set(
    preview.cells
      .filter((c) => c.status === 'review' && c.member && (c.role === 'rating' || c.role === 'memberRating'))
      .map((c) => `${c.readingId}:${normalize(c.member!)}`)
  )
  // An earlier import may have combined identically named works after missing the author column.
  // Reassign only scoreless, commentless source readings with one exact dated match in this import.
  const reassigned = new Map<string, string>()
  const originalNotes = new Map<string, string[]>()
  for (const legacy of base.works.filter((work) => !work.creator.trim() && work.source)) {
    for (const session of sessionsFor(legacy)) {
      if (session.ratings.length || session.reviews.length) continue
      const matches = preview.works.filter(
        (work) =>
          normalize(work.title) === normalize(legacy.title) &&
          sessionsFor(work).some((reading) => reading.date === session.date)
      )
      if (matches.length !== 1) continue
      const target = matches[0]
      reassigned.set(`${legacy.id}:${session.id}`, target.id)
      if (session.notes) {
        const key = `${target.id}:${session.date ?? ''}`
        originalNotes.set(key, [...(originalNotes.get(key) ?? []), session.notes])
      }
    }
  }
  for (const incoming of preview.works) {
    let index = works.findIndex((w) => workKey(w) === workKey(incoming))
    if (index < 0 && incoming.creator) {
      const matches = works
        .map((w, i) => ({ w, i }))
        .filter(({ w }) => !w.creator.trim() && normalize(w.title) === normalize(incoming.title) && w.source)
      if (matches.length === 1) index = matches[0].i
    }
    const old = index < 0 ? undefined : works[index],
      targetId = old?.id ?? incoming.id
    const originalSessions = old ? sessionsFor(old) : []
    const sessions = originalSessions.filter((session) => {
      const target = reassigned.get(`${old!.id}:${session.id}`)
      return !target || target === incoming.id
    })
    const start = JSON.stringify(originalSessions)
    for (const session of originalSessions.filter((session) => !sessions.includes(session))) {
      const target = preview.works.find((work) => work.id === reassigned.get(`${old!.id}:${session.id}`))!
      changes.push({
        kind: 'details',
        title: incoming.title,
        date: session.date,
        before: 'Lukukerta ilman tekijätietoa',
        after: `Liitetään tekijään ${target.creator}`,
        source: session.source
      })
    }
    if (!old) {
      added++
      changes.push({ kind: 'work', title: incoming.title, before: 'Ei arkistossa', after: 'Uusi teos' })
    }
    for (const rawSession of sessionsFor(incoming)) {
      const candidate = {
        ...rawSession,
        notes:
          [...(originalNotes.get(`${incoming.id}:${rawSession.date ?? ''}`) ?? []), rawSession.notes]
            .filter(Boolean)
            .join('\n') || undefined,
        id: readingId(targetId, rawSession.date),
        ratings: rawSession.ratings.map((r) => ({
          ...r,
          memberId: ids.get(r.memberId) ?? r.memberId,
          review: undefined
        })),
        reviews: rawSession.reviews.map((r) => ({ ...r, memberId: ids.get(r.memberId) ?? r.memberId }))
      }
      let session = sessions.find((s) => s.date === candidate.date)
      if (!session) {
        session = { ...candidate, ratings: [], reviews: [], notes: undefined }
        sessions.push(session)
        newReadings++
        changes.push({
          kind: 'reading',
          title: incoming.title,
          date: candidate.date,
          before: 'Ei lukukertaa',
          after: 'Uusi lukukerta',
          source: candidate.source
        })
      }
      for (const rating of candidate.ratings) {
        const i = session.ratings.findIndex((r) => r.memberId === rating.memberId),
          before = i < 0 ? undefined : session.ratings[i]
        if (
          !before ||
          before.value !== rating.value ||
          before.min !== rating.min ||
          before.max !== rating.max
        ) {
          const change = {
            kind: 'rating' as const,
            title: incoming.title,
            date: session.date,
            member: members.find((m) => m.id === rating.memberId)?.name,
            before: before ? `${before.value} (${before.min}–${before.max})` : 'Ei arvosanaa',
            after: `${rating.value} (${rating.min}–${rating.max})`,
            source: rating.source
          }
          changes.push(change)
          if (before)
            conflicts.push(
              `${change.title} (${change.date ?? 'ei päiväystä'}): ${change.member}, ${change.before} → ${change.after}`
            )
        }
        if (i < 0) session.ratings.push(rating)
        else session.ratings[i] = { ...before, ...rating }
      }
      if (blankPolicy === 'delete')
        for (const blank of preview.blankRatings.filter(
          (b) => b.workId === incoming.id && b.date === session!.date
        )) {
          const mid = ids.get(blank.memberId) ?? blank.memberId
          const name = members.find((m) => m.id === mid)?.name
          if (
            candidate.ratings.some((r) => r.memberId === mid) ||
            (name && invalidScores.has(`${rawSession.id}:${normalize(name)}`))
          )
            continue
          const before = session.ratings.find((r) => r.memberId === mid)
          if (before) {
            session.ratings = session.ratings.filter((r) => r.memberId !== mid)
            const change = {
              kind: 'rating' as const,
              title: incoming.title,
              date: session.date,
              member: members.find((m) => m.id === mid)?.name,
              before: String(before.value),
              after: 'Poistetaan arvosana',
              source: blank.source
            }
            changes.push(change)
            conflicts.push(`${incoming.title}: ${change.member}, ${before.value} → poistetaan`)
          }
        }
      for (const review of candidate.reviews) {
        if (!session.reviews.some((r) => r.memberId === review.memberId && r.text === review.text)) {
          session.reviews.push(review)
          changes.push({
            kind: 'review',
            title: incoming.title,
            date: session.date,
            member: members.find((m) => m.id === review.memberId)?.name,
            before: '',
            after: review.text,
            source: review.source
          })
        }
      }
      const notes =
        [...new Set([...(session.notes?.split('\n') ?? []), ...(candidate.notes?.split('\n') ?? [])])]
          .filter(Boolean)
          .join('\n') || undefined
      if (notes !== session.notes) {
        changes.push({
          kind: 'notes',
          title: incoming.title,
          date: session.date,
          before: session.notes ?? '',
          after: notes ?? ''
        })
        session.notes = notes
      }
    }
    const detailsChanged = !!old && !old.creator.trim() && !!incoming.creator
    if (detailsChanged)
      changes.push({
        kind: 'details',
        title: incoming.title,
        before: 'Tekijä puuttuu',
        after: `${incoming.creator} · ${incoming.category}`,
        source: incoming.source
      })
    const result = withSessions(
      detailsChanged
        ? {
            ...old!,
            creator: incoming.creator,
            category: incoming.category,
            publicationYear: incoming.publicationYear ?? old!.publicationYear
          }
        : (old ?? incoming),
      sessions
    )
    if (old && (detailsChanged || start !== JSON.stringify(sessions))) updated++
    if (index < 0) works.push(result)
    else works[index] = result
  }
  return {
    archive: {
      version: 1 as const,
      mode: current.mode === 'cloud' ? ('cloud' as const) : ('local' as const),
      members,
      works,
      imports: [{ ...record, added, updated }, ...base.imports]
    },
    added,
    updated,
    newReadings,
    removed: obsolete.length,
    conflicts,
    changes
  }
}
