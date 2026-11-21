import { useEnrichment } from '../services/useEnrichment'
import { EnrichmentStatus } from './EnrichmentStatus'
import { useRef, useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Upload, FileSpreadsheet, ArrowRight, Check, CheckCircle2, ChevronDown, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  readWorkbook,
  interpret,
  mergeArchive,
  roleLabels,
  detectSheet,
  type Workbook,
  type Role,
  type BlankPolicy
} from '../importer/excel'
import { readingViews } from '../domain/readings'
import { useArchive } from '../services/store'
import { canManage } from '../services/cloud'
import { ErrorText } from './UI'
import { ImportAudit } from './ImportAudit'
import { normalize, type ImportRecord } from '../domain/model'
export function ImportPage() {
  const { archive, save, busy, club } = useArchive(),
    fileRef = useRef<HTMLInputElement>(null),
    request = useRef(0)
  const enrichment = useEnrichment()
  const [lookup, setLookup] = useState(true)
  const [wb, setWb] = useState<Workbook | null>(null),
    [step, setStep] = useState(1),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [editing, setEditing] = useState(false),
    [min, setMin] = useState(1),
    [max, setMax] = useState(10),
    [confirmed, setConfirmed] = useState(false),
    [scaleConfirmed, setScaleConfirmed] = useState(false),
    [drag, setDrag] = useState(false),
    [blankPolicy, setBlankPolicy] = useState<BlankPolicy>('keep'),
    [summary, setSummary] = useState({ added: 0, updated: 0, newReadings: 0 })
  const preview = useMemo(() => (wb ? interpret(wb, min, max, archive) : null), [wb, min, max, archive])
  const stamp = useMemo(() => ({ id: crypto.randomUUID(), at: new Date().toISOString() }), [wb?.fingerprint])
  const record: ImportRecord = {
    ...stamp,
    filename: wb?.filename ?? '',
    fingerprint: wb?.fingerprint ?? '',
    added: 0,
    updated: 0,
    warnings: preview?.issues ?? [],
    mapping: { min, max, blankPolicy, sheets: wb?.sheets }
  }
  const merged = preview ? mergeArchive(archive, preview, record, blankPolicy) : null
  useEffect(() => setConfirmed(false), [wb, min, max, blankPolicy, archive])
  if (club && !canManage(club.role))
    return (
      <div className="page narrow">
        <h1>Arkiston päivittäminen</h1>
        <p>Yhteistä arkistoa voi päivittää kirjakerhon ylläpitäjä.</p>
        <Link className="button button-dark" to="/arkisto">
          Avaa arkisto
        </Link>
      </div>
    )
  async function read(file: File | undefined) {
    if (!file) return
    const id = ++request.current
    setError('')
    setLoading(true)
    try {
      const next = await readWorkbook(file)
      if (id !== request.current) return
      setWb({
        ...next,
        sheets: next.sheets.map((s) => ({
          ...s,
          columns: s.columns.map((c) =>
            c.role === 'ignore' && archive.members.some((m) => normalize(m.name) === normalize(c.header))
              ? {
                  ...c,
                  role: 'memberRating',
                  member: archive.members.find((m) => normalize(m.name) === normalize(c.header))!.name,
                  confidence: 0.9
                }
              : c
          )
        }))
      })
      setStep(2)
      setScaleConfirmed(false)
    } catch (e) {
      if (id === request.current) setError(e instanceof Error ? e.message : 'Tiedostoa ei voitu avata.')
    } finally {
      if (id === request.current) setLoading(false)
    }
  }
  function patchSheet(si: number, change: Record<string, unknown>) {
    setWb((old) =>
      old ? { ...old, sheets: old.sheets.map((s, i) => (i === si ? { ...s, ...change } : s)) } : null
    )
  }
  function editCell(name: string, row: number, column: number, value: string) {
    setWb((old) =>
      old
        ? {
            ...old,
            sheets: old.sheets.map((s) =>
              s.name === name
                ? {
                    ...s,
                    originalRows: s.originalRows ?? s.rows.map((r) => [...r]),
                    rows: s.rows.map((r, i) => (i === row ? Object.assign([...r], { [column]: value }) : r)),
                    cellWarnings: { ...s.cellWarnings, [XLSX.utils.encode_cell({ r: row, c: column })]: '' }
                  }
                : s
            )
          }
        : null
    )
  }
  async function finish() {
    if (!preview || !wb || !confirmed) return
    setError('')
    try {
      const result = mergeArchive(
        archive,
        preview,
        { ...record, id: crypto.randomUUID(), at: new Date().toISOString() },
        blankPolicy
      )
      await save(result.archive)
      setSummary(result)
      setStep(4)
      if (lookup) {
        const incomingKeys = new Set(preview.works.map((w) => normalize(w.title)))
        void enrichment.run(result.archive.works.filter((w) => incomingKeys.has(normalize(w.title))))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tallentaminen ei onnistunut.')
    }
  }
  function sample() {
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([
        [
          'Kirja',
          'Kirjailija',
          'Päivämäärä',
          ...archive.members.flatMap((m) => [m.name, `${m.name} kommentti`])
        ],
        ...readingViews(archive.works)
          .slice(0, 8)
          .map((w) => [
            w.title,
            w.creator,
            w.date,
            ...archive.members.flatMap((m) => [
              w.ratings.find((r) => r.memberId === m.id)?.value ?? '',
              w.reviews
                ?.filter((r) => r.memberId === m.id)
                .map((r) => r.text)
                .join('\n') ??
                w.ratings.find((r) => r.memberId === m.id)?.review ??
                ''
            ])
          ])
      ]),
      'Kirjat'
    )
    XLSX.writeFile(book, 'Atlas-esimerkki.xlsx')
  }
  return (
    <div className="page import-page">
      <div className="import-heading">
        <p className="eyebrow">OMA HISTORIA, UUSI LUKU</p>
        <h1>
          {step === 4 ? (
            <>
              Historia on <em>valmis.</em>
            </>
          ) : (
            <>
              Tuo kirjakerhon
              <br />
              <em>historia.</em>
            </>
          )}
        </h1>
        <p>Tarkista lähde, tulkinta ja muutokset ennen tallentamista.</p>
      </div>
      <ol className="import-steps">
        {['Valitse tiedosto', 'Tarkista tiedot', 'Vahvista tuonti'].map((label, i) => (
          <li className={step >= i + 1 ? 'active' : ''} key={label}>
            <span>{step > i + 1 ? <Check size={16} /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {step === 1 && (
        <>
          <div
            className={`upload-zone ${drag ? 'dragging' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              void read(e.dataTransfer.files[0])
            }}
          >
            <FileSpreadsheet size={44} />
            <h2>Kaikki alkaa yhdestä tiedostosta.</h2>
            <p>Alkuperäistä Exceliä ei tarvitse muokata.</p>
            <button
              className="button button-burgundy"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
            >
              <Upload size={20} />
              {loading ? 'Luetaan…' : 'Valitse Numbers- tai Excel-tiedosto'}
            </button>
            <input
              aria-label="Numbers- tai Excel-tiedosto"
              className="sr-only"
              type="file"
              accept=".numbers,.xlsx,.xls,.xlsm,.csv,.ods"
              ref={fileRef}
              onChange={(e) => void read(e.target.files?.[0])}
            />
            <p>Numbers, Excel, CSV, ODS · enintään 20 Mt</p>
          </div>
          <div className="import-info">
            <p>
              Tiedosto käsitellään tällä laitteella.{' '}
              {club
                ? 'Vahvistettu tuonti tallennetaan yhteiseen arkistoon.'
                : 'Vahvistettu tuonti tallennetaan tämän selaimen muistiin.'}
            </p>
            <button className="text-link" onClick={sample}>
              <Download size={18} />
              Lataa esimerkkitiedosto
            </button>
          </div>
        </>
      )}
      {step === 2 && wb && preview && (
        <>
          <div className="detected-banner">
            <FileSpreadsheet />
            <div>
              <strong>{wb.filename}</strong>
              <span>
                {wb.sheets.length} välilehteä · {preview.rows} tietoriviä
              </span>
            </div>
            <button
              className="text-link"
              onClick={() => {
                setStep(1)
                setWb(null)
              }}
            >
              Vaihda tiedosto
            </button>
          </div>
          <div className="detected-counts">
            <div>
              <strong>{preview.works.length}</strong>
              <span>teosta</span>
            </div>
            <div>
              <strong>{readingViews(preview.works).length}</strong>
              <span>lukukertaa</span>
            </div>
            <div>
              <strong>{preview.members.length}</strong>
              <span>arvioijaa</span>
            </div>
            <div>
              <strong>{readingViews(preview.works).reduce((s, w) => s + w.ratings.length, 0)}</strong>
              <span>arvosanaa</span>
            </div>
          </div>
          <div className="scale-panel">
            <div>
              <h3>Alkuperäinen arvosana-asteikko</h3>
              <p>Eri asteikot vertaillaan välillä 0–10. Kommentit tuodaan myös ilman arvosanaa.</p>
            </div>
            <label>
              Pienin
              <input
                type="number"
                step="any"
                value={min}
                onChange={(e) => {
                  setMin(+e.target.value)
                  setScaleConfirmed(false)
                }}
              />
            </label>
            <label>
              Suurin
              <input
                type="number"
                step="any"
                value={max}
                onChange={(e) => {
                  setMax(+e.target.value)
                  setScaleConfirmed(false)
                }}
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={scaleConfirmed}
                onChange={(e) => setScaleConfirmed(e.target.checked)}
              />
              Asteikko on oikein
            </label>
          </div>
          <button
            className="button button-outline mapping-toggle"
            onClick={() => setEditing(!editing)}
            aria-expanded={editing}
          >
            Tarkista ja korjaa sarakkeita
            <ChevronDown size={18} />
          </button>
          <div className="mapping-sheets">
            {wb.sheets.map((sheet, si) => (
              <div className="mapping-sheet" key={sheet.name}>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={sheet.enabled}
                    onChange={(e) => patchSheet(si, { enabled: e.target.checked })}
                  />
                  <strong>{sheet.name}</strong>
                  <span>{sheet.rows.length} riviä</span>
                </label>
                {sheet.enabled && (
                  <>
                    <p className="mapping-summary">
                      {sheet.columns
                        .map((c) => `${c.header} → ${roleLabels[c.role]}${c.member ? ` (${c.member})` : ''}`)
                        .join(' · ')}
                    </p>
                    {editing && (
                      <>
                        <label>
                          Otsikkorivi
                          <select
                            value={sheet.headerRow}
                            onChange={(e) => {
                              const next = detectSheet(sheet.name, sheet.rows, +e.target.value)
                              patchSheet(si, { headerRow: next.headerRow, columns: next.columns })
                            }}
                          >
                            {sheet.rows.slice(0, 40).map((row, i) => (
                              <option value={i} key={i}>
                                {i + 1}: {row.slice(0, 3).join(' · ').slice(0, 80)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="mapping-columns">
                          {sheet.columns.map((c, ci) => (
                            <div className="mapping-column" key={c.index}>
                              <strong>
                                {XLSX.utils.encode_col(c.index)} · {c.header}
                              </strong>
                              <label>
                                <span className="sr-only">Sarakkeen {c.header} merkitys</span>
                                <select
                                  value={c.role}
                                  onChange={(e) =>
                                    patchSheet(si, {
                                      columns: sheet.columns.map((x, i) =>
                                        i === ci ? { ...x, role: e.target.value as Role } : x
                                      )
                                    })
                                  }
                                >
                                  {Object.entries(roleLabels).map(([value, label]) => (
                                    <option key={value} value={value}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              {c.role.startsWith('member') && (
                                <label>
                                  Arvioijan nimi
                                  <input
                                    value={c.member ?? ''}
                                    onChange={(e) =>
                                      patchSheet(si, {
                                        columns: sheet.columns.map((x, i) =>
                                          i === ci ? { ...x, member: e.target.value } : x
                                        )
                                      })
                                    }
                                  />
                                </label>
                              )}
                              <span className="confidence uncertain">
                                {c.confidence < 0.8 ? 'Tarkista tulkinta' : 'Tunnistettu'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          <ImportAudit wb={wb} preview={preview} onEdit={editCell} />
          <div className="import-actions">
            <button
              className="button button-burgundy"
              disabled={
                !scaleConfirmed ||
                max <= min ||
                !preview.works.length ||
                wb.sheets.some((s) => s.enabled && !s.columns.some((c) => c.role === 'title'))
              }
              onClick={() => setStep(3)}
            >
              Vertaa muutoksia
              <ArrowRight size={20} />
            </button>
          </div>
        </>
      )}
      {step === 3 && preview && merged && (
        <>
          <section className="import-summary">
            <label className="check-label">
              <input type="checkbox" checked={lookup} onChange={(e) => setLookup(e.target.checked)} />
              Hae kirjojen maat ja teemat Finnasta tallennuksen jälkeen
            </label>
            <p className="small-note">
              Haku lähettää Finnaan kirjojen nimet ja tekijät. Löydetyt maat ja asiasanat tallennetaan
              lähdelinkkeineen. Arvosanat ja kommentit käsitellään arkistossa.
            </p>
            <h2>Ennen kuin tallennat.</h2>
            <p>
              {archive.mode === 'demo' ? 'Esimerkkiarkisto vaihtuu omaan arkistoosi. ' : ''}
              {merged.added} uutta teosta · {merged.newReadings} uutta lukukertaa · {merged.updated}{' '}
              päivittyvää teosta.
            </p>
            {merged.removed > 0 && (
              <p>
                {merged.removed} aiemmin teoksiksi tulkittua yhteenvetoriviä poistetaan teosluettelosta. Näet
                poistot alla.
              </p>
            )}
            <label>
              Tyhjä arvosanasolu uudelleentuonnissa
              <select value={blankPolicy} onChange={(e) => setBlankPolicy(e.target.value as BlankPolicy)}>
                <option value="keep">Säilytä aiempi arvosana</option>
                <option value="delete">Poista aiempi arvosana</option>
              </select>
            </label>
            <p className="small-note">
              Valinta koskee vain mukana olevien arvosanasarakkeiden tyhjiä soluja ja samaa lukukertaa.
              Puuttuva sarake, virheellinen arvo tai tyhjä kommentti ei poista aiempaa tietoa. Kommentit
              säilyvät.
            </p>
            <div className="audit-scroll" tabIndex={0}>
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Teos ja lukukerta</th>
                    <th>Muutos</th>
                    <th>Ennen</th>
                    <th>Jälkeen</th>
                    <th>Lähde</th>
                  </tr>
                </thead>
                <tbody>
                  {merged.changes.map((c, i) => (
                    <tr key={i}>
                      <th scope="row">
                        {c.title}
                        <small>
                          {c.kind === 'work' ? 'Teos' : (c.date ?? 'Ei päiväystä')}
                          {c.member ? ` · ${c.member}` : ''}
                        </small>
                      </th>
                      <td>
                        {
                          {
                            work: 'Uusi teos',
                            reading: 'Uusi lukukerta',
                            rating: 'Arvosana',
                            review: 'Kommentti',
                            notes: 'Muistiinpano',
                            details: 'Tekijätiedot'
                          }[c.kind]
                        }
                      </td>
                      <td className="preserve-text">{c.before || '—'}</td>
                      <td className="preserve-text">{c.after}</td>
                      <td>{c.source ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!merged.changes.length && (
              <p>Ei muutoksia teoksiin tai arvioihin. Tuonti kirjataan historiaan.</p>
            )}
          </section>
          {preview.issues.length > 0 && (
            <div className="import-warnings">
              <h3>{preview.issues.length} tarkistettavaa huomiota</h3>
              <p>
                {preview.skipped} riviä jää teosluettelon ulkopuolelle. Kaikki lähderivit säilyvät
                tuontihistoriassa.
              </p>
              <ul>
                {preview.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
          <label className="check-label">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            Olen tarkistanut sarakkeet, solut ja yllä näkyvät muutokset. Hyväksyn tuonnin.
          </label>
          <div className="import-actions">
            <button className="button button-outline" onClick={() => setStep(2)}>
              Takaisin tarkistukseen
            </button>
            <button
              className="button button-burgundy"
              onClick={() => void finish()}
              disabled={busy || !confirmed}
            >
              {busy ? 'Tallennetaan…' : 'Tallenna arkistoon'}
              <Check size={20} />
            </button>
          </div>
        </>
      )}
      {step === 4 && (
        <div className="import-complete">
          <EnrichmentStatus state={enrichment} />
          <CheckCircle2 size={62} />
          <h2>Historia on tallessa.</h2>
          <p>
            {summary.added} uutta teosta · {summary.newReadings} uutta lukukertaa · {summary.updated}{' '}
            päivitettyä teosta
          </p>
          <Link className="button button-burgundy" to="/arkisto">
            Tutki arkistoa
            <ArrowRight />
          </Link>
          <Link className="text-link" to="/vuosikirja">
            Tee kirjakerhon vuosikirja
          </Link>
        </div>
      )}
      <ErrorText message={error} />
    </div>
  )
}
