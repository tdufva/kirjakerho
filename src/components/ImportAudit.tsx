import { useState } from 'react'
import type { Preview, Cell, Workbook, AuditStatus } from '../importer/excel'
export const auditLabels: Record<AuditStatus, string> = {
  imported: 'Tuodaan',
  merged: 'Yhdistetään',
  empty: 'Tyhjä',
  stored: 'Muistiinpano',
  review: 'Tarkista',
  excluded: 'Ei mukana',
  header: 'Otsikko'
}
export const cellText = (v: Cell) =>
  v == null ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v)
export function ImportAudit({
  preview,
  wb,
  onEdit
}: {
  preview: Preview
  wb: Workbook
  onEdit: (sheet: string, row: number, column: number, value: string) => void
}) {
  const [filter, setFilter] = useState('review'),
    [tab, setTab] = useState<'cells' | 'rows'>('cells'),
    [page, setPage] = useState(0),
    [query, setQuery] = useState('')
  const filtered = preview.cells.filter(
    (c) =>
      (!filter || c.status === filter) &&
      (!query ||
        `${c.address} ${c.member ?? ''} ${cellText(c.raw)} ${c.interpreted}`
          .toLocaleLowerCase('fi')
          .includes(query.toLocaleLowerCase('fi')))
  )
  const filteredRows = preview.rowAudit.filter(
    (r) =>
      (!filter || r.status === filter) &&
      (!query ||
        `${r.sheet} ${r.row + 1} ${r.title}`.toLocaleLowerCase('fi').includes(query.toLocaleLowerCase('fi')))
  )
  const count = tab === 'cells' ? filtered.length : filteredRows.length,
    last = Math.max(0, Math.ceil(count / 40) - 1),
    current = Math.min(page, last)
  function report() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              filename: wb.filename,
              fingerprint: wb.fingerprint,
              cells: preview.cells,
              rows: preview.rowAudit
            },
            null,
            2
          )
        ],
        { type: 'application/json' }
      )
    )
    const a = document.createElement('a')
    a.href = url
    a.download = 'Atlas-tasmaytysraportti.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <section className="audit-panel">
      <div className="section-heading">
        <h2>Jokaiselle solulle selitys.</h2>
        <button className="text-link" onClick={report}>
          Lataa täsmäytysraportti
        </button>
      </div>
      <p>
        Alkuperäinen arvo ja Excel-osoite säilyvät. Korjaa tulkintaa muokkaamalla arvoa; sarakkeen merkitys ja
        arvioijan nimi vaihdetaan sarakeasetuksista. Kaavat tuodaan tallennettuina tuloksina.
      </p>
      <div className="audit-totals">
        {Object.entries(auditLabels).map(([key, label]) => (
          <button
            key={key}
            aria-pressed={filter === key}
            onClick={() => {
              setFilter(filter === key ? '' : key)
              setPage(0)
            }}
          >
            {label} <strong>{preview.cells.filter((c) => c.status === key).length}</strong>
          </button>
        ))}
      </div>
      <div className="audit-controls">
        <label>
          Näkymä
          <select
            value={tab}
            onChange={(e) => {
              setTab(e.target.value as 'cells' | 'rows')
              setPage(0)
            }}
          >
            <option value="cells">Solut ({preview.cells.length})</option>
            <option value="rows">Kaikki rivit ({preview.rowAudit.length})</option>
          </select>
        </label>
        <label>
          Rajaus
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setPage(0)
            }}
          >
            <option value="">Kaikki</option>
            {Object.entries(auditLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hae lähdettä tai arvoa
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
          />
        </label>
      </div>
      <div className="audit-scroll" tabIndex={0} aria-label="Tuonnin täsmäytys">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Lähde</th>
              {tab === 'cells' ? (
                <>
                  <th>Alkuperäinen</th>
                  <th>Korjattava arvo</th>
                  <th>Tulkinta</th>
                </>
              ) : (
                <th>Teos</th>
              )}
              <th>Tila ja selitys</th>
            </tr>
          </thead>
          <tbody>
            {tab === 'cells'
              ? filtered.slice(current * 40, current * 40 + 40).map((c) => (
                  <tr key={c.address}>
                    <th scope="row">{c.address}</th>
                    <td className="preserve-text">{cellText(c.original) || '—'}</td>
                    <td>
                      {!['header', 'excluded'].includes(c.status) ? (
                        <input
                          key={`${c.address}:${cellText(c.raw)}`}
                          aria-label={`Korjaa ${c.address}`}
                          defaultValue={cellText(c.raw)}
                          onBlur={(e) => {
                            if (e.target.value !== cellText(c.raw))
                              onEdit(c.sheet, c.row, c.column, e.target.value)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur()
                          }}
                        />
                      ) : (
                        <span>{cellText(c.raw) || '—'}</span>
                      )}
                    </td>
                    <td className="preserve-text">{c.interpreted || '—'}</td>
                    <td>
                      <strong className={`audit-status status-${c.status}`}>{auditLabels[c.status]}</strong>
                      <span>{c.reason}</span>
                    </td>
                  </tr>
                ))
              : filteredRows.slice(current * 40, current * 40 + 40).map((r) => (
                  <tr key={`${r.sheet}:${r.row}`}>
                    <th scope="row">
                      {r.sheet}, rivi {r.row + 1}
                    </th>
                    <td>{r.title || '—'}</td>
                    <td>
                      <strong>{auditLabels[r.status]}</strong>
                      <span>{r.reason}</span>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {!count && (
        <p role="status">Tällä rajauksella ei ole rivejä. Valitse ”Kaikki” nähdäksesi koko raportin.</p>
      )}
      <div className="audit-pagination">
        <button
          className="button button-outline"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
        >
          Edellinen
        </button>
        <span>
          {count} {tab === 'cells' ? 'solua' : 'riviä'} · sivu {current + 1} / {last + 1}
        </span>
        <button
          className="button button-outline"
          disabled={current === last}
          onClick={() => setPage(current + 1)}
        >
          Seuraava
        </button>
      </div>
    </section>
  )
}
