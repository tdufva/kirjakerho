import type { useEnrichment } from '../services/useEnrichment'
import { ErrorText } from './UI'
export function EnrichmentStatus({ state }: { state: ReturnType<typeof useEnrichment> }) {
  const { running, progress, completed, error, cancel } = state
  if (!running && !completed && !error) return null
  return (
    <div className="enrichment-status" aria-live="polite">
      <p>
        {running
          ? `Haetaan Atlas-tietoja · ${progress.processed} / ${progress.total}`
          : 'Atlas-haku päättyi.'}
      </p>
      {running && (
        <>
          <progress value={progress.processed} max={progress.total || 1} />
          <p className="small-note">{progress.current}</p>
          <button className="button button-outline" onClick={cancel}>
            Keskeytä haku
          </button>
        </>
      )}
      <p>
        {progress.matched} teokselle löytyi tietoja · {progress.withCountries} teokselle maita ·{' '}
        {progress.withThemes} teokselle teemoja.
      </p>
      {completed && !error && <p className="small-note">Löydetyt tiedot on tallennettu arkistoon.</p>}
      {progress.failures.length > 0 && (
        <details>
          <summary>{progress.failures.length} teosta jäi täydennettäväksi</summary>
          <ul>
            {progress.failures.map((f, i) => (
              <li key={i}>
                {f.title} · {f.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
      <ErrorText message={error} />
    </div>
  )
}
